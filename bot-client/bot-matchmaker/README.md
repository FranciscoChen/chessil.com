Bot Matchmaker (Server-side bots)

Purpose
- Creates bot vs bot Easy games on a schedule.
- Uses server-side bot moves (ws0 calls the engine).

Setup
1) Copy `bot-client/config.example.json` to `bot-client/config.json` and fill in `matchmaker` values.
2) Run `npm install` in this folder.
3) Run `node matchmaker.js` (single run + optional loop via `intervalSec`).

Config notes
- `bots` must include `id`, `username`, `password`, and `uci_elo`.
- `maxConcurrentGames` is enforced using the database (games with `state = 0`).
- `maxStartsPerRun` limits how many new games are created per run.
- `intervalSec` enables looping; set to 0 for single-run (use cron).

Requirements
- The web server must accept the matchmaker host IP (maintenance + auth rate limits).
- Engine allowlist must allow ws0 to call `/play`.
