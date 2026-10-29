// Public engine API. Nginx supplies the peer IP; all work routes require the
// service token. Foreground bot play and bounded fair-play sampling share workers.
const http = require('http');
const Redis = require('ioredis');
const { Pool } = require('pg');
const config = require('../config.json');
const queueRequest = require('./queue-client');
const swift = require('./bots/swift');
const { parseJob } = require('./sf');
const obs = require('../observability').createObserver('engine');
obs.installProcessHandlers();
const redis = new Redis();
const database = new Pool({ connectionString: config.shared.postgresUrl, max: 2,
  connectionTimeoutMillis: 5000, statement_timeout: 5000, idleTimeoutMillis: 30000 });
database.on('error', error => obs.log('error', 'database_pool_error', { error: error.message }));
const fairPlay = require('./fair-play-service')({ redis, database, obs });
const gameIdPattern = /^[a-zA-Z0-9]{9}$/;
let shuttingDown = false;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '', bytes = 0;
    req.setTimeout(5000, () => req.destroy(new Error('Request body timed out')));
    req.setEncoding('utf8');
    req.on('data', chunk => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 128 * 1024) { reject(Object.assign(new Error('Request too large'), { status: 413 })); req.destroy(); return; }
      body += chunk;
    });
    req.on('error', reject);
    req.on('end', () => {
      req.setTimeout(0);
      try { resolve(JSON.parse(body)); } catch (error) { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
    });
  });
}
function send(res, status, data) {
  if (res.destroyed || res.writableEnded) return;
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
async function play(payload) {
  if (!payload || !gameIdPattern.test(payload.gameid || '')) throw Object.assign(new Error('Invalid gameid'), { status: 400 });
  const moves = typeof payload.moves === 'string' ? payload.moves : '';
  const plies = moves ? moves.trim().split(/\s+/).length : 0;
  const turn = plies % 2 ? 'b' : 'w';
  if (payload.turn != null && payload.turn !== turn) throw Object.assign(new Error('Invalid turn'), { status: 400 });
  const uuidhm = payload.uuidhm || `${payload.gameid}-${plies}-${turn}`;
  if (payload.bot != null && payload.bot !== 'swift') throw Object.assign(new Error('Unknown bot program'),{status:400});
  const profile = payload.bot === 'swift' ? swift.settings(payload.difficulty) : null;
  const sf = [uuidhm, payload.wtime, payload.btime, payload.winc, payload.binc,
    profile ? profile.mtime : 256, profile ? 0 : payload.elo, profile ? 0 : 7,
    ...(profile ? ['bot:swift:' + profile.difficulty] : []), moves].join(' ');
  try { parseJob(sf); } catch (error) { throw Object.assign(error, { status: 400 }); }
  const response = await queueRequest('/lpush', { sf });
  if (response.status !== 200) throw Object.assign(new Error('Engine queue busy'), { status: 503 });
  let result;
  try { result = JSON.parse(response.body); } catch (error) { throw new Error('Invalid engine response'); }
  if (result.error || result.uuidhm !== uuidhm) throw new Error(result.error || 'Mismatched engine result');
  if (profile) result.bot = { program:'swift', difficulty:profile.difficulty,
    thinkTimeMs:swift.thinkTime({remaining:Number(turn==='w'?payload.wtime:payload.btime),
      increment:Number(turn==='w'?payload.winc:payload.binc),plies}), searchLimitMs:profile.mtime };
  return result;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: !shuttingDown });
  if (req.method !== 'POST' || req.headers.authorization !== config.shared.engineAuthToken ||
      !Object.prototype.hasOwnProperty.call(config.engine.myServers, req.headers['x-real-ip'])) {
    return send(res, 401, { error: 'Unauthorized' });
  }
  if (shuttingDown) return send(res, 503, { error: 'Service restarting' });
  try {
    if (!['/play', '/check', '/fair-play/report'].includes(req.url)) return send(res, 404, { error: 'Not found' });
    const payload = await readJson(req);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return send(res, 400, { error: 'Expected an object' });
    if (req.url === '/play') return send(res, 200, await play(payload));
    const gameid = req.headers.id || payload.gameid;
    if (!gameIdPattern.test(gameid || '')) return send(res, 400, { error: 'Invalid gameid' });
    if (req.url === '/fair-play/report') {
      const report = await fairPlay.report(gameid);
      return send(res, report ? 200 : 404, report || { error: 'No report' });
    }
    try { fairPlay.validate(payload); } catch (error) { return send(res, 400, { error: error.message }); }
    send(res, 200, await fairPlay.ingest(gameid, payload));
  } catch (error) {
    obs.count('request_error');
    obs.log('warn', 'request_error', { route: req.url, error: error.message });
    send(res, error.status || 502, { error: error.message });
  }
});
const port = Number(process.env.PORT || config.engine.port);
server.listen(port);
obs.log('info', 'server_listen', { port });
server.on('error', error => obs.log('error', 'server_error', { error: error.message }));

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  obs.log('info', 'shutdown_start', { signal });
  const deadline = setTimeout(() => process.exit(0), 20000);
  Promise.all([new Promise(resolve => server.close(resolve)), fairPlay.close()])
    .then(() => Promise.all([redis.quit(), database.end()]))
    .catch(error => obs.log('error', 'shutdown_error', { error: error.message }))
    .finally(() => { clearTimeout(deadline); process.exit(0); });
}
process.on('SIGTERM', () => shutdown('sigterm'));
process.on('SIGINT', () => shutdown('sigint'));
