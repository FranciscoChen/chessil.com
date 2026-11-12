# BT4-it332 policy opening book

Standalone CPU generator. It does not change the live explorer or production
application checkout. The output is a standard Polyglot book. Base generation defaults to 599,984 bytes;
named opening coverage may extend the final size without removing positions.

## Reproducible environment

Requires Python 3.11+, a C++20 compiler, Python development headers, pkg-config,
Ninja, zlib and OpenBLAS development libraries. `bootstrap.sh /absolute/workdir`
creates an isolated virtual environment, builds Lc0 Python bindings from revision
`d91bd1443ac1a4f367de96d3569dce7bbd35920a`, and downloads the network from Lc0. The pinned source receives a one-line
`pybind11` namespace alias fix in its python-chess bridge; the patch is included
in the bootstrap script. Build files persist under `lc0/build-cpu` for retries.
The script verifies SHA-256 and gzip integrity. It installs `patchelf` for the
Linux wheel packaging step. Do not commit network weights,
checkpoints, or synthetic test books.

BT4-it332 network SHA-256:
`e6ada9d6c4a769bfab3aa0848d82caeb809aa45f83e6c605fc58a31d21bdd618`.
The network is pinned by identity; this is not a claim that it is currently the
strongest available network.

## Extraction and coverage

`generate.py` uses native Lc0 `GameState` encoding with the entire actual UCI move
path, native policy indices, and the vanilla policy head. It obtains raw legal
move logits, applies a stable softmax at temperature 1, and checks agreement with
Lc0's approximate built-in softmax (absolute tolerance 0.002). No search is run;
this is the policy-only equivalent of a fresh one-node evaluation, without UCI
statistics rounding. Every legal move is cross-checked with python-chess.

All positions at source plies 0, 1 and 2 are evaluated, and **all their legal
moves** are stored. This deliberately includes all moves out of ply-2 positions.
Afterward the frontier rotates through depths 3–16. At each depth, highest path
probability goes first, with every fifth selection giving one of the twenty
first moves a turn. There is no 3% threshold, top-p cutoff or path cutoff.
Every selected position keeps all legal moves; only expansion is budgeted.
The final few bytes may remain unused if the next complete policy will not fit.
Default base ceiling: 599,984 bytes / 37,499 entries. `--max-bytes` can raise it.
The final coverage pass adds missing prefixes of the Najdorf and Ruy Lopez sample
positions, keeping all their legal moves and preserving existing positions.
Final size is flexible and reported explicitly.

Transpositions share output entries but not inference inputs. Up to four actual
histories per position are evaluated, and their policies are combined using the
probability of those paths. This is a mixture over the sampled histories, not an
exact marginal over all possible chess histories. The cap bounds runtime on CPU.
The checkpoint stores raw per-history policies independently of the mixture.
Hash collisions are checked against board state, turn, castling and Polyglot en
passant semantics. All inference configuration is recorded; incompatible resumes
fail instead of mixing data.

A position reached at ply 16 has book moves. No tasks are created for ply 17.
**Polyglot alone cannot enforce a game-ply limit**: the same key may occur at ply
17 through a repetition or transposition. The browser reader requires the actual
ply and returns an empty result at ply 17 or later.

## Benchmark and run

From the standalone workspace, with the scripts copied alongside the venv:

```sh
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
venv/bin/python generate.py --weights BT4-it332.pb.gz \
  --lc0-revision d91bd1443ac1a4f367de96d3569dce7bbd35920a --benchmark 100
venv/bin/python generate.py --weights BT4-it332.pb.gz \
  --lc0-revision d91bd1443ac1a4f367de96d3569dce7bbd35920a
```

Use a CPU/memory limited background unit on a server with other workloads.
The working directory contains `bt4-book-work/checkpoint.sqlite3`, benchmark data,
`bt4_it332_policy.bin` and its JSON report. Every history commits atomically;
rerunning the same command resumes. `--stop-after N` writes a partial verified
export for inspection; its final console report has `complete:false`.
An interrupted run may always be resumed; a book is final only after the frontier
has been exhausted under the budget and the run reports `complete:true`.

All entries use big-endian `>QHHI` (16 bytes), weight = rounded probability ×
65,535 clamped to [1,65535], and learn=0. The file is sorted by key, then descending
weight. Export validates every stored move through python-chess, including
castling and promotions. The JSON report records sizes, checksum, depth coverage,
network/build identity and sample distributions. Missing sample openings appear
as empty arrays rather than fabricated recommendations.

## Browser reader

Load `polyglot-random.js`, then `polyglot.js`. Fetch the `.bin` as an ArrayBuffer:

```js
const book = new ChessilPolyglotBook(await response.arrayBuffer());
const moves = book.lookup(fen, actualPly);
// [{uci, weight, prior}, ...], descending by weight
```

Keys use BigInt and DataView big-endian reads. Lookup is binary search. Castling
is decoded to standard UCI. `prior` is the quantized policy mixture, not a win
probability. SAN can be produced by the site's shared chess rules. No new browser
library is needed. After generation, `run.sh` adds the named sample openings and measured human
coverage, then runs `verify_uci.py` against fresh `go nodes 1`
searches at startpos and after e4, d4, c4 and Nf3. It checks every legal prior
against Lc0's native FastExp softmax, allowing 0.00025 absolute error
for rounded UCI output and compressed tree priors. A separate fresh native
evaluation checks cached ideal-softmax policies to 0.000001 and records the
difference between the ideal exponential and Lc0's FastExp approximation. Successful comparisons are
recorded in the JSON report as `uci_verification`. Treat the artifact as verified
only when `complete` is true and this field is present.

The existing JSON explorer stays in place until the finished
real-network artifact is reviewed and integrated.

## Verification

```sh
python -m unittest discover -s tools/policy-book -p 'test_*.py'
```

Tests use synthetic priors only in temporary files. They verify mandatory coverage,
resume, source ply 16, file budget, castling/promotions, browser hash/move parity
against python-chess and empty browser results at ply 17.

## Human opening coverage

`human_coverage.py` streams bounded samples directly from public Lichess monthly
standard-rated PGN dumps; no whole dump is downloaded to disk. Default: 30,000
games from each of August, September and October 2026. These are prefix samples,
not random samples or complete months. Exact UTC windows, accepted counts and
rating cohorts are recorded. `--games-per-month 0` scans complete months. Use a
new frequency database to resample existing months with a larger limit; additional
months can be appended to an existing database. Interrupted months restart
atomically; completed months are reused.

Average player rating defines three cohorts: below 1600, 1600–2199, and 2200+.
Known BOT titles and missing/invalid ratings are excluded. Any history occurring
at least ten times in any cohort qualifies, through source ply 16. Every legal
move is evaluated by BT4 for newly covered positions. Human frequency selects
positions only; the binary weights remain Leela policies. Existing positions
are preserved, and final size can exceed the initial budget. `--min-games`
controls the observed-frequency threshold. The frequency database is retained
for later expansion and all additions are checkpointed. No claim of exhaustive
coverage of every human opening is made.
