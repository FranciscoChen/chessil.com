const WebSocket = require('ws');
const { readConfig, readStateFile } = require('./lib/io');
const { request } = require('./lib/http');

async function fetchGameInfo(baseUrl, session, gameid) {
  const response = await request({
    method: 'POST',
    url: baseUrl + '/gameinfo',
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': Buffer.byteLength(gameid),
      'Cookie': `s=${session}`,
      'User-Agent': 'chessil-bot-client'
    },
    body: gameid
  });

  if (response.statusCode !== 200) {
    throw new Error(`gameinfo failed: HTTP ${response.statusCode} ${response.body}`);
  }

  let info;
  try {
    info = JSON.parse(response.body);
  } catch (err) {
    throw new Error('gameinfo failed: invalid JSON');
  }

  return info;
}

async function requestEngineMove(config, payload) {
  const body = JSON.stringify(payload);
  const response = await request({
    method: 'POST',
    url: config.engineBaseUrl + '/play',
    headers: {
      'authorization': config.engineAuthToken,
      'x-real-ip': config.engineXRealIp,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body)
    },
    body
  });

  if (response.statusCode !== 200) {
    throw new Error(`engine /play failed: HTTP ${response.statusCode} ${response.body}`);
  }

  let result;
  try {
    result = JSON.parse(response.body);
  } catch (err) {
    throw new Error('engine /play failed: invalid JSON');
  }

  if (!result || typeof result.bestmove !== 'string') {
    throw new Error('engine /play failed: missing bestmove');
  }

  return result.bestmove;
}

async function main() {
  const config = readConfig();
  const baseUrl = config.webBaseUrl;
  if (!baseUrl) throw new Error('Missing webBaseUrl in config.json');
  if (!config.engineBaseUrl || !config.engineAuthToken || !config.engineXRealIp) {
    throw new Error('Missing engineBaseUrl/engineAuthToken/engineXRealIp in config.json');
  }

  const session = readStateFile('bot-session.txt');
  if (!session) throw new Error('Missing bot-session.txt; run bot-login first.');

  const gameState = JSON.parse(readStateFile('game.json'));
  if (!gameState || !gameState.gameid) throw new Error('Missing game.json; run easy-start first.');

  const gameid = gameState.gameid;
  const gameInfo = await fetchGameInfo(baseUrl, session, gameid);
  const gameServer = gameInfo.gameserver || 'ws0';
  const winc = Number(gameInfo.increment || 0) * 1000;
  const binc = Number(gameInfo.increment || 0) * 1000;

  let moves = [];
  let wtime = null;
  let btime = null;
  let ourSide = gameInfo.side || null;
  let pending = false;
  let finished = false;
  let lastRequestedHm = -1;

  function currentTurn() {
    return moves.length % 2 === 0 ? 'w' : 'b';
  }

  async function maybePlay(ws) {
    if (pending || finished) return;
    if (!ourSide) return;
    if (ourSide === 's') {
      console.log('Session is spectator for this game.');
      ws.close();
      return;
    }
    if (wtime === null || btime === null) return;
    const turn = currentTurn();
    const hm = moves.length;
    if (turn !== ourSide) return;
    if (lastRequestedHm === hm) return;

    pending = true;
    try {
      const bestmove = await requestEngineMove(config, {
        gameid,
        uuidhm: `${gameid}-${hm}-${turn}`,
        moves: moves.join(' '),
        wtime,
        btime,
        winc,
        binc,
        elo: config.bot.uci_elo,
        turn
      });

      if (moves.length === hm && currentTurn() === turn) {
        ws.send('m' + bestmove);
        lastRequestedHm = hm;
      }
    } catch (err) {
      console.error(err.message || err);
    } finally {
      pending = false;
    }
  }

  const ws = new WebSocket(`wss://${gameServer}.chessil.com/game/${gameid}`, {
    headers: {
      Cookie: `s=${session}`,
      'User-Agent': 'chessil-bot-client',
      Origin: baseUrl
    }
  });

  ws.on('open', () => {
    ws.send('s');
  });

  ws.on('message', (data) => {
    const message = data.toString();
    if (!message.length) return;
    switch (message[0]) {
      case '1':
        ws.send('0');
        break;
      case 'a':
        ws.send('b');
        break;
      case 'z':
        ourSide = message.slice(1);
        break;
      case 'm': {
        if (message[1] === ':') {
          const parts = message.slice(2).split(':');
          const move = parts[0];
          const ply = Number(parts[3]);
          if (Number.isFinite(ply) && ply > 0) {
            moves[ply - 1] = move;
          }
        } else {
          const allMoves = message.slice(1).trim();
          moves = allMoves.length ? allMoves.split(' ') : [];
        }
        break;
      }
      case 'l':
        wtime = Number(message.slice(1));
        break;
      case 'n':
        btime = Number(message.slice(1));
        break;
      case 'f':
        if (Number(message.slice(1)) > 0) {
          finished = true;
          ws.close();
        }
        break;
      default:
        break;
    }
    void maybePlay(ws);
  });

  ws.on('close', () => {
    if (finished) {
      console.log('Game finished.');
    } else {
      console.log('Connection closed.');
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message || err);
  });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
