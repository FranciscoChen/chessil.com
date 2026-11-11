# Training

Training, drills, and puzzles compose one shell (`ui/training.js`), one controller
(`src/training.js`), and the shared native `ChessilBoard`. They inherit site theme,
board/piece themes, sound preferences, promotion, drag, and keyboard input.
There is no additional board library or separate move generator.

`training/curriculum.js` owns lesson content: tutorial, opening repertoires,
endgame principles, tactical patterns and strategy exercises. IDs are stable
progress keys. Positions use standard FEN and solutions use legal UCI moves.
Lessons explain an intended plan; they do not claim that every other legal move
is objectively bad. Opening lines stop shortly after the named formation. King's
Indian Defence belongs to the d4 family; King's Indian Attack is a distinct system.

Openings have three passes: immediate guidance, a seven-second pause before a
hint, and recall with no hints. The learner plays their repertoire's side and
scripted replies are automatic. Completing a pass unlocks the next; the last pass
marks the lesson complete. Selecting a lesson starts board input immediately.
Guided passes pulse the source square; selecting its piece shows the board's
usual legal destinations and pulses the intended destination. A five-second
countdown and progress bar advance to the next pass or lesson automatically;
the Next button advances immediately. Switching lessons or sections, retrying,
and leaving the page cancel that countdown. Recall and puzzle rush do not
reveal answers. Custom repertoires can extend this data contract later.

Tutorial exercises teach the rules through board interaction. Strategy exercises
ask for a move before revealing the intended plan on request. Tactics provide
individual puzzles and a three-minute rush ending on time, three mistakes, or
completion of the finite curated set. A puzzle is used only once per rush.

Endgames support both scripted teaching and live Syzygy practice. The server
validates positions and proxies the fixed tablebase endpoint with bounded cache,
concurrency, response size and timeout. A tablebase move's category is from the
opponent's perspective. The controller accepts all moves preserving the best
result; distance-to-zeroing is not a unique strategic truth. Outages leave guided
lessons available and preserve the practice position. Tablebases currently rely
on the public Lichess tablebase service, not a local Syzygy HTTP service.

Guests keep progress on their device; authenticated progress is stored in
`training_progress` with monotonic stage/completion updates. A small curated
`training_puzzles` dataset is installed by the existing database migration path.
The curriculum and dynamic coaching text currently use English, with localized
navigation in English, Spanish and Chinese. No third-party tutorial text, art,
source, or videos are copied.

Build production assets with `node web/scripts/build-board.js`. Readable source
stays in `src/`; generated training CSS/JS is committed and versioned by the
existing renderer. Deployment is exclusively through GitHub's existing hook.

References informing the scope of the beginner curriculum:
- https://lichess.org/learn
- https://www.chess.com/lessons/learn-to-play-chess

Initial curriculum: 34 tutorial lessons, 45 short opening lines, seven verified
endgame seeds, 12 curated tactics and 38 strategy exercises (136 total). All
scripted plies are checked against the shared move generator, including the
legality of the starting side not being left in check. The strategy exercises
include attacks against regular and fianchetto king shelters on both wings,
coordinated files/diagonals, central stabilization, switching fronts and restriction.

Reproduce puzzle migrations with `node database/training-seed.js`; use `--check`
to detect drift. Verify the seven endgame key moves against archived complete
provider responses with `node database/training-verify.js --offline`, or probe
live with `node database/training-verify.js`. The archive includes all legal
alternatives, checked independently against the shared move generator.

## Lichess puzzle workspace

`/{language}/training/puzzles` is linked from Training; the existing
`/{language}/puzzles` URL serves the same workspace. `ui/puzzles.js` composes
shared training geometry, controls, coordinates and progress. `src/puzzles.js`
uses the native board and rules, including promotions and alternative mates in
one. The export FEN precedes the opponent's setup move: apply that first move,
then orient to the solving side. Solutions and replies run entirely locally.

`GET /api/training/puzzles?theme=mixed` returns up to 16 puzzles, or filter by
one of the export's exact theme tokens. `exclude` accepts up to 128 recent IDs.
Random primary-key seeks wrap at the end of the collection; this intentionally
provides variety rather than a statistically uniform sample. Theme membership
uses a GIN index. `GET /api/training/puzzle-themes` reads precomputed counts.
The migration preserves the separate `lichess_puzzles` collection. After any
future replacement import, refresh `lichess_puzzle_theme_counts` explicitly.

`src/buffer.js` is a reusable persistent batch queue independent of chess. The
puzzle consumer fetches 16 when fewer than 12 upcoming puzzles remain, coalesces
refills, deduplicates IDs, and retries failures after 30 seconds or reconnection.
Current and upcoming puzzles persist per theme in localStorage. Connection
loss never blocks buffered play; loading the page itself still requires its
HTML and assets. Browser storage failures fall back to memory for the visit.
