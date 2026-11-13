# Standalone analysis board

Explore links to `/en/analysis`, `/es/analysis`, or `/zh/analysis`. No game or
account is required. `ui/study.js` composes the shared native board, history rail,
evaluations, and compact Engine/Book cards. Desktop keeps a bounded side column;
mobile keeps one scrollable history line above the board. Navigation buttons stay
outside that scroll area. `ChessilHistoryFocus` centers each new displayed move
once and leaves subsequent manual scrolling alone.

`src/variations.js` owns the independent tree model. Ordered children define the
main line; selecting a node never changes this order. Each node stores FEN, SAN,
parent and children. Defaults bound the complete tree to 2,048 nodes (including
root), 12 alternatives per position, eight nested variations, and 1,024 plies.
Rejected additions leave existing branches intact. Deleting removes the complete
subtree. Promotion and sibling reordering validate the resulting nesting before
committing. Reset starts a new tree; Flip changes orientation and coordinate edges.

`src/study.js` adapts this model to the existing board/history interface:
`boardView`, `movesList`, `uci`, `a1ti`, and `gamereplay`. `uci` is the selected
continuation. Desktop displays inline variation groups; the branch icon opens the
same tree renderer in a dialog on either viewport. Branch controls select, promote,
reorder, or delete. The mobile rail always stays flat and compact.

`ChessilStudy.play`, `position`, and `positions` describe the selected variation.
For imported games, `source()` returns copies of the immutable recorded moves and
positions; `selectOriginal(ply)` returns to that record even after local branch
editing. Imported nodes can be restored after deletion, subject to tree capacity.
Game review annotations and background searches use the source, not the variation.

The engine starts automatically, evaluates the selected position, and feeds the
book. Rapid navigation coalesces to the latest pending position; stale results
cannot replace a newer view. Searches share one serial local worker. See
`ANALYSIS.md` for ordering, optional plan/threat arrows, and resource bounds.

A finished game loads read-only with `?game=ID`; `&review=1` enables backward
autoplay. Both import routes start the engine and review all recorded positions.
Unfinished games are rejected. Neither mode creates a game or writes game data.
The variation tree lasts for the current page visit; saved studies and custom FEN
imports remain separate features.

Build with `node web/scripts/build-board.js`. Tests include
`variation-model.test.js`, `study-browser.test.js`, and the real-WASM engine/review
browser suites. Shared pointer/compositor regression checks remain required.
