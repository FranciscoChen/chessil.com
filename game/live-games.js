const {publish}=require('../shared/live-games');
const fields=['f','m','t','l','n','s','botSide','createdAt'];
module.exports=function livePublisher({redis,central,region,abortKey='game:timeouts:abort',finishKey='game:timeouts:finish',intervalMs=3000}) {
 let busy=false,closed=false,seeded=false;
 async function seed() {
  let cursor='0';
  do {
   const [next,keys]=await redis.scan(cursor,'MATCH','?????????','COUNT',500);cursor=next;
   const valid=keys.filter(key=>/^[a-zA-Z0-9]{9}$/.test(key));
   if(valid.length) {
    const results=await redis.pipeline(valid.map(key=>['hmget',key,...fields])).exec();
    const transaction=redis.multi();
    results.forEach(([error,value],i)=>{
     if(error || value[0]!=='0' || typeof value[1]!=='string')return;
     const id=valid[i],plies=value[1]?value[1].split(' ').length:0,last=Number(value[5]) || Number(value[7]) || Date.now();
     transaction.sadd('game:active',id);
     // Recover deadlines only if absent; live moves keep their atomic schedule.
     if(plies<2)transaction.zadd(abortKey,'NX',last+14000,id);
     else transaction.zadd(finishKey,'NX',last+Number(value[value[2]==='w'?3:4])+400,id);
    });
    await transaction.exec();
   }
  }while(cursor!=='0');
  seeded=true;
 }
 async function tick() {
  if(busy || closed || central.status!=='ready')return;busy=true;
  try {
   if(!seeded)await seed();
   const ids=await redis.smembers('game:active'),games=[],stale=[];
   for(let offset=0;offset<ids.length;offset+=500) {
    const chunk=ids.slice(offset,offset+500),results=await redis.pipeline(chunk.map(id=>['hmget',id,...fields])).exec();
    results.forEach(([error,value],i)=>{
     if(error)throw error;
     if(value[0]!=='0' || typeof value[1]!=='string'){stale.push(chunk[i]);return;}
     const plies=value[1]?value[1].split(' ').length:0;
     games.push({gameid:chunk[i],server:region,turn:value[2],whiteMs:Number(value[3]),blackMs:Number(value[4]),
      lastMoveAt:Number(value[5]),plies,lastMove:value[1]?value[1].split(' ').at(-1):'',clockRunning:plies>=2 || value[6]===value[2]});
    });
   }
   if(stale.length)await redis.srem('game:active',...stale);
   await publish(central,region,games);
  }catch(error){console.error('Live game publisher:',error.message);}finally{busy=false;}
 }
 const timer=setInterval(tick,intervalMs);timer.unref();
 return {tick,close(){closed=true;clearInterval(timer);}};
};
