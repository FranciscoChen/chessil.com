const glicko2 = require('glicko2');
const { ucifen, wpiececount, bpiececount } = require('./chess');
const settings = { tau: 0.5, rating: 1500, rd: 200, vol: 0.06 };
const queue = 'game:results:pending';
const leaseMs = 30000;

// A lease moves the deadline rather than removing the job. A crash or a database
// failure therefore leaves work recoverable by either Node instance.
const claimLua = `
local due = tonumber(redis.call('ZSCORE', KEYS[1], ARGV[1]) or '-1')
if due < 0 or due > tonumber(ARGV[2]) then return 0 end
redis.call('ZADD', KEYS[1], tonumber(ARGV[2]) + tonumber(ARGV[3]), ARGV[1])
return 1
`;

function outcome(snapshot) {
  const finished = Number(snapshot.f);
  if (finished === 1) return snapshot.t === 'w' ? 0 : 1;
  if (finished === 7) return snapshot.e.slice(-2, -1) === 'w' ? 0 : 1;
  if (finished === 6) {
    const position = ucifen(snapshot.m || '').split(' ')[0];
    return snapshot.t === 'w' ? (bpiececount(position) > 1 ? 0 : 0.5)
      : (wpiececount(position) > 1 ? 1 : 0.5);
  }
  return finished === 9 ? null : 0.5;
}

function terminalMessage(snapshot) {
  const code = Number(snapshot.f);
  if (code === 6) return 't:' + snapshot.t + ':0:6';
  if (code === 7 || code === 8) {
    const event = snapshot.e.slice(-2);
    const timestamp = snapshot.k.split(' ').pop();
    return `e:${event[1]}:${event[0]}:${timestamp}:${code}`;
  }
  return 'f' + code;
}

module.exports = function createResultWorker({ redis, database, broadcastGameUpdate }) {
  let closed = false;
  let polling = false;
  const inFlight = new Set();

  async function save(gameid, snapshot) {
    const finished = Number(snapshot.f);
    const score = outcome(snapshot);
    // Notify before SQL: a database outage must not leave the board playing.
    if (finished === 9) {
      const side = snapshot.cheatSide;
      broadcastGameUpdate(gameid, { w: [side === 'w' ? '9c' : '9'],
        b: [side === 'b' ? '9c' : '9'], s: ['9'] }, { w: true, b: true, s: true });
    } else {
      const message = terminalMessage(snapshot);
      broadcastGameUpdate(gameid, { w: [message], b: [message], s: [message] });
    }
    let rated = Number(snapshot.a) !== -1 && finished !== 9;
    let didSave = false;
    let white, black, whiteDiff = null, blackDiff = null;
    if (rated) {
      const ranking = new glicko2.Glicko2(settings);
      white = ranking.makePlayer(Number(snapshot.a), Number(snapshot.d), Number(snapshot.h));
      black = ranking.makePlayer(Number(snapshot.c), Number(snapshot.g), Number(snapshot.x));
      ranking.updateRatings([[white, black, score]]);
      whiteDiff = white.getRating() - Number(snapshot.a);
      blackDiff = black.getRating() - Number(snapshot.c);
    }
    // Commit the result and both ratings together. A conditional update ensures
    // that a duplicate control message cannot rate a game twice.
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const saved = await client.query(`UPDATE games SET moves=$2, clock=$3,
        events=$4, eventsclock=$5,
        clock1=CASE WHEN color1='black' THEN $7::float8 ELSE $6::float8 END,
        clock2=CASE WHEN color1='black' THEN $6::float8 ELSE $7::float8 END,
        state=$8, result=$9,
        ratingdiff1=CASE WHEN NOT rated THEN NULL WHEN color1='black' THEN $11::float8 ELSE $10::float8 END,
        ratingdiff2=CASE WHEN NOT rated THEN NULL WHEN color1='black' THEN $10::float8 ELSE $11::float8 END,
        finished=NOW() WHERE gameid=$1 AND (state=0 OR state IS NULL) RETURNING id, rated`,
        [gameid, snapshot.m || '', snapshot.i || '', snapshot.e || '', snapshot.k || '',
          snapshot.l, snapshot.n, finished, score === null || score === 0.5 ? null : score === 1, whiteDiff, blackDiff]);
      didSave = saved.rowCount > 0;
      if (saved.rowCount && !saved.rows[0].rated) rated = false;
      if (saved.rowCount && rated) {
        // Lock accounts in stable order to avoid reversed-color game deadlocks.
        await client.query('SELECT id FROM users WHERE id=ANY($1::bigint[]) ORDER BY id FOR UPDATE', [[snapshot.w, snapshot.b]]);
        await client.query('UPDATE users SET rating=rating+$1, deviation=$2, volatility=$3 WHERE id=$4',
          [whiteDiff, white.getRd(), white.getVol(), snapshot.w]);
        await client.query('UPDATE users SET rating=rating+$1, deviation=$2, volatility=$3 WHERE id=$4',
          [blackDiff, black.getRd(), black.getVol(), snapshot.b]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error; // Retain the Redis snapshot if persistence fails.
    } finally {
      client.release();
    }
    if (didSave && rated) {
      const message = 'd:' + Math.floor(whiteDiff) + ':' + Math.floor(blackDiff);
      broadcastGameUpdate(gameid, { w: [message], b: [message], s: [message] });
    }
    // Delete the immutable terminal snapshot and acknowledge the queue together.
    await redis.multi().del(gameid).zrem(queue, gameid).exec();
  }

  async function processGame(gameid) {
    if (closed || inFlight.has(gameid)) return;
    inFlight.add(gameid);
    try {
      if (!await redis.eval(claimLua, 1, queue, gameid, Date.now(), leaseMs)) return;
      const snapshot = await redis.hgetall(gameid);
      if (!snapshot.f) { await redis.zrem(queue, gameid); return; }
      if (Number(snapshot.f) === 0) throw new Error('Active game in result queue');
      await redis.multi().del('game:bot:pending:' + gameid)
        .zrem('game:timeouts:abort', gameid).zrem('game:timeouts:finish', gameid).exec();
      await save(gameid, snapshot);
    } catch (error) {
      console.error('Result persistence deferred:', gameid, error);
    } finally { inFlight.delete(gameid); }
  }

  const timer = setInterval(async () => {
    if (closed || polling) return;
    polling = true;
    try {
      const ids = await redis.zrangebyscore(queue, '-inf', Date.now(), 'LIMIT', 0, 4);
      await Promise.all(ids.map(processGame));
    } catch (error) { console.error('Result queue poll failed:', error); }
    finally { polling = false; }
  }, 1000);
  timer.unref();
  return { process: processGame, close() { closed = true; clearInterval(timer); } };
};
