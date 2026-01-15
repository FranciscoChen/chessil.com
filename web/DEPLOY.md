Zero-downtime web setup (systemd + nginx upstream)

Setup (one time)
1) Install the systemd template:
   sudo cp web/systemd/chessil-web@.service /etc/systemd/system/
   sudo systemctl daemon-reload
2) Start and enable both instances:
   sudo systemctl enable --now chessil-web@8081 chessil-web@8082
3) Configure nginx to proxy to both instances:
   - Copy the upstream from web/nginx-web-upstream.conf into your nginx config.
   - Ensure your server block proxies / to http://chessil_web.
   - Reload nginx after changes.

Deployment / restart
- Run: ./web/restart-web.sh
