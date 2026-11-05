const {difficulty}=require('../../bots/catalog');
// Wide root coverage exposes genuinely poor moves, rather than just the top four.
const widths=[256,128,64,32,16,8,4,1];
const errorRates=[.98,.92,.82,.68,.50,.32,.15,0];
const bands=[[.65,1],[.45,1],[.30,.90],[.15,.75],[.05,.60],[0,.40],[0,.25],[0,0]];
function settings(level) {
  return { bot:'swift', difficulty:difficulty(level), skill:20, multiPV:widths[difficulty(level)-1], nodes:2048, mtime:1, syzygy:0, elo:0 };
}
// Scores are from the side to move. Mate scores must outrank all centipawn scores.
function score(info) {const s=info.score;return s.type==='cp'?s.value:s.value>0?1000000-s.value:-1000000-s.value;}
function choose(summary,best,level,random=Math.random) {
 const index=difficulty(level)-1,candidates=summary.candidates().sort((a,b)=>score(b)-score(a) || a.multipv-b.multipv);
 if(!best.bestmove || !candidates.length)return summary.finish(best);
 let chosen=candidates[0];
 if(candidates.length>1 && random()<errorRates[index]) {
  const [low,high]=bands[index],last=candidates.length-1;
  const first=Math.max(1,Math.ceil(last*low)),end=Math.max(first,Math.ceil(last*high));
  chosen=candidates[first+Math.min(end-first,Math.floor(random()*(end-first+1)))];
 }
 const move=chosen.pv[0];
 // Never attach Stockfish's original ponder or another move's evaluation.
 return {bestmove:move,...(chosen.pv[1]?{ponder:chosen.pv[1]}:{}),eval:`${chosen.score.type} ${chosen.score.value}`,analysis:chosen};
}
// An explicit pacing policy, not Stockfish's hidden or adaptive search allocation.
function thinkTime({remaining,increment,plies}) {
  const reserve=Math.max(0,remaining-100);
  const horizon=Math.max(20,40-Math.min(20,Math.floor(plies/4)));
  return Math.max(0,Math.floor(Math.min(8000,remaining*.12,remaining/horizon+increment*.75,reserve)));
}
module.exports={settings,thinkTime,choose};
