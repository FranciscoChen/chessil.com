/* Authenticated/session-scoped menu. Redis snapshots decide liveness; SQL owns
 * identities and game details. Invitations expire and never grant game access. */
module.exports=({db,index,redis,join,create,notify=()=>{}})=>{
 const fail=(status,message)=>{throw Object.assign(Error(message),{status});};
 const own=(row,user,session,n)=>user!=='0'&&String(row['userid'+n])===user||row['sessionid'+n]===session;
 const pending=row=>!row.started&&!row.finished&&!(Number(row.state)>0)&&row.userid2==null&&row.sessionid2==null;
 const key=user=>'ui:invites:'+user;
 async function incoming(user){if(user==='0')return [];await redis.zremrangebyscore(key(user),'-inf',Date.now()-300000);return redis.zrange(key(user),0,-1);}
 async function list(user,session){
  const invited=await incoming(user);
  const {rows}=await db.query(`SELECT g.id,g.gameid,g.userid1,g.userid2,g.sessionid1,g.sessionid2,g.color1,g.color2,g.started,g.finished,g.state,g.initialtime,g.increment,g.timecontrol1,g.rated,g.bot_program,g.bot_difficulty,u1.username AS username1,u2.username AS username2
   FROM games g LEFT JOIN users u1 ON u1.id=g.userid1 LEFT JOIN users u2 ON u2.id=g.userid2
   WHERE g.finished IS NULL AND (g.state IS NULL OR g.state<=0) AND
   ((($1::bigint<>0 AND (g.userid1=$1 OR g.userid2=$1)) OR g.sessionid1=$2 OR g.sessionid2=$2) OR g.gameid=ANY($3::text[])) ORDER BY g.created DESC`,[user,session,invited]);
  const [live,leased]=await Promise.all([index.read(rows.filter(row=>own(row,user,session,1)||own(row,user,session,2)).map(row=>row.gameid)),index.openIds(rows.filter(pending).map(row=>row.gameid))]);const games=[],invitations=[],challenges=[];
  for(const row of rows){const first=own(row,user,session,1),second=own(row,user,session,2),snapshot=live.get(row.gameid);
   const label=n=>row.bot_program&&n===1?'Swift · '+row.bot_difficulty:row['username'+n]||'Guest';
   if((first||second)&&snapshot){const side=row['color'+(first?1:2)]==='black'?'b':'w';games.push({gameid:row.gameid,opponent:label(first?2:1),side,yourTurn:snapshot.turn===side,time:row.initialtime+'+'+row.increment});}
   else if(pending(row)&&leased.has(row.gameid)){if(first)challenges.push({gameid:row.gameid,time:row.timecontrol1,rated:!!row.rated});else if(invited.includes(row.gameid))invitations.push({gameid:row.gameid,from:label(1),time:row.timecontrol1,rated:!!row.rated});}
  }
  games.sort((a,b)=>Number(b.yourTurn)-Number(a.yourTurn));return {games,invitations,challenges};
 }
 async function action(data,req,sessiondata){
  const user=String(sessiondata[1]||'0'),session=req.headers.cookie.slice(2);
  if(data.action==='send'){
   if(typeof data.username!=='string'||!/^[a-zA-Z0-9_-]{2,30}$/.test(data.username))fail(400,'Enter a valid username.');
   const {rows:[recipient]}=await db.query('SELECT id FROM users WHERE canonical=$1',[data.username.toLowerCase()]);
   if(!recipient)fail(404,'Player not found.');if(String(recipient.id)===user)fail(400,'Choose another player.');
   const count=await redis.incr('ui:invite-rate:'+session);if(count===1)await redis.expire('ui:invite-rate:'+session,60);if(count>10)fail(429,'Please wait before inviting again.');
   let gameid=data.gameid;if(!gameid)gameid=(await create({timecontrol:'5+0',rated:false},req,sessiondata)).gameid;
   if(typeof gameid!=='string'||!/^[a-zA-Z0-9]{9}$/.test(gameid))fail(400,'Invalid challenge.');
   const {rows:[game]}=await db.query('SELECT * FROM games WHERE gameid=$1',[gameid]);
   if(!game||!pending(game)||!own(game,user,session,1)||!(await index.openIds([gameid])).has(gameid))fail(410,'Create an open challenge first.');
   await redis.zadd(key(recipient.id),Date.now(),gameid);await redis.expire(key(recipient.id),300);notify(String(recipient.id),{type:'game_invitation'});return {success:true,gameid};
  }
  if(!['accept','decline'].includes(data.action)||typeof data.gameid!=='string'||!/^[a-zA-Z0-9]{9}$/.test(data.gameid))fail(400,'Invalid invitation.');
  if(!(await incoming(user)).includes(data.gameid))fail(403,'This invitation is not addressed to you.');
  if(data.action==='decline'){await redis.zrem(key(user),data.gameid);return {success:true};}
  const {rows:[game]}=await db.query('SELECT id FROM games WHERE gameid=$1',[data.gameid]);if(!game)fail(410,'Invitation expired.');
  const result=await join({id:game.id,action:'join'},req,sessiondata);await redis.zrem(key(user),data.gameid);return result;
 }
 return {list,action};
};
