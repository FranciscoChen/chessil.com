const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { createTrainingApi, createTablebase, validateFen, normalizeTablebase,
  requestTablebase, progressInput } = require('../training-api');

const FEN = '8/8/8/8/4k3/8/4PK2/8 b - - 0 1';
const OTHER_FEN = '8/kP6/2K5/8/8/8/8/8 w - - 0 1';
function table(moves = [
  { uci: 'e4f4', san: 'Kf4', category: 'draw', dtz: 0 },
  { uci: 'e4d4', san: 'Kd4', category: 'win', dtz: 11 }
]) {
  return { category: 'draw', dtz: 0, checkmate: false, stalemate: false,
    insufficient_material: false, moves };
}
const fixtureCurriculum = { openings: [{ id: 'opening-d4', moves: ['d2d4'] }],
  endgames: [{ id: 'opposition', fen: FEN }], tactics: [] };

async function api(t, options = {}) {
  const handler = createTrainingApi({ origin: 'https://chessil.com', curriculum: () => fixtureCurriculum,
    log: () => {}, ...options });
  const server = http.createServer((req, res) => handler(req, res, { 'X-Fixture': 'kept' }, [null, req.headers['x-test-user'] || '0']));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return function call(route, { method = 'GET', body, raw, user = '0', headers = {} } = {}) {
    const content = raw ?? (body === undefined ? '' : JSON.stringify(body));
    return new Promise((resolve, reject) => {
      const request = http.request({ hostname: '127.0.0.1', port: server.address().port,
        path: '/api/training/' + route, method, agent: false,
        headers: { 'x-test-user': user, ...(content ? { 'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(content) } : {}), ...headers }
      }, response => {
        let text = '';
        response.setEncoding('utf8'); response.on('data', chunk => text += chunk);
        response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: JSON.parse(text) }));
      });
      request.on('error', reject); request.end(content);
    });
  };
}

test('curriculum returns the module export, while guest progress stays in frontend storage', async t => {
  const call = await api(t, { db: { query() { throw new Error('Guests must not use DB'); } } });
  const curriculum = await call('curriculum');
  assert.equal(curriculum.status, 200); assert.deepEqual(curriculum.body, fixtureCurriculum);
  assert.equal(curriculum.headers['x-fixture'], 'kept');
  assert.equal(curriculum.headers['cache-control'], 'no-store');
  assert.deepEqual((await call('progress')).body, { account: false, progress: {} });
  assert.equal((await call('progress', { method: 'POST', body: {} })).status, 401);
  for (const user of ['-1', 'n', '9223372036854775808']) {
    assert.equal((await call('progress', { user })).body.account, false);
  }
  assert.equal((await call('curriculum', { method: 'POST', body: {} })).status, 405);
  assert.equal((await call('__proto__')).status, 404);
  assert.equal((await call('progress?user_id=2')).status, 400);
});

test('accounts persist opening passes independently, with atomic monotonic merges and session-only identity', async t => {
  const saved = new Map(), queries = [];
  const call = await api(t, { db: { async query(sql, values) {
    queries.push({ sql, values });
    if (sql.startsWith('INSERT')) {
      assert.match(sql, /GREATEST\(training_progress.stage, EXCLUDED.stage\)/);
      assert.match(sql, /training_progress.completed OR EXCLUDED.completed/);
      const [user, lesson, stage, completed] = values, key = user + ':' + lesson;
      const prior = saved.get(key) || { stage: 0, completed: false };
      saved.set(key, { stage: Math.max(prior.stage, stage), completed: prior.completed || completed });
      return { rows: [] };
    }
    assert.match(sql, /WHERE user_id = \$1/);
    return { rows: [...saved].filter(([key]) => key.startsWith(values[0] + ':'))
      .map(([key, value]) => ({ lesson_id: key.split(':')[1], ...value })) };
  } } });
  const submit = (user, body) => call('progress', { method: 'POST', user, body });
  assert.equal((await submit('42', { lessonId: 'opening-d4', stage: 1, completed: false, updatedAt: Date.now() })).status, 200);
  await submit('42', { exerciseId: 'opening-d4', stage: 3, completed: true });
  await Promise.all([
    submit('42', { lessonId: 'opening-d4', stage: 0, completed: false, updatedAt: 0 }),
    submit('42', { lessonId: 'opposition', stage: 1, completed: false }),
    submit('43', { lessonId: 'opening-d4', stage: 2, completed: false })
  ]);
  assert.deepEqual((await call('progress', { user: '42' })).body, { account: true,
    progress: { 'opening-d4': { stage: 3, completed: true }, opposition: { stage: 1, completed: false } } });
  assert.deepEqual((await call('progress', { user: '43' })).body.progress,
    { 'opening-d4': { stage: 2, completed: false } });
  const before = queries.length;
  assert.equal((await submit('42', { lessonId: 'opening-d4', stage: 1, completed: true, user_id: '43' })).status, 400);
  assert.equal(queries.length, before);
});

test('progress rejects unknown IDs, conflicting aliases, invalid stages, timestamps, and prototype keys', () => {
  const valid = { lessonId: 'opening-d4', stage: 1, completed: false };
  for (const patch of [{ lessonId: 'missing' }, { stage: '1' }, { stage: -1 }, { stage: 4 }, { stage: 1.5 },
    { completed: 'true' }, { updatedAt: 'tomorrow' }, { updatedAt: -1 }, { exerciseId: 'opposition' }]) {
    assert.throws(() => progressInput({ ...valid, ...patch }, fixtureCurriculum), { status: 400 });
  }
  assert.throws(() => progressInput(JSON.parse('{"__proto__":{},"lessonId":"opening-d4","stage":1,"completed":false}'), fixtureCurriculum), { status: 400 });
  assert.equal(progressInput({ ...valid, updatedAt: '2026-11-07T00:00:00.000Z' }, fixtureCurriculum).stage, 1);
});

test('JSON inputs enforce sizes, same-origin writes, media types and hide database details', async t => {
  const call = await api(t, { db: { query: async () => { throw new Error('secret database host'); } } });
  const valid = { lessonId: 'opening-d4', stage: 1, completed: false };
  for (const [options, status] of [
    [{ raw: '{' }, 400], [{ raw: '[]' }, 400], [{ raw: 'null' }, 400],
    [{ raw: '{"x":"' + 'a'.repeat(4100) + '"}' }, 413],
    [{ body: valid, headers: { 'Content-Type': 'text/plain' } }, 415],
    [{ body: valid, headers: { 'Content-Encoding': 'gzip' } }, 415],
    [{ body: valid, headers: { Origin: 'https://evil.example' } }, 403],
    [{ body: valid, headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403]
  ]) assert.equal((await call('progress', { method: 'POST', user: '42', ...options })).status, status);
  const failure = await call('progress', { user: '42' });
  assert.equal(failure.status, 503); assert.doesNotMatch(JSON.stringify(failure.body), /secret/);
});

test('FEN validation checks seven-piece limit, rank widths, kings, pawns, checks and en passant', () => {
  assert.equal(validateFen(FEN), FEN);
  // Legal checks against the moving side are allowed.
  assert.equal(validateFen('8/8/8/8/8/4K3/6Q1/7k b - - 0 1').split(' ')[1], 'b');
  assert.equal(validateFen('8/8/8/3pP3/8/2K5/8/7k w - d6 0 1').split(' ')[3], 'd6');
  for (const bad of [null, {}, FEN + '\n', '8/8/8/8/8/8/8/8 w - - 0 1',
    '8/8/8/8/8/8/8/Kk6 w - - 0 1', // adjacent kings
    '8/8/8/8/8/4K3/6Q1/7k w - - 0 1', // nonmoving king in check
    'r6k/8/8/8/8/8/8/K7 b - - 0 1', // inactive king in rook check
    '7k/8/8/8/8/8/2n5/K7 b - - 0 1', // inactive king in knight check
    '7k/8/8/8/8/8/1p6/K7 b - - 0 1', // inactive king in pawn check
    '8/8/8/8/8/8/4k3/4K3 b - - 0 1',
    '8/8/8/8/8/8/4k3/P3K3 w - - 0 1',
    '8/8/8/8/8/8/4k3/4K2K w - - 0 1',
    '9/8/8/8/8/8/8/K6k w - - 0 1',
    '7/8/8/8/8/8/8/K6k w - - 0 1',
    '8/8/8/8/8/8/PPPPPP2/K6k w - - 0 1',
    '8/8/8/8/8/8/8/K6k w K - 0 1',
    '8/8/8/8/8/8/8/K6k x - - 0 1',
    '8/8/8/8/8/8/8/K6k w - - -1 1',
    '8/8/8/8/8/8/8/K6k w - - 0 0',
    '8/8/8/8/8/8/8/K6k w - d6 0 1',
    '8/8/8/3pP3/8/2K5/8/7k w - d6 1 1',
    '8/8/8/3pP3/8/2K5/8/7k w - d3 0 1'
  ]) assert.throws(() => validateFen(bad), { status: 400 }, String(bad));
});

test('tablebase preserves opponent perspective and treats equal-outcome DTZ alternatives as equivalent', () => {
  const unique = normalizeTablebase(table(), FEN);
  assert.equal(unique.bestMove, 'e4f4'); assert.equal(unique.uniqueOptimal, true);
  assert.equal(unique.categoryPerspective, 'side-to-move');
  assert.equal(unique.moveCategoryPerspective, 'opponent');
  const alternatives = table([
    { uci: 'e4f4', san: 'Kf4', category: 'draw', dtz: 0 },
    { uci: 'e4d4', san: 'Kd4', category: 'draw', dtz: 12 }
  ]);
  assert.deepEqual(normalizeTablebase(alternatives, FEN).optimalMoves, ['e4f4', 'e4d4']);
  assert.equal(normalizeTablebase(alternatives, FEN).uniqueOptimal, false);
  alternatives.moves[1].category = 'unknown';
  const unknown = normalizeTablebase(alternatives, FEN);
  assert.equal(unknown.certainty, 'unknown'); assert.equal(unknown.bestMove, null);
  assert.deepEqual(unknown.optimalMoves, []); assert.equal(unknown.uniqueOptimal, false);
  const terminal = normalizeTablebase({ ...table([]), checkmate: true, category: 'loss' }, FEN);
  assert.equal(terminal.bestMove, null); assert.equal(terminal.uniqueOptimal, false);
  assert.throws(() => normalizeTablebase(table([{ uci: 'e4f4', san: '<script>', category: 'draw', dtz: 0 }]), FEN), { status: 502 });
});

test('tablebase coalesces requests, expires cache, bounds concurrency and never caches errors', async () => {
  let clock = 0, calls = 0, release;
  const probe = () => { calls++; return new Promise(resolve => { release = resolve; }); };
  const lookup = createTablebase({ probe, now: () => clock, ttlMs: 10, cacheSize: 1, maxConcurrent: 1 });
  const first = lookup(FEN), second = lookup(FEN);
  await assert.rejects(lookup(OTHER_FEN), { status: 503 });
  release(table()); await Promise.all([first, second]); assert.equal(calls, 1);
  await lookup(FEN); assert.equal(calls, 1);
  clock = 11; const fresh = lookup(FEN); await Promise.resolve(); release(table()); await fresh; assert.equal(calls, 2);
  const other = lookup(OTHER_FEN); await Promise.resolve(); release(table()); await other;
  const evicted = lookup(FEN); await Promise.resolve(); release(table()); await evicted; assert.equal(calls, 4);
  let failures = 0;
  const broken = createTablebase({ probe: async () => { failures++; throw new Error('offline'); } });
  await assert.rejects(broken(FEN)); await assert.rejects(broken(FEN)); assert.equal(failures, 2);
});

test('GET and POST tablebase accept a FEN, reject conflicts and never forward invalid positions', async t => {
  let calls = 0;
  const call = await api(t, { tablebase: createTablebase({ probe: async () => { calls++; return table(); } }) });
  const encoded = encodeURIComponent(FEN);
  assert.equal((await call('tablebase?fen=' + encoded)).body.uniqueOptimal, true);
  assert.equal((await call('tablebase', { method: 'POST', body: { fen: FEN } })).body.bestMove, 'e4f4');
  assert.equal((await call('tablebase?fen=' + encoded, { method: 'POST' })).status, 200);
  assert.equal(calls, 1);
  for (const route of ['tablebase', 'tablebase?fen=bad', 'tablebase?fen=x&fen=y', 'tablebase?url=https://evil.example']) {
    assert.equal((await call(route)).status, 400);
  }
  assert.equal((await call('tablebase?fen=' + encoded, { method: 'POST', body: { fen: OTHER_FEN } })).status, 400);
  assert.equal((await call('tablebase', { method: 'POST', body: { fen: FEN, url: 'https://evil.example' } })).status, 400);
  assert.equal(calls, 1);
});

test('upstream transport has a total timeout and caps responses and translates failures', async () => {
  let destroyed = false;
  const hanging = () => { const req = new EventEmitter(); req.destroy = () => { destroyed = true; }; return req; };
  await assert.rejects(requestTablebase(FEN, { request: hanging, timeoutMs: 10 }), { status: 504 });
  assert.equal(destroyed, true);
  function upstream(status, body, abort = false) {
    return (url, options, callback) => {
      assert.equal(url, 'https://tablebase.lichess.ovh/standard?fen=' + encodeURIComponent(FEN));
      assert.equal(options.headers.Accept, 'application/json');
      const req = new EventEmitter(), response = new PassThrough();
      req.destroy = () => response.destroy(); response.statusCode = status;
      process.nextTick(() => { callback(response); if (abort) response.emit('aborted'); else response.end(body); });
      return req;
    };
  }
  assert.deepEqual(await requestTablebase(FEN, { request: upstream(200, JSON.stringify(table())) }), table());
  for (const [status, body, expected, abort] of [
    [404, '', 422], [429, '', 503], [500, '', 502], [302, '', 502],
    [200, '{', 502], [200, 'a'.repeat(128 * 1024 + 1), 502], [200, '', 502, true]
  ]) await assert.rejects(requestTablebase(FEN, { request: upstream(status, body, abort) }), { status: expected });
});

test('training routes are wired after session verification and preserve shared pool use', () => {
  const source = fs.readFileSync(require.resolve('../server'), 'utf8');
  assert.match(source, /createTrainingApi\(\{ db: lobbyDb, origin: domainname \}\)/);
  const route = source.slice(source.indexOf('function route('));
  assert.match(route, /return trainingApi\(req, res, resHeaders, sessiondata\)/);
});

test('archived live Syzygy seeds are legal and have exactly the planned principle move', async () => {
  const archive = require('../../database/training-tablebase-fixtures.json');
  const rules = {};
  vm.createContext(rules);
  vm.runInContext(fs.readFileSync(require.resolve('../src/chess-rules.js'), 'utf8'), rules);
  assert.ok(archive.positions.length >= 5);
  for (const seed of archive.positions) {
    assert.equal(validateFen(seed.fen), seed.fen);
    const result = normalizeTablebase(seed.response, seed.fen);
    assert.equal(result.category, seed.category);
    assert.equal(result.certainty, 'exact');
    assert.equal(result.uniqueOptimal, true, seed.principle);
    assert.deepEqual(result.optimalMoves, [seed.teachingMove], seed.principle);
    assert.ok(result.moves.length > 1, 'A principle seed needs genuine choices');
    assert.deepEqual(result.moves.map(move => move.uci).sort(), Array.from(rules.mg(seed.fen)).sort(),
      'Archived response must contain every legal alternative: ' + seed.principle);
  }
  await require('../../database/training-verify').verify({ offline: true });
});

test('SQL seed generation escapes content, rejects invalid puzzles and replaces its block reproducibly', () => {
  const { migrationFor, updatesFor, puzzlesFrom } = require('../../database/training-seed');
  const source = fs.readFileSync(require.resolve('../../database/training.sql'), 'utf8');
  const curriculum = { tactics: [{ id: 'runner', title: "Stop Black's runner", fen: FEN, moves: ['e4f4'], theme: 'pawn' }] };
  const migration = migrationFor(curriculum, source);
  assert.equal(migrationFor(curriculum, migration), migration);
  const updates = updatesFor('SELECT 1;\n', migration);
  assert.equal(updatesFor(updates, migration), updates);
  assert.ok(updates.startsWith('SELECT 1;\n'));
  assert.deepEqual(JSON.parse(migration.split('$training_puzzles$')[1]), puzzlesFrom(curriculum));
  assert.throws(() => puzzlesFrom({ tactics: [] }), /empty tactics/);
  assert.throws(() => puzzlesFrom({ tactics: [{ ...curriculum.tactics[0], id: undefined }] }), /Invalid/);
  assert.throws(() => puzzlesFrom({ tactics: [...curriculum.tactics, ...curriculum.tactics] }), /Invalid/);
  assert.throws(() => migrationFor({ tactics: [{ ...curriculum.tactics[0], title: '$training_puzzles$' }] }, source), /delimiter/);
});

test('all curriculum tactics match both persistent seed SQL and the hook migration exactly', () => {
  const curriculum = require('../training/curriculum');
  const { puzzlesFrom, migrationFor, updatesFor } = require('../../database/training-seed');
  const migration = fs.readFileSync(require.resolve('../../database/training.sql'), 'utf8');
  const updates = fs.readFileSync(require.resolve('../../database/updates.sql'), 'utf8');
  assert.ok(curriculum.tactics.length >= 8, 'The curated dataset must be populated');
  assert.deepEqual(JSON.parse(migration.split('$training_puzzles$')[1]), puzzlesFrom(curriculum));
  assert.equal(migrationFor(curriculum, migration), migration);
  assert.equal(updatesFor(updates, migration), updates);
  assert.match(migration, /REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(migration, /PRIMARY KEY \(user_id, lesson_id\)/);
  assert.match(migration, /stage BETWEEN 0 AND 3/);
});
