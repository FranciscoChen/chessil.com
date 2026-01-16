Zero-downtime game setup (systemd + nginx upstream)

Setup (one time)
1) Install the systemd template:
   sudo cp game/systemd/chessil-game@.service /etc/systemd/system/
   sudo systemctl daemon-reload
2) Start and enable both instances:
   sudo systemctl enable --now chessil-game@8081 chessil-game@8082
3) Configure nginx to proxy to both instances:
   - Copy the upstream from game/nginx-game-upstream.conf into your nginx config.
   - Ensure your server block proxies / to http://chessil_game.
   - Reload nginx after changes.

Deployment / restart
- Run: ./game/restart-game.sh
