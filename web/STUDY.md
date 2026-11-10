# Standalone analysis board

Explore links to `/en/analysis`, `/es/analysis`, or `/zh/analysis`. No game or account
is required. `ui/study.js` renders the shared history rail, native board and
coordinates. `src/study.css` composes the existing game layout without player
cards or clocks. Mobile keeps history and evaluations above the board. There is no Explore
preface or header row above the workspace. The named engine card expands its
shared engine options in place without opening a dialog or changing pages.

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
become local study variations. Both compact tool cards are visible by default;
the book loads automatically and the engine starts only when requested. Free analysis needs no game IDs or game API calls. A finished game can be loaded
read-only with `?game=ID`; `&review=1` automatically starts the backward game
review after import. Metadata and moves come from the existing game read APIs.
Neither mode creates a game, connects to a game server, or writes game data.
The tree lasts for the current page visit; saved studies and position imports
are separate future features.

Build with `node web/scripts/build-board.js`. Verify with
`node --test web/tests/study-browser.test.js`; existing board and review browser
suites cover the shared renderer, compositor/pointer behavior and review tools.
