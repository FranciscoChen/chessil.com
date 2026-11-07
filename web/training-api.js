'use strict';

const https = require('node:https');

const BODY_LIMIT = 4096;
const FEN_LIMIT = 128;
const CATEGORIES = new Set(['win', 'syzygy-win', 'maybe-win', 'cursed-win', 'draw',
  'blessed-loss', 'maybe-loss', 'syzygy-loss', 'loss', 'unknown']);
const CERTAIN = new Set(['win', 'cursed-win', 'draw', 'blessed-loss', 'loss']);
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/;
const fail = (status, message) => Object.assign(new Error(message), { status });
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function keysOnly(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) {
    throw fail(400, 'Unexpected input fields');
  }
}

function readJson(req) {
  const type = req.headers['content-type'] || '';
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type)) {
    req.resume();
    return Promise.reject(fail(415, 'Use application/json'));
  }
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
    req.resume();
    return Promise.reject(fail(415, 'Content encoding is not supported'));
  }
  return new Promise((resolve, reject) => {
    let size = 0, done = false;
    const chunks = [];
    const timer = setTimeout(() => finish(fail(408, 'Request body timed out')), 5000);
    function finish(error, value) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      chunks.length = 0;
      if (error) { req.resume(); reject(error); } else resolve(value);
    }
    req.on('data', chunk => {
      if (done) return;
      size += chunk.length;
      if (size > BODY_LIMIT) return finish(fail(413, 'Request body too large'));
      chunks.push(chunk);
    });
    req.once('error', () => finish(fail(400, 'Invalid request body')));
    req.once('aborted', () => finish(fail(400, 'Request aborted')));
    req.once('end', () => {
      if (done) return;
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!object(value)) throw new Error();
        finish(null, value);
      } catch (_) { finish(fail(400, 'Invalid JSON object')); }
    });
    const length = req.headers['content-length'];
    if (length !== undefined && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT)) {
      finish(fail(413, 'Request body too large'));
    }
  });
}

// Board indices run from a8 to h1. Validate legality relevant to a Syzygy probe,
// including the king of the side that just moved not being left in check.
function attacked(board, target, byWhite) {
  const tr = Math.floor(target / 8), tf = target % 8;
  for (let from = 0; from < 64; from++) {
    const piece = board[from];
    if (!piece || (piece === piece.toUpperCase()) !== byWhite) continue;
    const dr = tr - Math.floor(from / 8), df = tf - from % 8;
    const ar = Math.abs(dr), af = Math.abs(df), kind = piece.toLowerCase();
    if (kind === 'p' && dr === (byWhite ? -1 : 1) && af === 1) return true;
    if (kind === 'n' && ar * af === 2) return true;
    if (kind === 'k' && Math.max(ar, af) === 1) return true;
    if (from === target) continue;
    if (!((['b', 'q'].includes(kind) && ar === af) ||
          (['r', 'q'].includes(kind) && (dr === 0 || df === 0)))) continue;
    const step = Math.sign(dr) * 8 + Math.sign(df);
    let blocked = false;
    for (let at = from + step; at !== target; at += step) {
      if (board[at]) { blocked = true; break; }
    }
    if (!blocked) return true;
  }
  return false;
}

function validateFen(value) {
  if (typeof value !== 'string' || value.length > FEN_LIMIT || /[\r\n\t]/.test(value)) {
    throw fail(400, 'Invalid FEN');
  }
  const fields = value.trim().split(/ +/);
  if (fields.length !== 6 || !/^[wb]$/.test(fields[1]) || fields[2] !== '-' ||
      !/^(?:-|[a-h][36])$/.test(fields[3]) || !/^\d{1,6}$/.test(fields[4]) ||
      !/^[1-9]\d{0,6}$/.test(fields[5])) {
    throw fail(400, 'Expected a standard six-field FEN without castling rights');
  }
  const ranks = fields[0].split('/'), board = [], pieces = [];
  if (ranks.length !== 8) throw fail(400, 'Invalid FEN ranks');
  for (const rank of ranks) {
    if (!/^[prnbqkPRNBQK1-8]+$/.test(rank) || /[1-8]{2}/.test(rank)) throw fail(400, 'Invalid FEN rank');
    let width = 0;
    for (const symbol of rank) {
      if (/^[1-8]$/.test(symbol)) {
        const empty = Number(symbol);
        board.push(...Array(empty).fill(null)); width += empty;
      } else { pieces.push(symbol); board.push(symbol); width++; }
    }
    if (width !== 8) throw fail(400, 'Invalid FEN rank width');
  }
  if (pieces.length > 7 || pieces.filter(p => p === 'K').length !== 1 ||
      pieces.filter(p => p === 'k').length !== 1 ||
      [...board.slice(0, 8), ...board.slice(56)].some(p => p && p.toLowerCase() === 'p')) {
    throw fail(400, 'Tablebase positions require both kings, at most seven pieces, and no back-rank pawns');
  }
  const inactiveWhite = fields[1] === 'b';
  if (attacked(board, board.indexOf(inactiveWhite ? 'K' : 'k'), !inactiveWhite)) {
    throw fail(400, 'Illegal FEN: the side that just moved is in check');
  }
  if (fields[3] !== '-') {
    const expectedRank = fields[1] === 'w' ? '6' : '3';
    const target = (8 - Number(fields[3][1])) * 8 + 'abcdefgh'.indexOf(fields[3][0]);
    const pawn = fields[1] === 'w' ? 'p' : 'P';
    const offset = fields[1] === 'w' ? 8 : -8;
    if (fields[3][1] !== expectedRank || board[target] || board[target + offset] !== pawn ||
        board[target - offset] || Number(fields[4]) !== 0) throw fail(400, 'Invalid en passant FEN');
  }
  fields[4] = String(Number(fields[4]));
  return fields.join(' ');
}

function normalizeTablebase(data, fen) {
  if (!object(data) || !CATEGORIES.has(data.category) ||
      !(data.dtz === null || Number.isSafeInteger(data.dtz)) ||
      !Array.isArray(data.moves) || data.moves.length > 218 ||
      ['checkmate', 'stalemate', 'insufficient_material'].some(key => typeof data[key] !== 'boolean')) {
    throw fail(502, 'Invalid tablebase response');
  }
  const seen = new Set();
  const moves = data.moves.map(move => {
    if (!object(move) || typeof move.uci !== 'string' || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move.uci) ||
        seen.has(move.uci) || typeof move.san !== 'string' || !/^[a-zA-Z0-9=+#x-]{1,20}$/.test(move.san) ||
        !CATEGORIES.has(move.category) || !(move.dtz === null || Number.isSafeInteger(move.dtz))) {
      throw fail(502, 'Invalid tablebase move');
    }
    seen.add(move.uci);
    return { uci: move.uci, san: move.san, category: move.category, dtz: move.dtz };
  });
  // Provider order selects a reliable game reply. Category-equivalent alternatives
  // remain acceptable even when DTZ sorting prefers a particular conversion.
  const certain = CERTAIN.has(data.category) && moves.every(move => CERTAIN.has(move.category));
  const optimalMoves = certain && moves.length
    ? moves.filter(move => move.category === moves[0].category).map(move => move.uci) : [];
  return { fen, source: 'lichess', category: data.category, dtz: data.dtz,
    categoryPerspective: 'side-to-move', moveCategoryPerspective: 'opponent',
    checkmate: data.checkmate, stalemate: data.stalemate, insufficientMaterial: data.insufficient_material,
    moves, bestMove: certain && moves.length ? moves[0].uci : null, optimalMoves,
    uniqueOptimal: optimalMoves.length === 1, certainty: certain ? 'exact' : 'unknown' };
}

// Fixed upstream: clients supply only a validated FEN, never a URL or hostname.
function requestTablebase(fen, { request = https.get, timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    let done = false, upstream;
    const timer = setTimeout(() => {
      finish(fail(504, 'Tablebase timed out'));
      upstream?.destroy();
    }, timeoutMs);
    function finish(error, data) {
      if (done) return;
      done = true; clearTimeout(timer);
      if (error) reject(error); else resolve(data);
    }
    try {
      upstream = request('https://tablebase.lichess.ovh/standard?fen=' + encodeURIComponent(fen), {
        headers: { Accept: 'application/json', 'User-Agent': 'chessil-training/1.0' }
      }, response => {
        response.once('error', () => finish(fail(502, 'Tablebase unavailable')));
        if (done) { response.destroy(); return; }
        if (response.statusCode !== 200) {
          finish(fail(response.statusCode === 404 ? 422 : response.statusCode === 429 ? 503 : 502,
            response.statusCode === 404 ? 'Position not available in tablebase' : 'Tablebase unavailable'));
          response.destroy();
          return;
        }
        let size = 0;
        const chunks = [];
        response.on('data', chunk => {
          if (done) return;
          size += chunk.length;
          if (size > 128 * 1024) { finish(fail(502, 'Tablebase response too large')); upstream.destroy(); return; }
          chunks.push(chunk);
        });
        response.once('aborted', () => finish(fail(502, 'Incomplete tablebase response')));
        response.once('end', () => {
          if (done) return;
          try { finish(null, JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
          catch (_) { finish(fail(502, 'Invalid tablebase response')); }
        });
      });
      upstream.once('error', () => finish(fail(502, 'Tablebase unavailable')));
    } catch (_) { finish(fail(502, 'Tablebase unavailable')); }
  });
}

function createTablebase({ probe = requestTablebase, now = Date.now, ttlMs = 600000,
  cacheSize = 512, maxConcurrent = 4 } = {}) {
  const cache = new Map(), pending = new Map();
  return async value => {
    const fen = validateFen(value), cached = cache.get(fen);
    if (cached && cached.expires > now()) return cached.value;
    cache.delete(fen);
    if (pending.has(fen)) return pending.get(fen);
    if (pending.size >= maxConcurrent) throw fail(503, 'Tablebase busy; try again shortly');
    const work = Promise.resolve().then(() => probe(fen)).then(data => {
      const result = normalizeTablebase(data, fen);
      if (cache.size >= cacheSize) cache.delete(cache.keys().next().value);
      cache.set(fen, { value: result, expires: now() + ttlMs });
      return result;
    }).finally(() => pending.delete(fen));
    pending.set(fen, work);
    return work;
  };
}

function curriculumIds(curriculum) {
  const ids = new Set();
  function visit(value) {
    if (!object(value) && !Array.isArray(value)) return;
    if (typeof value.id === 'string' && ID.test(value.id)) ids.add(value.id);
    Object.values(value).forEach(visit);
  }
  visit(curriculum);
  return ids;
}

function progressInput(value, curriculum) {
  keysOnly(value, ['lessonId', 'exerciseId', 'stage', 'completed', 'updatedAt']);
  const lessonId = value.lessonId ?? value.exerciseId;
  if (typeof lessonId !== 'string' || !ID.test(lessonId) ||
      (value.lessonId !== undefined && value.exerciseId !== undefined && value.lessonId !== value.exerciseId) ||
      !curriculumIds(curriculum).has(lessonId)) throw fail(400, 'Unknown lessonId');
  if (!Number.isInteger(value.stage) || value.stage < 0 || value.stage > 3 ||
      typeof value.completed !== 'boolean') throw fail(400, 'Expected stage 0–3 and boolean completed');
  const validTimestamp = (typeof value.updatedAt === 'number' && Number.isSafeInteger(value.updatedAt) && value.updatedAt >= 0 && value.updatedAt <= 8640000000000000) ||
    (typeof value.updatedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value.updatedAt) && value.updatedAt.length <= 35 && Number.isFinite(Date.parse(value.updatedAt)));
  if (value.updatedAt !== undefined && !validTimestamp) {
    throw fail(400, 'Invalid updatedAt');
  }
  return { lessonId, stage: value.stage, completed: value.completed };
}

function createTrainingApi({ db, origin, curriculum = () => require('./training/curriculum'),
  tablebase = createTablebase(), log = console.error } = {}) {
  const expectedOrigin = origin ? new URL(origin).origin : null;
  return async function trainingApi(req, res, headers = {}, session) {
    function send(status, value, extra = {}) {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
      res.end(JSON.stringify(value));
    }
    try {
      if (req.url.length > 2048) throw fail(414, 'Request URL too long');
      const url = new URL(req.url, 'http://training.invalid');
      const route = url.pathname.slice('/api/training/'.length);
      const routes = { curriculum: ['GET'], progress: ['GET', 'POST'], tablebase: ['GET', 'POST'] };
      const allowed = Object.hasOwn(routes, route) && routes[route];
      if (!allowed) throw fail(404, 'Not found');
      if (!allowed.includes(req.method)) {
        req.resume();
        return send(405, { error: 'Method not allowed' }, { Allow: allowed.join(', ') });
      }
      for (const key of url.searchParams.keys()) {
        if (route !== 'tablebase' || key !== 'fen' || url.searchParams.getAll(key).length !== 1) throw fail(400, 'Unexpected query parameters');
      }
      if (req.method === 'POST') {
        if (req.headers['sec-fetch-site'] === 'cross-site' ||
            (req.headers.origin && req.headers.origin !== expectedOrigin)) {
          throw fail(403, 'Cross-origin request denied');
        }
      }
      if (route === 'curriculum') return send(200, curriculum());
      if (route === 'tablebase') {
        let fen = url.searchParams.get('fen');
        if (req.method === 'POST') {
          const body = fen !== null && !req.headers['transfer-encoding'] &&
            (!req.headers['content-length'] || req.headers['content-length'] === '0') ? {} : await readJson(req);
          keysOnly(body, ['fen']);
          if (fen !== null && body.fen !== undefined && fen !== body.fen) throw fail(400, 'Conflicting FEN inputs');
          fen = body.fen ?? fen;
        }
        return send(200, await tablebase(fen));
      }
      // Identity comes exclusively from the verified Redis session, never JSON.
      const user = String(session?.[1] ?? '0');
      const account = /^[1-9]\d{0,18}$/.test(user) && BigInt(user) <= 9223372036854775807n;
      if (!account) {
        if (req.method === 'POST') throw fail(401, 'Sign in to sync training progress; guests use local storage');
        return send(200, { account: false, progress: {} });
      }
      if (req.method === 'POST') {
        const input = progressInput(await readJson(req), curriculum());
        // Stale tabs/devices cannot erase a finished pass. Client clocks are not
        // trusted; updatedAt is accepted for the controller but DB time is used.
        await db.query(`INSERT INTO training_progress (user_id, lesson_id, stage, completed)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, lesson_id) DO UPDATE SET
            stage = GREATEST(training_progress.stage, EXCLUDED.stage),
            completed = training_progress.completed OR EXCLUDED.completed,
            updated_at = NOW()`, [user, input.lessonId, input.stage, input.completed]);
      }
      const { rows } = await db.query('SELECT lesson_id, stage, completed FROM training_progress WHERE user_id = $1 ORDER BY lesson_id', [user]);
      const progress = Object.fromEntries(rows.map(row => [row.lesson_id, { stage: row.stage, completed: row.completed }]));
      return send(200, { account: true, progress });
    } catch (error) {
      req.resume();
      if (!error.status) log('Training API:', error.message);
      return send(error.status || 503, { error: error.status ? error.message : 'Training service unavailable' });
    }
  };
}

module.exports = { createTrainingApi, createTablebase, validateFen, requestTablebase,
  normalizeTablebase, progressInput };
