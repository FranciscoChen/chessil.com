/* Stable PV plans and legal null-turn threat probes; independent of UI/search scheduling. */
window.ChessilAnalysisGuidance={
 plan(fen,pv,side){const arrows=[];for(const move of pv.slice(0,12)){const turn=fen.split(' ')[1];if(!mg(fen).includes(move))break;if(turn===side&&arrows.length<4)arrows.push({from:move.slice(0,2),to:move.slice(2,4),type:'plan',label:'Plan '+(arrows.length+1)});fen=ucifen(move,fen,boardgen(fen),{}).f;if(arrows.length===4)break;}return arrows;},
 probe(fen,best,side){if(fen.split(' ')[1]!==side||!mg(fen).includes(best))return null;const after=ucifen(best,fen,boardgen(fen),{}).f;if(incheck(after)||!mg(after).length)return null;const fields=after.split(' '),skipped=fields[1];fields[1]=side;fields[3]='-';fields[4]=String(Number(fields[4])+1);if(skipped==='b')fields[5]=String(Number(fields[5])+1);const position=fields.join(' ');if(incheck(position)||!mg(position).length)return null;return position;},
 improves(before,after){if(!before||!after||before.kind==='mate')return false;return after.kind==='mate'?after.value>0:after.value-before.value>=80;}
};
window.ChessilStablePlan=class{
 constructor(){this.reset();}
 reset(){this.key='';this.input='';this.candidate=[];this.since=0;this.samples=0;this.wait=0;}
 observe(fen,pv,side,depth,now=performance.now()){
  const input=fen+'|'+side+'|'+pv.slice(0,12).join(' ');
  if(input!==this.input){this.input=input;this.candidate=ChessilAnalysisGuidance.plan(fen,pv,side);}
  const key=fen+'|'+side+'|'+this.candidate.map(a=>a.from+a.to).join(' ');
  if(key!==this.key){this.key=key;this.since=now;this.samples=1;}else this.samples++;
  const stable=depth>=6&&this.samples>=2&&now-this.since>=650;
  this.wait=!stable&&depth>=6&&this.candidate.length?Math.max(16,650-(now-this.since)):0;
  return stable?this.candidate:[];
 }
};
