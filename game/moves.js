const { randomBytes } = require('crypto');
const { ucifen, mate, piececount } = require('./chess');

const fields = ['m', 'i', 't', 'j', 'l', 'n', 'o', 'z', 'q', 'r', 's', 'f'];
const opposite = side => side === 'w' ? 'b' : 'w';
const clockField = side => side === 'w' ? 'l' : 'n';
const incrementField = side => side === 'w' ? 'o' : 'z';

// Reserve preparation across instances. A finite claim protects timely moves
// from flagging during worker queuing, while a crashed process cannot freeze play.
const claimLua = `
if redis.call('HGET', KEYS[1], 'f') ~= '0' or
   redis.call('HGET', KEYS[1], 'm') ~= ARGV[1] or
   redis.call('HGET', KEYS[1], 't') ~= ARGV[2] then return 0 end
local pending = tonumber(redis.call('HGET', KEYS[1], 'pendingUntil') or '0')
if pending > tonumber(ARGV[4]) then return 0 end
redis.call('HSET', KEYS[1], 'pendingMove', ARGV[3], 'pendingUntil', tonumber(ARGV[4]) + 3000)
return 1
`;
const releaseLua = `
if redis.call('HGET', KEYS[1], 'pendingMove') == ARGV[1] then
  redis.call('HDEL', KEYS[1], 'pendingMove', 'pendingUntil')
end
return 1
`;

// Compare and commit in one Redis operation across all Node instances. A stale
// worker response must never overwrite a newer move or a terminal game state.
const commitLua = `
if redis.call('HGET', KEYS[1], 'f') ~= '0' or
   redis.call('HGET', KEYS[1], 'm') ~= ARGV[1] or
   redis.call('HGET', KEYS[1], 't') ~= ARGV[2] or
   redis.call('HGET', KEYS[1], 'pendingMove') ~= ARGV[15] then return nil end
redis.call('HDEL', KEYS[1], 'pendingMove', 'pendingUntil')
local premove = redis.call('HGET', KEYS[1], ARGV[14]) or ''
local finished = tonumber(ARGV[9])
local counts = redis.call('HGET', KEYS[1], 'lc') or ''
local premoves = redis.call('HGET', KEYS[1], 'pm') or ''
redis.call('HSET', KEYS[1], 'lc', counts .. ' ' .. ARGV[16], 'pm', premoves .. ARGV[17])
local repetitions = redis.call('HINCRBY', KEYS[1], ARGV[8], 1)
if finished == 0 and repetitions >= 3 then finished = 4 end
redis.call('HSET', KEYS[1], 'm', ARGV[3], 'i', ARGV[4], 't', ARGV[5],
  'j', ARGV[6], ARGV[7], ARGV[10], 's', ARGV[11], 'f', finished,
  'q', '', 'r', '', 'u', 0, 'v', 0)
redis.call('ZREM', KEYS[2], KEYS[1])
redis.call('ZREM', KEYS[3], KEYS[1])
if finished == 0 then
  if ARGV[1] == '' then
    redis.call('ZADD', KEYS[2], tonumber(ARGV[11]) + tonumber(ARGV[12]), KEYS[1])
  else
    local remaining = tonumber(redis.call('HGET', KEYS[1], ARGV[13]))
    redis.call('ZADD', KEYS[3], tonumber(ARGV[11]) + remaining + 400, KEYS[1])
  end
else
  redis.call('ZADD', KEYS[4], ARGV[11], KEYS[1])
end
return {tostring(finished), premove}
`;

module.exports = function createMoveHandler({
  redis, movegen, broadcastGameUpdate, requestBotMove, checkgame,
  persistFinishedGame, finishgame, aborttimer, timeback, lagCompensationPercent,
  lagCompensationLimitMilliseconds, timeoutKeyAbort, timeoutKeyFinish, resultQueue = 'game:results:pending'
}) {
  const generate = fen => new Promise((resolve, reject) => {
    movegen.generate(fen, (error, moves) => error ? reject(error) : resolve(moves));
  });

  async function handleMove(gameid, side, move, ws, premoveContext) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move) || !['w', 'b'].includes(side)) return;
    // Capture arrival time before Redis/worker queuing; server load is not player think time.
    const received = premoveContext ? premoveContext.received : Date.now();
    let token;
    try {
      const values = await redis.hmget(gameid, ...fields);
      const state = Object.fromEntries(fields.map((field, i) => [field, values[i]]));
      if (state.f !== '0' || state.t !== side || !(state.j || '').split(' ').includes(move)) return;
      if (premoveContext && state.m !== premoveContext.moves) return;
      const other = opposite(side);
      const ply = state.m ? state.m.split(' ').length : 0;
      let compensation = 0;
      if (ws && !premoveContext) {
        if (ws.receivedRTT === false) ws.cheatingRTT = true;
        else {
          ws.sentTime = received;
          ws.receivedRTT = false;
          ws.send('a');
        }
        if (Number.isFinite(ws.roundTripTime) && !ws.cheatingRTT) {
          compensation = Math.min(lagCompensationLimitMilliseconds,
            Math.max(0, Math.floor(lagCompensationPercent * ws.roundTripTime)));
        }
      }
      const elapsed = !premoveContext && ply >= 2 && Number(state.s) > 0
        ? Math.max(0, received - Number(state.s) - compensation - timeback) : 0;
      const remaining = Number(state[clockField(side)]) - elapsed;
      // Keep the deadline intact if preparation fails. The timeout handler owns flagging.
      if (remaining <= 0) return finishgame(gameid);
      token = randomBytes(16).toString('hex');
      if (!await redis.eval(claimLua, 1, gameid, state.m, side, token, Date.now())) return;
      const timeleft = remaining + Number(state[incrementField(side)]) + compensation;
      const moves = state.m ? state.m + ' ' + move : move;
      const fen = ucifen(moves);
      const fenFields = fen.split(' ');
      const legal = await generate(fen);
      // Checkmate takes precedence over automatic draw rules on the same move.
      const finished = !legal ? mate(fenFields)
        : piececount(fenFields[0]) === 2 ? 3 : Number(fenFields[4]) >= 100 ? 5 : 0;
      // Castling rights affect repetition even while castling is blocked. An EP
      // target affects repetition only when an actual legal EP capture exists.
      const target = fenFields[3];
      const board = fenFields[0].replace(/[1-8]/g, n => ' '.repeat(Number(n))).replaceAll('/', '');
      const epLegal = target !== '-' && legal.split(' ').some(candidate =>
        board[(8 - Number(candidate[1])) * 8 + candidate.charCodeAt(0) - 97] === (other === 'w' ? 'P' : 'p') &&
        candidate.slice(2, 4) === target && candidate[0] !== candidate[2] &&
        candidate[1] === (other === 'w' ? '5' : '4'));
      const positionKey = 'position:' + fenFields.slice(0, 3).join(' ') + ' ' + (epLegal ? target : '-');
      const clock = state.i ? state.i + ' ' + timeleft : String(timeleft);
      const result = await redis.eval(commitLua, 4, gameid, timeoutKeyAbort, timeoutKeyFinish, resultQueue,
        state.m, side, moves, clock, other, legal, clockField(side), positionKey,
        finished, timeleft, received, aborttimer, clockField(other), other === 'w' ? 'q' : 'r', token, legal ? legal.split(' ').length : 0, premoveContext ? '1' : '0');
      if (!result) return; // Another instance already committed a move or ended the game.
      const finalState = Number(result[0]);
      let message = `m:${move}:${side}:${timeleft}:${ply + 1}:${received}`;
      if (finalState) message += ':' + finalState;
      broadcastGameUpdate(gameid, { w: [message], b: [message], s: [message] });
      if (finalState) {
        checkgame(gameid);
        await persistFinishedGame(gameid);
        return;
      }
      const premove = result[1];
      if (premove && legal.split(' ').includes(premove)) {
        // Reuse validation/commit for the consumed premove. The expected history
        // prevents it from running after an intervening move.
        await handleMove(gameid, other, premove, null, { moves, received });
      } else {
        requestBotMove(gameid);
        if (ply >= 1) checkgame(gameid);
      }
    } catch (error) {
      console.error('move failed:', gameid, error);
      if (ws) ws.terminate();
    } finally {
      if (token) await redis.eval(releaseLua, 1, gameid, token).catch(error => console.error('Move claim release failed:', error));
    }
  }
  return handleMove;
};
