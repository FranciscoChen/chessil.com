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

Live-game contract
- A matched game has `started` set and numeric `state=0`; terminal states are 1–9.
- The web API provides display metadata separately from state, player side, and
  server name. Server names are canonical (`ws0`), not a suffix to prefix again.
- Redis is live game state. WebSockets authenticate through the web service and
  subscribe as the white player, black player, or a read-only spectator.
- Bot strength is passed through `/ng` as optional `bw`/`bb` headers. Bot requests
  use unique queue IDs ending in the side; background analysis has a separate ID.
- Completion saves the game and rating changes in one database transaction.
- `RESTART_GAME=1` enables game restarts after push deployments. Each instance
  must pass its local `/health` check before the next instance restarts.
