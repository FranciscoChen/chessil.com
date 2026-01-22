const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { Client } = require('pg');

function readConfig() {
  const configPath = path.join(__dirname, 'config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

function request({ method, url, headers = {}, body = null, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'https:' ? https : http;
    const options = {
      method,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      headers
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Request timed out'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function extractSessionCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const entry of cookies) {
    const match = entry.match(/s=([0-9a-f]{32})/i);
    if (match) return match[1];
  }
  return null;
}

function encodeForm(data) {
  return Object.entries(data)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

async function login(baseUrl, username, password) {
  const seed = await request({
    method: 'GET',
    url: baseUrl + '/',
    headers: { 'User-Agent': 'chessil-bot-matchmaker' }
  });
  const seedCookie = extractSessionCookie(seed.headers);
  if (!seedCookie) {
    throw new Error('Missing session cookie from initial request');
  }

  const form = encodeForm({ username, password });
  const loginRes = await request({
    method: 'POST',
    url: baseUrl + '/login',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(form),
      'Cookie': `s=${seedCookie}`,
      'User-Agent': 'chessil-bot-matchmaker'
    },
    body: form
  });

  const loginCookie = extractSessionCookie(loginRes.headers);
  if (!loginCookie) {
    throw new Error('Login failed: missing session cookie');
  }

  return loginCookie;
}

async function startEasyGame(baseUrl, session, botId, opts) {
  const color = opts.color === 'white' || opts.color === 'black' ? opts.color : null;
  const body = JSON.stringify({
    botId: botId,
    rated: !!opts.rated,
    timecontrol: opts.timecontrol,
    color: color
  });
  const response = await request({
    method: 'POST',
    url: baseUrl + '/easy/start',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Cookie': `s=${session}`,
      'User-Agent': 'chessil-bot-matchmaker'
    },
    body
  });

  if (response.statusCode !== 200) {
    throw new Error(`easy/start failed: HTTP ${response.statusCode} ${response.body}`);
  }

  let payload;
  try {
    payload = JSON.parse(response.body);
  } catch (err) {
    throw new Error('easy/start failed: invalid JSON');
  }

  if (!payload || !payload.gameid) {
    throw new Error(`easy/start failed: ${response.body}`);
  }

  return payload.gameid;
}

function shuffleInPlace(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

function pickBotPair(bots, eloRange) {
  if (bots.length < 2) return null;
  const shuffled = shuffleInPlace(bots.slice());
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = i + 1; j < shuffled.length; j++) {
      const a = shuffled[i];
      const b = shuffled[j];
      if (!Number.isFinite(Number(a.uci_elo)) || !Number.isFinite(Number(b.uci_elo))) {
        continue;
      }
      if (Math.abs(Number(a.uci_elo) - Number(b.uci_elo)) <= eloRange) {
        return [a, b];
      }
    }
  }
  return null;
}

async function fetchActiveBots(client, botIds) {
  const result = await client.query(
    'SELECT userid1, userid2 FROM games WHERE state = 0 AND (userid1 = ANY($1) OR userid2 = ANY($1))',
    [botIds]
  );
  const busy = new Set();
  for (const row of result.rows) {
    if (row.userid1) busy.add(String(row.userid1));
    if (row.userid2) busy.add(String(row.userid2));
  }
  return busy;
}

async function fetchActiveBotVsBotCount(client, botIds) {
  const result = await client.query(
    'SELECT count(*) AS c FROM games WHERE state = 0 AND userid1 = ANY($1) AND userid2 = ANY($1)',
    [botIds]
  );
  return Number(result.rows[0] ? result.rows[0].c : 0);
}

async function runOnce(config) {
  const baseUrl = config.webBaseUrl;
  const mm = config.matchmaker || {};
  const bots = Array.isArray(mm.bots) ? mm.bots : [];

  if (!baseUrl) throw new Error('Missing webBaseUrl in config.json');
  if (!config.postgresUrl) throw new Error('Missing postgresUrl in config.json');
  if (bots.length < 2) {
    console.log('Not enough bots configured.');
    return;
  }

  const botIds = bots.map((bot) => Number(bot.id)).filter((id) => Number.isFinite(id));
  if (botIds.length < 2) {
    throw new Error('Bots must include numeric id values.');
  }

  const client = new Client({ connectionString: config.postgresUrl });
  await client.connect();

  try {
    const activeCount = await fetchActiveBotVsBotCount(client, botIds);
    const maxConcurrent = Number.isFinite(Number(mm.maxConcurrentGames)) ? Number(mm.maxConcurrentGames) : 0;
    if (maxConcurrent > 0 && activeCount >= maxConcurrent) {
      console.log('Active bot games at limit:', activeCount);
      return;
    }

    const busyBots = await fetchActiveBots(client, botIds);
    let available = bots.filter((bot) => !busyBots.has(String(bot.id)));
    const maxStarts = Number.isFinite(Number(mm.maxStartsPerRun)) ? Number(mm.maxStartsPerRun) : 1;
    const eloRange = Number.isFinite(Number(mm.eloRange)) ? Number(mm.eloRange) : 0;

    let created = 0;
    let runningCount = activeCount;
    while (created < maxStarts && available.length >= 2 && (maxConcurrent <= 0 || runningCount < maxConcurrent)) {
      const pair = pickBotPair(available, eloRange);
      if (!pair) break;
      const [botA, botB] = pair;

      const session = await login(baseUrl, botA.username, botA.password);
      const gameid = await startEasyGame(baseUrl, session, Number(botB.id), {
        rated: !!mm.rated,
        timecontrol: mm.timecontrol || '5+0',
        color: mm.color || 'random'
      });

      console.log('Created bot vs bot game:', gameid, 'bots:', botA.id, botB.id);
      created += 1;
      runningCount += 1;
      available = available.filter((bot) => bot.id !== botA.id && bot.id !== botB.id);
    }

    if (created === 0) {
      console.log('No eligible bot pairs found.');
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const config = readConfig();
  const intervalSec = Number.isFinite(Number(config.matchmaker && config.matchmaker.intervalSec))
    ? Number(config.matchmaker.intervalSec)
    : 0;

  await runOnce(config);

  if (intervalSec > 0) {
    setInterval(() => {
      runOnce(config).catch((err) => {
        console.error(err.message || err);
      });
    }, intervalSec * 1000);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
