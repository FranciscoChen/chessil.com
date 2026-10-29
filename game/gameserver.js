const http = require('http');
const https = require('https');
const server = http.createServer();
const crypto = require('crypto');
const observability = require('../observability');
const obs = observability.createObserver('game');
obs.installProcessHandlers();
obs.log('info', 'server_start', { ts: Date.now() });
// Session database
const Redis = require("ioredis");
const redis = new Redis();
const redisSub = new Redis();
const serverId = crypto.randomBytes(8).toString('hex');
const gameChannelPrefix = 'game:';

// Users, seeks and games database
const pg = require("pg");
const config = require('../config.json');
// 'postgres://user:password@host:port/db?sslmode=require'
const conString = config.shared.postgresUrl
const database = new pg.Pool({ connectionString: conString, max: 4,
  connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 5000 });
database.on('error', error => console.error('Database pool error:', error));

const domainname = config.game.domainName
const engineAuthIp = getEngineAuthIp()
function getEngineAuthIp() {
  const entries = Object.entries(config.engine.myServers || {});
  for (var i = 0; i < entries.length; i++) {
    if (entries[i][1] === 'ws') {
      return entries[i][0];
    }
  }
  if (entries.length === 0) {
    throw new Error('Missing config.engine.myServers entries');
  }
  throw new Error('Missing ws entry in config.engine.myServers');
}


const servername = config.game.serverName
const myServers = config.game.myServers
const envPort = parseInt(process.env.PORT || '', 10);
const port = Number.isFinite(envPort) ? envPort : 8080;

const movegen = require('./movegen-pool')();

// Local socket subscriptions; Redis Pub/Sub forwards updates between instances.
const subs = {}
const wsconnections = {}

redisSub.psubscribe(gameChannelPrefix + '*', (err) => {
  if (err) {
    obs.log('error', 'game_pubsub_subscribe_error', { error: err && err.stack ? err.stack : String(err) });
  }
});

redisSub.on('pmessage', (pattern, channel, message) => {
  if (typeof channel !== 'string' || channel.indexOf(gameChannelPrefix) !== 0) return;
  if (typeof message !== 'string' || message.length === 0) return;
  let payload;
  try {
    payload = JSON.parse(message);
  } catch (e) {
    return;
  }
  if (payload && payload.origin === serverId) return;
  const gameid = channel.slice(gameChannelPrefix.length);
  deliverGameBroadcast(gameid, payload);
});
function scheduleTimeout(key, gameid, delayMs) {
  var when = Date.now() + Math.max(0, delayMs);
  redis.zadd(key, when, gameid, (err) => {
    if (err) console.error(err);
  });
}

function cancelTimeout(key, gameid) {
  redis.zrem(key, gameid, (err) => {
    if (err) console.error(err);
  });
}

function clearGameTimeouts(gameid) {
  cancelTimeout(timeoutKeyAbort, gameid);
  cancelTimeout(timeoutKeyFinish, gameid);
}

const timeoutPollIntervalMs = 250
let pollingTimeouts = false;
const timeoutPoller = setInterval(() => {
  if (pollingTimeouts) return;
  pollingTimeouts = true;
  const now = Date.now();
  redis.eval(popDueTimeoutsLua, 1, timeoutKeyAbort, now, timeoutBatchSize, (err, items) => {
    if (err) console.error(err);
    if (Array.isArray(items)) {
      for (var i = 0; i < items.length; i++) {
        abortgame(items[i]);
      }
    }
    redis.eval(popDueTimeoutsLua, 1, timeoutKeyFinish, now, timeoutBatchSize, (err2, items2) => {
      if (err2) console.error(err2);
      if (Array.isArray(items2)) {
        for (var j = 0; j < items2.length; j++) {
          finishgame(items2[j]);
        }
      }
      pollingTimeouts = false;
    });
  });
}, timeoutPollIntervalMs);

function deliverGameBroadcast(gameid, payload) {
  if (!payload || typeof payload !== 'object') return;
  const websockets = subs[gameid];
  if (!websockets) return;
  const messages = payload.messages || {};
  const terminate = payload.terminate || {};
  const sides = ['w', 'b', 's'];
  for (var i = 0; i < sides.length; i++) {
    const side = sides[i];
    const group = websockets[side];
    if (!group) continue;
    const raw = messages[side];
    const list = Array.isArray(raw) ? raw : (typeof raw === 'string' ? [raw] : null);
    if (list) {
      for (var user in group) {
        for (var j = 0; j < list.length; j++) {
          if (group[user].readyState === 1) group[user].send(list[j]);
        }
      }
    }
    if (terminate[side]) {
      for (var user in group) {
        group[user].terminate();
      }
    }
  }
}

function broadcastGameUpdate(gameid, messages, terminate) {
  const payload = {
    origin: serverId,
    messages: messages || {},
    terminate: terminate || {}
  };
  deliverGameBroadcast(gameid, payload);
  redis.publish(gameChannelPrefix + gameid, JSON.stringify(payload));
}

function sanitizeUserAgent(useragent) {
  if (typeof useragent !== 'string') {
    return ''
  }
  return useragent.replace(/[\r\n]/g, ' ').slice(0, 255)
}

function setSessionProps(sessiondata) {
  sessiondata.ip = sessiondata[0]
  sessiondata.userid = sessiondata[1]
  sessiondata.theme = sessiondata[2]
  sessiondata.lang = sessiondata[3]
  sessiondata.created = sessiondata[4]
  sessiondata.username = sessiondata[5]
  sessiondata.useragent = sessiondata[6] || ''
  return sessiondata
}

function buildSessionData(ip, userid, theme, lang, created, username, useragent) {
  const sessiondata = [ip, userid, theme, lang, created, username, useragent || '']
  return setSessionProps(sessiondata)
}

function parseSessionData(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null
  }
  if (raw[0] !== '{') {
    return null
  }
  try {
    const parsed = JSON.parse(raw)
    return buildSessionData(
      parsed.ip || '',
      parsed.userid || '0',
      parsed.theme || 'n',
      parsed.lang || 'en',
      parsed.created || '0',
      parsed.username || 'u',
      sanitizeUserAgent(parsed.useragent || '')
    )
  } catch (err) {
    console.error(err)
    return null
  }
}

// Timeout system (stored in Redis)
const timeoutKeyAbort = 'game:timeouts:abort'
const timeoutKeyFinish = 'game:timeouts:finish'
const resultQueue = 'game:results:pending'
const timeoutBatchSize = 100
const popDueTimeoutsLua = [
  "local key=KEYS[1]",
  "local now=tonumber(ARGV[1])",
  "local limit=tonumber(ARGV[2])",
  "local items=redis.call('ZRANGEBYSCORE', key, '-inf', now, 'LIMIT', 0, limit)",
  "if #items > 0 then",
  "  redis.call('ZREM', key, unpack(items))",
  "end",
  "return items"
].join("\n")
const aborttimer = 14000
const botPendingPrefix = 'game:bot:pending:'
const botPendingTtlMs = 30000
// Give back 2 ms every move by default, because of server processing time
const timeback = 2

// Lag compensation. Half compensated before flag check, and the other half after.
// Also to mitigate abuse of fake lag, compensate only 40% of the lag
const lagCompensationPercent = 0.5

// A fair limit is to compensate up to 300ms, since higher lag is not due to server distance
const lagCompensationLimitMilliseconds = 300 * lagCompensationPercent


function onSocketError(err) { console.error(err); }

function clearBotPending(gameid) {
  redis.del(botPendingPrefix + gameid, (err) => {
    if (err) console.error(err);
  });
}

function releaseBotRequest(gameid, token) {
  return redis.eval("if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0", 1, botPendingPrefix + gameid, token)
    .catch(error => console.error('Bot request release failed:', error));
}

const bots = require('./bots')({redis,
  request:require('./engine-client')({host:config.game.engineHost,token:config.shared.engineAuthToken,peerIp:engineAuthIp}),
  move:(...args)=>handleMove(...args)
});
function requestBotMove(gameid) {
  bots.enqueue(gameid).catch(error=>console.error('Bot enqueue:',error.message));
}

// Move preparation happens outside Redis; the Lua commit verifies the snapshot.
const handleMove = require('./moves')({
  redis, movegen, broadcastGameUpdate, requestBotMove, checkgame,
  persistFinishedGame, finishgame, aborttimer, timeback,
  lagCompensationPercent, lagCompensationLimitMilliseconds,
  timeoutKeyAbort, timeoutKeyFinish, resultQueue
});

function authenticate(req, callback) {
  let completed = false;
  const finish = (error, session) => {
    if (completed) return;
    completed = true;
    callback(error, session);
  };
  if (req.headers.origin !== new URL(domainname).origin) {
    finish(true, null)
    return
  }
  const cookie = req.headers['cookie']
  if (typeof cookie === 'undefined' || cookie.length !== 34 || cookie.slice(0, 2) !== 's=') {
    finish(true, null)
    return
  }

  const myURL = new URL(domainname + '/websocket')
  const options = {
    hostname: myURL.hostname,
    port: 443,
    path: myURL.pathname,
    method: 'POST',
    headers: { 'authorization': config.shared.websocketPassword }
  };

  const newreq = https.request(options, (res) => {
    res.on('error', error => finish(error, null));
    if (res.statusCode !== 200) {
      res.resume();
      finish(true, null)
    } else {
      res.setEncoding('utf8');
      var rawData = '';
      var useragent = sanitizeUserAgent(req.headers['user-agent'])
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        // Check IP and useragent with the ones from the request
        const sessiondata = parseSessionData(rawData)
        if (!sessiondata) {
          finish(true, null)
          return
        }
        if (req.headers['x-real-ip'] === sessiondata[0]) {
          finish(false, sessiondata)
        } else {
          if (useragent === sessiondata[6]) {
            // If same user agent, assuming dynamic IP case, but can be further checked to be in the same location or country
            finish(false, sessiondata)
          } else {
            // Different IP, different user agent, same cookie - cookie theft most probably! Set new cookie
            finish(true, null)
          }
        }
      })
    }
  });
  newreq.on('error', (e) => {
    finish(e, null)
    return
  });
  newreq.setTimeout(5000, () => newreq.destroy(new Error('Session authentication timed out')));
  newreq.end(cookie);
}


// Internal HTTP API. Nginx supplies the authenticated peer IP header.
server.on('request', (req, res) => {

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Only accepts POST requests authenticated from my own servers
  if (req.method !== 'POST' || typeof req.headers['authorization'] === 'undefined' || req.headers['authorization'] !== config.shared.gameServerAuthToken || typeof myServers[req.headers['x-real-ip']] === 'undefined') {
    res.writeHead(401, { "Content-Type": "text/html" });
    res.end();
    return;
  }

  const requestedGame = req.url === '/game' ? req.headers.gn : req.headers.gameid;
  if (['/game', '/cg', '/ag'].includes(req.url) && !/^[a-zA-Z0-9]{9}$/.test(requestedGame || '')) {
    res.writeHead(400); res.end(); return;
  }
  if (req.url === '/ag' && !['w', 'b'].includes(req.headers.side)) {
    res.writeHead(400); res.end(); return;
  }

  // To check if the game is up and ready to be started
  if (req.url === '/game') {
    const r = req.headers
    redis.hget(r.gn, 'm', (err, result) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end();
        console.error(err);
        return;
      }
      if (typeof result === 'string') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end();
      } else {
        // Game is not ready, not found
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end();
      }
    });
  }
  // To update a game in format halfmove bestmove scoretype scorenumber eg. '26', 'e2e4 cp +21', used by cheat detector
  if (req.url === '/cg') {
    if (!/^\d+$/.test(req.headers.hm || '')) { res.writeHead(400); res.end(); return; }
    redis.eval(`
      if redis.call('HGET', KEYS[1], 'f') ~= '0' then return 0 end
      redis.call('HSET', KEYS[1], ARGV[1], ARGV[2])
      return 1`, 1, req.headers.gameid, req.headers.hm,
      req.headers.bm + ' ' + req.headers.ev, (error, saved) => {
        if (error) console.error(error);
        res.writeHead(error ? 500 : saved ? 200 : 410);
        res.end();
      });
  }
  // To abort a game, due to cheater detected. used by cheat detector
  if (req.url === '/ag') {
    abortgamecheater(req.headers['gameid'], req.headers['side']);
    res.writeHead(202);
    res.end();
  }
  
  // To load a new game
  if (req.url === '/ng') {
    const r = req.headers
    if (!/^[a-zA-Z0-9]{9}$/.test(r.gn || '') || !r.w || !r.b ||
        !['wt', 'bt', 'wi', 'bi'].every(key => r[key] !== undefined && Number.isFinite(Number(r[key])) && Number(r[key]) >= 0) ||
        Number(r.wt) <= 0 || Number(r.bt) <= 0) {
      res.writeHead(400); res.end(); return;
    }
    if (r['bot-program'] != null && (r['bot-program'] !== 'swift' ||
        !/^[1-8]$/.test(r['bot-difficulty'] || '') || !['w','b'].includes(r['bot-side']))) {
      res.writeHead(400);res.end();return;
    }
    // r.gn - gamename, r.w - whiteplayer (playerid or sessionid), r.b blackplayer, r.t time, r.i increment
    // Start a new game in redis. u for uci moves with clock time left {move:timeleft}, t for time left, x for increment, e for events with their event times {event:eventtimeclockleft}
    const gameData = {
      'creationKey': crypto.createHash('sha256').update(JSON.stringify(['gn','w','b','wt','bt','wi','bi','wr','br','wd','bd','wv','bv','bw','bb','bot-program','bot-difficulty','bot-side'].map(key=>r[key] || ''))).digest('hex'),
      'm': '', // Moves
      'lc': '20', // Legal choice count at each position, starting with the initial 20
      'pm': '', // One flag per committed ply: 1 for a server-executed premove
      'i': '', // Moves times mt -> i
      't': 'w', // Turn
      'j': 'h2h3 g2g3 f2f3 e2e3 d2d3 c2c3 b2b3 a2a3 h2h4 g2g4 f2f4 e2e4 d2d4 c2c4 b2b4 a2a4 g1h3 g1f3 b1c3 b1a3', // Legal moves lm -> j
      'e': '', // Events
      'k': '', // Events times et -> k
      'w': r.w, // White player id, or session id
      'b': r.b, // Black player id, or session id
      'l': r.wt * 60000, // White time left, (initial time at the moment of initialising) wt -> l
      'n': r.bt * 60000, // Black time left, minutes to milliseconds conversion bt -> n
      'o': r.wi * 1000, // increment wi -> o seconds to milliseconds
      'z': r.bi * 1000, // blackincrement seconds to milliseconds
      'q': '', // White premove wp -> q
      'r': '', // Black premove bp -> r
      's': r['bot-side'] === 'w' ? Date.now() : 0, // Last move time lmt -> s
      'f': 0, // Finished code
      'u': 0, // White draw agreement wd -> u
      'v': 0, // Black draw agreement bd -> v
      'a': r.wr, // White rating
      'c': r.br, // Black rating
      'd': r.wd, // White deviation
      'g': r.bd, // Black deviation
      'h': r.wv, // White volatility
      'x': r.bv, // Black volatility
      'position:rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -': 1,
      'y': r.wt // initial time
    };
    if (r['bot-program']) {
      gameData.botProgram=r['bot-program'];gameData.botDifficulty=r['bot-difficulty'];gameData.botSide=r['bot-side'];
    }
    if (r.bw !== undefined) gameData.bw = r.bw;
    if (r.bb !== undefined) gameData.bb = r.bb;
    const entries = Object.entries(gameData).flat();
    redis.eval(`
      if redis.call('EXISTS', KEYS[1]) == 1 then
        if redis.call('HGET',KEYS[1],'creationKey') == ARGV[2] then return 2 end
        return 0
      end
      redis.call('HSET', KEYS[1], unpack(ARGV))
      return 1`, 1, r.gn, ...entries, (err, result) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          console.error(err);
          return;
        }
        if (!result) { res.writeHead(409); res.end(); return; }
        if (Number(result) === 2) { requestBotMove(r.gn); res.writeHead(200); res.end(); return; }
        subs[r.gn] = { w: {}, b: {}, s: {} }
        scheduleTimeout(timeoutKeyAbort, r.gn, aborttimer)
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end();
        requestBotMove(r.gn);
      });
    return;
  }
  if (!['/game', '/cg', '/ag'].includes(req.url)) { res.writeHead(404); res.end(); }
});

server.on('error', (err) => {
  obs.count('server_error');
  obs.log('error', 'server_error', { error: err && err.stack ? err.stack : String(err) });
});

// Apply controls atomically across game instances. Player identity is established
// by the WebSocket handshake; spectators never enter this handler.
const gameActionLua = `
if redis.call('HGET', KEYS[1], 'f') ~= '0' then return nil end
local side, action, now = ARGV[1], ARGV[2], ARGV[3]
local own = side == 'w' and 'u' or 'v'
local other = side == 'w' and 'v' or 'u'
local finished = 0
if action == '1' then finished = 7
elseif action == '2' then
  if redis.call('HGET', KEYS[1], own) == '1' then return nil end
  redis.call('HSET', KEYS[1], own, 1)
  if redis.call('HGET', KEYS[1], other) == '1' then finished = 8 end
else return nil end
local events = (redis.call('HGET', KEYS[1], 'e') or '') .. side .. action
local times = redis.call('HGET', KEYS[1], 'k') or ''
if times ~= '' then times = times .. ' ' end
redis.call('HSET', KEYS[1], 'e', events, 'k', times .. now, 'f', finished)
if finished > 0 then
  local last = tonumber(redis.call('HGET', KEYS[1], 's') or '0')
  local moves = redis.call('HGET', KEYS[1], 'm') or ''
  if last > 0 and string.find(moves, ' ') then
    local field = redis.call('HGET', KEYS[1], 't') == 'w' and 'l' or 'n'
    local remaining = tonumber(redis.call('HGET', KEYS[1], field)) - (tonumber(now) - last)
    redis.call('HSET', KEYS[1], field, math.max(0, remaining))
  end
  redis.call('ZADD', KEYS[2], now, KEYS[1])
end
return {tostring(finished), now}
`;

// Terminal transitions enqueue atomically in Redis. The result worker owns SQL,
// retries and notifications, including recovery after a Node restart.
const results = require('./results')({ redis, database, broadcastGameUpdate });
function persistFinishedGame(gameid) { return results.process(gameid); }

async function handleGameAction(gameid, side, action) {
  try {
    const result = await redis.eval(gameActionLua, 2, gameid, resultQueue, side, action, Date.now());
    if (!result) return;
    const finished = Number(result[0]);
    const message = 'e:' + action + ':' + side + ':' + result[1] + ':' + finished;
    if (!finished) {
      broadcastGameUpdate(gameid, { w: [message], b: [message], s: [message] });
      return;
    }
    clearBotPending(gameid);
    clearGameTimeouts(gameid);
    await results.process(gameid);
  } catch (error) {
    console.error('game action failed:', gameid, error);
  }
}

const premoveLua = `
if redis.call('HGET', KEYS[1], 'f') ~= '0' then return 0 end
local turn = redis.call('HGET', KEYS[1], 't')
if ARGV[2] ~= '' and turn == ARGV[1] then return 0 end
local field = ARGV[1] == 'w' and 'q' or 'r'
redis.call('HSET', KEYS[1], field, ARGV[2])
return 1
`;
async function handlePremove(gameid, side, move, ws) {
  if (move !== '' && !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) return;
  try {
    if (await redis.eval(premoveLua, 1, gameid, side, move)) ws.send('p' + move);
  } catch (error) { console.error('premove failed:', error); }
}

server.on('upgrade', function upgrade(req, socket, head) {
  socket.on('error', onSocketError);
  authenticate(req, function next(err, sessiondata) {
    if (err || !sessiondata) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    if (socket.destroyed || shuttingDown) return socket.destroy();
    socket.removeListener('error', onSocketError);

    wss.handleUpgrade(req, socket, head, function done(ws) {
      wss.emit('connection', ws, req, sessiondata);
    });
  });
});

server.listen(port);
obs.log('info', 'server_listen', { port: port });

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ noServer: true, maxPayload: 256 });


wss.on('connection', function connection(ws, req, sessiondata) {
  // Session identity is provided by the web service, never by socket messages.
  ws.isAlive = true;
  const wsid = crypto.randomBytes(16).toString('hex');

  ws.id = wsid

  ws.once('close', () => {
    const stored = wsconnections[ws.id];
    if (stored && subs[stored.g] && subs[stored.g][stored.s]) {
      delete subs[stored.g][stored.s][stored.u + '_' + ws.id];
    }
    delete wsconnections[ws.id];
    if (stored && subs[stored.g] && Object.values(subs[stored.g]).every(group => Object.keys(group).length === 0)) {
      delete subs[stored.g];
    }
  });

  ws.on('error', (error) => {
    console.error(error)
    if (typeof wsconnections[ws.id] !== 'undefined') {
      const stored = wsconnections[ws.id]
      if (typeof subs[stored.g] !== 'undefined' && typeof subs[stored.g][stored.s] !== 'undefined')
        delete subs[stored.g][stored.s][stored.u + '_' + ws.id] // free memory
    }
  });

  if (req.url === '/ping') {
    ws.send('a');
    ws.sentTime = Date.now()

    ws.on('message', function msg(data) {
      const message = data.toString('utf-8')
      if (message === '0') {
        ws.isAlive = true;
      }
      if (message === 'b') {
        ws.roundTripTime = Date.now() - ws.sentTime;
        //Log into the database
        if (ws.measured) return;
        ws.measured = true;
        const session = req.headers.cookie.slice(2);
        // RTT is measured by this server, never accepted from a browser JSON body.
        database.query(`INSERT INTO game_server_latency (sessionid,server,rtt,measured_at)
          VALUES ($1,$2,$3,NOW()) ON CONFLICT (sessionid,server)
          DO UPDATE SET rtt=EXCLUDED.rtt,measured_at=EXCLUDED.measured_at`,
          [session,servername,ws.roundTripTime], err => {
            if (err) console.error('Regional latency storage failed', err.message);
            // Keep the legacy connection table for current operations tooling.
            if (servername === 'ws0') database.query(`INSERT INTO connections (sessionid,userid,ws0,updated)
              VALUES ($1,$2,$3,NOW()) ON CONFLICT (sessionid)
              DO UPDATE SET ws0=EXCLUDED.ws0,updated=EXCLUDED.updated`,
              [session,sessiondata[1],ws.roundTripTime], error => { if(error) console.error(error); });
            ws.terminate();
          });
      }
    });
  }

  if (req.url.slice(0, 6) === '/game/') {
    // First question, are you a player or a spectator?
    const sessid = req.headers['cookie'].slice(2)
    const uid = String(sessiondata[1])
    const gameid = req.url.slice(6)
    if (!/^[a-zA-Z0-9]{9}$/.test(gameid)) return ws.close(4400, 'Invalid game id');
    var side = 's' // Side s for spectator. w or b for the players

    // Check if we have the game loaded in 
    redis.hmget(gameid, 'w', 'b', 'f', (err, uidarr) => {
      if (ws.readyState !== 1) return;
      if (err) { console.error(err); return ws.terminate(); }
      if (uidarr[2] === null) { ws.close(4404, 'Game unavailable'); return; }
      if (uidarr[0] === uid) side = 'w'
      if (uidarr[0] === sessid) side = 'w'
      if (uidarr[1] === uid) side = 'b'
      if (uidarr[1] === sessid) side = 'b'
      if (side === 's') {
        ws.on('message', function msg(data) {
          const message = data.toString('utf-8')
          if (message.length) {
            switch (message[0]) {
              case '0': {
                ws.isAlive = true;
                break;
              }
              case 's': {
                // Starting to watch, get all game info so far and subscribe
                redis.hmget(gameid, 'm', 'i', 'e', 'k', 'l', 'n', 'f', 's', (err, re) => {
                  if (ws.readyState !== 1) return;
                  if (err) { console.error(err); return ws.terminate(); };
                  ws.send('z' + side);
                  ws.send('s' + re[7]);
                  ws.send('l' + re[4]);
                  ws.send('n' + re[5]);
                  ws.send('m' + re[0]);
                  ws.send('i' + re[1]);
                  ws.send('e' + re[2]);
                  ws.send('k' + re[3]);
                  ws.send('f' + re[6]);
                  if (typeof subs[gameid] === 'undefined') {
                    subs[gameid] = { w: {}, b: {}, s: {} }  // Initialise after a crash?
                  }
                  // Subscribe if the game is not finished
                  if (re[6] === '0') {
                    subs[gameid][side][uid + '_' + wsid] = ws
                    wsconnections[ws.id] = { g: gameid, s: side, u: uid }
                    requestBotMove(gameid);
                  }
                })
                break;
              }
            }
          }
        });
      } else {
        const otherside = { w: 'b', b: 'w' }[side]
        ws.on('message', function msg(data) {
          const message = data.toString('utf-8')
          if (message.length) {
            switch (message[0]) {
              case '0': {
                ws.isAlive = true;
                break;
              }
              case 'e': {
                if (/^e[12]$/.test(message)) handleGameAction(gameid, side, message[1]);
                break;
              }
              case 'p': {
                handlePremove(gameid, side, message.slice(1), ws);
                break;
              }
              case 'm': {
                // Move, received when the client perceives it is the own player turn
                const clientmove = message.slice(1)
                handleMove(gameid, side, clientmove, ws)
                break;
              }
              case 'b': {
                // Live round trip times
                if ((typeof ws.receivedRTT === 'undefined' || ws.receivedRTT === false) && typeof ws.sentTime !== 'undefined') {
                  ws.receivedRTT = true;
                  ws.roundTripTime = Date.now() - ws.sentTime;
                } else {
                  ws.cheatingRTT = true;
                }
                break;
              }
              case 's': {
                // Starting to play, get all game info so far and subscribe
                redis.hmget(gameid, 'm', 'i', 'e', 'k', 'l', 'n', 'f', 's', { w: 'q', b: 'r' }[side], (err, re) => {
                  if (ws.readyState !== 1) return;
                  if (err) { console.error(err); return ws.terminate(); };
                  ws.send('z' + side);
                  ws.send('s' + re[7]);
                  ws.send('l' + re[4]);
                  ws.send('n' + re[5]);
                  ws.send('m' + re[0]);
                  ws.send('i' + re[1]);
                  ws.send('e' + re[2]);
                  ws.send('k' + re[3]);
                  ws.send('f' + re[6]);
                  ws.send('p' + re[8]); //Own premove info sent to client to be displayed
                  if (typeof subs[gameid] === 'undefined') {
                    subs[gameid] = { w: {}, b: {}, s: {} }  // Initialise after a crash?
                  }
                  // Subscribe if the game is not finished
                  if (re[6] === '0') {
                    subs[gameid][side][uid + '_' + wsid] = ws
                    wsconnections[ws.id] = { g: gameid, s: side, u: uid }
                    requestBotMove(gameid);
                  }
                })
                break;
              }
            }
          }
        });
      }
    })
  }
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    if (ws.readyState === 1) ws.send('1'); // 1 means PING
  });
}, 4000);

wss.on('close', () => clearInterval(interval));

function checkgame(gameid) {
  // Send game data to cheat detector to check for cheating
  // Send compact telemetry, not the growing repetition/analysis hash.
  const fields = ['m', 'i', 't', 'l', 'n', 'o', 'z', 'w', 'b', 'a', 'c', 'bw', 'bb', 'lc', 'pm', 'f', 'botProgram'];
  redis.hmget(gameid, ...fields, (err, values) => {
    if (err) {
      console.error(err);
      return;
    }
    if (values[fields.indexOf('botProgram')]) return; // Practice bots do not need fair-play searches.
    const myURL = new URL('https://' + config.game.engineHost + '/check')
    const options = {
      hostname: myURL.hostname,
      port: 443,
      path: myURL.pathname,
      method: 'POST',
      headers: {
        'authorization': config.shared.engineAuthToken,
        'id': gameid,
      }
    };

    const newreq = https.request(options, (res) => {
      res.resume();
      if (res.statusCode !== 200) {
        console.log('function checkgame response code not 200: ' + gameid)
        return;
      }
    });
    newreq.on('error', (e) => {
      console.log(e)
      return
    });
    newreq.setTimeout(5000, () => newreq.destroy(new Error('Cheat analysis request timed out')));
    const snapshot = Object.fromEntries(fields.flatMap((field, i) => values[i] == null ? [] : [[field, values[i]]]));
    if (snapshot.m == null) return newreq.destroy();
    newreq.end(JSON.stringify(snapshot));
  })
}

async function abortgamecheater(gameid, side) {
  try {
    const claimed = await redis.eval(`
      if redis.call('HGET', KEYS[1], 'f') ~= '0' then return 0 end
      redis.call('HSET', KEYS[1], 'f', 9, 'cheatSide', ARGV[1])
      redis.call('ZADD', KEYS[2], ARGV[2], KEYS[1])
      return 1`, 2, gameid, resultQueue, side, Date.now());
    if (claimed) await results.process(gameid);
  } catch (error) { console.error('cheater abort failed:', gameid, error); }
}

async function abortgame(gameid) {
  try {
    const claimed = await redis.eval(`
      if redis.call('HGET', KEYS[1], 'f') ~= '0' then return 0 end
      local deadline = tonumber(redis.call('ZSCORE', KEYS[2], KEYS[1]) or '0')
      if deadline > tonumber(ARGV[1]) then return 0 end
      local pending = tonumber(redis.call('HGET', KEYS[1], 'pendingUntil') or '0')
      if pending > tonumber(ARGV[1]) then
        redis.call('ZADD', KEYS[2], pending + 100, KEYS[1])
        return 0
      end
      if string.len(redis.call('HGET', KEYS[1], 'm') or '') > 8 then return 0 end
      redis.call('HSET', KEYS[1], 'f', 9)
      redis.call('ZADD', KEYS[3], ARGV[1], KEYS[1])
      return 1`, 3, gameid, timeoutKeyAbort, resultQueue, Date.now());
    if (claimed) await results.process(gameid);
  } catch (error) { console.error('game abort failed:', gameid, error); }
}

async function finishgame(gameid) {
  try {
    const result = await redis.eval(`
      if redis.call('HGET', KEYS[1], 'f') ~= '0' then return nil end
      local pending = tonumber(redis.call('HGET', KEYS[1], 'pendingUntil') or '0')
      if pending > tonumber(ARGV[1]) then
        redis.call('ZADD', KEYS[3], pending + 100, KEYS[1])
        return nil
      end
      local side = redis.call('HGET', KEYS[1], 't')
      local field = side == 'w' and 'l' or 'n'
      local last = tonumber(redis.call('HGET', KEYS[1], 's') or '0')
      if last == 0 then return nil end
      local remaining = tonumber(redis.call('HGET', KEYS[1], field) or '0') - (tonumber(ARGV[1]) - last)
      if remaining > 0 then return {side, tostring(remaining)} end
      redis.call('HSET', KEYS[1], 'f', 6, field, 0)
      redis.call('ZADD', KEYS[2], ARGV[1], KEYS[1])
      return {side, '0'}`, 3, gameid, resultQueue, timeoutKeyFinish, Date.now());
    if (!result) return;
    if (Number(result[1]) > 0) {
      scheduleTimeout(timeoutKeyFinish, gameid, Number(result[1]) + 400);
      return;
    }
    await results.process(gameid);
  } catch (error) { console.error('game timeout failed:', gameid, error); }
}
let shuttingDown = false;

function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  obs.log('info', 'shutdown_start', { reason: reason });

  server.close(() => {
    obs.log('info', 'shutdown_server_closed', {});
  });

  wss.close(() => {
    obs.log('info', 'shutdown_ws_closed', {});
  });

  clearInterval(timeoutPoller);
  movegen.close();
  results.close();

  Object.keys(subs).forEach((gameid) => {
    const websockets = subs[gameid];
    ['w', 'b', 's'].forEach((side) => {
      const group = websockets[side];
      if (!group) return;
      for (var user in group) {
        group[user].terminate();
      }
    });
  });
  Object.keys(subs).forEach((gameid) => delete subs[gameid]);
  Object.keys(wsconnections).forEach((id) => delete wsconnections[id]);

  redisSub.quit().catch(() => {});
  redis.quit().catch(() => {});
  database.end().catch(() => {});

  setTimeout(() => {
    obs.log('info', 'shutdown_forced_exit', {});
    process.exit(0);
  }, 30000);
}

process.on('SIGTERM', () => shutdown('sigterm'));
process.on('SIGINT', () => shutdown('sigint'));
