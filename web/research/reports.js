'use strict';

module.exports = {
 date: '2026-11-24',
 match: {
  elo: 9.3, low: 1.5, high: 17.1,
  games: 1600, pairs: 800, wins: 486, draws: 671, losses: 443,
  milliseconds: 50, threads: 1, hash: 16,
  hybrid: 'dev-20261104-m-2ffd877d',
  baseline: 'dev-20261025-ff3a6c50',
  hybridSha256: '46a0bd48ad6ffa0b0c36acca287bedb2328df7120fd9f4000b7f6b020ea057fc',
  baselineSha256: 'b75d83809713b2b5072e204e232ed7820089a109b4bce40e19665e065118cc12',
  hybridSource: 'https://github.com/FranciscoChen/stockfish-hybrid-v5/tree/1d6489069fc04558f2d03ca34e7dc17655ed405d',
  baselineSource: 'https://github.com/official-stockfish/Stockfish/tree/ff3a6c508ed731f0dcf253f4ddf646df19a62f84',
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
