// Expiring snapshots are the truth; Pub/Sub only tells gateways to fetch them again.
const channel='lobby:changed',ttl=20;
const publishLua=`
local stamp=tonumber(ARGV[1])
local previous=tonumber(redis.call('GET',KEYS[1]..':stamp') or '0')
if previous > stamp then return 0 end
local games=cjson.decode(ARGV[2]);local keep={};local changed=false
for _,game in ipairs(games) do
 local id=game.gameid;keep[id]=true
 local key='lobby:game:'..id;local value=cjson.encode(game)
 if redis.call('GET',key) ~= value then changed=true end
 redis.call('SET',key,value,'EX',ARGV[3]);redis.call('ZADD','lobby:live',stamp+tonumber(ARGV[3])*1000,id)
end
for _,id in ipairs(redis.call('SMEMBERS',KEYS[1]..':games')) do
 if not keep[id] then redis.call('DEL','lobby:game:'..id);redis.call('ZREM','lobby:live',id);changed=true end
end
redis.call('DEL',KEYS[1]..':games')
for id,_ in pairs(keep) do redis.call('SADD',KEYS[1]..':games',id) end
redis.call('EXPIRE',KEYS[1]..':games',120)
redis.call('SET',KEYS[1]..':stamp',ARGV[1],'EX',120)
redis.call('SET',KEYS[1]..':heartbeat',ARGV[1],'EX',ARGV[3])
if changed then redis.call('PUBLISH','lobby:changed','live') end
return #games`;
async function publish(client,region,games,stamp=Date.now()) {
 return client.eval(publishLua,1,'lobby:region:'+region,stamp,JSON.stringify(games),ttl);
}
async function ids(client){return client.zrangebyscore('lobby:live',Date.now(),'+inf');}
async function read(client,requestedIds) {
 const wanted=requestedIds || await ids(client);
 if(!wanted.length)return new Map();
 const values=await client.mget(...wanted.map(id=>'lobby:game:'+id));
 return new Map(values.flatMap((raw,i)=>{if(!raw)return [];try {const game=JSON.parse(raw);return game.gameid===wanted[i]?[[wanted[i],game]]:[];}catch(_){return [];}}));
}
async function alive(client,region){return !!region && !!await client.exists('lobby:region:'+region+':heartbeat');}
module.exports={channel,ttl,publish,read,alive,ids};
