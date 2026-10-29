const { spawn } = require('child_process');
const { join } = require('path');
const { createInterface } = require('readline');

// Each game-server instance keeps one worker by default. Two instances share a VPS.
module.exports = function createMovegenPool({
  size = Number(process.env.MG_WORKERS || 1),
  maxQueue = 1024,
  timeoutMs = 2000,
  binary = join(__dirname, 'mg')
} = {}) {
  if (!Number.isInteger(size) || size < 1 || size > 32) {
    throw new Error('MG_WORKERS must be an integer between 1 and 32');
  }
  const queue = [];
  const workers = [];
  let closed = false;

  function finish(job, error, moves) {
    clearTimeout(job.timer);
    setImmediate(job.callback, error, moves);
  }

  function dispatch() {
    if (closed) return;
    for (const worker of workers) {
      if (worker.dead || worker.job || !queue.length) continue;
      worker.job = queue.shift();
      worker.child.stdin.write(worker.job.fen + '\n');
    }
  }

  function start(index) {
    const child = spawn(binary, [], { stdio: ['pipe', 'pipe', 'ignore'] });
    const worker = { child, job: null, dead: false, restart: null };
    workers[index] = worker;
    const lines = createInterface({ input: child.stdout });
    function fail(error) {
      if (worker.dead) return;
      worker.dead = true;
      lines.close();
      child.kill('SIGKILL');
      if (worker.job) {
        finish(worker.job, error);
        worker.job = null;
      }
      if (!closed) {
        worker.restart = setTimeout(() => { start(index); dispatch(); }, 1000);
      }
    }
    worker.fail = fail;
    child.on('error', fail);
    child.stdin.on('error', fail);
    child.on('exit', (code, signal) => fail(new Error(`mg exited (${signal || code})`)));
    lines.on('line', line => {
      if (!worker.job) return fail(new Error('Unexpected mg response'));
      const moves = line.trim();
      if (moves.length > 16384 || (moves && !/^(?:[a-h][1-8][a-h][1-8][qrbn]?)(?: [a-h][1-8][a-h][1-8][qrbn]?)*$/.test(moves))) {
        return fail(new Error('Invalid mg response'));
      }
      const job = worker.job;
      worker.job = null;
      finish(job, null, moves);
      dispatch();
    });
  }

  for (let i = 0; i < size; i++) start(i);

  return {
    generate(fen, callback) {
      if (closed || queue.length >= maxQueue) {
        return setImmediate(callback, new Error(closed ? 'Move generator closed' : 'Move generator queue full'));
      }
      if (typeof fen !== 'string' || fen.length > 128 || /[\r\n]/.test(fen)) {
        return setImmediate(callback, new Error('Invalid FEN request'));
      }
      const job = { fen, callback };
      job.timer = setTimeout(() => {
        const index = queue.indexOf(job);
        if (index !== -1) {
          queue.splice(index, 1);
          finish(job, new Error('Move generator queue timeout'));
        } else {
          const worker = workers.find(worker => worker.job === job);
          if (worker) worker.fail(new Error('Move generator request timeout'));
        }
      }, timeoutMs);
      queue.push(job);
      dispatch();
    },
    close() {
      closed = true;
      for (const job of queue.splice(0)) finish(job, new Error('Move generator closed'));
      for (const worker of workers) {
        clearTimeout(worker.restart);
        worker.fail(new Error('Move generator closed'));
      }
    }
  };
};
