// Shared live index lives on the database host. Regional move/session Redis stays local.
const Redis=require('ioredis');
module.exports=function lobbyRedis(config) {
 if(!config.shared.liveRedis)throw new Error('Configure shared.liveRedis on the database host');
 const client=new Redis({...config.shared.liveRedis,enableOfflineQueue:false,maxRetriesPerRequest:1,
  connectTimeout:3000,commandTimeout:3000,retryStrategy:attempt=>Math.min(5000,250*attempt)});
 client.on('error',error=>console.error('Lobby Redis:',error.message));
 return client;
};
