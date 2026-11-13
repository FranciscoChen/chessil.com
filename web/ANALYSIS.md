# Local post-game review

Game pages contain no evaluation, WDL, engine or book UI. Their Analyze game link
appears only for finished games with moves (result codes 1–8), and navigates to
`/analysis?game=ID&review=1`. The dedicated analysis page loads the recorded moves
and player perspective before starting the existing backward review. A direct
`?game=ID` link loads the same game without automatically starting the engine.
Imports reject unfinished/unavailable games. Engine binaries and NNUE files download when engine analysis starts; the opening book loads with the analysis board; the small engine catalog is also used by settings.
`src/analysis.js` composes the existing native board, move history, shared buttons,
progress, and CSS countdown. `src/local-engine.js` serializes UCI searches in one
worker. Engine and book each have a compact card, visible by default. Engine
controls are shared SVG icons: Play starts, Stop retains output, and Options
expands a CSS-animated panel inside the engine card. The selected engine name is
visible; close/theme controls and the Explore preface are omitted. Engine,
network, MultiPV, hash and thread fields use the same renderer and preference
owner as general settings. Changes persist globally and apply on engine start. Original history, clocks, and stored game
data are not edited.

The scan starts at the final position and moves backwards. Searches retain the
original game history, use MultiPV 3 and UCI_ShowWDL, and stop at 120,000 nodes or
700 ms per position. Suspected losses of at least 100 cp receive a second search
restricted to the played move (180,000 nodes / 1 second). The comparison uses
both searches from the same mover's perspective.

Outcome classification uses expected score `(wins + draws/2) / total` from UCI
WDL. A score of at least .8 is likely winning; at most .2 is likely losing;
the middle is uncertain/drawish. A downgrade between these bands is marked as
an outcome-changing mistake only when expected score falls by at least .2. Hopeless positions are excluded: losing mate scores, a best
move still at -400 cp or worse, or <=5% expected score with a best move below
-200 cp. Same-sign mate-distance changes are omitted. A best defense of -250 cp
or better against a played move of -400 cp or worse (at least 200 cp difference)
is retained as a practical-chances suggestion even if engine WDL is pessimistic.
A fall of .5 or more receives `??`, otherwise `?`. Other improvements of at least
100 cp or .1 expected score receive a neutral `?!` suggestion. Thus +7 to +5
is advice, not a blunder. Engines without WDL use a conservative logistic cp
fallback; mate scores use their winning/losing sign. These are bounded-search
estimates, not proofs of the game's result.

Normal move clicks always show the recorded position after that move. A symbol
button after its notation opens a distinct suggestion step: the position before
the move, with the played move's squares red, best-move squares using the shared
white pulse, and the shared floating explanation underneath the destination.
Adjacent arrow/button navigation visits this step between the previous and
actual move. Leaving it clears the guide. Clicking symbols directly does the
same. Backward autoplay visits every ply, from the final position through the start.
Ordinary steps use a two-second CSS countdown; review suggestions pause for five
seconds. Piece sliding uses the shared renderer and respects motion preferences. Manual
navigation and exploration pause autoplay. Local variations never alter history.

Mobile game/review layouts use a shared horizontal history rail above the board,
with fixed navigation buttons at both ends. Desktop keeps the original side
column with a two-column move list and navigation below it. A compact evaluation block gives the centipawn bar its full available width and
puts the three-segment WDL bar with labeled percentages on its own row. Win uses
the reviewing side’s piece color, Loss uses the opponent’s, and Draw is their
50/50 color mix. Both-sides review labels these segments White, Draw and Black. Live games display unknown values,
never engine assistance. Review defaults to the player’s side (both for spectators);
White, Black and Both change marker visibility, board orientation, score and WDL
perspective, without restarting the scan. All positions are analyzed once.

On mobile the header, player rows and clocks are compact.
Recorded move navigation keeps the selected move visible. Marker buttons have
separate actions, keyboard focus, and an accessible explanation.

The bar, score and WDL follow the selected perspective (White for Both).
Opening names still come from the offline CC0 ECO index. The opening explorer
loads the BT4-it332 Polyglot book described by
`web/engine/book/polyglot-manifest.json`, using the shared reader in
`tools/policy-book`. It fetches one cached ArrayBuffer, optionally from the
precompressed gzip asset using native DecompressionStream. Lookup uses exact
64-bit Polyglot hashes and binary search. The original manifest and JSON shards
remain available to cached older clients.

The default 8.32 MB book contains 15,994 positions / 520,011 moves, including
1,644 positions at source ply 16. Its gzip download is 2,465,144 bytes. Every
legal move is retained at each selected position, including all positions through
source ply 2. Lookup stops from ply 17, including repetitions/transpositions.
The previous 4,160,480-byte edition is preserved with its own binary, gzip,
report and `bt4-it332-4mb-manifest.json`; its 8,258 positions and all their weights
are unchanged in the larger edition. `bt4-it332-8mb-manifest.json` also pins the
new edition separately from the default selector.

Raw weights are quantized temperature-1 BT4-it332 policy priors, not human move
frequency or win rates. Coverage retains the frequent histories sampled from
89,558 accepted human games and adds high path-probability lines with larger
quotas at plies 12–16. Priority uses the product of move probabilities along a
path. Coverage reporting separately expresses conditional move probabilities
from each stored parent, by parent ply; neither is a universal completeness
threshold. The versioned report contains those figures and their scope.

Seventeen explicit opening continuations (Ragozin plus sixteen representative
main lines) are verified through source ply 16, with complete legal-move policies
at every position. The representatives come from the project's CC0 ECO source;
after the named position, Leela chooses the highest-policy continuation. These
coverage reservations do not imply exhaustive coverage of all main-line branches.
Generation, checkpointing, preservation, UCI verification and packaging are
documented in `tools/policy-book/README.md`. The browser caches 128 notation
results and uses the shared chess rules for legal moves and SAN.

The book card is always visible on analysis
pages and starts no engine. It shows the current opening name and compact move
priors; empty positions use a dash instead of instructional filler. Navigation
uses the shared move history, without a separate book Back button or switch.
Neither card is present on game pages, including finished-game pages.

Engine Start/Stop terminates/recreates the local worker. Stopping keeps the board,
book, evaluations and completed review moments. Starting with unchanged settings
resumes the unfinished scan; changed settings reset evaluations and scan again.
Global settings persist engine/network IDs, MultiPV (1–8), hash (8–256 MB), and
requested thread count. `/engine/catalog.json` lists installed compatible options;
the current Lite build supports one thread only, and the loader clamps the
requested count to the selected build's capabilities. The supplied external and
bundled NNUE options currently contain the same default network. New builds and
matching external networks can be registered through the catalog; arbitrary
URLs and incompatible files are not accepted from preference storage.

Shared highlight calls accept multiple `areas` and use a pointer-transparent
8% dimming mask around them. The mask follows scroll/resize and is removed with
the highlight; header stacking remains above board highlights.

## Engine source and network builds

The initial build is Stockfish 19 Lite, single threaded, based on
https://github.com/nmrugg/stockfish.js at
`0dc3d0ac03705353dad6659c0dad4597cdee4021`. Like the Lichess approach it compiles
Stockfish to WebAssembly and runs UCI in a worker. The lite network is smaller
and weaker than the full network; it makes a practical default for local review.
Modern WebAssembly SIMD support is required. No SharedArrayBuffer or special
cross-origin isolation headers are required. Failures appear in the panel and
can be retried by closing/reopening it; there is no server-engine fallback.

Install/activate Emscripten **6.0.9**, then:

```
python3 web/scripts/build-browser-engine.py
```

This checks out pinned source, applies `engine-build/browser.patch`, builds with
one compiler job, and publishes content-addressed JS/WASM/network files plus
`engine/manifest.json`. `--source /path/to/patched-source` builds our own edited
source tree. `--network /path/to/matching.nnue` selects the external network.
`--full --network /path/to/full.nnue` builds the full architecture. Network
architecture must match the engine; a policy network requires corresponding
C++ architecture/search changes, not just a renamed NNUE file.

The patch exports Emscripten FS, imports externally supplied network buffers,
accepts the target UCI network option, and retains native network validation.
The client verifies each network's SHA-256 and checks that the engine advertises
its configured option. Future builds can list additional network files/options
in the manifest (for example a policy option implemented by that engine).
The initial build also embeds its upstream default network; it explicitly loads
the manifest's external network before any search.

`--package-only --source /path/to/completed-build` packages an existing build.
The release includes GPLv3 license and complete corresponding patched source,
build scripts, and network in `source.zip`, linked from the panel. When adding
new source files to a fork, keep them tracked or not ignored so packaging includes
them. Production assets are committed and deployed solely by the GitHub hook.
No compiler is needed on production servers.

Browser integration tests use the real shipped WASM and external NNUE. They cover
live-game gating, reverse discovery of both sides' queen blunders, autoplay,
manual/variation navigation, local book moves, unchanged game history, mates,
load failure, and mobile overflow. Existing shared board compositor tests remain
required when changing its renderer or annotation layer.

## Header game menu

`game-menu.js` serves session/account-owned games from the Redis live index; SQL
supplies opponent identity. `GET /my-games` never uses stale unfinished rows as
proof of liveness. The global header and ongoing-games page share one renderer.
Invitations are recipient-scoped Redis sets with five-minute expiry; they are
shown only while the original challenge lease remains live. Accept goes through
the existing atomic lobby join/start path. Send verifies challenge ownership and
rate-limits invitations. Notification events and opening the menu refresh it; a
visible-page 30-second refresh keeps badges current and renews owned challenges.
Board and sound settings use one global header dialog.
