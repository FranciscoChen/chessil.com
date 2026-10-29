const { spawn } = require('child_process');
const { createInterface } = require('readline');
const { join } = require('path');
const { SearchSummary, parseBestmove } = require('./uci');

// One engine, one search, one permanent output reader. All waits are bounded.
class Stockfish {
  constructor({ binary = process.env.STOCKFISH_BIN || join(__dirname, 'stockfish') } = {}) {
    this.options = new Map();
    this.waiter = null;
    this.search = null;
    this.failure = null;
    this.stderr = '';
    this.lastGame = null;
    this.child = spawn(binary, [], { cwd: __dirname, stdio: ['pipe', 'pipe', 'pipe'] });
    this.lines = createInterface({ input: this.child.stdout });
    this.lines.on('line', line => this.onLine(line));
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', chunk => { this.stderr = (this.stderr + chunk).slice(-4096); });
    this.child.on('error', error => this.fail(error));
    this.child.stdin.on('error', error => this.fail(error));
    this.child.on('exit', (code, signal) => this.fail(new Error(`Stockfish exited (${signal || code}): ${this.stderr}`)));
  }
  fail(error) {
    if (this.failure) return;
    this.failure = error;
    if (this.waiter) this.waiter.reject(error);
    if (this.search) this.search.reject(error);
    this.child.kill('SIGKILL');
  }
  write(command) {
    if (this.failure) throw this.failure;
    this.child.stdin.write(command + '\n');
  }
  waitFor(reply, command, timeout = 10000) {
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.fail(new Error(`Stockfish ${reply} timed out`)), timeout);
      const finish = (callback, value) => { clearTimeout(timer); this.waiter = null; callback(value); };
      this.waiter = { reply, resolve: () => finish(resolve), reject: error => finish(reject, error) };
      try { this.write(command); } catch (error) { this.waiter.reject(error); }
    });
  }
  onLine(raw) {
    const line = raw.trim();
    if (/^info string (?:ERROR|CRITICAL ERROR)\b/.test(line)) return this.fail(new Error(line));
    if (line.length > 65536) return this.fail(new Error('Stockfish output line too long'));
    const option = /^option name (.+) type (\w+)(.*)$/.exec(line);
    if (option) {
      const min = /\bmin (-?\d+)/.exec(option[3]);
      const max = /\bmax (-?\d+)/.exec(option[3]);
      this.options.set(option[1], { min: min ? Number(min[1]) : undefined, max: max ? Number(max[1]) : undefined });
    }
    if (this.waiter && line === this.waiter.reply) this.waiter.resolve();
    if (!this.search) return;
    try {
      if (line.startsWith('bestmove')) {
        const best = parseBestmove(line);
        this.search.resolve(this.search.summary.finish(best));
      } else this.search.summary.add(line);
    } catch (error) { this.fail(error); }
  }
  setOption(name, value) {
    const option = this.options.get(name);
    if (!option) return;
    if (typeof value === 'number' && option.min !== undefined && option.max !== undefined) {
      value = Math.max(option.min, Math.min(option.max, Math.round(value)));
    }
    this.write(`setoption name ${name} value ${value}`);
  }
  async initialize() {
    await this.waitFor('uciok', 'uci');
    this.setOption('Threads', 1);
    this.setOption('Hash', 64);
    this.setOption('MultiPV', 1);
    this.setOption('Move Overhead', 20);
    this.setOption('SyzygyPath', join(__dirname, 'syzygy'));
    await this.waitFor('readyok', 'isready');
  }
  async analyse(job) {
    if (this.search) throw new Error('Stockfish already searching');
    const game = job.uuidhm.split('-')[0];
    if (game !== this.lastGame) { if (!job.bot) this.write('ucinewgame'); this.lastGame = game; }
    this.setOption('UCI_LimitStrength', !job.bot && job.elo !== 0);
    this.setOption('Skill Level', job.bot ? job.skill : 20);
    // Strength limiting already searches multiple candidates. Ask for their
    // scores too, so the chosen weaker move gets its own evaluation.
    this.setOption('MultiPV', job.bot ? (job.skill < 20 ? 4 : 1) : job.elo === 0 ? 1 : 4);
    if (job.elo !== 0) this.setOption('UCI_Elo', job.elo);
    this.setOption('SyzygyProbeLimit', job.syzygy);
    await this.waitFor('readyok', 'isready');
    this.write('position startpos' + (job.moves ? ' moves ' + job.moves : ''));
    const activeClock = job.uuidhm.endsWith('w') ? job.wtime : job.btime;
    const budget = Math.max(1, Math.floor(Math.min(job.mtime, Math.max(1, activeClock - 20))));
    return new Promise((resolve, reject) => {
      let killTimer;
      const timer = setTimeout(() => {
        try { this.write('stop'); } catch (error) { return this.fail(error); }
        killTimer = setTimeout(() => this.fail(new Error('Stockfish search timed out')), 1000);
      }, budget + 2000);
      const finish = (callback, result) => {
        clearTimeout(timer); clearTimeout(killTimer); this.search = null; callback(result);
      };
      this.search = { summary: new SearchSummary(), resolve: value => finish(resolve, value), reject: error => finish(reject, error) };
      try { this.write(`go wtime ${job.wtime} btime ${job.btime} winc ${job.winc} binc ${job.binc} movetime ${budget}${job.nodes ? ' nodes ' + job.nodes : ''}`); }
      catch (error) { this.search.reject(error); }
    });
  }
  close() {
    this.lines.close();
    this.fail(new Error('Stockfish worker closed'));
  }
}
module.exports = Stockfish;
