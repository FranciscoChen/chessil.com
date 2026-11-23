'use strict';

module.exports = {
 'gigantua-move-generation': {
  title: 'Gigantua-style move generation in Stockfish',
  summary: 'Generate legal moves from Stockfish’s board and feed them directly into its move picker.',
  sections: [
   ['One board, several consumers', 'Gigantua inspired the use of destination bitboards and batched emission. The hybrid keeps Stockfish Position and StateInfo as the source of truth for make and undo, castling, en passant, repetition and NNUE updates. Ordinary piece moves go straight to the scored list in batches, allowing scoring to reuse information for a source square. Pawns and special moves keep explicit encodings. The same work also provides callback and count-only paths for perft.'],
   ['A conservative recovery', 'A later prototype generated and scored candidates on demand. It changed the order within search stages, and the experimental build regressed in match testing. The recovery restored baseline search and ordering behavior while retaining the earlier generation work. Because several changes were reverted together, the match does not isolate the cause.'],
   ['What the benchmark established', 'Perft counts legal leaves at a given depth. Matching those counts checks move generation, including positions with special moves. The five search runs per build also visited identical node totals. Their median times were almost identical, so the integration established a useful implementation baseline without a demonstrated search speedup.'],
  ],
 },
 'compact-policy-nnue': {
  title: 'Training the first compact policy NNUE',
  summary: 'Use Leela as a teacher and train a small policy that can rank moves inside Stockfish.',
  sections: [
   ['Policy and evaluation have different jobs', 'Leela supplied a legal-move prior for a native root-ordering prototype. The first compact student reused 1,024 transformed Stockfish NNUE features with a 32-unit hidden layer and quantized weights. It ranked root challengers after the incumbent. Stockfish still evaluated positions and made the final decision through alpha-beta search.'],
   ['What the student learned', 'The training run combined Leela-labeled self-play positions with moves from 59 championship events. Validation was split by game, with exact board overlaps removed from the championship validation data. Epoch five produced the lowest validation cross-entropy of six epochs. Most targets were played moves, so the ranking scores measure agreement with the labels.'],
   ['V2 widened the student', 'The V2 binary format introduced a configurable width and an int16 weight file. One expansion grew the student from 32 to 512 units while initially preserving its predictions. It copied the existing units and zeroed the new units’ outgoing weights. A new optimizer handled the larger model, and later batches resumed optimizer state. Teacher-enriched batches drew on championship and self-play positions while the engine continued to run the small student during play.'],
   ['V3 made the output more expressive', 'V3 introduced joint origin–destination rows, a shared promotion term and two king-file indicators to disambiguate horizontal orientation. It still depended on the exact frozen evaluation feature transformer and recomputed a dense projection when policy was requested. The first student loaded successfully in a one-node engine check. Its held-out accuracy and that load check leave playing strength unmeasured.'],
  ],
 },
 'incremental-policy-training': {
  title: 'Incremental policy training, from V4 to V5',
  summary: 'Give the policy its own sparse features, then train separate output heads for different material counts.',
  sections: [
   ['V4 updates its own features', 'V4 introduced independent king-relative piece features, castling rights and en passant inputs. It updates the sparse sum when policy is requested and refreshes a perspective when the king bucket or mirror changes. The two perspectives form the input to a shared move output. The team tested widths from 128 to 1,024 with Python/exported-engine parity and real make, undo and null-move checks.'],
   ['Train and validate on separate positions', 'Training evolved through stored teacher labels, resumable batches and a fixed holdout. The displayed V4 checkpoint was evaluated on 2,000 frozen positions. Top-1 and top-3 count how often a reference move is ranked first or among the first three. They measure agreement with the reference, which has a different purpose from timed head-to-head games.'],
   ['V5 routes by material', 'V5 shares a 256-unit accumulator across four output heads, selecting one based on the number of pieces including kings. After opening-book warmup, sampling uses four material bands with fixed quotas. The low-material portion includes locally generated Syzygy positions with exact outcome-preserving move labels. Early Leela examples use BT4 priors, while later examples can retain search-derived targets. V5 has its own frozen and stratified validation set, so its metrics should be compared against V4 on that same set.'],
  ],
 },
 'economical-policy-search': {
  title: 'Reducing the cost of policy inside search',
  summary: 'Request fewer predictions, score fewer moves, and reuse the logits that search already paid for.',
  sections: [
   ['Wait for the quiet stage', 'The economical V4 experiment leaves the transposition-table move and good captures first. When search reaches quiet moves, it can score up to eight history-leading candidates, subject to a remaining-depth gate and a work budget. It caches raw logits per worker, recomputes their blend with history on each visit, and stably promotes up to three candidates. A good capture that cuts off search incurs no quiet inference.'],
   ['Measure elapsed time as well as calls', 'The benchmark used three positions, three runs per position per build, 500,000 nodes per run, one thread, a 16 MiB hash and warm models. The patch also replaced floating-point output accumulation with an integer SIMD kernel and a scalar fallback. Quiet calls dropped sharply, while total elapsed time fell by 3.2%. This is a small fixed-node comparison of the combined patch. The start-position median was slightly slower.'],
   ['Why exact parity still needs matches', 'A later two-frame accumulator experiment removed per-move policy bookkeeping. In 24 paired 500,000-node samples it matched search output and took 19.740 s versus 20.337 s. A subsequent short match scored lower than previous runs with the same network and different opening seeds. The V5 material build reverted that accumulator experiment as a precaution. Fixed-node parity and elapsed time capture different aspects of performance from game results.'],
  ],
 },
 'policy-guided-reductions': {
  title: 'Using policy margins to reduce search depth',
  summary: 'Probe lower-priority quiet moves at a smaller depth while keeping Stockfish’s re-search logic.',
  sections: [
   ['Spend fewer nodes on selected probes', 'The experiment compares each scored quiet’s raw logit with the best logit in the existing shortlist. A gap of one or less leaves the usual reduction alone. Larger gaps add up to one ply to the reduction before rounding, with half the adjustment at improving nodes. Unscored moves keep ordinary reductions. The rule requests no extra network outputs.'],
   ['Keep the tactical safeguards', 'The rule is limited to expected cut nodes and ordinary non-checking quiets with modest history scores. It excludes the principal variation, check evasions, mate-sensitive searches and excluded-move verification. A reduced probe that beats alpha goes through Stockfish’s deeper re-search. A false fail-low can still hide a strong quiet defense. A separate experiment delays a fresh shallow policy call until the history-leading quiet has been searched and failed to cut off.'],
   ['What the measurements say', 'In a depth-16 ablation with the inference gate fixed at six, 64 positions used 5,847,510 nodes with ordering alone and 5,948,360 with margin reductions, about 1.7% more. It activated the extra one-ply reduction 28 times. Shorter individual probes did not reduce total work in this sample. All listed runs used 50 ms per move, one thread, a 16 MiB hash and color-reversed opening pairs. The two depth comparisons used the same engine binary on both sides, with margin reductions enabled. They varied when fresh quiet-ordering inference starts. The original-engine comparison includes the rest of the hybrid changes. Every paired-opening Elo interval spans zero, so these runs leave both the strength advantage and the best inference gate unresolved.'],
  ],
 },
};
