// Parse individual UCI lines. Transport chunk boundaries have no protocol meaning.
const movePattern = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const integer = value => /^[+-]?\d+$/.test(value || '') && Number.isSafeInteger(Number(value)) ? Number(value) : undefined;
const numericFields = new Set(['depth', 'seldepth', 'multipv', 'nodes', 'nps', 'hashfull', 'tbhits', 'time']);

function parseInfo(line) {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'info' || tokens[1] === 'string') return null;
  const info = { multipv: 1 };
  for (let i = 1; i < tokens.length; i++) {
    const key = tokens[i];
    if (numericFields.has(key)) {
      const value = integer(tokens[++i]);
      if (value !== undefined && value >= 0) info[key] = value;
    } else if (key === 'score') {
      const type = tokens[++i], value = integer(tokens[++i]);
      if ((type === 'cp' || type === 'mate') && value !== undefined) info.score = { type, value };
    } else if ((key === 'lowerbound' || key === 'upperbound') && info.score) {
      info.score.bound = key;
    } else if (key === 'wdl') {
      const values = tokens.slice(i + 1, i + 4).map(integer);
      if (values.length === 3 && values.every(n => n !== undefined && n >= 0)) info.wdl = values;
      i += 3;
    } else if (key === 'pv') {
      info.pv = [];
      while (movePattern.test(tokens[i + 1] || '') && info.pv.length < 256) info.pv.push(tokens[++i]);
    }
  }
  return info.score ? info : null;
}

function parseBestmove(line) {
  const tokens = line.trim().split(/\s+/);
  if (tokens[0] !== 'bestmove') return null;
  const bestmove = tokens[1];
  if (!movePattern.test(bestmove || '') && bestmove !== '(none)' && bestmove !== '0000') {
    throw new Error('Invalid UCI bestmove');
  }
  const result = { bestmove: movePattern.test(bestmove) ? bestmove : null };
  if (tokens[2] === 'ponder' && movePattern.test(tokens[3] || '')) result.ponder = tokens[3];
  return result;
}

class SearchSummary {
  constructor() { this.lines = new Map(); }
  add(line) {
    const info = parseInfo(line);
    if (!info || info.multipv < 1 || info.multipv > 256) return;
    const previous = this.lines.get(info.multipv);
    if (previous && (previous.depth || 0) > (info.depth || 0)) return;
    if (previous && previous.depth === info.depth && !previous.score.bound && info.score.bound) return;
    this.lines.set(info.multipv, info);
  }
  finish(best) {
    // Limited-strength searches may choose a secondary PV. Prefer its score.
    const analysis = [...this.lines.values()].find(info => info.pv?.[0] === best.bestmove)
      || this.lines.get(1) || null;
    return { ...best, eval: analysis ? `${analysis.score.type} ${analysis.score.value}` : null, analysis };
  }
}

module.exports = { parseInfo, parseBestmove, SearchSummary, movePattern };
