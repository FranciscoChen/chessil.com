const fs = require('fs');
const { URL } = require('url');
const WebSocket = require('ws');
const { readConfig, writeStateFile, stateDir } = require('./lib/io');
const { request, extractSessionCookie, encodeForm } = require('./lib/http');

function ensureStateDir() {
  fs.mkdirSync(stateDir, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveWsPingUrl(config, webBaseUrl) {
  if (config.wsPingUrl) return config.wsPingUrl;
  if (config.wsBaseUrl) {
    return config.wsBaseUrl.replace(/\/+$/, '') + '/ping';
  }
  if (!webBaseUrl) return null;
  const base = new URL(webBaseUrl);
  if (base.hostname.endsWith('chessil.com')) {
    return 'wss://ws0.chessil.com/ping';
  }
  const wsProtocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${base.host}/ping`;
}

async function seedSession(baseUrl) {
  const seed = await request({
    method: 'GET',
    url: baseUrl + '/',
    headers: { 'User-Agent': 'chessil-bot-client' }
  });
  const seedCookie = extractSessionCookie(seed.headers);
  if (!seedCookie) {
    throw new Error('Missing session cookie from initial request');
  }
  return seedCookie;
}

function wsPing(wsPingUrl, sessionCookie, origin) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ws = new WebSocket(wsPingUrl, {
      headers: {
        'Cookie': `s=${sessionCookie}`,
        'User-Agent': 'chessil-bot-client',
        ...(origin ? { 'Origin': origin } : {})
      }
    });

    const finish = (err) => {
      if (settled) return;
      settled = true;
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };

    const timeout = setTimeout(() => {
      ws.terminate();
      finish(new Error('WebSocket ping timed out'));
    }, 10000);

    ws.on('message', (data) => {
      const message = data.toString('utf-8');
      if (message === '1') {
        ws.send('0');
      } else if (message === 'a') {
        ws.send('b');
      }
    });

    ws.on('close', () => {
      clearTimeout(timeout);
      finish();
    });

    ws.on('error', (err) => {
      clearTimeout(timeout);
      finish(err);
    });
  });
}

async function registerUser(baseUrl, sessionCookie, username, password) {
  const form = encodeForm({
    username,
    password,
    nocheating: 'true',
    treatotherswell: 'true',
    nomultiaccount: 'true',
    noattacks: 'true'
  });

  const response = await request({
    method: 'POST',
    url: baseUrl + '/register',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(form),
      'Cookie': `s=${sessionCookie}`,
      'User-Agent': 'chessil-bot-client'
    },
    body: form
  });

  if (response.statusCode >= 400) {
    throw new Error(`Register failed: HTTP ${response.statusCode} ${response.body}`);
  }

  return response;
}

async function main() {
  const config = readConfig();
  const baseUrl = config.webBaseUrl;
  if (!baseUrl) throw new Error('Missing webBaseUrl in config.json');

  const wsPingUrl = resolveWsPingUrl(config, baseUrl);
  if (!wsPingUrl) throw new Error('Missing wsPingUrl in config.json');

  if (!config.register || !config.register.username || !config.register.password) {
    throw new Error('Missing register.username or register.password in config.json');
  }

  ensureStateDir();

  const sessionCookie = await seedSession(baseUrl);
  await wsPing(wsPingUrl, sessionCookie, baseUrl);
  await sleep(2500);

  const response = await registerUser(
    baseUrl,
    sessionCookie,
    config.register.username,
    config.register.password
  );

  const newSession = extractSessionCookie(response.headers);
  const bodyPreview = typeof response.body === 'string'
    ? response.body.slice(0, 200).replace(/\s+/g, ' ').trim()
    : '';
  if (newSession) {
    writeStateFile('register-session.txt', newSession + '\n');
  }
  writeStateFile('register-user.json', JSON.stringify({
    username: config.register.username,
    statusCode: response.statusCode,
    hasSession: Boolean(newSession)
  }, null, 2) + '\n');

  console.log('Registration request complete.');
  if (newSession) {
    console.log('New session saved to state/register-session.txt');
  } else {
    console.log('No session cookie returned.');
    console.log(`Status: ${response.statusCode}`);
    if (response.headers && response.headers.location) {
      console.log(`Location: ${response.headers.location}`);
    }
    if (bodyPreview) {
      console.log(`Body preview: ${bodyPreview}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
