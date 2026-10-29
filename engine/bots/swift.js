const {difficulty}=require('../../bots/catalog');
const skills=[0,2,5,8,11,14,17,20];
function settings(level) {
  return { bot:'swift', difficulty:difficulty(level), skill:skills[difficulty(level)-1], nodes:2048, mtime:1, syzygy:0, elo:0 };
}
// An explicit pacing policy, not Stockfish's hidden or adaptive search allocation.
function thinkTime({remaining,increment,plies}) {
  const reserve=Math.max(0,remaining-100);
  const horizon=Math.max(20,40-Math.min(20,Math.floor(plies/4)));
  return Math.max(0,Math.floor(Math.min(8000,remaining*.12,remaining/horizon+increment*.75,reserve)));
}
module.exports={settings,thinkTime};
