# Runbook

## Services
- web: HTTP frontend, sessions, auth, static assets.
- game: WebSocket game service and clocks.
- engine: Stockfish API + cheat detection.
- engine-queue: internal analysis queue.
- engine-worker: Stockfish worker process.
- notify: WebSocket notifications service (Redis pub/sub + active games snapshot).

## Logs and counters
- All services emit JSON lines to stdout.
- Each log entry includes: `ts`, `level`, `service`, `event`.
- Counter snapshots are emitted every 60 seconds as `event=counters` with a `counters` object.
- Auth events (web) are logged as `event=auth_*` with ip/user-agent/session/username when available.

## Health checks
- engine-queue: `curl -s http://127.0.0.1:8092/health`
- web/game/engine: rely on process uptime + nginx proxy checks.
- notify: rely on process uptime + nginx proxy checks.

## Notify service setup
- Config: ensure `config.notify.*` is set and that the notify host IP is present in `config.web.websocketServerIps`.
- Nginx: proxy `/notify` to the notify port with WebSocket upgrade headers (see `notify/README.md`).
- Systemd:
  - `sudo cp notify/systemd/chessil-notify@.service /etc/systemd/system/`
  - `sudo systemctl daemon-reload`
  - `sudo systemctl enable --now chessil-notify@8090`
- Operation: publishes notifications to Redis channels `notify:global` and `notify:user:<userid>`.
- Helper: `notify/scripts/install-notify.sh 8090` installs and enables the unit.

## Common issues
- Many `auth_rate_limit` logs: raise nginx/app limits or investigate abusive IPs.
- `queue_request_error` or `queue_set_error` in engine-worker: verify queue is reachable on `127.0.0.1:8092`.
- `stockfish_restart` spikes: check Stockfish binary, CPU, or system limits.
- `server_error` in any service: inspect preceding logs for stack trace.

## Quick actions
- Tail logs: `journalctl -u <service-name> -f` or process stdout in your supervisor.
- Restart a service with your supervisor (systemd, tmux, or similar).
- Verify Redis/Postgres reachability if auth or game requests fail.

## Nginx checks
- Confirm `x-real-ip` is set by nginx and not forwarded from clients.
- Keep auth endpoint rate limits enabled (see `nginx-config-update`).
