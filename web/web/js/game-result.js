/* Live-game outcomes use the same dialog as local lessons and puzzles. */
(()=>{
 let metadata,shown=false;
 const gameid=()=>location.pathname.match(/\/game\/([a-zA-Z0-9]{9})/)?.[1];
 async function request(url,data){const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),40000);try{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:controller.signal});const result=await response.json();if(!response.ok)throw Error(result.error||'Please try again.');return result;}finally{clearTimeout(timeout);}}
 async function playAgain(rematch){
  if(window.chessilMeasureLatency)await window.chessilMeasureLatency();
  const timecontrol=metadata.initialtime+'+'+metadata.increment;
  let result;
  if(metadata.bot)result=await request('/easy/start',{bot:'swift',difficulty:metadata.bot.difficulty,timecontrol,color:metadata.side==='w'?'black':'white'});
  else if(rematch)result=await request('/game-rematch',{gameid:gameid()});
  else result=await request(metadata.rated?'/matchmaking/find':'/matchmaking/casual',{timecontrol});
  if(!/^[a-zA-Z0-9]{9}$/.test(result.gameid||''))throw Error('The next game could not be created.');
  location.assign('/game/'+result.gameid);
 }
 async function show(){
  if(!gameid()||!window.ChessilResult||typeof stat==='undefined'||stat<1||stat>8)return;
  try{const response=await fetch('/gameinfo',{method:'POST',headers:{'Content-Type':'text/plain'},body:gameid()});if(!response.ok)throw Error();metadata=await response.json();}catch(_){return;}
  if(!['w','b'].includes(metadata.side))return;
  const score=document.querySelector('.result-wrap .result')?.textContent||'½–½',winner=score==='1–0'?'w':score==='0–1'?'b':null;
  const difference=Number(metadata.side==='w'?metadata.ratingdiff1:metadata.ratingdiff2),hasRating=metadata.rated&&(metadata.side==='w'?metadata.ratingdiff1:metadata.ratingdiff2)!=null;
  ChessilResult.show({outcome:winner===null?'draw':winner===metadata.side?'win':'loss',score,reason:document.querySelector('[data-game-field="state"]')?.textContent||'',rating:hasRating?'Rating '+(difference>=0?'+':'')+Math.round(difference):'',actions:[{label:'Rematch',pendingLabel:'Requesting rematch…',primary:true,close:false,run:()=>playAgain(true)},{label:'New game',pendingLabel:'Finding a game…',close:false,run:()=>playAgain(false)}]});
 }
 document.addEventListener('chessil:game-finished',()=>{if(!shown){shown=true;show();}});
 // Historical games remain readable; their result can reopen the dialog.
 document.addEventListener('click',event=>{if(event.target.closest('.result-wrap .result'))show();});
})();
