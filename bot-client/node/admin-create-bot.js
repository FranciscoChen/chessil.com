const { readConfig, writeStateFile } = require('./lib/io');
const { request, extractSessionCookie, encodeForm } = require('./lib/http');

async function login(baseUrl, username, password) {
  const seed = await request({
    method: 'GET',
    url: baseUrl + '/',
    headers: { 'User-Agent': 'chessil-bot-client' }
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
      'User-Agent': 'chessil-bot-client'
    },
    body: form
  });

  const loginCookie = extractSessionCookie(loginRes.headers);
  if (!loginCookie) {
    throw new Error('Login failed: missing session cookie');
  }

  return loginCookie;
}

async function createBotUser(baseUrl, adminSession, config) {
  const now = new Date().toISOString();
  const role = Number.isFinite(Number(config.bot.role)) ? Number(config.bot.role) : 3;
  const rating = Number.isFinite(Number(config.bot.rating)) ? Number(config.bot.rating) : 1500;
  const deviation = Number.isFinite(Number(config.bot.deviation)) ? Number(config.bot.deviation) : 350;
  const volatility = Number.isFinite(Number(config.bot.volatility)) ? Number(config.bot.volatility) : 0.06;

  const payload = {
    action: 'create',
    data: {
      username: config.bot.username,
      canonical: String(config.bot.username).toLowerCase(),
      password: config.bot.password,
      email: null,
      created: now,
      ip: '127.0.0.1',
      theme: 'n',
      language: 'en',
      role: role,
      rating: rating,
      deviation: deviation,
      volatility: volatility,
      uci_elo: config.bot.uci_elo
    }
  };

  const body = JSON.stringify(payload);
  const response = await request({
    method: 'POST',
    url: baseUrl + '/admin/user',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Cookie': `s=${adminSession}`,
      'User-Agent': 'chessil-bot-client'
    },
    body
  });

  if (response.statusCode !== 200) {
    throw new Error(`Admin create failed: HTTP ${response.statusCode} ${response.body}`);
  }

  let result;
  try {
    result = JSON.parse(response.body);
  } catch (err) {
    throw new Error('Admin create failed: invalid JSON response');
  }

  if (!result.ok) {
    throw new Error(`Admin create failed: ${response.body}`);
  }

  return result;
}

async function main() {
  const config = readConfig();
  const baseUrl = config.webBaseUrl;
  if (!baseUrl) throw new Error('Missing webBaseUrl in config.json');

  const adminSession = await login(baseUrl, config.admin.username, config.admin.password);
  writeStateFile('admin-session.txt', adminSession + '\n');

  const result = await createBotUser(baseUrl, adminSession, config);
  writeStateFile('bot-user.json', JSON.stringify({
    id: result.id,
    username: config.bot.username,
    role: Number(config.bot.role || 1),
    uci_elo: config.bot.uci_elo
  }, null, 2) + '\n');

  console.log('Admin login ok. Bot user created:', result.id);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
