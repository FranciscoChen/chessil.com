# Board frontend

## Source and production files

The readable, commented source is in `web/src/`. Browsers receive generated,
comment-free `board.min.js`, `game.min.js`, `preferences.min.js`, `board.min.css` and
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
| `src/board.js` | Shared piece elements, overlays, pointer/keyboard gestures and promotion UI |
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
   squares are shown. A legal normal drag previews the destination immediately,
   hiding a captured piece (including en passant) and placing the castling rook.
   This changes presentation only; the model and square map await the server.
   Confirmation reconciles in one render without replaying the dropped move.
   A rejected snapshot, disconnect or five-second timeout restores the model.
   Premoves do not preview placement. Click moves retain their slide animation.
6. Promotion opens a native modal with explicit Queen/Rook/Bishop/Knight buttons;
   Escape cancels. The saved “Automatically promote to queen” option bypasses
   the chooser for normal moves and premoves; it defaults to off.
7. One renderer handles ordinary moves, captures, EP, promotion and castling.
   It reuses moving elements for a confirmed move; castling also relocates the
   rook. Arbitrary snapshots and replay reconcile by square, without applying a
   historical move to the current visual position.
8. Pieces use percentages of their own square size for transforms. Input reads
   the current board rectangle with client coordinates. Scroll and resize need
   no cached geometry, pixel-perfect width calculations or resize listeners.
9. Last origin/destination, selection, possible destinations, captures and queued
   premoves have distinct overlays. Keyboard users can focus the board, navigate
   squares with arrows after selecting with Enter or Space, and cancel with Escape.
   Outside that keyboard selection mode, Left/Right review history and Up/Down
   (or Home/End) jump to the start/latest position. Editing fields and open dialogs
   retain their keyboard behavior. Review is available live: the authoritative
   position and clocks keep updating, and board input is disabled until returning
   to the latest move. Entering review cancels any queued premove so it cannot
   execute unseen. Incoming moves preserve the position being reviewed.
   Coordinate announcements and promotion buttons provide non-pointer access.

Premoves use piece geometry to offer potential destinations during the opponent's
turn, including squares occupied by the player's own pieces for anticipated
recaptures. Pieces stay in place until server confirmation. They are intentions; only the server can decide whether one is legal after
the opponent moves. Normal moves use the browser's legal-move list and are still
validated by the server. Duplicate broadcasts are ignored. A missing/out-of-order
ply triggers a fresh snapshot instead of patching partial state. Reconnects
check whether the game has already finished before opening a new socket.

## Animation and visual themes

Animation uses the Web Animations API on the actual moved element, with an
explicit final CSS transform. New moves cancel an old transition before starting
another. Dragged pieces follow the pointer directly. Legal drops stay at their destination
while awaiting confirmation, including when sliding is disabled. Confirmation
never slides an already dropped piece back from its origin. Replay/snapshots snap to
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

## Shared component and performance contract

Any page can load `board.min.css`, `preferences.min.js`, and `board.min.js`, then
create `new ChessilBoard(root, {state, submit, cancelPremove})`. Supply a positioned,
square parent; `cg-board` owns its geometry and layers without `.game-page`.
`game.min.js` is only the game controller and is not needed by a training or
analysis board. The controller supplies authoritative snapshots, legal moves and
connection/turn permissions; the view proposes moves without altering those
snapshots. Piece images, themes, preferences, coordinate mapping and input stay
in their shared modules. Page CSS owns surrounding layout, never board geometry.

Unchanged pieces and overlays retain their DOM nodes and attributes. Normal slides
use known transforms without computed style reads; only interruption of an active
slide samples its current visual position. Pointer movement writes the transform synchronously from the latest coalesced
input sample, using bounds measured at gesture start. There is no extra animation
frame queue, CSS transition, easing or server round trip during dragging. Slide
duration only applies to confirmed moves. Scroll, resize, pointer cancellation
and teardown cancel the gesture. The picked-up piece advertises `will-change:transform` at pointerdown, before
movement begins. Drag coordinates use CSS pixels and update only the cached
picked-up element; there are no drag-time layout reads or board redraws. Board
paint containment is avoided so it does not introduce another clipping/compositing
boundary around moving pieces. Per-frame filters are avoided. Destroy removes this instance's nodes, listeners,
animations and timers. Input uses `pointerrawupdate` where supported and `pointermove` otherwise.
No native cursor replacement, parallel mobile implementation or device heuristics.

Clocks cache their elements, write only changed labels, and skip hidden documents.
The real time source remains the server timestamp; visibility changes repaint
immediately. Reduced motion and each user's slide duration remain authoritative.

Browser regressions exercise a board outside the game-page shell, 6x CPU
throttling, zero DOM mutations/computed-style reads for unchanged snapshots,
1,000 synchronous pointer updates with no queued frames, immediate piece-centre
alignment within 0.1 px of the latest sample, one bounds read, cancellation
and teardown, in addition to actual click/drag, touch, castling, promotion,
premoves and history navigation. Throttling is a development approximation, not
a guarantee of frame rate on every low-end device.

Reference review: Lichess Chessground `src/drag.ts`, `src/util.ts` and
`assets/chessground.base.css` establish its pixel-transform drag loop, animation
cancellation and pre-existing `will-change` hint on piece elements. Our version prepares only
the picked-up piece, conserving compositor layers on low-end devices. No Chessground
source is copied or bundled. Chess.com documents pointer snapping separately from
move animation; its internal implementation has not been verified. Coordinate
alignment tests alone do not establish perceptual drag latency.

The focus indicator uses a static `::after` border rather than a native CSS
outline. A browser compositor trace reproduced a board-sized repaint for every
drag sample with the native outline. Removing the keyboard square did not fix
it; removing the outline did. The replacement retains the visible keyboard cue
without an outline whose bounds track transformed descendants.

Drop regression tests hold server confirmation across eight rendered frames for
normal moves, captures, en passant, castling, promotion and Black orientation,
with sliding off and at 320 ms. They check destination alignment before and
after confirmation, DOM identity, and rollback on rejection, timeout and send
failure. The shared board is our own implementation, with no Chessground dependency.

While dragging, the square under the pointer receives a full-cell warm accent
with an inset border, whether or not it is a legal destination. The existing
legal destination dots and capture rings remain visible away from the pointer.
The accent is defined per board palette and follows the theme.

Shared board consumers may override `state().autoQueen` for a move-specific
promotion lesson. When absent, the saved user preference remains authoritative.
This lets an underpromotion exercise show the chooser without changing settings.
