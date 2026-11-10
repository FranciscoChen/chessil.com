# Deployment

Production application changes must be deployed by pushing to GitHub and letting
this repository's existing deployment hook perform the rollout.

Do not copy application files or commits directly into production checkouts, fetch
from the workspace into production, merge/reset production checkouts manually,
or manually restart services as a substitute deployment path.

If GitHub rejects a push or the deployment hook fails, stop the deployment and
report the failure. Do not bypass the hook. Read-only production diagnostics and
verification remain allowed. Recovery must preserve the hook-only deployment
path unless the user explicitly authorizes a specific exception.

# Chessboard

Use the shared native board implementation in `web/src/board.js`. Do not add
Chessground as a dependency, bundle its source, or replace this renderer with it.
Keep dragging independent of move animations and preserve the compositor
regression checks when changing pointer handling or board styles.

# UI density

Treat every operational page with an interactive chessboard as a dense workspace:
game, analysis, training, drills, puzzles, and any future board workspace. This
applies on desktop as well as mobile. Prioritize the board, move history,
controls, clocks, and information needed for the current task. Space is functional,
not an invitation to add decoration or explanatory copy.

Omit obvious titles, repeated instructions, redundant labels, promotional prose,
and engine/build metadata from these workspaces. Keep useful lesson titles,
position-specific guidance, actionable errors, and essential controls. Prefer
compact shared components, icon controls with accessible names, and plain move
lines over padded cards for individual lines.

Landing and informational pages can keep their fuller editorial presentation.
Do not apply operational density rules indiscriminately sitewide. A decorative
chessboard illustration on the landing page does not make it a board workspace.

Evaluation, WDL, engine, and opening-book tools belong on dedicated analysis
pages, not game pages. Analysis pages show separate compact Engine and Book cards
by default, without switches between them or obvious heading/help text.

Played-game analysis defaults to the authenticated/session player's color, with
that player's pieces at the bottom and coordinates oriented accordingly. Review
annotations, evaluation and WDL use the same perspective. Respect manual overrides;
when the viewer is a spectator, default to both sides.
