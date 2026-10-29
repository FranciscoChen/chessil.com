/* Durable initialization jobs: a lost HTTP response must never reopen a claimed seat. */
module.exports = function gameStarts({ db, start, notify, publish }) {
  async function run(gameid) {
    const { rows:[job] } = await db.query(`UPDATE game_start_jobs SET lease_until=NOW()+INTERVAL '45 seconds'
      WHERE gameid=$1 AND (lease_until IS NULL OR lease_until<NOW()) RETURNING payload`, [gameid]);
    if (!job) return false;
    const task = job.payload;
    try {
      await new Promise((resolve,reject)=>start(task.payload,error=>error?reject(error):resolve()));
      await db.query(`UPDATE games SET started=COALESCE(started,NOW()),state=COALESCE(state,0),rating1=$2,rating2=$3
        WHERE gameid=$1 AND finished IS NULL`,[gameid,task.rating1,task.rating2]);
      notify(gameid,true);
      const message = { type:'game_start', gameid, server:task.payload.region.id,
        rated:task.rated, time:task.payload.time.minutes, increment:task.payload.time.increment };
      publish(task.creatorId,{...message,color:task.whiteIsPlayer1?'w':'b'});
      publish(task.userId,{...message,color:task.whiteIsPlayer1?'b':'w'});
      await db.query('DELETE FROM game_start_jobs WHERE gameid=$1',[gameid]);
      return true;
    } catch (error) {
      await db.query(`UPDATE game_start_jobs SET lease_until=NULL,next_attempt=NOW()+INTERVAL '5 seconds'
        WHERE gameid=$1`,[gameid]);
      console.error('Game initialization will retry:',gameid,error.message);
      return false;
    }
  }
  let busy=false;
  const timer=setInterval(async()=>{
    if(busy)return; busy=true;
    try {
      const {rows}=await db.query(`SELECT gameid FROM game_start_jobs WHERE next_attempt<=NOW()
        AND (lease_until IS NULL OR lease_until<NOW()) ORDER BY next_attempt LIMIT 4`);
      await Promise.all(rows.map(row=>run(row.gameid)));
    } catch(error) { console.error('Game initialization worker:',error.message); }
    finally {busy=false;}
  },5000);
  timer.unref();
  return {run,stop:()=>clearInterval(timer)};
};
