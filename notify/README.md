# Notifications service

WebSocket service that authenticates logged-in users, subscribes to Redis pub/sub, and delivers notifications.

## Config
- `config.notify.domainName` (default: `config.web.domainName`)
- `config.notify.port` (default: `8090`)
- `config.notify.wsPath` (default: `/notify`)
- `config.notify.sendActiveGamesOnConnect` (default: `true`)
- `config.notify.activeGamesLimit` (default: `10`)

Add the notify host IP to `config.web.websocketServerIps` so `/websocket` auth accepts the service.

## Channels
- `notify:global` (broadcast to all connected users)
- `notify:user:<userid>` (per-user notifications)
- `notify:session:<sessionid>` (per-session notifications, including anonymous users)

## Payloads
Messages are JSON and forwarded as-is to the client. If a message is not JSON, it is wrapped as:
```
{ "type": "message", "channel": "...", "message": "..." }
```

## Local run
```
cd notify
npm install
PORT=8090 node server.js
```

## Systemd
Copy the unit file and enable a port instance:
```
sudo cp notify/systemd/chessil-notify@.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now chessil-notify@8090
```

## Nginx
Example mapping (single instance; snippet at `notify/nginx/notify-location.conf`):
```
location /notify {
  proxy_pass http://127.0.0.1:8090;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  include proxy_params;
}
```

For zero-downtime restarts, use the upstream snippet in `notify/nginx/notify-upstream.conf`
and run two instances (8090 + 8091).

## Helper install script
Single instance:
```
notify/scripts/install-notify.sh 8090
```

Zero-downtime (two instances):
```
notify/scripts/install-notify.sh 8090 8091
```
