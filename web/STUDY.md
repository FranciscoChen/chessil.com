# Standalone analysis board

Explore links to `/en/analysis`, `/es/analysis`, or `/zh/analysis`. No game or account
is required. `ui/study.js` renders the shared history rail, native board and
coordinates. `src/study.css` composes the existing game layout without player
cards or clocks. Mobile keeps history and evaluations above the board.

`src/study.js` owns an in-memory variation tree. Each node stores its FEN, SAN,
parent and children; revisiting an earlier position and choosing another move
preserves the previous continuation. Continuation buttons appear when multiple
branches exist. Reset starts a new tree; Flip only changes board orientation.
The adapter exposes the small board/history interface already used by game.js
(`boardView`, `movesList`, `uci`, `a1ti`, `gamereplay`) plus `ChessilStudy.play` and
`ChessilStudy.positions`, so `src/analysis.js` supplies the same engine, book,
evaluation, settings and Start/Stop controls as game review.

In study mode, the engine evaluates the selected position rather than scanning
backward for mistakes. Rapid changes coalesce into the most recent pending
position; stale scores cannot replace a newer view. Book and engine-line moves
become local study variations. Neither tool starts until requested. No game IDs,
game API calls, game-server connection, database writes or game creation occur.
The tree lasts for the current page visit; saved studies and position imports
are separate future features.

Build with `node web/scripts/build-board.js`. Verify with
`node --test web/tests/study-browser.test.js`; existing board and review browser
suites cover the shared renderer, compositor/pointer behavior and review tools.
