// Cheap evidence extraction, independent of HTTP/Redis/Stockfish processes.
// Position k is AFTER k plies; analysis[k] evaluates the move at moves[k].
// These are triage rules, not calibrated cheating probabilities or verdicts.
const POLICY = Object.freeze({ openingPlies: 20, minDepth: 10,
  minCompared: 16, minLossSamples: 10, minTimed: 16,
  trivialCp: 500, preciseLossCp: 15, timingCv: 0.18 });
const movePattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const sideAt = ply => ply % 2 === 0 ? 'w' : 'b';
const ratio = (n, d) => d ? n / d : null;

// Wilson-based finite-sample penalty for the observed match fraction. Chess
// moves are correlated: this is not a calibrated confidence interval or a
// likelihood that the player cheated.
function lowerMatchBound(matches, total) {
  if (!total) return 0;
  const z2 = 3.8416, p = matches / total;
  return (p + z2 / (2 * total) - 1.96 * Math.sqrt(p * (1 - p) / total + z2 / (4 * total * total))) / (1 + z2 / total);
}
function moments() { return { count: 0, mean: 0, m2: 0 }; }
function addMoment(stats, value) {
  const delta = value - stats.mean;
  stats.mean += delta / ++stats.count;
  stats.m2 += delta * (value - stats.mean);
}
function variation(stats) {
  return stats.count >= 2 && stats.mean > 0 ? Math.sqrt(stats.m2 / (stats.count - 1)) / stats.mean : null;
}
function exactEvaluation(raw) {
  if (!raw || raw.bound || !Number.isFinite(raw.depth) || raw.depth < POLICY.minDepth) return null;
  const { score } = raw;
  if (!score || score.bound || !['cp', 'mate'].includes(score.type) || !Number.isFinite(score.value)) return null;
  return raw;
}
function whiteScore(score, ply) {
  const turn = sideAt(ply) === 'w' ? 1 : -1;
  // Mate distance stays a separate quantity; multiplying distance by cp reverses
  // the meaning of "closer to mate" and corrupts loss comparisons.
  if (score.type === 'mate') return { mateWinner: (score.value > 0 ? turn : -turn) === 1 ? 'w' : 'b' };
  return { cp: turn * score.value };
}
function winProxy(cp) {
  // Descriptive evaluation transform used for move quality, not a player-specific
  // win probability. See the source/reference and limitations in FAIR_PLAY.md.
  return 100 / (1 + Math.exp(-0.00368208 * clamp(cp, -2000, 2000)));
}
function player(id, bot) {
  return { id: String(id || ''), bot, eligible: 0, compared: 0, matches: 0,
    lossSamples: 0, lossSum: 0, lossOver50: 0, accuracySum: 0, unstablePairs: 0,
    forced: 0, premoves: 0, trivial: 0, unknownChoices: 0,
    timed: moments(), fast: 0, pressureExcluded: 0, clockCredits: 0,
    bestRun: 0, run: 0, lastMatchedPly: -2, swings: [], recent: [], signals: [] };
}
function finishPlayer(p) {
  const matchRate = ratio(p.matches, p.compared);
  const averageLoss = ratio(p.lossSum, p.lossSamples);
  const cv = variation(p.timed);
  const enoughMatches = p.compared >= POLICY.minCompared;
  const enoughLoss = p.lossSamples >= POLICY.minLossSamples;
  const precise = enoughLoss && averageLoss <= POLICY.preciseLossCp && p.lossOver50 / p.lossSamples <= 0.1;
  const agreement = enoughMatches && lowerMatchBound(p.matches, p.compared) >= 0.65;
  if (agreement) p.signals.push({ code: 'high-engine-agreement', domain: 'quality', samples: p.compared });
  if (precise) p.signals.push({ code: 'low-loss-in-contested-positions', domain: 'quality', samples: p.lossSamples });
  if (p.timed.count >= POLICY.minTimed && p.timed.mean >= 750 && p.timed.mean <= 30000 && cv <= POLICY.timingCv) {
    p.signals.push({ code: 'uniform-server-observed-timing', domain: 'timing', samples: p.timed.count });
  }
  // Compare recent consecutive own moves, never stitching together missing data.
  // This is a change indicator, not evidence that an engine was switched on.
  if (p.recent.length === 16) {
    const before = p.recent.slice(0, 8), after = p.recent.slice(8);
    const a = before.filter(x => x.loss !== null), b = after.filter(x => x.loss !== null);
    if (a.length >= 6 && b.length >= 6) {
      const oldLoss = a.reduce((sum, x) => sum + x.loss, 0) / a.length;
      const newLoss = b.reduce((sum, x) => sum + x.loss, 0) / b.length;
      if (oldLoss >= 80 && newLoss <= 15) p.signals.push({ code: 'recent-quality-change', domain: 'change', samples: b.length });
    }
  }
  const domains = new Set(p.signals.map(signal => signal.domain));
  const sufficient = enoughMatches || enoughLoss;
  const review = sufficient && domains.has('quality') && (domains.has('timing') || domains.has('change'));
  const verdict = p.bot ? 'excluded-bot' : review ? 'review' : !sufficient ? 'insufficient-data'
    : p.signals.length ? 'watch' : 'no-flag';
  return { id: p.id, bot: p.bot, verdict,
    // A bounded work/review priority, never a confidence percentage.
    priority: p.bot ? 0 : review ? 80 : p.signals.length ? 40 : 0,
    signals: p.signals, metrics: {
      eligibleMoves: p.eligible, comparedMoves: p.compared, engineMatches: p.matches,
      matchRate, matchFractionLowerBound: p.compared ? lowerMatchBound(p.matches, p.compared) : null,
      coverage: ratio(p.compared, p.eligible), lossSamples: p.lossSamples,
      averageCentipawnLoss: averageLoss, lossSum: p.lossSum,
      meanMoveAccuracy: ratio(p.accuracySum, p.lossSamples), unstableEvaluationPairs: p.unstablePairs,
      forcedExcluded: p.forced, premovesExcluded: p.premoves, trivialExcluded: p.trivial,
      unknownChoicesExcluded: p.unknownChoices, timedMoves: p.timed.count,
      meanTimeMs: p.timed.count ? p.timed.mean : null, timingCv: cv,
      timeM2: p.timed.m2, fastMoves: p.fast, timePressureExcluded: p.pressureExcluded,
      clockCreditsExcluded: p.clockCredits, longestObservedMatchRun: p.bestRun,
      swingPlies: p.swings.slice(-8)
    } };
}

function assessGame(game, analyses = {}) {
  const moves = game.m ? game.m.trim().split(/\s+/) : [];
  const clocks = game.i ? game.i.trim().split(/\s+/).map(Number) : [];
  const counts = game.lc ? game.lc.trim().split(/\s+/).map(Number) : [];
  const premoves = game.pm || '';
  const validCounts = counts.length === moves.length + 1;
  const validPremoves = premoves.length === moves.length;
  const bots = { w: game.bw != null, b: game.bb != null };
  const players = { w: player(game.w, bots.w), b: player(game.b, bots.b) };
  // Training against a supplied bot is outside this live human-game detector.
  const excluded = bots.w || bots.b;
  for (let ply = POLICY.openingPlies; ply < moves.length && !excluded; ply++) {
    const side = sideAt(ply), p = players[side];
    const increment = Number(side === 'w' ? game.o : game.z);
    const premove = validPremoves && premoves[ply] === '1';
    if (premove) p.premoves++;
    // Clock entries alternate colors. Compare SAME player's previous clock,
    // two plies earlier; subtracting the opponent's clock was the old bug.
    const previous = clocks[ply - 2], current = clocks[ply];
    const rawTime = previous + increment - current;
    const pressure = Math.min(previous, current) <= Math.max(5000, increment * 3);
    if (validCounts && counts[ply] > 1 && !premove && Number.isFinite(rawTime) && Number.isFinite(increment) && increment >= 0 && previous >= 0 && current >= 0) {
      if (pressure) p.pressureExcluded++;
      else if (rawTime <= 300) p.clockCredits++; // Premoves/lag credit are not reliable think times.
      else { addMoment(p.timed, rawTime); if (rawTime < 1000) p.fast++; }
    }
    const recent = { ply, loss: null };
    p.recent.push(recent); if (p.recent.length > 16) p.recent.shift();
    if (!validCounts || !Number.isInteger(counts[ply]) || counts[ply] < 1) { p.unknownChoices++; p.run = 0; continue; }
    if (counts[ply] === 1) { p.forced++; p.run = 0; continue; }
    if (premove) { p.run = 0; continue; }
    p.eligible++;
    const before = exactEvaluation(analyses[ply]);
    if (!before || !movePattern.test(before.bestmove || '')) { p.run = 0; continue; }
    const position = whiteScore(before.score, ply);
    if (position.cp === undefined || Math.abs(position.cp) > POLICY.trivialCp) { p.trivial++; p.run = 0; continue; }
    p.compared++;
    const matched = moves[ply] === before.bestmove;
    if (matched) {
      p.matches++;
      p.run = p.lastMatchedPly === ply - 2 ? p.run + 1 : 1;
      p.lastMatchedPly = ply; p.bestRun = Math.max(p.bestRun, p.run);
    } else p.run = 0;
    const after = exactEvaluation(analyses[ply + 1]);
    if (!after) continue;
    const next = whiteScore(after.score, ply + 1);
    if (next.cp === undefined) continue; // Mate transitions are not centipawn losses.
    const sign = side === 'w' ? 1 : -1;
    const delta = sign * (position.cp - next.cp);
    // A large apparent "improvement" indicates inconsistent shallow searches.
    if (delta < -75) { p.unstablePairs++; continue; }
    const loss = Math.max(0, delta);
    p.lossSamples++; p.lossSum += loss;
    if (loss > 50) p.lossOver50++;
    const winLoss = Math.max(0, winProxy(sign * position.cp) - winProxy(sign * next.cp));
    p.accuracySum += clamp(103.1668 * Math.exp(-0.04354 * winLoss) - 3.1669, 0, 100);
    recent.loss = loss;
    if (loss >= 150) p.swings.push(ply + 1);
  }
  return { version: 1, plies: moves.length, excluded: excluded ? 'bot-game' : null,
    white: finishPlayer(players.w), black: finishPlayer(players.b) };
}

module.exports = { assessGame, POLICY, lowerMatchBound, whiteScore };
