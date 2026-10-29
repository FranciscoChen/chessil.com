const { lowerMatchBound } = require('./fair-play');
const clamp = value => Math.max(0, Math.min(1, value));

// Aggregate distinct games, including partial samples. Sparse sampling must not
// discard an account's evidence merely because each individual game was short.
function summarizeAccount(entries) {
  const human = entries.filter(entry => !entry.excluded && !entry.player.bot);
  const usable = human.filter(entry => entry.player.metrics.comparedMoves >= 6 || entry.player.metrics.lossSamples >= 4);
  const qualified = human.filter(entry => ['no-flag', 'watch', 'review'].includes(entry.player.verdict));
  const sum = field => human.reduce((total, entry) => total + (entry.player.metrics[field] || 0), 0);
  const compared = sum('comparedMoves'), paired = sum('lossSamples');
  const matches = sum('engineMatches'), loss = sum('lossSum');
  const opponents = new Set(usable.map(entry => entry.opponent));
  const flagged = qualified.filter(entry => entry.player.verdict === 'review').length;
  const timed = usable.filter(entry => entry.player.metrics.timedMoves >= 8);
  const uniform = timed.filter(entry => {
    const m = entry.player.metrics;
    return m.meanTimeMs >= 750 && m.meanTimeMs <= 30000 && m.timingCv != null && m.timingCv <= 0.18;
  });
  const sufficient = usable.length >= 3 && opponents.size >= 2 && (compared >= 40 || paired >= 30);
  const matchSignal = compared >= 40 ? clamp((lowerMatchBound(matches, compared) - 0.65) / 0.2) : 0;
  const lossSignal = paired >= 30 && sum('lossOver50') / paired <= 0.1 ? clamp((50 - loss / paired) / 35) : 0;
  const timingSupport = timed.length >= 3 ? uniform.length / timed.length : 0;
  const quality = Math.max(matchSignal, lossSignal); // Correlated quality signals never add twice.
  const flagRate = qualified.length ? flagged / qualified.length : 0;
  const gameEvidence = 70 * flagRate + 20 * Math.min(1, flagged / 5);
  // An index of persistent quality + timing/change evidence, not a probability.
  // A score of 100 means maximum warning; it never means confirmed cheating.
  const warning = sufficient ? Math.round(Math.min(100, Math.max(100 * quality * timingSupport,
    flagged >= 2 ? gameEvidence : 0))) : null;
  return { version: 1, warning, status: !sufficient ? 'insufficient-data' : warning >= 60 ? 'flagged'
    : warning > 0 ? 'watch' : 'no-flag', flaggedGames: flagged, analysedGames: qualified.length,
    observedGames: human.length, flaggedRate: sufficient && qualified.length >= 3 ? Math.round(flagRate * 1000) / 10 : null,
    comparedMoves: compared, lossSamples: paired, opponents: opponents.size };
}
module.exports = { summarizeAccount };
