# Starting games and adding regions

## Play paths

Easy Game calls `/easy/start` once with a bot, human color preference, rated flag
and time control. It shares challenge creation and seat claiming with the lobby.
Null bot rating bounds mean unbounded. Repeated starts for the same bot, session,
time control and mode resume the existing unfinished game.

Lobby joining claims the empty seat with a conditional SQL update. The same SQL
transaction writes an immutable initialization job. Web instances lease these
jobs, call the selected game server, and retry temporary failures. The game
server recognizes identical initialization requests without resetting clocks,
moves or timeout schedules. A seat stays reserved during recovery.

`/matchmaking/find` requires a signed-in account. It joins an open rated game
with the same clock and at most 500 rating points difference, choosing the
closest rating first; otherwise it creates a waiting rated challenge. Allocation
is serialized per clock through shared web Redis. The waiting browser polls and
uses the lobby's existing status/SSE notifications. Cancel closes an unclaimed
challenge. Existing rated games are resumed. This is a challenge-based queue;
open challenges persist when their browser leaves, just like manual challenges.

## Latency and placement

The browser discovers region probe URLs through `/game-servers`. On page load,
every minute while visible, and before play requests, it connects to `/ping` on
each enabled region. The server sends `a`, receives the immediate `b`, measures
RTT itself and stores it in `game_server_latency` keyed by session and region.
Browser-supplied latency numbers are never accepted. Player-initiated delay of
a reply is still possible; RTT probes are placement hints, not anti-cheat proof.

Only measurements from the last two minutes count. For human players the score
in milliseconds is `max(pingA, pingB) + abs(pingA - pingB)`. This penalizes both
slow play and an unfair difference; it does not artificially delay either player.
Bot games minimize the human's ping. Regions with complete measurements rank
before regions with missing measurements. Missing measurements fall back to
configuration order. Each placement checks `/health`; unavailable regions are
excluded. The selected region is stored in `games.gameserver` and the immutable
start job. Recovery never migrates a possibly running game to another region.

One VPS cannot improve geographic distance or guarantee equal ping. More regions
provide additional choices; they do not guarantee equal routes or latency.

## Rollout

1. Apply `database/game-server-latency.sql` to the shared PostgreSQL database.
   It is also included in the existing `database/updates.sql` deployment path.
   Both the latency table and durable start-job table are required.
2. Deploy/restart the game service first, enabling regional probes and idempotent
   initialization. Then deploy/restart web instances with the updated frontend.
3. The existing single server is inferred from `game.serverName` and
   `engine.gameHost` if `web.gameServers` is absent. Explicit configuration:

   ```json
   {
     "web": {
       "gameServers": [
         { "id": "ws0", "host": "ws0.chessil.com", "enabled": true },
         { "id": "ws1", "host": "ws1.chessil.com", "enabled": true }
       ]
     }
   }
   ```

4. For each regional VPS, provision DNS/TLS and the existing game systemd/Nginx
   setup, set its distinct `game.serverName`, and expose `/health`, `/ping` and
   `/game/*`. Update the Nginx example's ws0 hostname/certificate paths. Internal
   `/ng` uses the existing shared token and peer-IP checks; retain those controls.
5. Give each region its own local game Redis, shared by the Node instances on
   that VPS. Do not share active-game Redis across regions: clocks, deadlines,
   move state and bot requests must execute beside the selected game server.
   The web instances continue sharing their central session/pubsub Redis. Game
   WebSocket authentication uses the central web authentication service.
6. Use the shared PostgreSQL database for games, users, results and latency.
   Add every region's public IP to `web.websocketServerIps` so central session
   authentication accepts it. Configure `game.myServers` on each region to allow
   the web and engine peers, and the engine's allowed-peer configuration for
   every regional game server. Keep bot/analysis engine connections reachable.
7. Add the region to the web list only after its health and authenticated game
   connection work. `enabled:false` drains new placements and probes; its host
   stays discoverable for existing games. Keep it running until those games end.

Daily maintenance can remove measurements older than one day:
`DELETE FROM game_server_latency WHERE measured_at < NOW() - INTERVAL '1 day';`.
Inspect recovery with `SELECT gameid,next_attempt,lease_until FROM game_start_jobs;`.
If jobs accumulate, restore the assigned server or credentials; do not delete
jobs or reopen claimed seats while their game may exist on a regional server.

## Local checks

`node --test web/tests/*.test.js` checks placement, bot filter bounds, job recovery
and competing workers. The initialization check starts a temporary local Redis
instance and verifies concurrent initialization, changed clocks and mismatched
requests. PostgreSQL integration and a live two-player regional game require a
configured deployment; this repository checkout has no `config.json`.

## Swift practice games

Easy Game now sends `{bot:"swift", difficulty:1..8, color, timecontrol}` to
`/easy/start`; it no longer lists bot accounts or uses `/easy/bots`. The server
chooses a region for the human, atomically stores game metadata and the start
job, and resumes a matching unfinished game on repeated submissions. Built-in
bots occupy an internal `bot:swift:<level>` identity, not a registered account.
Apply `database/built-in-bots.sql`; fields are `bot_program`, `bot_version`,
`bot_difficulty`, `bot_side`. The existing bot-account endpoints are retained for
older clients, but they are not used by the new practice page.
