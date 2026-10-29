const http = require('http');
const Stockfish = require('./stockfish-process');
const { movePattern } = require('./uci');
const obs = require('../observability').createObserver('engine-worker');

function parseJob(reply) {
  const [uuidhm, ...parts] = reply.trim().split(/\s+/);
  if (!/^[a-zA-Z0-9-]{1,127}[wb]$/.test(uuidhm || '') || parts.length < 7) throw new Error('Invalid queue job');
  const numbers = parts.slice(0, 7).map(Number);
  if (numbers.some(n => !Number.isFinite(n) || n < 0 || n > 2147483647)) throw new Error('Invalid engine limits');
  const [wtime, btime, winc, binc, mtime, elo, syzygy] = numbers.map(Math.round);
  if (mtime < 1 || mtime > 60000 || syzygy > 7 || elo > 10000) throw new Error('Invalid search settings');
  let botSettings = {};
  let moveOffset=7;
  if (parts[7]?.startsWith('bot:')) {
    const match=/^bot:swift:([1-8])$/.exec(parts[7]);
    if (!match) throw new Error('Invalid bot profile');
    botSettings=require('./bots/swift').settings(Number(match[1])); moveOffset=8;
  }
  const moves = parts.slice(moveOffset);
  if (!moves.every(move => movePattern.test(move))) throw new Error('Invalid UCI move history');
  return { uuidhm, wtime, btime, winc, binc, mtime, elo, syzygy, ...botSettings, moves: moves.join(' ') };
}

function queueRequest(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request({ hostname: process.env.QUEUE_HOST || '127.0.0.1',
      port: Number(process.env.QUEUE_PORT || 8092), path, headers }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
        if (body.length > 65536) request.destroy(new Error('Queue response too large'));
      });
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, body }));
    });
    request.setTimeout(3000, () => request.destroy(new Error('Queue request timed out')));
    request.on('error', reject);
    request.end();
  });
}

async function run() {
  obs.installProcessHandlers();
  let engine, stopping = false, idle = 0, shutdownTimer;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const stop = signal => {
    if (stopping) return;
    stopping = true;
    obs.log('info', 'shutdown_start', { signal });
    // Finish the current search and publish its result before exiting.
    shutdownTimer = setTimeout(() => { engine?.close(); process.exit(0); }, 10000);
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  async function publish(uuidhm, result) {
    let attempts = 0;
    while (!stopping || attempts < 3) {
      try {
        const response = await queueRequest('/set', {
          uuidhm, bm: result.bestmove || '0000', eval: result.eval || '',
          ...(result.analysis ? { analysis: JSON.stringify(result.analysis) } : {}),
          ...(result.ponder ? { ponder: result.ponder } : {}),
          ...(result.error ? { error: result.error.replace(/[^\x20-\x7e]/g, ' ').slice(0, 256) } : {})
        });
        if (response.status !== 200) throw new Error('Queue rejected result: ' + response.status);
        return;
      } catch (error) {
        attempts++;
        obs.count('queue_set_error');
        obs.log('error', 'queue_set_error', { uuidhm, error: error.message });
        await sleep(Math.min(1000, attempts * 100));
      }
    }
  }

  obs.log('info', 'worker_start');
  try {
    while (!stopping) {
      try {
        if (!engine || engine.failure) {
          engine?.close();
          engine = new Stockfish();
          await engine.initialize();
          obs.log('info', 'stockfish_ready');
        }
        if (stopping) break;
        const response = await queueRequest('/lpop');
        if (response.status === 404) { await sleep(Math.min(1000, ++idle * 32)); continue; }
        if (response.status !== 200) throw new Error('Queue pop failed: ' + response.status);
        idle = 0;
        let job, result;
        try {
          job = parseJob(response.body);
          result = await engine.analyse(job);
          if (result.bestmove && !result.eval && !job.bot) throw new Error('Stockfish returned a move without a score');
          obs.log('info', 'analysis_result', { uuidhm: job.uuidhm, bm: result.bestmove,
            eval: result.eval, depth: result.analysis?.depth, nodes: result.analysis?.nodes });
        } catch (error) {
          obs.count('analysis_error');
          obs.log('error', 'analysis_error', { error: error.message });
          const uuidhm = response.body.split(/\s+/)[0];
          if (!/^[a-zA-Z0-9-]{1,128}$/.test(uuidhm)) continue;
          job = { uuidhm };
          result = { error: error.message };
        }
        await publish(job.uuidhm, result);
      } catch (error) {
        obs.count('worker_retry');
        obs.log('error', 'worker_retry', { error: error.message });
        await sleep(1000);
      }
    }
  } finally {
    clearTimeout(shutdownTimer);
    engine?.close();
    process.removeListener('SIGTERM', stop);
    process.removeListener('SIGINT', stop);
  }
}

if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { parseJob, run };
