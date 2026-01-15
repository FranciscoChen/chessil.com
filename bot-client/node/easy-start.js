const { readConfig, readStateFile, writeStateFile } = require('./lib/io');
const { request } = require('./lib/http');

async function fetchBotList(baseUrl, session, config) {
  const target = Number(config.easy.opponentUciElo || 0);
  const range = Number(config.easy.opponentEloRange || 200);
  const body = JSON.stringify({
    timecontrol: config.easy.timecontrol,
    filterBy: config.easy.filterBy || 'uci_elo',
    eloMin: target ? Math.max(0, target - range) : null,
    eloMax: target ? Math.min(4000, target + range) : null
  });
  const response = await request({
    method: 'POST',
    url: baseUrl + '/easy/bots',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Cookie': `s=${session}`,
      'User-Agent': 'chessil-bot-client'
    },
    body
  });

  if (response.statusCode !== 200) {
    throw new Error(`easy/bots failed: HTTP ${response.statusCode} ${response.body}`);
  }

  let bots;
  try {
    bots = JSON.parse(response.body);
  } catch (err) {
    throw new Error('easy/bots failed: invalid JSON');
  }

  if (!Array.isArray(bots)) {
    throw new Error('easy/bots failed: unexpected response');
  }

  return bots;
}

function pickBotId(bots, targetElo) {
  if (!bots.length) return null;
  if (!Number.isFinite(targetElo)) return bots[0].id;
  let best = bots[0];
  let bestDiff = Math.abs((Number(bots[0].uci_elo) || 0) - targetElo);
  for (const bot of bots) {
    const diff = Math.abs((Number(bot.uci_elo) || 0) - targetElo);
    if (diff < bestDiff) {
      best = bot;
      bestDiff = diff;
    }
  }
  return best.id;
}

async function startGame(baseUrl, session, config, botId) {
  const color = config.easy.color === 'white' || config.easy.color === 'black' ? config.easy.color : null;
  const body = JSON.stringify({
    botId: botId,
    rated: !!config.easy.rated,
    timecontrol: config.easy.timecontrol,
    color: color
  });
  const response = await request({
    method: 'POST',
    url: baseUrl + '/easy/start',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Cookie': `s=${session}`,
      'User-Agent': 'chessil-bot-client'
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

async function main() {
  const config = readConfig();
  const baseUrl = config.webBaseUrl;
  if (!baseUrl) throw new Error('Missing webBaseUrl in config.json');

  const session = readStateFile('bot-session.txt');
  if (!session) throw new Error('Missing bot-session.txt; run bot-login first.');

  let botId = config.easy.opponentBotId;
  if (!Number.isFinite(Number(botId))) {
    const bots = await fetchBotList(baseUrl, session, config);
    botId = pickBotId(bots, Number(config.easy.opponentUciElo || 0));
  }

  if (!Number.isFinite(Number(botId))) {
    throw new Error('No opponent bot found');
  }

  const gameid = await startGame(baseUrl, session, config, Number(botId));
  writeStateFile('game.json', JSON.stringify({
    gameid,
    botId: Number(botId),
    createdAt: new Date().toISOString()
  }, null, 2) + '\n');

  console.log('Easy game created:', gameid, 'opponent bot:', botId);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
