# Game service

`gameserver.js` owns HTTP/WebSocket wiring, session authentication, bot requests,
Redis broadcasts, timers, and result persistence. It runs as two Node instances
behind Nginx. Both instances share Redis; local memory contains sockets only.

## Code map

| File | Responsibility |
| --- | --- |
| `gameserver.js` | Service wiring, player controls, bots, deadlines and PostgreSQL results |
| `moves.js` | Validate a move, calculate its clock and position, atomically commit it, process one consumed premove |
| `chess.js` | Replay UCI history to FEN, distinguish checkmate/stalemate, count material |
| `movegen-pool.js` | Bounded persistent native workers; see `MOVEGEN.md` |
| `restart-game.sh` | Restart instances sequentially and check `/health` |

## Move flow and concurrency

1. The web service authenticates the session during the WebSocket handshake.
   Redis player IDs/session IDs determine White, Black or spectator permissions.
2. `moves.js` reads a fixed list of Redis fields. The arrival timestamp is captured
   before this read, so queue time is not added to the player's think time.
3. It validates against the stored legal moves, computes the new FEN and asks an
   `mg` worker for the next legal moves. No Redis state changes during preparation.
4. One Lua operation compares the original move history, turn and active state,
   then updates moves, clocks, repetition counts, legal moves and sorted deadlines.
   A stale result cannot resurrect a finished game or overwrite another move.
5. The commit consumes the current opponent premove atomically. If legal, it goes
   through the same handler with zero think time and the correct side's increment.
   Its expected history prevents it being applied after an intervening move.
6. The server broadcasts through `game:<gameid>`. An origin token avoids delivering
   the local publication twice. Local sockets are removed on close.
7. A terminal state is saved to PostgreSQL with both ratings in one transaction.
   The conditional game update makes rating changes idempotent. Redis is deleted
   only after a successful transaction.

Each Node instance has a PostgreSQL pool capped at four connections. The native
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

- **Durable result retries:** PostgreSQL failures retain the terminal Redis hash,
  but there is no durable retry queue/scanner. Results need an outbox so a database
  outage or a crash after claiming a result cannot strand a finished game.
- **Material rules:** automatic material draws currently cover bare kings only;
  flag adjudication uses the opponent's piece count. Full dead-position and mating
  possibility rules need a separately reviewed chess-rules change.
- **Overload near a deadline:** a timeout can claim a flag while a timely move is
  waiting for a worker longer than the 400 ms grace period. Arrival timestamps
  alone do not solve this; pending-move claims need coordination with flagging.
- **Concurrent rating periods:** separate finished games involving the same users
  may update deviations from older starting snapshots. Rating-period policy and
  consistent user-row locking need a dedicated review.
- **Long histories:** FEN replay still scales with the number of moves. Persisting
  the current position would allow incremental updates, but requires coordinated
  initialization/recovery changes.

Repetition counters use the corrected keys for newly created games. Games already
running during this deployment retain their old counters; earlier occurrences
under the old format are not migrated.
