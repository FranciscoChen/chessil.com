const https = require('https');
function configuredRegions(config) {
  const source = config.web.gameServers || [{ id: config.game.serverName, host: config.engine.gameHost }];
  if (!Array.isArray(source) || !source.length) throw new Error('Configure at least one game server');
  const ids = new Set();
  return source.map(region => {
    if (!/^ws\d+$/.test(region.id) || ids.has(region.id)) throw new Error('Invalid or duplicate game server id');
    ids.add(region.id);
    const host = region.host || region.id + '.chessil.com';
    if (!/^[a-z0-9.-]+$/i.test(host)) throw new Error('Invalid game server host');
    return { id: region.id, host, enabled: region.enabled !== false };
  });
}
// Fairness matters, but adding latency to both players is expensive too.
function rankRegions(regions, first, second, bot = false) {
  return regions.filter(r => r.enabled).map(region => {
    const a = first[region.id], b = second[region.id];
    const known = Number.isFinite(a) && (bot || Number.isFinite(b));
    return { ...region, measured: known, score: known ? (bot ? a : Math.max(a,b) + Math.abs(a-b)) : Infinity };
  }).sort((a,b) => a.score - b.score);
}
function healthy(region) {
  return new Promise(resolve => {
    const req = https.get({ hostname:region.host, path:'/health', timeout:2000 }, res => {
      res.resume(); resolve(res.statusCode === 200);
    });
    req.on('timeout',()=>req.destroy()); req.on('error',()=>resolve(false));
  });
}
async function chooseRegion(regions, db, firstSession, secondSession, bot) {
  let measurements = [];
  try {
    const result = await db.query(`SELECT sessionid, server, rtt FROM game_server_latency
      WHERE sessionid = ANY($1::text[]) AND measured_at > NOW() - INTERVAL '2 minutes'`, [[firstSession,secondSession]]);
    measurements = result.rows;
  } catch(error) {
    // A single-server installation can start games before the optional migration.
    if (regions.filter(r=>r.enabled).length !== 1 || error.code !== '42P01') throw error;
  }
  const first={}, second={};
  for (const row of measurements) (row.sessionid===firstSession?first:second)[row.server]=Number(row.rtt);
  const ranked = rankRegions(regions, first, second, bot);
  const availability = await Promise.all(ranked.map(healthy));
  const selected = ranked.find((_,i)=>availability[i]);
  if (!selected) throw Object.assign(new Error('No game server is available. Please try again.'), { status:503 });
  return selected;
}
module.exports = { configuredRegions, rankRegions, chooseRegion };
