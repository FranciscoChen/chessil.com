'use strict';

module.exports = {
 date: '2026-11-24',
 match: {
  elo: 9.3, low: 1.5, high: 17.1,
  games: 1600, pairs: 800, wins: 486, draws: 671, losses: 443,
  milliseconds: 50, threads: 1, hash: 16,
  hybrid: 'dev-20261104-m-2ffd877d',
  baseline: 'dev-20261025-ff3a6c50',
  seed: 1795532238,
  network: '7a702165ba92072006f99708a16aeb60508130d9044412a17a29ad526b04008e',
  results: '/research-data/depth-six-hybrid-2026-11-24.csv',
 },
 benchmark: {
  leaves: 198825300,
  perft: [1.177, 0.664],
  early: [395.6, 405.4],
  later: [3.552, 3.427],
  nodes: [58192, 51148],
  milliseconds: [81.88, 69.54],
  depthAt50ms: [16.74, 17.60],
 },
 code: `targets = attacks(piece, from, occupied) & allowed;
if (pinned(from)) targets &= line(ourKing, from);
leafCount += popcount(targets);

hidden = concat(clippedAccumulator(us), clippedAccumulator(them));
head = (pieceCount - 1) / 8;
logit[m] = dot(hidden, weights[head][fromTo(m)]);

priority[m] = historyScore[m] + 1024 * clamp(logit[m] - maxLogit, -2, 0);
promoteStableTopThree(shortlist, priority);`,
};
