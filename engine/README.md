# Stockfish workers

The API (`server.js`) submits jobs to `queue.js`; each `sf.js` worker owns one
persistent Stockfish process and handles one job at a time. The queue prioritizes
bot play with `/lpush` and background analysis with `/rpush`.

## Code map

| File | Responsibility |
| --- | --- |
| `sf.js` | Queue polling, input validation, result delivery, retries and shutdown |
| `stockfish.js` | Engine process, UCI handshake/options, readiness barriers and search lifecycle |
| `uci.js` | Pure line parsers and bounded per-search result summaries |
| `queue.js` | Priority queue and outstanding HTTP listeners |

The executable is `engine/stockfish`, resolved relative to the script rather than
selected by directory ordering. `STOCKFISH_BIN` can select another executable.
Workers use `QUEUE_HOST` and `QUEUE_PORT`, defaulting to `127.0.0.1:8092`.
This change does not rebuild Stockfish.

## Output handling

One permanent `readline` reader handles stdout. A chunk can contain half a line,
several lines, or any combination; only complete lines reach the parser. There
is no accumulated search transcript and no `execFile` output-buffer limit.
Stderr retains only its final 4096 characters for process-failure diagnostics.

A search summary keeps the latest useful score for each MultiPV slot, up to 256
slots and 256 PV plies per slot. Non-score progress and `info string` lines cannot
erase the last evaluation. Higher depths take precedence; at equal depth an exact
score takes precedence over a bound. If the chosen move matches a reported PV,
that PV supplies the score (useful for limited-strength searches). Otherwise the
principal line supplies the evaluation; its `pv[0]` identifies the evaluated move.

Results include:

```json
{
  "uuidhm": "gameid123-4-w",
  "bestmove": "g1f3",
  "eval": "cp 26",
  "ponder": "b8c6",
  "analysis": {
    "multipv": 1,
    "depth": 16,
    "seldepth": 22,
    "score": { "type": "cp", "value": 26 },
    "nodes": 123456,
    "nps": 789000,
    "time": 156,
    "hashfull": 12,
    "tbhits": 0,
    "pv": ["g1f3", "b8c6"]
  }
}
```

`score.type` is `cp` or `mate`; `score.bound` is `lowerbound` or `upperbound`
when present. Scores use Stockfish's side-to-move perspective. Optional `wdl`
contains the three reported WDL values. Metrics/PV/ponder may be absent.
`bestmove (none)` and `bestmove 0000` become `bestmove: null`. An absent score
becomes `eval: null`; a playable move without any score is an explicit error,
never a fabricated zero evaluation. Background cheat analysis skips bound scores.

Workers report results to `/set` using UUID/move/eval headers plus optional JSON
`analysis`, `ponder`, or `error` headers. The queue constructs responses with
`JSON.stringify`. Errors reach the play API as HTTP 502 and are not recorded as
cheat evaluations.

## Engine lifecycle

Startup sends `uci` immediately, waits for `uciok`, configures one thread and
64 MiB hash, then waits for `readyok`. Options are read from the engine itself;
numeric settings, including Elo, are clamped to its advertised ranges. Requests
from a different game send `ucinewgame`. Each search waits for readiness after
setting its options.

The queue payload is:

`uuidhm wtime btime winc binc mtime elo syzygy [UCI moves...]`

Clocks, increments and `mtime` use milliseconds. Elo zero means full strength.
The worker supplies an explicit `movetime` bounded by `mtime` and the active
clock minus 20 ms. A UCI handshake has a ten-second deadline. Search supervision
sends `stop` after the budget plus two seconds; another second without a reply
kills the engine. An exit, bad result or pipe failure rejects the current search.
The worker publishes the error and initializes a new engine before taking work.

Queue HTTP requests have a three-second inactivity timeout and bounded response
size. Result publication retries before taking another job. SIGTERM stops taking
new jobs, finishes and publishes the current search, then exits. A ten-second
shutdown deadline bounds a failed drain. See `DEPLOY.md` for service commands.

## Queue limits that still need separate work

The queue and HTTP listeners are in memory. Restarting the queue drops pending
requests, and a worker crash after popping a job has no lease-based recovery.
Duplicate UUIDs can overwrite an existing listener. Those are queue ownership
issues; this worker refactor does not make the queue durable.
