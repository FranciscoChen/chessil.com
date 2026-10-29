const queueRequest = require('./queue-client');
const { randomBytes, createHash } = require('crypto');
const { assessGame, POLICY } = require('./fair-play');
const { summarizeAccount } = require('./fair-play-account');
const PREFIX = 'fairplay:';
const TTL = 7200;
const HISTORY = 30 * 86400;
const MAX_GAMES = 2000;
const MAX_PLIES = 2048;

// Shared gates cover all API instances. No duplicate listener UUIDs, no unbounded
// background queue, and foreground bot requests retain the queue's priority.
const reserveLua = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
if redis.call('HEXISTS', KEYS[2], ARGV[1]) == 1 then return 0 end
redis.call('ZREMRANGEBYSCORE', KEYS[3], '-inf', ARGV[2])
if redis.call('ZCARD', KEYS[3]) >= 4 then return 0 end
local used = tonumber(redis.call('GET', KEYS[4]) or '0')
if used >= 2 then return 0 end
redis.call('INCR', KEYS[4]); redis.call('EXPIRE', KEYS[4], 2)
redis.call('SET', KEYS[1], ARGV[3], 'PX', 180000)
redis.call('ZADD', KEYS[3], tonumber(ARGV[2]) + 180000, ARGV[3])
return 1
`;
const releaseLua = `
if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('DEL', KEYS[1]) end
redis.call('ZREM', KEYS[2], ARGV[1])
return 1
`;
const reportLua = `
local old = redis.call('GET', KEYS[1])
if old then
  local prior = cjson.decode(old)
  if tonumber(prior.plies) > tonumber(ARGV[1]) then return 0 end
  if tonumber(prior.plies) == tonumber(ARGV[1]) and tonumber(prior.evaluations) > tonumber(ARGV[2]) then return 0 end
end
redis.call('SET', KEYS[1], ARGV[3], 'EX', ARGV[4])
redis.call('ZADD', KEYS[2], ARGV[5], ARGV[6])
local overflow = redis.call('ZREVRANGE', KEYS[2], 10000, 10064)
for _, id in ipairs(overflow) do
  redis.call('DEL', 'fairplay:report:' .. id); redis.call('ZREM', KEYS[2], id)
end
return 1
`;

function validate(game) {
  if (!game || typeof game.m !== 'string' || typeof game.i !== 'string') throw new Error('Missing game history');
  if ((game.lc != null && typeof game.lc !== 'string') || (game.pm != null && (typeof game.pm !== 'string' || /[^01]/.test(game.pm)))) throw new Error('Invalid decision metadata');
  const moves = game.m ? game.m.trim().split(/\s+/) : [];
  if (moves.length > MAX_PLIES || !moves.every(move => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move))) throw new Error('Invalid move history');
  if (!['l', 'n', 'o', 'z'].every(key => game[key] !== null && game[key] !== '' && Number.isFinite(Number(game[key])) && Number(game[key]) >= 0)) throw new Error('Invalid clock data');
  if (!/^[0-9]$/.test(String(game.f)) || !['w', 'b'].every(side => typeof game[side] === 'string' && game[side].length > 0 && game[side].length <= 64)) throw new Error('Invalid game identity/state');
  const clocks = game.i ? game.i.trim().split(/\s+/) : [];
  if (clocks.length !== moves.length || !clocks.every(clock => clock !== '' && Number.isFinite(Number(clock)) && Number(clock) >= 0)) throw new Error('Invalid clock history');
  if (game.t !== (moves.length % 2 ? 'b' : 'w')) throw new Error('Turn does not match move history');
  return moves.length;
}

module.exports = function createFairPlayService({ redis, database, obs }) {
  let closed = false, flushing = false;
  const requests = new Set();
  const key = (type, id) => PREFIX + type + ':' + id;
  async function assess(gameid) {
    const [raw, records] = await Promise.all([redis.get(key('game', gameid)), redis.hgetall(key('analysis', gameid))]);
    if (!raw) return null;
    const game = JSON.parse(raw), analyses = {};
    for (const [ply, value] of Object.entries(records)) analyses[ply] = JSON.parse(value);
    const report = { ...assessGame(game, analyses), gameid, updated: Date.now(), evaluations: Object.keys(analyses).length };
    if (!await redis.eval(reportLua, 2, key('report', gameid), PREFIX + 'reports', report.plies, report.evaluations, JSON.stringify(report), HISTORY, report.updated, gameid)) return report;
    if (report.white.verdict === 'review' || report.black.verdict === 'review') {
      obs.count('fairplay_review');
      obs.log('info', 'fairplay_review', { gameid, plies: report.plies, white: report.white.verdict, black: report.black.verdict });
    }
    if (!report.excluded) {
      for (const [side, p] of [['w', report.white], ['b', report.black]]) {
        if (!/^[1-9]\d{0,18}$/.test(p.id) || BigInt(p.id) > 9223372036854775807n || p.bot) continue;
        const accountKey = key('account-games', p.id);
        const indexKey = key('account-index', p.id);
        const compactPlayer = { id: p.id, bot: p.bot, verdict: p.verdict, signals: p.signals.map(signal => ({ code: signal.code })),
          metrics: Object.fromEntries(['comparedMoves', 'lossSamples', 'engineMatches', 'lossSum', 'lossOver50', 'timedMoves', 'meanTimeMs', 'timingCv'].map(field => [field, p.metrics[field]])) };
        const entry = { gameid, updated: report.updated, player: compactPlayer,
          fingerprint: JSON.stringify([p.verdict, compactPlayer.metrics, p.signals.map(signal => signal.code)]),
          opponent: String(side === 'w' ? game.b : game.w), excluded: report.excluded };
        await redis.eval(`
          redis.call('ZREMRANGEBYSCORE', KEYS[5], '-inf', ARGV[4])
          if not redis.call('ZSCORE', KEYS[5], ARGV[1]) and redis.call('ZCARD', KEYS[5]) >= 5000 then return 0 end
          local old = redis.call('HGET', KEYS[1], ARGV[2])
          local changed = true
          if old then
            local prior = cjson.decode(old)
            local incoming = cjson.decode(ARGV[3])
            if prior.plies > incoming.plies or (prior.plies == incoming.plies and prior.evaluations > incoming.evaluations) then return 0 end
            changed = prior.fingerprint ~= incoming.fingerprint
          end
          redis.call('HSET', KEYS[1], ARGV[2], ARGV[3])
          redis.call('ZADD', KEYS[2], ARGV[5], ARGV[2])
          redis.call('EXPIRE', KEYS[1], ${HISTORY}); redis.call('EXPIRE', KEYS[2], ${HISTORY})
          redis.call('ZADD', KEYS[5], ARGV[5], ARGV[1])
          local expired = redis.call('ZRANGEBYSCORE', KEYS[2], '-inf', ARGV[4])
          local overflow = redis.call('ZRANGE', KEYS[2], 0, -33)
          for _, list in ipairs({expired, overflow}) do
            for _, game in ipairs(list) do
              redis.call('HDEL', KEYS[1], game); redis.call('ZREM', KEYS[2], game)
            end
          end
          if not changed then return 0 end
          redis.call('SET', KEYS[4], ARGV[6], 'NX')
          local revision = redis.call('INCR', KEYS[4])
          redis.call('ZADD', KEYS[3], revision, ARGV[1])
          return 1`, 5, accountKey, indexKey, PREFIX + 'dirty-accounts', PREFIX + 'account-revision', PREFIX + 'accounts',
          p.id, gameid, JSON.stringify({ ...entry, plies: report.plies, evaluations: report.evaluations }),
          Date.now() - HISTORY * 1000, Date.now(), String(Date.now() * 1000));
      }
    }
    return report;
  }

  async function schedule(gameid, game, report) {
    const hm = report.plies;
    if (closed || report.excluded || String(game.f) !== '0' || hm < POLICY.openingPlies) return;
    const offset = createHash('sha256').update(gameid).digest()[0] % 12;
    const slot = (hm + offset) % 12;
    const elevated = Math.max(report.white.priority, report.black.priority) >= 40;
    if (!elevated && ![0, 1, 7, 8].includes(slot)) return;
    const token = randomBytes(16).toString('hex');
    const pending = key('pending', gameid);
    const reserved = await redis.eval(reserveLua, 4, pending, key('analysis', gameid),
      PREFIX + 'inflight', PREFIX + 'budget:' + Math.floor(Date.now() / 1000), hm, Date.now(), token);
    if (!reserved) { obs.count('fairplay_analysis_budget_skip'); return; }
    const uuidhm = `${gameid}-fairplay-${hm}-${token}-${game.t}`;
    try {
      const response = await queueRequest('/rpush', { sf: [uuidhm, game.l, game.n, game.o, game.z, 256, 0, 7, game.m].join(' ') }, 110000);
      if (response.status !== 200) throw new Error('Analysis queue status ' + response.status);
      if (!response.body) return;
      const result = JSON.parse(response.body);
      if (result.uuidhm !== uuidhm || result.error) return;
      const analysis = result.analysis;
      if (!analysis?.score || analysis.score.bound || !Number.isFinite(analysis.depth)) return;
      const compact = { bestmove: result.bestmove, score: analysis.score, depth: analysis.depth };
      await redis.multi().hset(key('analysis', gameid), hm, JSON.stringify(compact))
        .expire(key('analysis', gameid), TTL).exec();
      // Re-assess AFTER results arrive. The old detector only ran before its
      // own analysis, leaving the latest evidence unused until another move.
      await assess(gameid);
    } catch (error) {
      obs.log('warn', 'fairplay_analysis_error', { gameid, error: error.message });
    } finally {
      await redis.eval(releaseLua, 2, pending, PREFIX + 'inflight', token).catch(() => {});
    }
  }

  async function ingest(gameid, game) {
    const hm = validate(game);
    const index = PREFIX + 'active-games';
    // Bound active snapshot memory independently of account report retention.
    const accepted = await redis.eval(`
      redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
      if not redis.call('ZSCORE', KEYS[1], ARGV[2]) and redis.call('ZCARD', KEYS[1]) >= ${MAX_GAMES} then return 0 end
      local old = redis.call('GET', KEYS[2])
      if old then
        local prior = cjson.decode(old)
        if string.len(prior.m) > string.len(ARGV[4]) then return 2 end
        if tostring(prior.f) ~= '0' and tostring(cjson.decode(ARGV[3]).f) == '0' then return 2 end
        if string.sub(ARGV[4], 1, string.len(prior.m)) ~= prior.m then return 3 end
      end
      redis.call('SET', KEYS[2], ARGV[3], 'EX', ${TTL})
      redis.call('EXPIRE', KEYS[3], ${TTL})
      redis.call('ZADD', KEYS[1], ARGV[5], ARGV[2])
      return 1`, 3, index, key('game', gameid), key('analysis', gameid), Date.now() - TTL * 1000, gameid, JSON.stringify(game), game.m, Date.now());
    if (accepted === 0) throw Object.assign(new Error('Fair-play capacity reached'), { status: 503 });
    if (accepted === 3) throw Object.assign(new Error('Conflicting game history'), { status: 409 });
    if (accepted === 2) return { accepted: true, stale: true };
    const report = await assess(gameid);
    const work = schedule(gameid, game, report);
    requests.add(work);
    work.catch(error => obs.log('error', 'fairplay_schedule_error', { error: error.message })).finally(() => requests.delete(work));
    return { accepted: true, plies: hm, white: report.white.verdict, black: report.black.verdict };
  }

  // Coalesce public-account writes across both API instances. A failed database
  // write leaves the dirty entry in Redis for the next poll/restart.
  const flushTimer = setInterval(async () => {
    if (closed || flushing) return;
    flushing = true;
    try {
      const ids = await redis.zrange(PREFIX + 'dirty-accounts', 0, 15, 'WITHSCORES');
      for (let i = 0; i < ids.length; i += 2) {
        const id = ids[i], revision = ids[i + 1];
        try {
        const all = Object.values(await redis.hgetall(key('account-games', id))).map(JSON.parse);
        const summary = { ...summarizeAccount(all), revision: Number(revision), updated: Date.now() };
        await redis.eval(`
          local old = redis.call('GET', KEYS[1])
          if old and cjson.decode(old).revision > tonumber(ARGV[1]) then return 0 end
          redis.call('SET', KEYS[1], ARGV[2], 'EX', ${HISTORY}); return 1`,
          1, key('account', id), revision, JSON.stringify(summary));
        await database.query(`INSERT INTO fair_play_accounts (userid, warning, status, flagged_games, analysed_games, observed_games,
          flagged_rate, compared_moves, loss_samples, opponents, revision)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (userid) DO UPDATE SET warning=EXCLUDED.warning, status=EXCLUDED.status,
          flagged_games=EXCLUDED.flagged_games, analysed_games=EXCLUDED.analysed_games,
          observed_games=EXCLUDED.observed_games, flagged_rate=EXCLUDED.flagged_rate,
          compared_moves=EXCLUDED.compared_moves, loss_samples=EXCLUDED.loss_samples,
          opponents=EXCLUDED.opponents, revision=EXCLUDED.revision, updated_at=NOW()
          WHERE fair_play_accounts.revision <= EXCLUDED.revision`,
        [id, summary.warning, summary.status, summary.flaggedGames, summary.analysedGames,
          summary.observedGames, summary.flaggedRate, summary.comparedMoves, summary.lossSamples, summary.opponents, summary.revision]);
        await redis.eval(`if redis.call('ZSCORE', KEYS[1], ARGV[1]) == ARGV[2] then redis.call('ZREM', KEYS[1], ARGV[1]) end return 1`,
          1, PREFIX + 'dirty-accounts', id, revision);
        } catch (error) {
          if (error.code === '23503') {
            await redis.multi().del(key('account-games', id), key('account-index', id), key('account', id))
              .zrem(PREFIX + 'dirty-accounts', id).zrem(PREFIX + 'accounts', id).exec();
          } else obs.log('error', 'fairplay_account_save_error', { id, error: error.message });
        }
      }
    } catch (error) { obs.log('error', 'fairplay_account_save_error', { error: error.message }); }
    finally { flushing = false; }
  }, 1000);
  flushTimer.unref();
  return { ingest, validate, async report(gameid) { const raw = await redis.get(key('report', gameid)); return raw ? JSON.parse(raw) : null; },
    async close() { closed = true; clearInterval(flushTimer); await Promise.allSettled([...requests]); } };
};
