# Board frontend

## Source and production files

The readable, commented source is in `web/src/`. Browsers receive generated,
comment-free `game.min.js`, `preferences.min.js`, `board.min.css` and
`preferences.min.css`. The previous `web/js/game.js` and `web/css/game.css` were
removed so there is one implementation to maintain.

Run `node web/scripts/build-board.js` after editing source or the shared
preference schema. It uses Terser from the development environment; generated
files are committed, so production needs neither Terser nor a build step.
Do not edit generated files directly. JavaScript global names used by
`gamepage.js` are preserved; private locals are mangled. The renderer's existing
content hashes invalidate browser caches after deployment.

| File | Responsibility |
| --- | --- |
| `src/chess-rules.js` | Pure browser legal moves, FEN transitions and notation |
| `src/game.js` | WebSocket protocol, history, clocks, replay, server-confirmed moves |
| `src/board.js` | Piece elements, overlays, pointer/keyboard gestures and promotion UI |
| `src/board.css` | Geometry, square overlays, board palettes and board-only layers |
| `src/classic-pieces.css` | Existing game SVGs, retained as Classic |
| `src/sculpted-pieces.css` | Landing-page vector set, retained as Sculpted |
| `src/preferences.js` | Settings UI, persistence, account/guest selection and reduced motion |
| `src/preferences.css` | Shared settings panel, game dialog and promotion dialog |
| `src/sounds.js` | Web Audio palettes, event envelopes and gesture unlocking |
| `shared/ui-preferences.js` | Server and generated-browser allowlist/defaults |

The game page retains its player/clock/history/action layout in `play.css`.
The Sites skill's local frontend workflow informed the design and verification;
this existing repository continues using its own hosting and push deployment.

## Model, view and gestures

1. The controller owns FEN and UCI history. The server is authoritative.
2. The board view receives a position snapshot and maps each occupied square to
   one piece element. `render()` is the only place that changes that mapping.
3. Pointer input is attached only to `cg-board`. One Pointer Events path handles
   mouse, pen and touch; compatibility touch events cannot duplicate a move.
4. Pointer down selects an owned piece. A five-pixel threshold distinguishes a
   drag from a tap. Pointer capture delivers release outside the board. An
   invalid/outside drop, cancellation, lost capture or window blur restores the
   piece and clears the gesture. A second tap on the same piece deselects it.
5. Clicking/tapping a destination and releasing a drag call the same proposal
   function. A legal local candidate is sent as `m<UCI>` or `p<UCI>`. Pending
   squares are shown, but the position is not changed before server confirmation.
6. Promotion opens a native modal with explicit Queen/Rook/Bishop/Knight buttons;
   Escape cancels. There is no preselected hidden promotion that silently fires.
7. One renderer handles ordinary moves, captures, EP, promotion and castling.
   It reuses moving elements for a confirmed move; castling also relocates the
   rook. Arbitrary snapshots and replay reconcile by square, without applying a
   historical move to the current visual position.
8. Pieces use percentages of their own square size for transforms. Input reads
   the current board rectangle with client coordinates. Scroll and resize need
   no cached geometry, pixel-perfect width calculations or resize listeners.
9. Last origin/destination, selection, possible destinations, captures and queued
   premoves have distinct overlays. Keyboard users can focus the board, navigate
   squares with arrows, select/submit with Enter or Space and cancel with Escape.
   Coordinate announcements and promotion buttons provide non-pointer access.

Premoves use piece geometry to offer potential destinations during the opponent's
turn. They are intentions; only the server can decide whether one is legal after
the opponent moves. Normal moves use the browser's legal-move list and are still
validated by the server. Duplicate broadcasts are ignored. A missing/out-of-order
ply triggers a fresh snapshot instead of patching partial state. Reconnects
check whether the game has already finished before opening a new socket.

## Animation and visual themes

Animation uses the Web Animations API on the actual moved element, with an
explicit final CSS transform. New moves cancel an old transition before starting
another. Dragged pieces follow the pointer directly. Replay/snapshots snap to
position and stay silent. User speeds are off, 100, 180 or 320 ms. The server
accepts a validated 0–600 ms value. `prefers-reduced-motion` always takes priority
and cancels active animations. Animation never changes protocol timing or clocks.

Board palettes: follow the site theme, Ivory Study, Midnight Observatory or
Walnut. Piece sets: Classic and Sculpted. These choices are independent, and
changing them neither rebuilds the game nor resets a clock. Board highlights
use palette tokens; piece, highlight, drag and coordinate layers stay inside the
board's isolated stacking context. Dialogs use the browser's top layer.

## Personal sound themes

Ivory Study uses soft sine tones with a warm filter; Midnight Observatory uses
lower triangle tones with a darker filter. Each palette contains distinct move,
capture, slide, start, end, check and low-clock envelopes. The slide cue sweeps
in pitch, while capture is a two-part impact and start/end are opposite motifs.
Sounds are synthesized, with no audio downloads or external assets.

A user chooses follow-site, Ivory or Midnight, master volume and mute. Each
individual event can use the chosen theme, explicitly use either palette, or be
disabled. Preview buttons audition one event. Preview intentionally bypasses
master mute, but obeys volume and an event's Off setting. Historical moves and
replay never sound. Background tabs are silent. A low-clock warning plays once
per game, below ten seconds on the user's active clock; there is no continuous
clock tick. The browser requires a pointer or keyboard gesture to unlock audio.
An initial start cue may wait for the first gesture for up to fifteen seconds.

## Storage and rollout

`GET /preferences` reads the current user/session profile. `POST /preferences`
accepts a bounded object normalized by `shared/ui-preferences.js`. Unknown fields
are discarded. Signed-in profiles are stored in `users.ui_preferences` JSONB and
sync across devices. Guests use a separate session-keyed Redis record and a
browser-local cache used only as an offline fallback. Account profiles are never
written into that shared browser cache. UI writes are debounced and serialized;
save failures are displayed and do not claim successful synchronization.

Apply `database/ui-preferences.sql` before deploying web. It is included in the
idempotent cumulative updates. Then restart web instances to load templates and
asset hashes. No game/engine protocol or service update is needed for this board.

## Verification and limits

`node --test web/tests/preferences.test.js web/tests/board-browser.test.js`
checks the real minified browser assets against an isolated local WebSocket
fixture. It covers click/drag, illegal drops, scroll/resize, premoves, keyboard
input, last moves, castling/EP/underpromotion, cancellation, Black touch input,
spectators, reduced motion, replay, theme persistence and distinct sound cues.
Preference tests verify user isolation and validation. Start-position legal move
counts include depth 3 (8902). These checks do not prove every chess position or
browser bug-free; server-side move validation remains the final authority.
