Zero-downtime engine setup (systemd + nginx upstream)

Services
- API: engine/server.js (public HTTP)
- Queue: engine/queue.js (internal)
- Worker: engine/sf.js (internal)

Setup (one time)
1) Install the systemd units:
   sudo cp engine/systemd/chessil-engine-api@.service /etc/systemd/system/
   sudo cp engine/systemd/chessil-engine-queue.service /etc/systemd/system/
   sudo cp engine/systemd/chessil-engine-worker@.service /etc/systemd/system/
   sudo systemctl daemon-reload
2) Start and enable services:
   - Set `ENGINE_WORKER_COUNT` and `ENGINE_API_PORTS` in engine/engine-services.conf
   - Run ./engine/install-engine-service.sh
3) Configure nginx to proxy to both API instances:
   - Generate the upstream with ./engine/generate-nginx-upstream.sh.
   - Copy the upstream from engine/nginx-engine-upstream.conf into your nginx config.
   - Ensure your server block proxies / to http://chessil_engine_api.
   - Reload nginx after changes.

Deployment / restart
- Run: ./engine/restart-engine.sh

Public fair-play summaries
- Apply `database/fair-play.sql` to the shared database before deploying the new API/web code.
- On the database host, run `database/allow-engine.sh <engine IPv4> chessil postgres`
  if the engine's shared PostgreSQL connection is not already allowed. The script
  backs up pg_hba.conf and installs a database/role/IP-specific SSL-only rule.
- Restart API instances one at a time. Stockfish workers and the in-memory queue
  do not need restarting for detector-only changes.
- `RESTART_ENGINE=0` currently disables automatic engine restarts in this repository;
  run the API restarts explicitly when deploying detector changes.
- Inspect private `fairplay:report:<gameid>` and `fairplay:account:<userid>` keys or
  use the authenticated `/fair-play/report` endpoint. Public profiles read only
  the bounded summary in `fair_play_accounts`.
