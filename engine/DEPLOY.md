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
   sudo systemctl enable --now chessil-engine-queue chessil-engine-worker@1 chessil-engine-worker@2 chessil-engine-api@8081 chessil-engine-api@8082
3) Configure nginx to proxy to both API instances:
   - Copy the upstream from engine/nginx-engine-upstream.conf into your nginx config.
   - Ensure your server block proxies / to http://chessil_engine_api.
   - Reload nginx after changes.

Deployment / restart
- Run: ./engine/restart-engine.sh
