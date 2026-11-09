// Allowlist shared by the web API and tests. Unknown keys never reach storage.
const defaults = Object.freeze({ board:'auto', pieces:'classic', slide:180, autoQueen:false,
 analysis:{engine:'stockfish-lite',network:'default',multiPV:3,hash:32,threads:1},
 sound:'auto', volume:45, muted:false, events:{move:'theme',capture:'theme',slide:'theme',start:'theme',end:'theme',clock:'theme',check:'theme'} });
function normalize(value={}) {
 const choices=(v,allowed,fallback)=>allowed.includes(v)?v:fallback;
 const number=(v,min,max,fallback)=>typeof v==='number' && Number.isFinite(v)?Math.round(Math.max(min,Math.min(max,v))):fallback;
 if(!value || typeof value!=='object' || Array.isArray(value))value={};
 const identifier=(v,fallback)=>typeof v==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}$/.test(v)?v:fallback;
 return {analysis:{engine:identifier(value.analysis?.engine,'stockfish-lite'),network:identifier(value.analysis?.network,'default'),multiPV:number(value.analysis?.multiPV,1,8,3),hash:number(value.analysis?.hash,8,256,32),threads:number(value.analysis?.threads,1,16,1)},autoQueen:typeof value.autoQueen==='boolean'?value.autoQueen:defaults.autoQueen,board:choices(value.board,['auto','ivory','midnight','walnut'],defaults.board),
  pieces:choices(value.pieces,['classic','sculpted'],defaults.pieces),
  slide:number(value.slide,0,600,defaults.slide),sound:choices(value.sound,['auto','ivory','midnight'],defaults.sound),
  volume:number(value.volume,0,100,defaults.volume),muted:typeof value.muted==='boolean'?value.muted:false,
  events:Object.fromEntries(Object.keys(defaults.events).map(key=>[key,choices(value.events?.[key],['theme','ivory','midnight','off'],'theme')]))};
}
module.exports={defaults,normalize};
