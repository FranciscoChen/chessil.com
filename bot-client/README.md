Bot Client (Easy Games)

This folder is meant to be copied as a standalone bot client. Each copy keeps its own config and state.

Setup
- Copy `config.example.json` to `config.json` and fill in the values.
- Run `npm install` inside this folder to install the WebSocket dependency.

Scripts
- `scripts/admin-create-bot.sh` logs in with the admin account and creates the bot user.
- `scripts/bot-login.sh` logs in as the bot user and stores the session cookie.
- `scripts/easy-start.sh` starts a new Easy game against a server bot and stores the `gameid`.
- `scripts/play-game.sh` connects to the game server, calls `/play` for each move, and plays the game.
- `scripts/register-user.sh` registers a normal user via `/register` and stores the new session cookie.
- `scripts/sync-bot-client.sh` rsync helper to keep a copied bot-client folder in sync.

State Files (auto-created)
- `state/admin-session.txt`
- `state/bot-session.txt`
- `state/bot-user.json`
- `state/game.json`
- `state/register-session.txt`
- `state/register-user.json`

Notes
- `/play` is the engine service and requires a valid `engineAuthToken` and an allowed `engineXRealIp` from the engine server configuration.
- If you want a different user role, set `bot.role` in `config.json` (defaults to 1).
- `register-user` requires a strong password that passes the server strength check (zxcvbn score 4).
- `wsPingUrl` should point at the game server ping endpoint, e.g. `wss://ws0.chessil.com/ping`.
- `sync-bot-client` usage: set `SRC` and `DEST` paths in the script, run manually or via cron.
