# Game service

`gameserver.js` owns HTTP/WebSocket wiring, session authentication, bot requests,
Redis broadcasts, timers, and the result worker. It runs as two Node instances
behind Nginx. Both instances share Redis; local memory contains sockets only.

## Code map

| File | Responsibility |
| --- | --- |
| `gameserver.js` | Service wiring, player controls, bots, deadlines and PostgreSQL results |
| `moves.js` | Validate a move, calculate its clock and position, atomically commit it, process one consumed premove |
| `results.js` | Durable terminal-result queue, PostgreSQL transactions, ratings and recovery |
| `chess.js` | Replay UCI history to FEN, distinguish checkmate/stalemate, count material |
| `movegen-pool.js` | Bounded persistent native workers; see `MOVEGEN.md` |
| `restart-game.sh` | Restart instances sequentially and check `/health` |

## Move flow and concurrency

1. The web service authenticates the session during the WebSocket handshake.
   Redis player IDs/session IDs determine White, Black or spectator permissions.
2. `moves.js` reads a fixed list of Redis fields. The arrival timestamp is captured
   before this read, so queue time is not added to the player's think time.
3. It validates against the stored legal moves and reserves preparation with a
   three-second token in Redis. Other instances ignore duplicate preparations;
   abort/flag handlers defer while the claim is live. A crash cannot freeze the
   clock indefinitely because the claim expires. It computes the FEN and asks an
   `mg` worker for the next legal moves. No Redis state changes during preparation.
4. One Lua operation compares the original move history, turn and active state,
   then updates moves, clocks, repetition counts, legal moves and sorted deadlines.
   A stale result cannot resurrect a finished game or overwrite another move.
5. The commit consumes the current opponent premove atomically. If legal, it goes
   through the same handler with zero think time and the correct side's increment.
   Its expected history prevents it being applied after an intervening move.
6. The server broadcasts through `game:<gameid>`. An origin token avoids delivering
   the local publication twice. Local sockets are removed on close.
7. Each terminal transition also adds the game ID to `game:results:pending` in
   the same Lua operation. The result worker leases the entry for 30 seconds,
   notifies viewers, then saves PostgreSQL results and ratings in one transaction.
   A failed attempt keeps its snapshot and queue entry; either instance retries
   when the lease expires. The conditional SQL update prevents duplicate ratings.
   Successful persistence deletes the snapshot and queue entry together.

Each Node instance has a PostgreSQL pool capped at four connections with five-second
connection and statement timeouts. The native
worker pool defaults to one worker per Node instance. WebSocket payloads are
limited to 256 bytes because clients send short control/move messages.

## Redis game hash

The compact field names are also used by the web and engine services. Changing
these names requires coordinated changes across those services.

| Fields | Meaning |
| --- | --- |
| `m`, `i` | Space-separated UCI moves and remaining-clock values for each ply |
| `t`, `j` | Side to move and space-separated legal moves |
| `w`, `b` | Player account IDs or anonymous session IDs |
| `l`, `n` | White/Black remaining milliseconds at the last move |
| `o`, `z` | White/Black increment in milliseconds |
| `q`, `r` | White/Black premove |
| `s` | Last move timestamp in milliseconds |
| `f` | Result code (below) |
| `e`, `k` | Concatenated side/action events and their timestamps |
| `u`, `v` | White/Black draw-offer flags |
| `a`, `c` | White/Black starting rating; `-1` denotes unrated |
| `d`, `g`, `h`, `x` | White/Black rating deviation, then White/Black volatility |
| `bw`, `bb` | Optional bot strength for White/Black |
| `y` | Initial White clock in minutes |
| `position:<placement> <turn> <rights> <ep>` | Repetition count; EP included only if a legal EP capture exists |
| `pendingMove`, `pendingUntil` | Token and expiry of move preparation |
| Numeric fields | Halfmove-indexed engine analysis |

Result codes: `0` active, `1` checkmate, `2` stalemate, `3` bare kings,
`4` repetition, `5` fifty-move rule, `6` flag, `7` resignation,
`8` agreed draw, `9` aborted.

`game:timeouts:abort` and `game:timeouts:finish` are sorted sets of game IDs scored
by deadline milliseconds. Each process polls every 250 ms. Lua removes a bounded
batch once across all instances; timeout handlers recheck the actual game state.
`game:bot:pending:<id>` is a token-valued expiring lock for one engine request.

## HTTP and WebSocket protocol

`GET /health` checks process readiness. Internal POST endpoints require the shared
game-server token and an allowed peer IP supplied by Nginx:

| Route | Action |
| --- | --- |
| `/ng` | Initialize a new game; rejects an existing Redis game instead of resetting it |
| `/game` | Check whether game state exists |
| `/cg` | Save engine analysis only while the game remains active |
| `/ag` | Claim a cheat abort and broadcast it to all instances |

WebSockets use `/game/<9-character id>` or `/ping`. Clients send `s` to subscribe,
`m<UCI>` for a move, `p<UCI>`/`p` to set/clear premoves, `e1` to resign,
`e2` to offer/accept a draw, `0` for heartbeat response and `b` for RTT response.
The server sends `z<side>` and initial state fields, then
`m:<move>:<side>:<clock>:<ply>:<timestamp>[:<result>]` for committed moves.
Terminal controls use `e:<action>:<side>:<timestamp>:<result>`, flags use
`t:<side>:0:6`, and rating changes use `d:<white delta>:<black delta>`.

## Remaining work found during review

- **Material rules:** automatic material draws currently cover bare kings only;
  flag adjudication uses the opponent's piece count. Full dead-position and mating
  possibility rules need a separately reviewed chess-rules change.
- **Concurrent rating periods:** separate finished games involving the same users
  may update deviations from older starting snapshots. Rating-period policy
  needs a dedicated review. User rows are locked in ID order
  to avoid reversed-color deadlocks.
- **Long histories:** FEN replay still scales with the number of moves. Persisting
  the current position would allow incremental updates, but requires coordinated
  initialization/recovery changes.

Repetition counters use the corrected keys for newly created games. Games already
running during this deployment retain their old counters; earlier occurrences
under the old format are not migrated.

## Result queue operations

The worker polls once per second, up to four due jobs per instance per poll.
Immediate terminal handlers attempt the same lease so the common path does not
wait for polling. A Redis lease survives Node crashes; retries require no new
systemd service or schema migration. Redis durability still depends on its
configured persistence, as does the active game state.

Inspect backlog with `redis-cli ZCARD game:results:pending` and due jobs with
`ZRANGEBYSCORE game:results:pending -inf <current-ms>`. Do not delete queue entries
or terminal hashes to clear a database error: fix the database and allow retries.
