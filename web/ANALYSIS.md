# Local post-game review

The Analyze game action is available only for finished games with moves (result
codes 1–8). No engine/network/book asset is downloaded before the user opens it.
`src/analysis.js` composes the existing native board, move history, shared buttons,
progress, and CSS countdown. `src/local-engine.js` serializes UCI searches in one
worker. Closing analysis terminates it and restores the game board's original
input boundary. Original history, clocks, and stored game data are not edited.

The scan starts at the final position and moves backwards, keeping scores from
both sides of each move. Searches use original move history for repetition
context, MultiPV 3, at most 120,000 nodes or 700 ms per position. Suspected losses
of at least 200 centipawns receive a second search restricted to the played move
(up to 180,000 nodes / 1 second). Confirmed estimated losses of 200–399 cp are
marked red; 400+ cp purple. Mate values are handled separately from ordinary cp.
These are bounded-search estimates, not proof that every label is definitive.

The first discovered blunder opens the position before the move, marking its
source and destination red and offering up to two near-best alternatives. More
findings advance in discovery order with a six-second CSS countdown. Pause,
history navigation, and playing alternatives stop autoplay. Previous/Next and
marked history entries select findings. Users can explore engine or book moves
on the same board; those local variations never alter the recorded game.

The evaluation bar and scores always use White's perspective. The opening book
is an offline position index of named ECO lines, not a games/statistics database
or a recommendation that every book move is good. Its source is the CC0
lichess-org/chess-openings dataset, revision
`3ba6b20d31b2e6125cb0e6a2e792f400717d9d39`, preserved in `assets/openings`.
Rebuild with `python web/scripts/build-opening-book.py` using `chess==1.11.2`.

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
