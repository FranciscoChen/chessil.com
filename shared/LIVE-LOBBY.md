# Live lobby

PostgreSQL owns game history and results. Each region's local Redis owns running
positions, clocks and deadlines. The database host's shared Redis is an expiring
index of that state, not a replacement game engine or result store.

Regional services publish public snapshots every three seconds. Snapshots and
region heartbeats expire after 20 seconds. Publication atomically removes games
that have ended; the durable result worker also removes terminal games immediately,
even if persisting their result needs a retry. Startup recovers the active set and
missing deadlines from regional hashes without resetting existing deadlines.

Waiting challenges have a 90-second lease. The creator's lobby renews it every 20
seconds, after an ownership check. An expired lease cannot be renewed. Lists and
join actions check the lease; a background sweep marks abandoned, unclaimed
challenges cancelled in PostgreSQL. Claimed games are excluded from this cleanup.
Legacy started records without a regional snapshot are excluded from live lists;
their metadata can show “Game no longer available”. This is a display state, not
an invented result or rating update. A 30-second startup grace avoids confusing a
new game with a lost game. An unreachable region remains pending rather than
being declared finished.

Browsers connect to `/lobby/events` using EventSource (SSE). Redis Pub/Sub only
invalidates the browser's list; clients then fetch `/lobby/list`. Reconnects and a
10-second refresh recover missed events and expired leases. Browsers never receive
Redis credentials. Existing game WebSockets still carry moves and game events.
Live clocks are projected from the regional snapshot and corrected on refresh.

Configure `shared.liveRedis` in the private config on the web, notification and
regional game hosts. Use TLS, authentication, and a firewall restricted to those
hosts. `database/install-live-redis.py` bootstraps the dedicated TLS service after
Redis and OpenSSL are installed: pass a JSON object on stdin with `host`, a random
alphanumeric `password` of at least 40 characters, and `allowedSources`. Its output
contains the public CA certificate to put in `shared.liveRedis.tls.ca`. The service
stores no durable history; after restart regional publishers rebuild the live
index, while outstanding challenge leases are intentionally lost. The ACL only
allows the lobby key/channel namespace. Add each new region to the firewall and
copy the shared connection config before starting its game services. Keep the
independent regional Redis private as before.

Run `node --test game/tests/live-games.test.js web/tests/lobby-live.test.js` for
registry expiry, ordering, recovery, ownership, Pub/Sub and stale-game regressions.
