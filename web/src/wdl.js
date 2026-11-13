/* One WDL presentation for position summaries, book rows and future consumers.
 * Engine values are side-to-move relative; rendering owns perspective and rounding.
 * CSS container queries decide whether each percentage has enough room. */
window.ChessilWdl=(()=>{
 const views=new WeakMap();
 function values(score,fen,side='both'){
  if(!score)return null;
  let result=score.kind==='mate'?(score.value>0?[1000,0,0]:[0,0,1000]):score.wdl?.slice();
  if(score.kind==='cp'&&score.pv?.length===0)result=[0,1000,0];
  if(!result||result.length!==3||result.some(n=>!Number.isFinite(n)||n<0)||!result.some(n=>n>0))return null;
  if(fen.split(' ')[1]==='b')result.reverse();if(side==='b')result.reverse();return result;
 }
 function percentages(weights){const total=weights.reduce((sum,n)=>sum+n,0),raw=weights.map(n=>n*100/total),result=raw.map(Math.floor),order=raw.map((n,i)=>({i,fraction:n-result[i]})).sort((a,b)=>b.fraction-a.fraction);for(let n=100-result.reduce((a,b)=>a+b,0),i=0;i<n;i++)result[order[i].i]++;return result;}
 function expected(weights){if(!weights)return null;return (weights[0]-weights[2])/weights.reduce((a,b)=>a+b,0);}
 function render(host,{score,fen='',perspective='both',weights=values(score,fen,perspective)}={}){
  let view=views.get(host);if(!view){host.classList.add('wdl-bar');host.setAttribute('role','img');const track=document.createElement('span');track.className='wdl-track';const segments=['win','draw','loss'].map(name=>{const segment=document.createElement('span'),label=document.createElement('span');segment.dataset.wdl=name;label.className='wdl-percent';segment.append(label);track.append(segment);return segment;});host.replaceChildren(track);view={segments};views.set(host,view);}
  const signature=perspective+'|'+(weights?.join(',')||'unknown');if(view.signature===signature)return view.result;view.signature=signature;
  const percent=weights?percentages(weights):null,labels=perspective==='both'?['White','Draw','Black']:['Win','Draw','Loss'];host.dataset.side=perspective==='b'?'b':'w';host.classList.toggle('is-unknown',!percent);host.setAttribute('aria-label',percent?labels.map((name,i)=>name+' '+percent[i]+'%').join(', '):'Win, draw, loss estimates unavailable');host.title=host.getAttribute('aria-label');
  view.segments.forEach((segment,i)=>{segment.style.flexBasis=(percent?percent[i]:[33,34,33][i])+'%';segment.firstElementChild.textContent=percent?percent[i]+'%':'';segment.setAttribute('aria-hidden','true');});view.result={percentages:percent,q:expected(weights)};return view.result;
 }
 return {render,values,percentages,expected};
})();
