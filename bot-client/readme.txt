Bot Client (Easy Games)

Purpose
- This folder is meant to be copied as a standalone bot client. Each copy keeps its own config and state.

Setup
1) Copy config.example.json to config.json and fill in the values.
2) Run: npm install

Scripts
- scripts/admin-create-bot.sh
  Logs in with the admin account and creates the bot user (role 3).
- scripts/bot-login.sh
  Logs in as the bot user and stores the session cookie.
- scripts/easy-start.sh
  Starts a new Easy game against a server bot and stores the gameid.
- scripts/play-game.sh
  Connects to the game server, calls /play for each move, and plays the game.

State files (auto-created)
- state/admin-session.txt
- state/bot-session.txt
- state/bot-user.json
- state/game.json

Notes
- /play is the engine service and requires a valid engineAuthToken and an allowed engineXRealIp from the engine server configuration.
- If you want a different user role, set bot.role in config.json (defaults to 3).
