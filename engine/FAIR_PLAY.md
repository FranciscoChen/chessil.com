# Fair-play evidence and public warnings

This detector extracts cheap signals and ranks cases for review. It does not
establish that somebody cheated. No automatic abort or account ban is performed.
The previous seven-point abort rule combined correlated evidence without a
minimum sample or calibration; it has been removed.

## Code and data flow

| File | Purpose |
| --- | --- |
| `fair-play.js` | Pure O(plies) numerical pass over one snapshot |
| `fair-play-account.js` | Bounded aggregation across distinct games |
| `fair-play-service.js` | Shared budgets, caches, reports and public-account persistence |
| `queue-client.js` | Bounded queue HTTP requests |
| `server.js` | Authenticated API, input validation and lifecycle |
| `database/fair-play.sql` | Public account summary schema |

The game service submits compact clock/move telemetry to `/check`. `/check`
acknowledges without waiting for Stockfish. Cached evidence is assessed immediately
and again after a new result arrives. Internal reports can be fetched with an
authenticated `POST /fair-play/report` and the game ID in the `id` header.
The report contains separate White/Black metrics, exclusions, coverage, sample
sizes and signal names. Public profiles expose only account summary numbers.

No SQL query, subprocess, network operation or per-position engine call occurs
inside the numerical scorer. A local 100-ply synthetic benchmark took roughly
0.04–0.06 ms/report; this excludes transport, Redis and engine work and is not a
whole-service capacity estimate.

## Position and clock conventions

Position `k` is the position **after k plies**, before `moves[k]`. Its engine score
is from the side to move. Before/after scores are converted to White perspective,
then compared from the mover's perspective. The original detector mixed indexes
and attributed some losses to the wrong player.

Clock entries alternate colors. Think time is the same player's clock two plies
earlier, plus their increment, minus their new clock. Lag credits and premoves
make this an approximate server-observed duration, not browser deliberation time.
Durations at/below 300 ms are excluded from timing regularity; clock pressure is
also excluded. No lack of premoves or lack of fast moves counts as proof.

New game hashes include `lc` (legal move counts, initial value `20`) and `pm`
(one `0`/`1` per committed ply; `1` means an executed premove). Unknown/misaligned
choice histories cannot become positive quality evidence. Games already running
when this telemetry was deployed will lack reliable initial metadata and will
usually remain insufficient. No historical backfill is performed.

## Evidence gates and interpretation

- Skip the first 20 plies as an opening precaution. This is not a complete opening
  book detector. Training games against supplied bots are excluded.
- Exclude forced moves, recorded premoves, mate positions and positions beyond
  +/-500 cp from the main quality evidence. Large advantages inflate accuracy.
- Use exact scores at depth 10 or higher. Bounds/missing results are not zeros or
  nonmatches. A paired estimate that appears to improve by over 75 cp is marked
  unstable rather than converted into a suspicious perfect move.
- Keep mate winners separate. Mate distances are never multiplied by centipawns.
- Track engine agreement against **available eligible analysis**, its coverage,
  and a Wilson-based sample-size penalty. Chess moves are correlated; this bound
  is a heuristic penalty, not a calibrated 95% cheating confidence interval.
- Track loss and move-quality averages with one scale throughout. The existing
  [Lichess evaluation/accuracy transforms](https://lichess.org/page/accuracy) are
  used only as descriptive metrics. They are not player-specific win probabilities,
  and the simple mean is not Lichess's game-accuracy calculation.
- Require 16 compared moves or 10 paired loss estimates before classifying an
  individual game. High agreement and low loss are one quality domain, so they
  cannot add suspicion twice. Quality alone does not produce a review flag.
- Combine quality with timing regularity or a substantial recent quality change.
  Timing needs 16 nonforced, nonpremove, non-pressure observations; coefficient
  of variation <=0.18 with mean 0.75–30 seconds creates a timing signal.
  A quality change compares two adjacent eight-move windows, each with at least
  six paired estimates. These thresholds are explicit heuristics, not validated
  decision boundaries.

Do not resurrect fixed claims that 75% engine agreement exceeds all grandmasters,
or count a same-origin/destination blunder as evidence of cheating. Neither was
supported by this code or a reference population. As Lichess explains, high
accuracy can result from easy or one-sided positions and is not itself proof.

## CPU and memory limits

Both API instances share Redis admission gates:

- At most two new background searches per second, at most four outstanding.
- One outstanding request per game; unique job UUIDs prevent listener collisions.
- Routine sampling uses paired slots `0,1,7,8` in a staggered 12-ply cycle, covering
  both colors. Preliminary signals allow denser sampling within the same budget.
- Bot play keeps `/lpush` priority. Background work uses `/rpush`, one thread,
  full strength and a 256 ms search budget. No global MultiPV expansion is added.
- At most 2,000 active game snapshots with two-hour TTLs; active requests refresh
  their analysis TTL. At most 10,000 retained detailed reports.
- At most 5,000 cached registered accounts, up to 32 distinct games per account,
  over the last 30 days. Anonymous sessions do not create public account rows.
- Public SQL writes coalesce in Redis and retry after database failure. Each API
  flushes up to 16 dirty accounts per poll through a two-connection pool. Source
  revisions prevent late writes replacing newer summaries. Foreign-key failures
  from deleted accounts are removed without blocking the rest of the batch.

A skipped search reduces coverage, not the player's reputation. Sparse evidence
remains sparse; the detector does not claim to have analysed every move. Redis
budgets limit this new workload independently of the queue's maximum length.
The underlying queue is still memory-backed and has no durable job lease.

## Public account indicators

Profiles show:

1. **Suspicion /100:** an automated warning index, not a probability. `100` is the
   maximum warning level, not confirmation of cheating. Both quality and timing/
   change evidence contribute; correlated quality measures are never added twice.
2. **Flagged-game rate:** individual review-flagged games divided by games with
   enough per-game evidence. It is not the proportion of all games in which the
   account actually cheated. Targeted sampling also means this is not an unbiased
   population estimate.

Account evidence can combine partial samples from short games. A numeric warning
requires three usable games, two distinct opponents, and either 40 compared moves
or 30 paired estimates. A usable game supplies at least six compared moves or
four pairs. Cross-game timing support needs three games with eight timing samples
each. The index combines pooled quality/timing and repeated per-game review flags;
see `fair-play-account.js` for the complete formula. A flagged-game rate additionally
requires three individually classifiable games. Thus an account-level warning
may exist while the individual-game rate is still unavailable.

Insufficient data is `null`, displayed as a dash with its sample counts. It is
never silently converted to zero or a clean-account claim. Stale summaries older
than 30 days display as insufficient; bot accounts display as not applicable.
No internal signal details, session IDs or opponent fingerprints are exposed.

## Cheap next improvements

The most valuable next step is calibration against a reference set of fair games,
matched by rating, time control, position type and analysis budget. Existing
summaries allow this offline; online lookup of cohort baselines would be cheap.
A player's sustained change against their own historical baseline can also be
tracked with small rolling summaries and no additional Stockfish searches.

A gap between the best and second-best move would help discount obvious/equivalent
choices. That needs extra PV work; reserve MultiPV=2 or deeper rechecks for selected
cases rather than every move on this machine. Opening-book lookups could also
exclude deep theory more accurately. Client tab-focus events and network/device
clusters are weak, spoofable/shared signals; do not use them alone for public flags.

Before changing warning levels into enforcement, measure false positives on the
reference set. No empirical cheating-rate or false-positive-rate claim is made by
this initial heuristic model.
