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

State Files (auto-created)
- `state/admin-session.txt`
- `state/bot-session.txt`
- `state/bot-user.json`
- `state/game.json`

Notes
- `/play` is the engine service and requires a valid `engineAuthToken` and an allowed `engineXRealIp` from the engine server configuration.
- If you want a different user role, set `bot.role` in `config.json` (defaults to 1).
