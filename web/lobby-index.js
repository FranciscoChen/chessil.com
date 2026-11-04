const {read,ids,channel}=require('../shared/live-games');
const owner=(user,session)=>String(user)!=='0'?'user:'+user:'session:'+session;
module.exports=function lobbyIndex({client,db,notify}) {
 const events=new Set();let sweeping=false;
 const subscriber=client.duplicate();subscriber.on('error',error=>console.error('Lobby subscription:',error.message));
 subscriber.on('ready',()=>subscriber.subscribe(channel).catch(error=>console.error('Lobby subscribe:',error.message)));
 subscriber.on('message',()=>{for(const send of events)send();});
 async function openIds(ids){if(!ids.length)return new Set();const values=await client.mget(...ids.map(id=>'lobby:challenge:'+id));return new Set(ids.filter((_,i)=>!!values[i]));}
 async function changed(type){await client.publish(channel,type);}
 async function open(id,user,session){await client.set('lobby:challenge:'+id,owner(user,session),'EX',90);await changed('challenge');}
 async function renew(id,user,session) {
  return Number(await client.eval(`if redis.call('GET',KEYS[1])~=ARGV[1] then return 0 end
    redis.call('EXPIRE',KEYS[1],90);return 1`,1,'lobby:challenge:'+id,owner(user,session)))===1;
 }
 async function close(id){await client.del('lobby:challenge:'+id);await changed('challenge');}
 async function sweep() {
  if(sweeping || client.status!=='ready')return;sweeping=true;
  try {
   const {rows}=await db.query(`SELECT id,gameid FROM games WHERE started IS NULL AND finished IS NULL
     AND userid2 IS NULL AND sessionid2 IS NULL AND created<NOW()-INTERVAL '10 seconds' ORDER BY created LIMIT 500`);
   const active=await openIds(rows.map(row=>row.gameid)),expired=rows.filter(row=>!active.has(row.gameid));
   if(expired.length) {
    const closed=await db.query(`UPDATE games SET finished=NOW(),state=9 WHERE id=ANY($1::bigint[])
      AND started IS NULL AND finished IS NULL AND userid2 IS NULL AND sessionid2 IS NULL RETURNING gameid`,[expired.map(row=>row.id)]);
    for(const row of closed.rows)notify(row.gameid,true,true);
    if(closed.rowCount)await changed('expired');
   }
   await client.zremrangebyscore('lobby:live','-inf',Date.now()-1);
  }catch(error){console.error('Lobby expiry:',error.message);}finally{sweeping=false;}
 }
 const timer=setInterval(sweep,30000);timer.unref();
 return {ids:()=>ids(client),read:ids=>read(client,ids),openIds,open,renew,close,changed,sweep,
  subscribe(send){events.add(send);return()=>events.delete(send);},
  stop(){clearInterval(timer);subscriber.disconnect();events.clear();}};
};
