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
