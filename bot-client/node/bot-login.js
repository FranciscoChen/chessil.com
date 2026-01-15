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

async function main() {
  const config = readConfig();
  const baseUrl = config.webBaseUrl;
  if (!baseUrl) throw new Error('Missing webBaseUrl in config.json');

  const session = await login(baseUrl, config.bot.username, config.bot.password);
  writeStateFile('bot-session.txt', session + '\n');
  console.log('Bot login ok. Session saved.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
