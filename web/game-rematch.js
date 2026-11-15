/* Invitations are derived from a finished game's verified participants, never
 * from client-supplied recipient IDs. Joining still uses the regional allocator. */
module.exports=({db,redis,index,create,join,notify=()=>{}})=>{
 const own=(row,user,session,n)=>user!=='0'&&String(row['userid'+n])===user||row['sessionid'+n]===session;
 const identity=(user,session)=>user!=='0'?user:'guest:'+session;
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
 return async function rematch({gameid},req,sessiondata){
  if(typeof gameid!=='string'||!/^[a-zA-Z0-9]{9}$/.test(gameid))fail(400,'Invalid game.');
  const user=String(sessiondata[1]||'0'),session=req.headers.cookie.slice(2);
  const {rows:[old]}=await db.query('SELECT * FROM games WHERE gameid=$1',[gameid]);
  if(!old)fail(404,'Game not found.');
  const seat=own(old,user,session,1)?1:own(old,user,session,2)?2:0;
  if(!seat)fail(403,'Only the players can request a rematch.');
  if(!old.finished||![1,2,3,4,5,6,7,8].includes(Number(old.state)))fail(409,'Finish the game first.');
  if(old.bot_program||String(old.sessionid1).startsWith('bot:')||String(old.sessionid2).startsWith('bot:'))fail(400,'Use New game to replay this bot.');
  const other=seat===1?2:1,recipient={user:String(old['userid'+other]||'0'),session:old['sessionid'+other]};
  if(!recipient.session)fail(410,'Opponent unavailable.');
  const lock='ui:rematch-lock:'+gameid,token=require('node:crypto').randomUUID();
  // A short lease serializes reciprocal clicks; creation itself remains SQL-locked.
  if(await redis.set(lock,token,'NX','EX',120)!=='OK')fail(409,'A rematch is being created. Please try again.');
  try{
   const saved=await redis.get('ui:rematch:'+gameid);
   if(saved){const challenge=JSON.parse(saved);const {rows:[row]}=await db.query('SELECT * FROM games WHERE gameid=$1',[challenge.gameid]);
    if(row&&!row.finished&&(row.started||(await index.openIds([row.gameid])).has(row.gameid))){
     if(own(row,user,session,1))return{success:true,gameid:row.gameid,started:!!row.started};
     const result=await join({id:row.id,action:'join'},req,sessiondata);await redis.zrem('ui:invites:'+identity(user,session),row.gameid);return result;
    }
   }
   const rate=await redis.incr('ui:rematch-rate:'+session);if(rate===1)await redis.expire('ui:rematch-rate:'+session,60);if(rate>6)fail(429,'Please wait before asking again.');
   const challenge=await create({rated:!!old.rated,timecontrol:old.timecontrol1||old.initialtime+'+'+old.increment,color:old['color'+seat]==='white'?'black':'white'},req,sessiondata,recipient);
   const key='ui:invites:'+identity(recipient.user,recipient.session);
   await redis.zadd(key,Date.now(),challenge.gameid);await redis.expire(key,300);
   await redis.set('ui:rematch:'+gameid,JSON.stringify({gameid:challenge.gameid}),'EX',300);
   if(recipient.user!=='0')notify(recipient.user,{type:'game_invitation'});
   return {...challenge,started:false};
  }finally{await redis.eval("if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) end return 0",1,lock,token);}
 };
};
