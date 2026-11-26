const { randomInt } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const openings = readFileSync(join(__dirname, 'development-openings.txt'), 'utf8').trim().split('\n');
const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const unrated = { rating: -1, deviation: 0, volatility: 0 };

function nextMatch(previous, control = '10+0.1') {
  const match = /^(\d+(?:\.\d+)?)\+(\d+(?:\.\d+)?)$/.exec(control);
  if (!match || +match[1] < 1 || +match[1] > 3600 || +match[2] > 60) throw Error('Invalid development time control');
  if (previous?.leg === 1) return { ...previous, builds: undefined, hybrid: 'b', leg: 2 };
  const pair = (previous?.pair || 0) + 1;
  return { pair, leg: 1, hybrid: 'w', opening: openings[(pair - 1) % openings.length],
    seconds: +match[1], increment: +match[2], policy: '7a702165ba92072006f99708a16aeb60508130d9044412a17a29ad526b04008e' };
}

async function allocate(db, region, control) {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('development-match'))");
    const { rows: [last] } = await client.query('SELECT development,finished FROM games WHERE development IS NOT NULL ORDER BY id DESC LIMIT 1');
    let gameid;
    if (!last || last.finished) {
      const match = nextMatch(last?.development, control);
      const { rows } = await client.query('SELECT id,development_engine FROM users WHERE role=3 AND development_engine IS NOT NULL');
      const ids = Object.fromEntries(rows.map(row => [row.development_engine, row.id]));
      if (!ids.stockfish || !ids.hybrid) throw Error('Missing development bot accounts');
      const [white, black] = match.hybrid === 'w' ? [ids.hybrid, ids.stockfish] : [ids.stockfish, ids.hybrid];
      gameid = Array.from({length:9}, () => alphabet[randomInt(alphabet.length)]).join('');
      const time = {minutes:match.seconds / 60, increment:match.increment};
      await client.query(`INSERT INTO games (gameid,userid1,userid2,rated,randomcolor,color1,color2,initialtime,increment,
          timecontrol1,gameserver,created,development) VALUES ($1,$2,$3,false,false,'white','black',$4,$5,$6,$7,NOW(),$8)`,
        [gameid,white,black,time.minutes,time.increment,match.seconds+'s+'+match.increment,region.id,match]);
      const payload = {gameid, region, time, whitePlayerId:white, blackPlayerId:black, whiteRatings:unrated,
        blackRatings:unrated, development:{hybrid:match.hybrid, opening:match.opening}};
      await client.query('INSERT INTO game_start_jobs(gameid,payload) VALUES($1,$2)', [gameid,
        {payload, creatorId:white, userId:black, rated:false, whiteIsPlayer1:true, rating1:null, rating2:null}]);
    }
    await client.query('COMMIT');
    return gameid;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

// An unavailable region can recover with intact games. Only a confirmed missing
// authoritative hash after startup can release an orphaned seat.
async function recover(db, regions, exists) {
  const {rows:[game]} = await db.query(`SELECT gameid,gameserver FROM games g WHERE development IS NOT NULL
    AND finished IS NULL AND started<NOW()-INTERVAL '2 minutes'
    AND NOT EXISTS (SELECT 1 FROM game_start_jobs j WHERE j.gameid=g.gameid)`);
  const region = game && regions.find(r=>r.id===game.gameserver);
  if (region && await exists(region, game.gameid) === false) {
    await db.query('UPDATE games SET state=9,finished=NOW() WHERE gameid=$1 AND finished IS NULL',[game.gameid]);
  }
}

function schedule({db, regions, start, exists, control, enabled = true}) {
  let lastCheck = 0;
  let busy = false;
  async function tick() {
    if (busy || !enabled) return;
    busy = true;
    try {
      const region = regions.find(region => region.enabled);
      if (!region) return;
      if (Date.now()-lastCheck > 60000) {
        lastCheck = Date.now();
        await recover(db, regions, exists);
      }
      const gameid = await allocate(db, region, control);
      if (gameid) await start(gameid);
    } catch (error) { console.error('Development match:',error.message); }
    finally { busy = false; }
  }
  const timer = setInterval(tick, 1500);
  timer.unref();
  return {stop: () => clearInterval(timer)};
}
module.exports = {allocate, nextMatch, schedule};
