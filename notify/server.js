const http = require('http');
const https = require('https');
const WebSocket = require('ws');
const Redis = require('ioredis');
const pg = require('pg');
const observability = require('../observability');
const config = require('../config.json');

const notifyConfig = config.notify || {};
const domainName = notifyConfig.domainName || config.web.domainName;
const wsPath = notifyConfig.wsPath || '/notify';
const envPort = parseInt(process.env.PORT || '', 10);
const port = Number.isFinite(envPort) ? envPort : (notifyConfig.port || 8090);
const sendActiveGamesOnConnect = notifyConfig.sendActiveGamesOnConnect !== false;
const activeGamesLimit = Number.isFinite(notifyConfig.activeGamesLimit) ? notifyConfig.activeGamesLimit : 10;

const obs = observability.createObserver('notify');
obs.installProcessHandlers();

const redisSub = new Redis();
const notifyGlobalChannel = 'notify:global';
const notifyUserPrefix = 'notify:user:';
const notifySessionPrefix = 'notify:session:';

const pool = new pg.Pool({ connectionString: config.shared.postgresUrl });

const clientsByUser = new Map();
const clientsBySession = new Map();
const userByClient = new Map();

function sanitizeUserAgent(useragent) {
  if (typeof useragent !== 'string') return '';
  return useragent.replace(/[\r\n]/g, ' ').slice(0, 255);
}

function buildSessionData(ip, userid, theme, lang, created, username, useragent) {
  return [ip, userid, theme, lang, created, username, useragent || ''];
}

function parseSessionData(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;
  if (raw[0] !== '{') return null;
  try {
    const parsed = JSON.parse(raw);
    return buildSessionData(
      parsed.ip || '',
      parsed.userid || '0',
      parsed.theme || 'n',
      parsed.lang || 'en',
      parsed.created || '0',
      parsed.username || 'u',
      sanitizeUserAgent(parsed.useragent || '')
    );
  } catch (err) {
    console.error(err);
    return null;
  }
}

function authenticate(req, callback) {
  if (typeof req.headers.origin !== 'string' || req.headers.origin.slice(0, domainName.length) !== domainName) {
    return callback(new Error('invalid_origin'));
  }
  const cookie = req.headers.cookie;
  if (typeof cookie !== 'string' || cookie.length !== 34 || cookie.slice(0, 2) !== 's=') {
    return callback(new Error('missing_cookie'));
  }
  const sessionid = cookie.slice(2);

  const myURL = new URL(domainName + '/websocket');
  const options = {
    hostname: myURL.hostname,
    port: 443,
    path: myURL.pathname,
    method: 'POST',
    headers: { authorization: config.shared.websocketPassword }
  };

  const useragent = sanitizeUserAgent(req.headers['user-agent']);
  const newreq = https.request(options, (res) => {
    if (res.statusCode !== 200) {
      return callback(new Error('auth_failed'));
    }
    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      const sessiondata = parseSessionData(rawData);
      if (!sessiondata) return callback(new Error('bad_session'));
      if (req.headers['x-real-ip'] === sessiondata[0]) return callback(null, sessiondata, sessionid);
      if (useragent === sessiondata[6]) return callback(null, sessiondata, sessionid);
      return callback(new Error('ip_mismatch'));
    });
  });
  newreq.on('error', (err) => callback(err));
  newreq.end(cookie);
}

function ensureUserSet(userid) {
  if (!clientsByUser.has(userid)) {
    clientsByUser.set(userid, new Set());
    redisSub.subscribe(notifyUserPrefix + userid, (err) => {
      if (err) obs.log('error', 'redis_subscribe_error', { channel: notifyUserPrefix + userid, error: String(err) });
    });
  }
  return clientsByUser.get(userid);
}

function ensureSessionSet(sessionid) {
  if (!clientsBySession.has(sessionid)) {
    clientsBySession.set(sessionid, new Set());
    redisSub.subscribe(notifySessionPrefix + sessionid, (err) => {
      if (err) obs.log('error', 'redis_subscribe_error', { channel: notifySessionPrefix + sessionid, error: String(err) });
    });
  }
  return clientsBySession.get(sessionid);
}

function removeUserClient(userid, ws) {
  const set = clientsByUser.get(userid);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) {
    clientsByUser.delete(userid);
    redisSub.unsubscribe(notifyUserPrefix + userid, (err) => {
      if (err) obs.log('error', 'redis_unsubscribe_error', { channel: notifyUserPrefix + userid, error: String(err) });
    });
  }
}

function removeSessionClient(sessionid, ws) {
  const set = clientsBySession.get(sessionid);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) {
    clientsBySession.delete(sessionid);
    redisSub.unsubscribe(notifySessionPrefix + sessionid, (err) => {
      if (err) obs.log('error', 'redis_unsubscribe_error', { channel: notifySessionPrefix + sessionid, error: String(err) });
    });
  }
}

function normalizeMessage(channel, message) {
  if (typeof message !== 'string') {
    return { type: 'message', channel: channel, message: '' };
  }
  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === 'object') {
      if (!parsed.type) parsed.type = 'message';
      if (!parsed.channel) parsed.channel = channel;
      return parsed;
    }
  } catch (err) {
    // fall through
  }
  return { type: 'message', channel: channel, message: message };
}

function sendToUser(userid, payload) {
  const set = clientsByUser.get(userid);
  if (!set) return;
  const data = JSON.stringify(payload);
  set.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });
}

function sendToSession(sessionid, payload) {
  const set = clientsBySession.get(sessionid);
  if (!set) return;
  const data = JSON.stringify(payload);
  set.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  });
}

function sendToAll(payload) {
  const data = JSON.stringify(payload);
  clientsByUser.forEach((set) => {
    set.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(data);
    });
  });
}

async function sendActiveGames(userid, ws) {
  if (!sendActiveGamesOnConnect) return;
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(
      'SELECT gameid, gameserver, rated, state, initialtime, increment, started FROM games WHERE state = 0 AND (userid1 = $1 OR userid2 = $1) ORDER BY started DESC NULLS LAST LIMIT $2',
      [Number(userid), activeGamesLimit]
    );
    if (result.rows.length > 0 && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'active_games', games: result.rows }));
    }
  } catch (err) {
    obs.log('error', 'active_games_error', { error: err && err.stack ? err.stack : String(err) });
  } finally {
    if (client) client.release();
  }
}

redisSub.subscribe(notifyGlobalChannel, (err) => {
  if (err) obs.log('error', 'redis_subscribe_error', { channel: notifyGlobalChannel, error: String(err) });
});

redisSub.on('message', (channel, message) => {
  const payload = normalizeMessage(channel, message);
  if (channel === notifyGlobalChannel) {
    sendToAll(payload);
    return;
  }
  if (channel.startsWith(notifyUserPrefix)) {
    const userid = channel.slice(notifyUserPrefix.length);
    sendToUser(userid, payload);
    return;
  }
  if (channel.startsWith(notifySessionPrefix)) {
    const sessionid = channel.slice(notifySessionPrefix.length);
    sendToSession(sessionid, payload);
  }
});

const server = http.createServer((req, res) => {
  res.writeHead(426, { 'Content-Type': 'text/plain' });
  res.end('Upgrade Required');
});

const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws, req, sessiondata, sessionid) => {
  const userid = sessiondata[1];
  userByClient.set(ws, { userid: userid, sessionid: sessionid });
  if (sessionid) {
    const sessionSet = ensureSessionSet(sessionid);
    sessionSet.add(ws);
  }
  if (userid !== '0') {
    const userSet = ensureUserSet(userid);
    userSet.add(ws);
  }

  if (userid !== '0') {
    sendActiveGames(userid, ws).catch(() => {});
  }

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (data) => {
    if (typeof data !== 'string') return;
    if (data === 'ping') {
      ws.send('pong');
    }
  });

  ws.on('close', () => {
    const info = userByClient.get(ws);
    userByClient.delete(ws);
    if (info && info.sessionid) {
      removeSessionClient(info.sessionid, ws);
    }
    if (info && info.userid && info.userid !== '0') {
      removeUserClient(info.userid, ws);
    }
  });
});

server.on('upgrade', (req, socket, head) => {
  const path = req.url ? req.url.split('?')[0] : '';
  if (path !== wsPath) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }
  authenticate(req, (err, sessiondata, sessionid) => {
    if (err || !sessiondata) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req, sessiondata, sessionid);
    });
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (err) {
      ws.terminate();
    }
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

server.listen(port, () => {
  obs.log('info', 'server_listen', { port: port, wsPath: wsPath });
});
