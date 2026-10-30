// Allowlist shared by the web API and tests. Unknown keys never reach storage.
const defaults = Object.freeze({ board:'auto', pieces:'classic', slide:180,
 sound:'auto', volume:45, muted:false, events:{move:'theme',capture:'theme',slide:'theme',start:'theme',end:'theme',clock:'theme',check:'theme'} });
function normalize(value={}) {
 const choices=(v,allowed,fallback)=>allowed.includes(v)?v:fallback;
 const number=(v,min,max,fallback)=>typeof v==='number' && Number.isFinite(v)?Math.round(Math.max(min,Math.min(max,v))):fallback;
 if(!value || typeof value!=='object' || Array.isArray(value))value={};
 return {board:choices(value.board,['auto','ivory','midnight','walnut'],defaults.board),
  pieces:choices(value.pieces,['classic','sculpted'],defaults.pieces),
  slide:number(value.slide,0,600,defaults.slide),sound:choices(value.sound,['auto','ivory','midnight'],defaults.sound),
  volume:number(value.volume,0,100,defaults.volume),muted:typeof value.muted==='boolean'?value.muted:false,
  events:Object.fromEntries(Object.keys(defaults.events).map(key=>[key,choices(value.events?.[key],['theme','ivory','midnight','off'],'theme')]))};
}
module.exports={defaults,normalize};
