/* Policy and cached scores are independent. Only the active search owns freshness. */
window.ChessilAnalysisBook=class{
 constructor(host,book,{play,scoreText}){this.host=host;this.book=book;this.play=play;this.scoreText=scoreText;this.cache=new Map();this.rows=new Map();this.epoch=0;}
 async render({fen,ply,lines=[],current=[],perspective='both'}){
  const epoch=++this.epoch,key=fen+'@'+ply;let request=this.cache.get(key);
  if(!request){request=this.book.lookup(fen,ply).then(result=>{const pieces=boardgen(fen),legal=mg(fen),policy=new Map(result.moves.map(row=>[row[0],row]));return {...result,hasPolicy:policy.size>0,moves:legal.map(move=>policy.get(move)||[move,gensanbase(move,pieces,fen,legal),null,null])};}).catch(error=>{this.cache.delete(key);throw error;});if(this.cache.size>=128)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,request);}
  const result=await request;if(epoch!==this.epoch)return result;
  const scores=new Map(lines.filter(line=>line.pv[0]).map(line=>[line.pv[0],line])),fresh=new Set(current.map(line=>line.pv[0])),best=current[0]?.pv[0],policyOrder=result.hasPolicy&&Number(fen.split(' ')[5])<9;
  const magnitude=line=>!line?-Infinity:line.kind==='mate'?(line.value>0?100000-Math.abs(line.value):-100000+Math.abs(line.value)):line.value;
  const ordered=result.moves.slice().sort((a,b)=>{
   if(policyOrder)return (b[2]||0)-(a[2]||0);
   if(a[0]===best)return -1;if(b[0]===best)return 1;
   return Number(fresh.has(b[0]))-Number(fresh.has(a[0]))||magnitude(scores.get(b[0]))-magnitude(scores.get(a[0]))||(b[2]||0)-(a[2]||0);
  });
  if(this.position!==key){this.position=key;this.rows.clear();this.host.replaceChildren();}
  for(const [move,label,weight,total] of ordered){
   let row=this.rows.get(move);
   if(!row){const button=document.createElement('button');button.type='button';button.className='book-move';button.dataset.move=move;const name=document.createElement('strong'),prior=document.createElement('span'),evaluation=document.createElement('span'),wdl=document.createElement('span');name.className='book-san';prior.className='book-policy';evaluation.className='book-eval';wdl.className='book-wdl';button.append(name,wdl,prior,evaluation);button.onclick=()=>this.play(move);row={button,name,prior,evaluation,wdl};this.rows.set(move,row);}
   const score=scores.get(move),probability=weight===null?null:weight/total,isFresh=!!score&&fresh.has(move);
   row.name.textContent=label;row.prior.hidden=probability===null;row.prior.textContent=probability===null?'':(probability*100).toFixed(1)+'%';row.prior.title='Policy probability';row.button.classList.toggle('no-policy',probability===null);row.button.classList.toggle('is-stale',!!score&&!isFresh);row.button.dataset.fresh=String(isFresh);
   row.evaluation.textContent=score?this.scoreText(score,fen,perspective):'';row.evaluation.title=score?(isFresh?'Current search':'Previous search')+' · depth '+score.depth:'Engine evaluation';
   ChessilWdl.render(row.wdl,{score,fen,perspective});row.button.setAttribute('aria-label',label+(probability===null?'':', policy '+row.prior.textContent)+(score?', '+row.evaluation.title+', evaluation '+row.evaluation.textContent:'')+', '+row.wdl.getAttribute('aria-label'));
  }
  // Move keyed rows without losing focus. Pointer/touch hover does not freeze ranking.
  let before=this.host.firstElementChild;for(const [move] of ordered){const button=this.rows.get(move).button;if(button===before)before=before.nextElementSibling;else this.host.insertBefore(button,before);}
  this.host.dataset.ranking=policyOrder?'policy':'engine';return result;
 }
};
