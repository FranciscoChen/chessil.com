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
- scripts/register-user.sh
  Registers a normal user via /register and stores the new session cookie.
- scripts/sync-bot-client.sh
  RSync helper to keep a copied bot-client folder in sync.

State files (auto-created)
- state/admin-session.txt
- state/bot-session.txt
- state/bot-user.json
- state/game.json
- state/register-session.txt
- state/register-user.json

Notes
- /play is the engine service and requires a valid engineAuthToken and an allowed engineXRealIp from the engine server configuration.
- If you want a different user role, set bot.role in config.json (defaults to 3).
- register-user requires a strong password that passes the server strength check (zxcvbn score 4).
- wsPingUrl should point at the game server ping endpoint, e.g. wss://ws0.chessil.com/ping.
- sync-bot-client usage: set SRC and DEST paths in the script, run manually or via cron.
