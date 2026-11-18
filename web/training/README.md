# Learning workspaces

`/training` is an editorial hub. Tutorial, endgames, tactics, strategy and opening
practice have separate routes and the shared game-sized native board. The same
library rail moves into a modal on mobile; it is never rendered twice.

## Ownership

- `courses.js`, `course-endgames.js`, `course-strategy.js`: playable concept seeds,
  objectives and original coaching. Legacy `curriculum.js` arrays/IDs remain for
  saved progress and `/drills`. The API discovers new IDs recursively.
- `ui/learning.js`, `src/learning.css`: hub and dense workspace layout.
- `src/learning.js`: immutable FEN/history, lesson state, acknowledgements and
  objective gating. `src/board.js` still owns all input, dragging and animation.
- `src/learning-navigation.js`: responsive library behavior shared with tactics.
- `src/local-engine.js`: one serial browser Stockfish worker per workspace,
  configured through the global engine/network/hash/thread preferences. Training
  replies and assistance request full strength, MultiPV 1, 700 ms. Searches include
  the custom starting FEN and move history, or actual startpos history for the
  AlphaZero game positions. No engine-server work is requested.
- `src/chess-outcome.js`: local terminal rules. Server games remain authoritative.
  The bare-kings coordinate exercise intentionally bypasses dead-material endings.
- `src/results.js`: common outcome dialog for local lessons, puzzles and games.
  A failed lesson cannot enable Continue. Rule demonstrations use Lesson complete,
  rather than incorrectly claiming a game was won.

A generation invalidates asynchronous work when restarting/changing lessons or
changing engine configuration. Workers close on navigation. Acknowledgements
lock board input, while allowing settings and library navigation. Guidance uses
`ChessilHighlight` with a board boundary and the board's existing CSS pulse/ripple;
routine hints use square highlights. Course notes live in `course-coaching.js` and can be tied to a specific move sequence.
No polling/animation loop is added to pointer movement.

Opening practice permits any legal move, either side, and 1–8 complete moves.
The optional tools reuse the shared policy book and engine; opening rounds restart
with the shared CSS countdown. Pause stops that countdown. Tactics retain their
validated dataset replies, and advanced rule demonstrations retain their scripted
responses, since changing those replies would change the exercise being taught.

## Content validation

All starting positions have two legal kings, no pre-existing check against the
nonmoving side, and at least one legal move. Scripted demonstrations and actual
game histories are replayed by the shared rules in `learning-data.test.js`.

The Lucena and Philidor seeds were transcribed from the supplied Müller/Lamprecht
PDF (diagrams 6.35 and 6.33). Their win/draw outcomes, and the key-squares pawn
ending, were independently checked against the seven-piece Syzygy API. Other
Capablanca/Müller teaching positions are explicitly identified as original practice
positions. Strategy histories were transcribed and legally replayed from the
supplied Game Changer PDF: AlphaZero–Stockfish 8, London 2018, Carlsbad, Python
squeeze and king-attack examples. Explanations are original, not copied book text.
The PDFs are not application assets and are not included in the build.

Curated tactics use Lichess puzzle popularity >=85, at least 100 plays, at most
seven plies, and level-appropriate rating ceilings. Theme/level/exclusion filters
are parameterized; random primary-key seeks avoid sorting the full puzzle corpus.

## Rematches

`game-rematch.js` verifies participation in a finished game and derives the
recipient from that row. Account and guest invitations use distinct Redis keys.
The challenge is reserved before publishing its open lease, hidden from public
queues, and join authorization checks the reservation. Reciprocal requests reuse
one challenge under a token-checked Redis lease. Normal game initialization,
latency allocation and GitHub-hook deployment remain unchanged.

## Checks

Run `node web/scripts/build-board.js` after source changes. Commit both readable
sources and generated production assets. Relevant integration checks:

```
node --test web/tests/learning-data.test.js web/tests/learning-browser.test.js
node --test web/tests/game-rematch.test.js web/tests/training-api.test.js
node --test web/tests/board-browser.test.js web/tests/puzzles-browser.test.js
```

The board suite includes compositor repaint and synchronous drag checks under
6x CPU throttling. The learning suite uses the real browser WASM engine, including
queen mate, Black-side opening rounds, coordinate recall, castling, en passant,
repetition, stalemate and mobile library behavior.
