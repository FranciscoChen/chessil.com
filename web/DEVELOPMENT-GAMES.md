# Public development games

The web workers schedule one unrated Stockfish-dev versus ChessiL-Hybrid match on the first enabled game region. PostgreSQL serializes allocation and retains the game and start job together. The regional game server owns the clocks, legal moves, spectators, and result. Each side uses the corresponding existing engine worker at full strength after the first eight book plies. The match ends by the normal game rules or clock.

In the web host configuration, `web.developmentTimeControl` uses **seconds + increment in seconds**. The default is `10+0.1`. Set `60+0.6` for LTC. A new setting takes effect at the next opening pair. `web.developmentGames: false` disables creation of successors. Configuration is read at web service startup.

The archived entry records the game ID, sides, opening prefix, pair and leg, policy hash, clocks, UCI history, result and executable hashes used. The public archive at `/database` links to spectators' game pages and individual PGNs. `GET /api/archive` lists finished games newest first. Pass its `next` cursor as `before` for the next page. Download a game at `/api/archive/<gameid>.pgn`. Abandoned games remain in the database and are excluded from the public results.

`development-openings.txt` contains 4,096 distinct eight-ply positions sampled from the project BT4 book. Each opening plays twice with colors reversed before advancing. The pool cycles after 8,192 games. To regenerate it from the repository root with python-chess installed:

```sh
python3 web/scripts/development-openings.py bt4_it332_policy.bin Stockfish-policy-search Stockfish-policy-depthwork > web/development-openings.txt
```

The generator excludes matching eight-ply positions from the supplied match CSV directories, including transpositions. Preserve the opening prefix and paired game identifiers when building a training split. Games played on the live shared infrastructure are development data. Controlled strength tests use the archived control binary and their own held-out opening pool.

## Research archive statistics

The archive lists finished STC show games. Its W/D/L totals use the hybrid's
perspective across the series. The game list can show either engine's outcome.
Wins and losses on time are part of the official game result and are counted
separately in the dashboard.

The paired monitor uses complete color-reversed openings from the pinned engine
builds and V5 policy after the Syzygy rollout. Its logistic Elo hypotheses are
0 and +5 with reference error rates of 5% in either direction. The likelihood
ratio follows the [Fishtest logistic model](https://github.com/official-stockfish/fishtest/blob/master/server/fishtest/stats/LLRcalc.py).
The separate Elo interval and likelihood of superiority use the observed
variance across opening pairs. The monitor is descriptive and does not stop the
show.

The engine workers use the exact executables from the 1,600-game frozen V5
match, Stockfish dev `ff3a6c50` and the depth-6 hybrid, with policy batch 6257.
The deployment hook verifies the executable hashes before restarting workers.
The live show uses its own clocks, hash allocation, opening book and tablebases.
