const http = require('http');
const https = require('https');
const server = http.createServer();
const crypto = require('crypto');
const observability = require('../observability');
const obs = observability.createObserver('game');
obs.installProcessHandlers();
obs.log('info', 'server_start', { ts: Date.now() });
// Session database
const Redis = require("ioredis");
const redis = new Redis();
const redisSub = new Redis();
const serverId = crypto.randomBytes(8).toString('hex');
const gameChannelPrefix = 'game:';

// Users, seeks and games database
const pg = require("pg");
const config = require('../config.json');
// 'postgres://user:password@host:port/db?sslmode=require'
const conString = config.shared.postgresUrl

const domainname = config.game.domainName
const servername = config.game.serverName
const myServers = config.game.myServers
const envPort = parseInt(process.env.PORT || '', 10);
const port = Number.isFinite(envPort) ? envPort : 8080;

const childprocess = require('child_process');

// Glicko 2 rating calculation
var glicko2 = require('glicko2');
var settings = {
  // tau : "Reasonable choices are between 0.3 and 1.2, though the system should
  //      be tested to decide which value results in greatest predictive accuracy."
  tau: 0.5,
  // rating : default rating
  rating: 1500,
  //rd : Default rating deviation 
  //     small number = good confidence on the rating accuracy
  rd: 200,
  //vol : Default volatility (expected fluctation on the player rating)
  vol: 0.06
};

// Subscription system instead of Redis Pub/Sub. Memory leak is possible, but hard if well managed
const subs = {}
const wsconnections = {}

redisSub.psubscribe(gameChannelPrefix + '*', (err) => {
  if (err) {
    obs.log('error', 'game_pubsub_subscribe_error', { error: err && err.stack ? err.stack : String(err) });
  }
});

redisSub.on('pmessage', (pattern, channel, message) => {
  if (typeof channel !== 'string' || channel.indexOf(gameChannelPrefix) !== 0) return;
  if (typeof message !== 'string' || message.length === 0) return;
  let payload;
  try {
    payload = JSON.parse(message);
  } catch (e) {
    return;
  }
  if (payload && payload.origin === serverId) return;
  const gameid = channel.slice(gameChannelPrefix.length);
  deliverGameBroadcast(gameid, payload);
});
function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function scheduleTimeout(key, gameid, delayMs) {
  var when = Date.now() + Math.max(0, delayMs);
  redis.zadd(key, when, gameid, (err) => {
    if (err) console.error(err);
  });
}

function cancelTimeout(key, gameid) {
  redis.zrem(key, gameid, (err) => {
    if (err) console.error(err);
  });
}

function clearGameTimeouts(gameid) {
  cancelTimeout(timeoutKeyAbort, gameid);
  cancelTimeout(timeoutKeyFinish, gameid);
}

const timeoutPollIntervalMs = 250
let pollingTimeouts = false;
const timeoutPoller = setInterval(() => {
  if (pollingTimeouts) return;
  pollingTimeouts = true;
  const now = Date.now();
  redis.eval(popDueTimeoutsLua, 1, timeoutKeyAbort, now, timeoutBatchSize, (err, items) => {
    if (err) console.error(err);
    if (Array.isArray(items)) {
      for (var i = 0; i < items.length; i++) {
        abortgame(items[i]);
      }
    }
    redis.eval(popDueTimeoutsLua, 1, timeoutKeyFinish, now, timeoutBatchSize, (err2, items2) => {
      if (err2) console.error(err2);
      if (Array.isArray(items2)) {
        for (var j = 0; j < items2.length; j++) {
          finishgame(items2[j]);
        }
      }
      pollingTimeouts = false;
    });
  });
}, timeoutPollIntervalMs);

function deliverGameBroadcast(gameid, payload) {
  if (!payload || typeof payload !== 'object') return;
  const websockets = subs[gameid];
  if (!websockets) return;
  const messages = payload.messages || {};
  const terminate = payload.terminate || {};
  const sides = ['w', 'b', 's'];
  for (var i = 0; i < sides.length; i++) {
    const side = sides[i];
    const group = websockets[side];
    if (!group) continue;
    const raw = messages[side];
    const list = Array.isArray(raw) ? raw : (typeof raw === 'string' ? [raw] : null);
    if (list) {
      for (var user in group) {
        for (var j = 0; j < list.length; j++) {
          group[user].send(list[j]);
        }
      }
    }
    if (terminate[side]) {
      for (var user in group) {
        group[user].terminate();
      }
    }
  }
}

function broadcastGameUpdate(gameid, messages, terminate) {
  const payload = {
    origin: serverId,
    messages: messages || {},
    terminate: terminate || {}
  };
  deliverGameBroadcast(gameid, payload);
  redis.publish(gameChannelPrefix + gameid, JSON.stringify(payload));
}

function sanitizeUserAgent(useragent) {
  if (typeof useragent !== 'string') {
    return ''
  }
  return useragent.replace(/[\r\n]/g, ' ').slice(0, 255)
}

function setSessionProps(sessiondata) {
  sessiondata.ip = sessiondata[0]
  sessiondata.userid = sessiondata[1]
  sessiondata.theme = sessiondata[2]
  sessiondata.lang = sessiondata[3]
  sessiondata.created = sessiondata[4]
  sessiondata.username = sessiondata[5]
  sessiondata.useragent = sessiondata[6] || ''
  return sessiondata
}

function buildSessionData(ip, userid, theme, lang, created, username, useragent) {
  const sessiondata = [ip, userid, theme, lang, created, username, useragent || '']
  return setSessionProps(sessiondata)
}

function parseSessionData(raw) {
  if (typeof raw !== 'string' || raw.length === 0) {
    return null
  }
  if (raw[0] !== '{') {
    return null
  }
  try {
    const parsed = JSON.parse(raw)
    return buildSessionData(
      parsed.ip || '',
      parsed.userid || '0',
      parsed.theme || 'n',
      parsed.lang || 'en',
      parsed.created || '0',
      parsed.username || 'u',
      sanitizeUserAgent(parsed.useragent || '')
    )
  } catch (err) {
    console.error(err)
    return null
  }
}

// Timeout system (stored in Redis)
const timeoutKeyAbort = 'game:timeouts:abort'
const timeoutKeyFinish = 'game:timeouts:finish'
const timeoutBatchSize = 100
const popDueTimeoutsLua = [
  "local key=KEYS[1]",
  "local now=tonumber(ARGV[1])",
  "local limit=tonumber(ARGV[2])",
  "local items=redis.call('ZRANGEBYSCORE', key, '-inf', now, 'LIMIT', 0, limit)",
  "if #items > 0 then",
  "  redis.call('ZREM', key, unpack(items))",
  "end",
  "return items"
].join("\n")
const aborttimer = 14000
// Give back 2 ms every move by default, because of server processing time
const timeback = 2

// Lag compensation. Half compensated before flag check, and the other half after.
// Also to mitigate abuse of fake lag, compensate only 40% of the lag
const lagCompensationPercent = 0.5

// A fair limit is to compensate up to 300ms, since higher lag is not due to server distance
const lagCompensationLimitMilliseconds = 300 * lagCompensationPercent
/*
// For the encoder to the final database
const exec = require('child_process').exec;
exec('./mg '+fenstr, function(error, stdout, stderr) {
  if(error){
  }
  console.log (stdout.split('\n'))
});
*/

function onSocketError(err) { console.error(err); }

function handleMove(gameid, side, clientmove, ws) {
  const otherside = { w: 'b', b: 'w' }[side]
  const terminate = () => {
    if (ws && typeof ws.terminate === 'function') {
      ws.terminate()
    }
  }

  redis.hmget(gameid, 'm', 'i', 't', 'j', 'e', 'k', 'l', 'n', 'o', 'q', 'r', 's', 'f', 'z', (err, re) => {
    if (err) { console.error(err); return terminate(); };
    // Verify that the player who issued the move is the one to play, and that the game is not finished
    if (side === re[2] && re[12] === '0') {
      if (re[3].split(' ').indexOf(clientmove) > -1) {
        // Verified legal move, but if not legal ignore it
        var movereceived = Date.now()
        // Could be the timeout before making first move, or the clock flag timeout, taking over time management here
        clearGameTimeouts(gameid)
        if (ws && typeof ws.receivedRTT !== 'undefined' && ws.receivedRTT === false) {
          // Someone is trying to abuse the RTT detection system, they shouldn't be able to emit two moves if the ping of the first move has not arrived yet
          // No lag compensation!
          ws.cheatingRTT = true
        } else if (ws) {
          ws.sentTime = movereceived
          ws.receivedRTT = false
          if (typeof ws.send === 'function') ws.send('a');
        }
        var lagcompensation = 0
        if (ws && typeof ws.roundTripTime !== 'undefined' && typeof ws.cheatingRTT === 'undefined') {
          lagcompensation = ~~(lagCompensationPercent * ws.roundTripTime)
          if (lagcompensation > lagCompensationLimitMilliseconds) lagcompensation = lagCompensationLimitMilliseconds;
        }
        // re[11] is lastmovetime
        var movetime
        var timeleft
        var newuci
        var newfen
        var newfenarr
        var newtime
        if (re[11] > 0 && re[0].length > 7) {
          movetime = movereceived - re[11] - lagcompensation - timeback
          timeleft = re[{ w: 6, b: 7 }[side]] - movetime
        } else {
          timeleft = 1 * re[{ w: 6, b: 7 }[side]]
        }
        if (timeleft > 0) {
          // Move is in time, apply the increment and second half of compensation
          //timeleft += 1*re[{w:8,b:9}[side]]
          timeleft += 1 * re[{ w: 8, b: 13 }[side]] + lagcompensation
          // Apply the move, and apply premoves
          newuci = re[0] + ' ' + clientmove
          if (re[0].length === 0) {
            newuci = clientmove
          }
          newfen = ucifen(newuci)
          newfenarr = newfen.split(' ')
          childprocess.exec("./mg '" + newfen + "'", (error, legalmoves, stderr) => {
            if (error) { console.error(error); return terminate(); };
            legalmoves = legalmoves.slice(0, -1)
            redis.hincrby(gameid, (newfenarr[0] + newfenarr[1] + legalmoves).replace(/\\s/g, ""), 1, (err, nthfold) => {
              if (err) { console.error(err); return terminate(); };
              var finished = 0
              if (newfenarr[4] > 99) finished = 5 // 50 move rule
              if (nthfold > 2) finished = 4 // threefold
              if (piececount(newfenarr[0]) === 2) finished = 3 // insufficient material
              if (legalmoves.length < 4) finished = mate(newfenarr) // 2 Stalemate, 1 Checkmate
              const premov = re[{ w: 9, b: 10 }[otherside]]
              if (finished === 0 && premov.length > 2 && legalmoves.split(' ').indexOf(premov) > -1) {
                // There was a premove, and was legal so apply it
                newuci = newuci + ' ' + premov
                newfen = ucifen(newuci)
                newfenarr = newfen.split(' ')
                childprocess.exec("./mg '" + newfen + "'", (error, legalmoves, stderr) => {
                  legalmoves = legalmoves.slice(0, -1)
                  if (error) { console.error(error); return terminate(); };
                  redis.hincrby(gameid, (newfenarr[0] + newfenarr[1] + legalmoves).replace(/\\s/g, ""), 1, (err, nthfold) => {
                    if (err) { console.error(err); return terminate(); };
                    var finished = 0
                    if (newfenarr[4] > 99) finished = 5 // 50 move rule
                    if (nthfold > 2) finished = 4 // threefold
                    if (piececount(newfenarr[0]) === 2) finished = 3 // insufficient material
                    if (legalmoves.length < 4) finished = mate(newfenarr) // 2 Stalemate, 1 Checkmate
                    // register the moves and their times and send back to opponent, self, and finally subscribers
                    const othertime = 1 * re[{ w: 6, b: 7 }[otherside]] + 1 * re[8] + timeback
                    newtime = re[1] + ' ' + timeleft + ' ' + othertime
                    if (re[1].length === 0) newtime = timeleft + ' ' + othertime
                    redis.hset(gameid,
                      'm', newuci, // Moves
                      'i', newtime, // Moves times
                      't', side, // Turn
                      'j', legalmoves, // Legal moves
                      { w: 'l', b: 'n' }[side], timeleft, // Time left for side (w or b)
                      { w: 'l', b: 'n' }[otherside], othertime, // Time left for the other side (w or b)
                      { w: 'q', b: 'r' }[side], '', // Reset own premove upon succesful move
                      { w: 'q', b: 'r' }[otherside], '', // Reset premove upon succesful premove
                      's', movereceived, // Last move time
                      'f', finished, // Finished, 1 is checkmate, 2 is stalemate
                      'u', 0, // When a move is made,  all draw agreements are canceled
                      'v', 0,
                      (err, result) => {
                        if (err) { console.error(err); return terminate(); };
                        var moveinfo = 'm:' + clientmove + ':' + side + ':' + timeleft + ':' + (newuci.split(' ').length - 1) + ':' + movereceived
                        var pmoveinfo = 'm:' + premov + ':' + otherside + ':' + othertime + ':' + newuci.split(' ').length + ':' + movereceived
                        if (finished > 0) pmoveinfo += ':' + finished
                        broadcastGameUpdate(gameid, { w: [moveinfo, pmoveinfo], b: [moveinfo, pmoveinfo], s: [moveinfo, pmoveinfo] }, {});
                        if (typeof subs[gameid] === 'undefined') {
                          subs[gameid] = { w: {}, b: {}, s: {} }  // Initialise after a crash?
                        }
                        // Clock flag timeout
                        scheduleTimeout(timeoutKeyFinish, gameid, 1 * timeleft + 400)
                        if (finished === 0 && newuci.length > 8) { checkgame(gameid) }
                        if (finished > 0) {
                          clearGameTimeouts(gameid)
                          // 0 - Not finished
                          // 1 - Checkmate, turn player loses
                          // 2 - Stalemate draw
                          // 3 - Insufficient Material draw
                          // 4 - Threefold draw
                          // 5 - 50 move rule draw
                          // 6 - timeout or clock flag loss, or draw if winning side has only a king
                          // 7 - Resign, the resigning side loses
                          // 8 - Draw agreement
                          var gameresult = 0.5
                          if (finished === 1) {
                            gameresult = { w: 0, b: 1 }[side]
                          }
                          redis.hmget(gameid, 'a', 'c', 'd', 'g', 'h', 'x', 'e', 'k', 'w', 'b', 'y', 'o', 'l', 'n', (err, rtn) => {
                            if (err) { console.error(err); return terminate(); };
                            var ranking, wpl, bpl, wdiff, bdiff, diffinfo, rated = true
                            if (rtn[0] == -1) { rated = false }
                            if (rated === false) {
                              wdiff = null; bdiff = null
                            } else {
                              ranking = new glicko2.Glicko2(settings);
                              wpl = ranking.makePlayer(rtn[0], rtn[2], rtn[4]);
                              bpl = ranking.makePlayer(rtn[1], rtn[3], rtn[5]);
                              ranking.updateRatings([[wpl, bpl, gameresult]]);
                              wdiff = wpl.getRating() - rtn[0]
                              bdiff = bpl.getRating() - rtn[1]
                              diffinfo = 'd:' + Math.floor(wdiff) + ':' + Math.floor(bdiff)
                            }
                            const websockets = subs[gameid] // = {userid:ws,userid:ws,userid:ws}
                            if (typeof websockets !== 'undefined') {
                              // var diffinfo = 'd:'+wdiff+':'+bdiff
                              if (rated === true) {
                                client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [wdiff, wpl.getRd(), wpl.getVol(), rtn[8]], (err, response) => {
                                  if (err) { console.log(err) }
                                  client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [bdiff, bpl.getRd(), bpl.getVol(), rtn[9]], (err, response) => {
                                    if (err) { console.log(err) }
                                    client.end();
                                    // Delete this game from Redis and terminate the ws connection
                                    redis.del(gameid, (err, res) => {
                                      if (err) { console.error(err); return; };
                                      return;
                                    })
                                  })
                                })
                              } else {
                                broadcastGameUpdate(gameid, {}, { w: true, b: true, s: true });
                              }
                              delete subs[gameid] // free memory
                            }
                            //Log into the database
                            var client = new pg.Client(conString);
                            client.connect();
                            client.query('UPDATE games SET moves = $1, clock = $2, events = $3, eventsclock = $4, clock1 = $10, clock2 = $11, state = $5, result = $6, ratingdiff1 = $7, ratingdiff2 = $8 WHERE gameid = $9', [newuci, newtime, rtn[6], rtn[7], finished, { 1: true, 0: false, 0.5: null }[gameresult], wdiff, bdiff, gameid, rtn[12], rtn[13]], (err, response) => {
                              if (err) { console.log(err) }
                              if (rated === true) {
                                client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [wdiff, wpl.getRd(), wpl.getVol(), rtn[8]], (err, response) => {
                                  if (err) { console.log(err) }
                                  client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [bdiff, bpl.getRd(), bpl.getVol(), rtn[9]], (err, response) => {
                                    if (err) { console.log(err) }
                                    client.end();
                                    // Delete this game from Redis and terminate the ws connection
                                    redis.del(gameid, (err, res) => {
                                      if (err) { console.error(err); return; };
                                      return;
                                    })
                                  })
                                })
                              } else {
                                // Unrated game
                                client.end();
                                // Delete this game from Redis and terminate the ws connection
                                redis.del(gameid, (err, res) => {
                                  if (err) { console.error(err); return; };
                                  return;
                                })
                              }
                            })
                          })
                        }
                      });
                  })
                })
              } else {
                // No premoves, or it finished already before the premove, or the premove is not legal
                // register the moves and their times and send back to opponent, self, and finally subscribers
                newtime = re[1] + ' ' + timeleft
                if (re[1].length === 0) newtime = timeleft
                redis.hset(
                  gameid,
                  'm', newuci, // Moves
                  'i', newtime, // Moves times
                  't', otherside, // Turn
                  'j', legalmoves, // Legal moves
                  { w: 'l', b: 'n' }[side], timeleft, // Time left for side (w or b)
                  { w: 'q', b: 'r' }[side], '', // Reset own premove upon succesful move
                  { w: 'q', b: 'r' }[otherside], '', // Reset premove upon consumption
                  's', movereceived, // Last move time
                  'f', finished, // Finished, 1 is checkmate, 2 is stalemate
                  'u', 0, // When a move is made,  all draw agreements are canceled
                  'v', 0,
                  (err, result) => {
                    if (err) { console.error(err); return terminate(); };
                    var moveinfo = 'm:' + clientmove + ':' + side + ':' + timeleft + ':' + newuci.split(' ').length + ':' + movereceived
                    if (finished > 0) moveinfo += ':' + finished
                    broadcastGameUpdate(gameid, { w: [moveinfo], b: [moveinfo], s: [moveinfo] }, {});
                    if (typeof subs[gameid] === 'undefined') {
                      subs[gameid] = { w: {}, b: {}, s: {} }  // Initialise after a crash?
                    }
                    // If just after first white move, give grace period to black player
                    if (re[0].length === 0) {
                      scheduleTimeout(timeoutKeyAbort, gameid, aborttimer)
                    } else {
                      scheduleTimeout(timeoutKeyFinish, gameid, 1 * re[{ w: 6, b: 7 }[otherside]] + 400)
                    }
                    if (finished === 0 && newuci.length > 8) { checkgame(gameid) }
                    if (finished > 0) {
                      clearGameTimeouts(gameid)
                      // 0 - Not finished
                      // 1 - Checkmate, turn player loses
                      // 2 - Stalemate draw
                      // 3 - Insufficient Material draw
                      // 4 - Threefold draw
                      // 5 - 50 move rule draw
                      // 6 - timeout or clock flag loss, or draw if winning side has only a king
                      // 7 - Resign, the resigning side loses
                      // 8 - Draw agreement
                      var gameresult = 0.5
                      if (finished === 1) {
                        gameresult = { w: 0, b: 1 }[side]
                      }
                      redis.hmget(gameid, 'a', 'c', 'd', 'g', 'h', 'x', 'e', 'k', 'w', 'b', 'y', 'o', 'l', 'n', (err, rtn) => {
                        if (err) { console.error(err); return terminate(); };
                        var ranking, wpl, bpl, wdiff, bdiff, diffinfo, rated = true
                        if (rtn[0] == -1) { rated = false }
                        if (rated === false) {
                          wdiff = null; bdiff = null
                        } else {
                          ranking = new glicko2.Glicko2(settings);
                          wpl = ranking.makePlayer(rtn[0], rtn[2], rtn[4]);
                          bpl = ranking.makePlayer(rtn[1], rtn[3], rtn[5]);
                          ranking.updateRatings([[wpl, bpl, gameresult]]);
                          wdiff = wpl.getRating() - rtn[0]
                          bdiff = bpl.getRating() - rtn[1]
                          diffinfo = 'd:' + Math.floor(wdiff) + ':' + Math.floor(bdiff)
                        }
                        const websockets = subs[gameid] // = {userid:ws,userid:ws,userid:ws}
                        if (typeof websockets !== 'undefined') {
                          if (rated === true) {
                            client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [wdiff, wpl.getRd(), wpl.getVol(), rtn[8]], (err, response) => {
                              if (err) { console.log(err) }
                              client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [bdiff, bpl.getRd(), bpl.getVol(), rtn[9]], (err, response) => {
                                if (err) { console.log(err) }
                                client.end();
                                // Delete this game from Redis and terminate the ws connection
                                redis.del(gameid, (err, res) => {
                                  if (err) { console.error(err); return; };
                                  return;
                                })
                              })
                            })
                          } else {
                            broadcastGameUpdate(gameid, {}, { w: true, b: true, s: true });
                          }
                          delete subs[gameid] // free memory
                        }
                        //Log into the database
                        var client = new pg.Client(conString);
                        client.connect();
                        client.query('UPDATE games SET moves = $1, clock = $2, events = $3, eventsclock = $4, clock1 = $10, clock2 = $11, state = $5, result = $6, ratingdiff1 = $7, ratingdiff2 = $8 WHERE gameid = $9', [newuci, newtime, rtn[6], rtn[7], finished, { 1: true, 0: false, 0.5: null }[gameresult], wdiff, bdiff, gameid, rtn[12], rtn[13]], (err, response) => {
                          if (err) { console.log(err) }
                          if (rated === true) {
                            client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [wdiff, wpl.getRd(), wpl.getVol(), rtn[8]], (err, response) => {
                              if (err) { console.log(err) }
                              client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [bdiff, bpl.getRd(), bpl.getVol(), rtn[9]], (err, response) => {
                                if (err) { console.log(err) }
                                client.end();
                                // Delete this game from Redis and terminate the ws connection
                                redis.del(gameid, (err, res) => {
                                  if (err) { console.error(err); return; };
                                  return;
                                })
                              })
                            })
                          } else {
                            // Unrated game
                            client.end();
                            // Delete this game from Redis and terminate the ws connection
                            redis.del(gameid, (err, res) => {
                              if (err) { console.error(err); return; };
                              return;
                            })
                          }
                        })
                      })
                    }
                  }
                );
              }
            });
          });
        } else {
          // Game is finished due to clock flag Oh no! :S
          timeleft = 0
          var finished = 6
          redis.hset(gameid,
            { w: 'l', b: 'n' }[side], timeleft, // Time left for side (w or b)
            'f', finished, // Finished, 6 is flag
            (err, result) => {
              if (err) { console.error(err); return terminate(); };
              // Finally, encode the game moves and times and insert it into postgres db... it's not urgent
              // Hopefully it can be left for another machine and endpoint to do, the encoder.
              // What is the result?
              // Finished code
              // 6 - timeout or clock flag loss, or draw if winning side has only a king
              newuci = re[0]
              newfen = ucifen(newuci)
              newfenarr = newfen.split(' ')
              var gameresult = 0.5
              if (newfenarr[1] == 'w') {
                if (bpiececount(newfenarr[0]) > 1) gameresult = 0
              }
              if (newfenarr[1] == 'b') {
                if (wpiececount(newfenarr[0]) > 1) gameresult = 1
              }
              redis.hmget(gameid, 'a', 'c', 'd', 'g', 'h', 'x', 'e', 'k', 'w', 'b', 'y', 'o', 'i', 'l', 'n', (err, rtn) => {
                if (err) { console.error(err); return terminate(); };
                var ranking, wpl, bpl, wdiff, bdiff, diffinfo, rated = true
                if (rtn[0] == -1) { rated = false }
                if (rated === false) {
                  wdiff = null; bdiff = null
                } else {
                  ranking = new glicko2.Glicko2(settings);
                  wpl = ranking.makePlayer(rtn[0], rtn[2], rtn[4]);
                  bpl = ranking.makePlayer(rtn[1], rtn[3], rtn[5]);
                  ranking.updateRatings([[wpl, bpl, gameresult]]);
                  wdiff = wpl.getRating() - rtn[0]
                  bdiff = bpl.getRating() - rtn[1]
                  diffinfo = 'd:' + Math.floor(wdiff) + ':' + Math.floor(bdiff)
                }
                var moveinfo = 't:' + side + ':' + timeleft + ':' + finished
                if (typeof subs[gameid] !== 'undefined') {
                  //var diffinfo = 'd:'+wdiff+':'+bdiff
                  if (rated === true) {
                    client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [wdiff, wpl.getRd(), wpl.getVol(), rtn[8]], (err, response) => {
                      if (err) { console.log(err) }
                      client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [bdiff, bpl.getRd(), bpl.getVol(), rtn[9]], (err, response) => {
                        if (err) { console.log(err) }
                        client.end();
                        // Delete this game from Redis and terminate the ws connection
                        redis.del(gameid, (err, res) => {
                          if (err) { console.error(err); return; };
                          return;
                        })
                      })
                    })
                  } else {
                    broadcastGameUpdate(gameid, { w: [moveinfo], b: [moveinfo], s: [moveinfo] }, { w: true, b: true, s: true });
                  }
                  delete subs[gameid] // free memory
                } else {
                  subs[gameid] = { w: {}, b: {}, s: {} }  // Initialise after a crash?
                }
                //Log into the database
                var client = new pg.Client(conString);
                client.connect();
                client.query('UPDATE games SET moves = $1, clock = $2, events = $3, eventsclock = $4, clock1 = $10, clock2 = $11, state = $5, result = $6, ratingdiff1 = $7, ratingdiff2 = $8 WHERE gameid = $9', [newuci, rtn[12], rtn[6], rtn[7], finished, { 1: true, 0: false, 0.5: null }[gameresult], wdiff, bdiff, gameid, rtn[13], rtn[14]], (err, response) => {
                  if (err) { console.log(err) }
                  if (rated === true) {
                    client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [wdiff, wpl.getRd(), wpl.getVol(), rtn[8]], (err, response) => {
                      if (err) { console.log(err) }
                      client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [bdiff, bpl.getRd(), bpl.getVol(), rtn[9]], (err, response) => {
                        if (err) { console.log(err) }
                        client.end();
                        // Delete this game from Redis and terminate the ws connection
                        redis.del(gameid, (err, res) => {
                          if (err) { console.error(err); return; };
                          return;
                        })
                      })
                    })
                  } else {
                    // Unrated game
                    client.end();
                    // Delete this game from Redis and terminate the ws connection
                    redis.del(gameid, (err, res) => {
                      if (err) { console.error(err); return; };
                      return;
                    })
                  }
                })
              })
            })
        }
      }
    }
  })
}

function authenticate(req, callback) {
  if (typeof req.headers['origin'] === 'undefined' || req.headers['origin'].slice(0, domainname.length) !== domainname) {
    callback(true, null)
    return
  }
  //const ip = req.headers['x-forwarded-for'].split(',')[0].trim();
  const cookie = req.headers['cookie']
  if (typeof cookie === 'undefined' || cookie.length !== 34 || cookie.slice(0, 2) !== 's=') {
    callback(true, null)
    return
  }

  const myURL = new URL(domainname + '/websocket')
  const options = {
    hostname: myURL.hostname,
    port: 443,
    path: myURL.pathname,
    method: 'POST',
    headers: { 'authorization': config.shared.websocketPassword }
  };

  const newreq = https.request(options, (res) => {
    if (res.statusCode !== 200) {
      callback(true, null)
    } else {
      res.setEncoding('utf8');
      var rawData = '';
      var useragent = sanitizeUserAgent(req.headers['user-agent'])
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        // Check IP and useragent with the ones from the request
        const sessiondata = parseSessionData(rawData)
        if (!sessiondata) {
          callback(true, null)
          return
        }
        if (req.headers['x-real-ip'] === sessiondata[0]) {
          callback(false, sessiondata)
        } else {
          if (useragent === sessiondata[6]) {
            // If same user agent, assuming dynamic IP case, but can be further checked to be in the same location or country
            callback(false, sessiondata)
          } else {
            // Different IP, different user agent, same cookie - cookie theft most probably! Set new cookie
            callback(true, null)
          }
        }
      })
    }
  });
  newreq.on('error', (e) => {
    callback(e, null)
    return
  });
  newreq.end(cookie);
}


// It is possible to customize the server to react to certain endpoints and requests
server.on('request', (req, res) => {

  // Only accepts POST requests authenticated from my own servers
  if (req.method !== 'POST' || typeof req.headers['authorization'] === undefined || req.headers['authorization'] !== config.shared.gameServerAuthToken || typeof myServers[req.headers['x-real-ip']] === 'undefined') {
    res.writeHead(401, { "Content-Type": "text/html" });
    res.end();
    return;
  }

  // To check if the game is up and ready to be started
  if (req.url === '/game') {
    const r = req.headers
    redis.hget(r.gn, 'm', (err, result) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end();
        console.error(err);
        return;
      }
      if (typeof result === 'string') {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end();
      } else {
        // Game is not ready, not found
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end();
      }
    });
  }
  // To update a game in format halfmove bestmove scoretype scorenumber eg. '26', 'e2e4 cp +21', used by cheat detector
  if (req.url === '/cg') {
    redis.hget(req.headers['gameid'], 'f', (err, re) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end();
        console.error(err);
        return;
      }
      if (re === '0') {
        redis.hset(req.headers['gameid'],
          req.headers['hm'], req.headers['bm'] + ' ' +req.headers['ev'],
          (err, result) => {
            if (err) {
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end();
              console.error(err);
	    };
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end();
          })
      } else {
        res.writeHead(410, { "Content-Type": "text/html" });
        res.end();
      }
    })
  }
  // To abort a game, due to cheater detected. used by cheat detector
  if (req.url === '/ag') {
    abortgamecheater(req.headers['gameid'], req.headers['side'])
  }
  
  // To load a new game
  if (req.url === '/ng') {
    const r = req.headers
    // r.gn - gamename, r.w - whiteplayer (playerid or sessionid), r.b blackplayer, r.t time, r.i increment
    // Start a new game in redis. u for uci moves with clock time left {move:timeleft}, t for time left, x for increment, e for events with their event times {event:eventtimeclockleft}
    const gameData = {
      'm': '', // Moves
      'i': '', // Moves times mt -> i
      't': 'w', // Turn
      'j': 'h2h3 g2g3 f2f3 e2e3 d2d3 c2c3 b2b3 a2a3 h2h4 g2g4 f2f4 e2e4 d2d4 c2c4 b2b4 a2a4 g1h3 g1f3 b1c3 b1a3', // Legal moves lm -> j
      'e': '', // Events
      'k': '', // Events times et -> k
      'w': r.w, // White player id, or session id
      'b': r.b, // Black player id, or session id
      'l': r.wt * 60000, // White time left, (initial time at the moment of initialising) wt -> l
      'n': r.bt * 60000, // Black time left, minutes to milliseconds conversion bt -> n
      'o': r.wi * 1000, // increment wi -> o seconds to milliseconds
      'z': r.bi * 1000, // blackincrement seconds to milliseconds
      'q': '', // White premove wp -> q
      'r': '', // Black premove bp -> r
      's': 0, // Last move time lmt -> s
      'f': 0, // Finished code
      'u': 0, // White draw agreement wd -> u
      'v': 0, // Black draw agreement bd -> v
      'a': r.wr, // White rating
      'c': r.br, // Black rating
      'd': r.wd, // White deviation
      'g': r.bd, // Black deviation
      'h': r.wv, // White volatility
      'x': r.bv, // Black volatility
      'y': r.wt // initial time
    };
    redis.hset(r.gn, gameData, (err, result) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          console.error(err);
        }
        subs[r.gn] = { w: {}, b: {}, s: {} }
        scheduleTimeout(timeoutKeyAbort, r.gn, aborttimer)
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end();
      });
  }
});

server.on('error', (err) => {
  obs.count('server_error');
  obs.log('error', 'server_error', { error: err && err.stack ? err.stack : String(err) });
});

server.on('upgrade', function upgrade(req, socket, head) {
  socket.on('error', onSocketError);
  authenticate(req, function next(err, sessiondata) {
    if (err || !sessiondata) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    socket.removeListener('error', onSocketError);

    wss.handleUpgrade(req, socket, head, function done(ws) {
      wss.emit('connection', ws, req, sessiondata);
    });
  });
});

server.listen(port);
obs.log('info', 'server_listen', { port: port });

var WebSocketServer = require('ws').Server
  // , wss = new WebSocketServer({port: 8080});
  , wss = new WebSocketServer({ noServer: true }); // For when we have a http server in front


wss.on('connection', function connection(ws, req, sessiondata) {
  // sessiondata is the normalized session array from the http server
  // 109.112.149.33 n l en 1696422564 u Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36
  // Of particular interest is the username, userid
  ws.isAlive = true;
  var wsid
  for (var i = 12; i--;) {
    wsid = randomString(12, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
    if (typeof wsconnections[wsid] === 'undefined') break
  }

  if (typeof wsid === 'undefined') {
    return ws.terminate();
  }

  ws.id = wsid

  ws.on('error', (error) => {
    console.error(error)
    if (typeof wsconnections[ws.id] !== 'undefined') {
      const stored = wsconnections[ws.id]
      if (typeof subs[stored.g] !== 'undefined' && typeof subs[stored.g][stored.s] !== 'undefined')
        delete subs[stored.g][stored.s][stored.u + '_' + ws.id] // free memory
    }
  });

  ws.on('close', (error) => {
    if (typeof wsconnections[ws.id] !== 'undefined') {
      const stored = wsconnections[ws.id]
      if (typeof subs[stored.g] !== 'undefined' && typeof subs[stored.g][stored.s] !== 'undefined')
        delete subs[stored.g][stored.s][stored.u + '_' + ws.id] // free memory
    }
  });

  if (req.url === '/ping') {
    ws.send('a');
    ws.sentTime = Date.now()

    ws.on('message', function msg(data) {
      const message = data.toString('utf-8')
      if (message === '0') {
        ws.isAlive = true;
      }
      if (message === 'b') {
        ws.roundTripTime = Date.now() - ws.sentTime;
        //Log into the database
        var client = new pg.Client(conString);
        client.connect();
        client.query('INSERT INTO connections (id,sessionid,userid,ws0,updated) VALUES (DEFAULT,$1,$2,$3,NOW()) ON CONFLICT (sessionid) DO UPDATE SET ws0 = EXCLUDED.ws0, updated = EXCLUDED.updated', [req.headers['cookie'].slice(2), sessiondata[1], ws.roundTripTime], (err, response) => {
          if (err) { console.log(err) }
          client.end();
          return ws.terminate();
        })
      }
    });
  }

  if (req.url.slice(0, 6) === '/game/') {
    // First question, are you a player or a spectator?
    const sessid = req.headers['cookie'].slice(2)
    const uid = sessiondata[1]
    const gameid = req.url.slice(6)
    var side = 's' // Side s for spectator. w or b for the players

    // Check if we have the game loaded in 
    redis.hmget(gameid, 'w', 'b', (err, uidarr) => {
      if (err) { console.error(err); return ws.terminate(); }
      if (uidarr[0] === uid) side = 'w'
      if (uidarr[0] === sessid) side = 'w'
      if (uidarr[1] === uid) side = 'b'
      if (uidarr[1] === sessid) side = 'b'
      if (side === 's') {
        ws.on('message', function msg(data) {
          const message = data.toString('utf-8')
          if (message.length) {
            switch (message[0]) {
              case '0': {
                ws.isAlive = true;
                break;
              }
              case 's': {
                // Starting to watch, get all game info so far and subscribe
                redis.hmget(gameid, 'm', 'i', 'e', 'k', 'l', 'n', 'f', 's', (err, re) => {
                  if (err) { console.error(err); return ws.terminate(); };
                  ws.send('z' + side);
                  ws.send('s' + re[7]);
                  ws.send('l' + re[4]);
                  ws.send('n' + re[5]);
                  ws.send('m' + re[0]);
                  ws.send('i' + re[1]);
                  ws.send('e' + re[2]);
                  ws.send('k' + re[3]);
                  ws.send('f' + re[6]);
                  if (typeof subs[gameid] === 'undefined') {
                    subs[gameid] = { w: {}, b: {}, s: {} }  // Initialise after a crash?
                  }
                  // Subscribe if the game is not finished
                  if (re[6] === '0') {
                    subs[gameid][side][uid + '_' + wsid] = ws
                    wsconnections[ws.id] = { g: gameid, s: side, u: uid }
                  }
                })
                break;
              }
            }
          }
        });
      } else {
        const otherside = { w: 'b', b: 'w' }[side]
        ws.on('message', function msg(data) {
          const message = data.toString('utf-8')
          if (message.length) {
            switch (message[0]) {
              case '0': {
                ws.isAlive = true;
                break;
              }
              case 'm': {
                // Move, received when the client perceives it is the own player turn
                const clientmove = message.slice(1)
                handleMove(gameid, side, clientmove, ws)
                break;
              }
              case 'b': {
                // Live round trip times
                if ((typeof ws.receivedRTT === 'undefined' || ws.receivedRTT === false) && typeof ws.sentTime !== 'undefined') {
                  ws.receivedRTT = true;
                  ws.roundTripTime = Date.now() - ws.sentTime;
                } else {
                  ws.cheatingRTT = true;
                }
                break;
              }
              case 's': {
                // Starting to play, get all game info so far and subscribe
                redis.hmget(gameid, 'm', 'i', 'e', 'k', 'l', 'n', 'f', 's', { w: 'q', b: 'r' }[side], (err, re) => {
                  if (err) { console.error(err); return ws.terminate(); };
                  ws.send('z' + side);
                  ws.send('s' + re[7]);
                  ws.send('l' + re[4]);
                  ws.send('n' + re[5]);
                  ws.send('m' + re[0]);
                  ws.send('i' + re[1]);
                  ws.send('e' + re[2]);
                  ws.send('k' + re[3]);
                  ws.send('f' + re[6]);
                  ws.send('p' + re[8]); //Own premove info sent to client to be displayed
                  if (typeof subs[gameid] === 'undefined') {
                    subs[gameid] = { w: {}, b: {}, s: {} }  // Initialise after a crash?
                  }
                  // Subscribe if the game is not finished
                  if (re[6] === '0') {
                    subs[gameid][side][uid + '_' + wsid] = ws
                    wsconnections[ws.id] = { g: gameid, s: side, u: uid }
                  }
                })
                break;
              }
            }
          }
        });
      }
    })
  }
});

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.send('1'); // 1 means PING
  });
}, 4000);

wss.on('close', function close() {
  wss.clients.forEach(function each(ws) {
    const stored = wsconnections[ws.id]
    if (typeof subs[stored.g] !== 'undefined' && typeof subs[stored.g][stored.s] !== 'undefined')
      delete subs[stored.g][stored.s][stored.u + '_' + ws.id] // free memory
  });
  clearInterval(interval);
});

function checkgame(gameid) {
  // Send game data to cheat detector to check for cheating
  redis.hgetall(gameid, (err, re) => {
    if (err) {
      console.error(err);
      return;
    }
    const myURL = new URL('https://' + config.game.engineHost + '/check')
    const options = {
      hostname: myURL.hostname,
      port: 443,
      path: myURL.pathname,
      method: 'POST',
      headers: {
        'authorization': config.shared.engineAuthToken,
        'id': gameid,
      }
    };

    const newreq = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        console.log('function checkgame response code not 200: ' + gameid)
        return;
      }
    });
    newreq.on('error', (e) => {
      console.log(e)
      return
    });
    newreq.end(JSON.stringify(re));
  })
}

function abortgamecheater(gameid,side) {
  clearBotPending(gameid)
  clearGameTimeouts(gameid)
  const websockets = subs[gameid] // = {userid:ws,userid:ws,userid:ws}
  if (typeof websockets !== 'undefined') {
    broadcastGameUpdate(
      gameid,
      { w: [{'w':'9c','b':'9'}[side]], b: [{'w':'9','b':'9c'}[side]], s: ['9'] },
      { w: true, b: true, s: true }
    );
    delete subs[gameid] // free memory
  }
  // Delete this game from Redis and terminate the ws connection
  redis.del(gameid, (err, res) => {
    if (err) { console.error(err); };
  })
  var client = new pg.Client(conString);
  client.connect();
  client.query('UPDATE games SET state = 9 WHERE gameid = $1', [gameid], (err, response) => {
    if (err) { console.log(err) }
    client.end();
  })
}
function abortgame(gameid) {
  clearBotPending(gameid)
  clearGameTimeouts(gameid)
  const websockets = subs[gameid] // = {userid:ws,userid:ws,userid:ws}
  if (typeof websockets !== 'undefined') {
    broadcastGameUpdate(gameid, { w: ['9'], b: ['9'], s: ['9'] }, { w: true, b: true, s: true });
    delete subs[gameid] // free memory
  }
  // Delete this game from Redis and terminate the ws connection
  redis.del(gameid, (err, res) => {
    if (err) { console.error(err); };
  })
  var client = new pg.Client(conString);
  client.connect();
  client.query('UPDATE games SET state = 9 WHERE gameid = $1', [gameid], (err, response) => {
    if (err) { console.log(err) }
    client.end();
  })
}
function finishgame(gameid) {
  clearBotPending(gameid)
  clearGameTimeouts(gameid)
  redis.hmget(gameid, 'f', 'm', 't', (err, re) => {
    if (err) { console.error(err); return; };
    if (re[0] === '0') {
      // Game is finished due to clock flag Oh no! :S
      var timeleft = 0
      var finished = 6
      var turn = re[2]
      redis.hset(gameid,
        { w: 'l', b: 'n' }[turn], timeleft, // Time left for turn side (w or b)
        'f', finished, // Finished, 6 is flag
        (err, result) => {
          if (err) { console.error(err); return; }
          // Finished code
          // 6 - timeout or clock flag loss, or draw if winning side has only a king
          var newuci = re[1] // All uci moves
          var newfen = ucifen(newuci)
          var newfenarr = newfen.split(' ')
          var gameresult = 0.5
          if (newfenarr[1] == 'w') {
            if (bpiececount(newfenarr[0]) > 1) gameresult = 0
          }
          if (newfenarr[1] == 'b') {
            if (wpiececount(newfenarr[0]) > 1) gameresult = 1
          }
          redis.hmget(gameid, 'a', 'c', 'd', 'g', 'h', 'x', 'e', 'k', 'w', 'b', 'y', 'o', 'i', 'l', 'n', (err, rtn) => {
            if (err) { console.error(err); return; };
            var ranking, wpl, bpl, wdiff, bdiff, diffinfo, rated = true
            if (rtn[0] == -1) { rated = false }
            if (rated === false) {
              wdiff = null; bdiff = null
            } else {
              ranking = new glicko2.Glicko2(settings);
              wpl = ranking.makePlayer(rtn[0], rtn[2], rtn[4]);
              bpl = ranking.makePlayer(rtn[1], rtn[3], rtn[5]);
              ranking.updateRatings([[wpl, bpl, gameresult]]);
              wdiff = wpl.getRating() - rtn[0]
              bdiff = bpl.getRating() - rtn[1]
              diffinfo = 'd:' + Math.floor(wdiff) + ':' + Math.floor(bdiff)
            }
            var moveinfo = 't:' + turn + ':' + timeleft + ':' + finished
            if (typeof subs[gameid] !== 'undefined') {
              if (rated === true) {
                client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [wdiff, wpl.getRd(), wpl.getVol(), rtn[8]], (err, response) => {
                  if (err) { console.log(err) }
                  client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [bdiff, bpl.getRd(), bpl.getVol(), rtn[9]], (err, response) => {
                    if (err) { console.log(err) }
                    client.end();
                    // Delete this game from Redis and terminate the ws connection
                    redis.del(gameid, (err, res) => {
                      if (err) { console.error(err); return; };
                      return;
                    })
                  })
                })
              } else {
                broadcastGameUpdate(gameid, { w: [moveinfo], b: [moveinfo], s: [moveinfo] }, { w: true, b: true, s: true });
              }
              delete subs[gameid] // free memory
            } else {
              subs[gameid] = { w: {}, b: {}, s: {} }  // Initialise after a crash?
            }
            //Log into the database
            var client = new pg.Client(conString);
            client.connect();
            client.query('UPDATE games SET moves = $1, clock = $2, events = $3, eventsclock = $4, clock1 = $10, clock2 = $11, state = $5, result = $6, ratingdiff1 = $7, ratingdiff2 = $8 WHERE gameid = $9', [newuci, rtn[12], rtn[6], rtn[7], finished, { 1: true, 0: false, 0.5: null }[gameresult], wdiff, bdiff, gameid, rtn[13], rtn[14]], (err, response) => {
              if (err) { console.log(err) }
              if (rated === true) {
                client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [wdiff, wpl.getRd(), wpl.getVol(), rtn[8]], (err, response) => {
                  if (err) { console.log(err) }
                  client.query('UPDATE users SET rating = rating + $1, deviation = $2, volatility = $3 WHERE id = $4', [bdiff, bpl.getRd(), bpl.getVol(), rtn[9]], (err, response) => {
                    if (err) { console.log(err) }
                    client.end();
                    // Delete this game from Redis and terminate the ws connection
                    redis.del(gameid, (err, res) => {
                      if (err) { console.error(err); return; };
                      return;
                    })
                  })
                })
              } else {
                // Unrated game
                client.end();
                // Delete this game from Redis and terminate the ws connection
                redis.del(gameid, (err, res) => {
                  if (err) { console.error(err); return; };
                  return;
                })
              }
            })
          })
        })
    }
  });
}
const ng = {
  u: '',
  f: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  b: {
    a8: { p: 'r', c: 'b' },
    b8: { p: 'n', c: 'b' },
    c8: { p: 'b', c: 'b' },
    d8: { p: 'q', c: 'b' },
    e8: { p: 'k', c: 'b' },
    f8: { p: 'b', c: 'b' },
    g8: { p: 'n', c: 'b' },
    h8: { p: 'r', c: 'b' },
    a7: { p: 'p', c: 'b' },
    b7: { p: 'p', c: 'b' },
    c7: { p: 'p', c: 'b' },
    d7: { p: 'p', c: 'b' },
    e7: { p: 'p', c: 'b' },
    f7: { p: 'p', c: 'b' },
    g7: { p: 'p', c: 'b' },
    h7: { p: 'p', c: 'b' },
    a6: { p: ' ', c: ' ' },
    b6: { p: ' ', c: ' ' },
    c6: { p: ' ', c: ' ' },
    d6: { p: ' ', c: ' ' },
    e6: { p: ' ', c: ' ' },
    f6: { p: ' ', c: ' ' },
    g6: { p: ' ', c: ' ' },
    h6: { p: ' ', c: ' ' },
    a5: { p: ' ', c: ' ' },
    b5: { p: ' ', c: ' ' },
    c5: { p: ' ', c: ' ' },
    d5: { p: ' ', c: ' ' },
    e5: { p: ' ', c: ' ' },
    f5: { p: ' ', c: ' ' },
    g5: { p: ' ', c: ' ' },
    h5: { p: ' ', c: ' ' },
    a4: { p: ' ', c: ' ' },
    b4: { p: ' ', c: ' ' },
    c4: { p: ' ', c: ' ' },
    d4: { p: ' ', c: ' ' },
    e4: { p: ' ', c: ' ' },
    f4: { p: ' ', c: ' ' },
    g4: { p: ' ', c: ' ' },
    h4: { p: ' ', c: ' ' },
    a3: { p: ' ', c: ' ' },
    b3: { p: ' ', c: ' ' },
    c3: { p: ' ', c: ' ' },
    d3: { p: ' ', c: ' ' },
    e3: { p: ' ', c: ' ' },
    f3: { p: ' ', c: ' ' },
    g3: { p: ' ', c: ' ' },
    h3: { p: ' ', c: ' ' },
    a2: { p: 'p', c: 'w' },
    b2: { p: 'p', c: 'w' },
    c2: { p: 'p', c: 'w' },
    d2: { p: 'p', c: 'w' },
    e2: { p: 'p', c: 'w' },
    f2: { p: 'p', c: 'w' },
    g2: { p: 'p', c: 'w' },
    h2: { p: 'p', c: 'w' },
    a1: { p: 'r', c: 'w' },
    b1: { p: 'n', c: 'w' },
    c1: { p: 'b', c: 'w' },
    d1: { p: 'q', c: 'w' },
    e1: { p: 'k', c: 'w' },
    f1: { p: 'b', c: 'w' },
    g1: { p: 'n', c: 'w' },
    h1: { p: 'r', c: 'w' }
  },
  h: {},
  m: [
    'a2a3', 'a2a4', 'b2b3',
    'b2b4', 'c2c3', 'c2c4',
    'd2d3', 'd2d4', 'e2e3',
    'e2e4', 'f2f3', 'f2f4',
    'g2g3', 'g2g4', 'h2h3',
    'h2h4', 'b1c3', 'b1a3',
    'g1h3', 'g1f3'
  ]
}

function threefold(gamehistory) {
  /*
   * // The game is drawn upon a correct claim by the player having the move, when the same
         // position, for at least the third time (not necessarily by a repetition of moves):
         // a. is about to appear, if he first writes his move on his scoresheet and declares to the
         // arbiter his intention to make this move, or
         // b. has just appeared, and the player claiming the draw has the move.
         // Positions as in (a) and (b) are considered the same, if the same player has the move,
         // pieces of the same kind and colour occupy the same squares, and the possible moves of
         // all the pieces of both players are the same.
         // Positions are not the same if a pawn that could have been captured en passant can no
         // longer be captured in this manner. When a king or a rook is forced to move, it will lose its
         // castling rights, if any, only after it is moved.
   const pos = [pieceplacement.join('/'), turn, castle, epsq].join(' ')
   if (typeof history[pos] === ud) {
     history[pos] = 1
   } else {
     history[pos] += 1
     if (history[pos] > 2) history.threefold = 1
   }
   var gamemoves = uci
   if (previousmoves.length > 0){
     gamemoves = previousmoves+' '+uci
   }
   */
  if (typeof gamehistory.threefold !== 'undefined') return true
  return false
}

function mate(fenarr) {
  const board = fenarr[0].split('/')
  const n = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 }
  var boardf = Array(8)
  for (var j = board.length; j--;) {
    var bfile = board[j]
    var y = ''
    for (var i = bfile.length; i--;) {
      var c = bfile.charAt(i)
      if (typeof n[c] === 'undefined') {
        // Not a number, add the piece
        y = c + y
      } else {
        while (c--) y = ' ' + y
      }
    }
    boardf[j] = y
  }
  boardf = boardf.join('')
  const incheck = ic(boardf, fenarr[1])
  if (incheck === true) return 1 // Checkmate
  return 2 // Stalemate, assuming no moves left for player
}

var isq = {}
var sqids = []
var cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
for (var j = cols.length; j--;) {
  const cl = cols[j]
  for (var i = 1; i < 9; ++i) {
    sqids.push(cl + i)
  }
}

function piececount(str) {
  var pieces = 2;

  for (var i = str.length; i--;) {
    pieces = pieces + { P: 1, p: 1, N: 1, n: 1, B: 1, b: 1, R: 1, r: 1, Q: 1, q: 1 }[str.charAt(i)] || pieces
  }

  return pieces;
}

function ep(fen) {
  const a = fen.split(' ')
  const square = a[3]
  if (square === '-') return false
  const side = a[1]
  const board = a[0].split('/')
  const file = { w: board[3], b: board[4] }[side]
  const pawn = { w: 'P', b: 'p' }[side]
  if (file.indexOf(pawn) === -1) return false
  const target = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 }[square[0]]
  const fileindex = { w: 3, b: 4 }[side]
  var x = ''
  const n = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 }
  const exboard = Array(8)
  for (var i = file.length; i--;) {
    var c = file.charAt(i)
    if (typeof n[c] === 'undefined') {
      // Not a number, add the piece
      x = c + x
    } else {
      while (c--) x = ' ' + x
    }
  }
  exboard[fileindex] = x
  const cols = [target - 1, target + 1]
  const fileexplicit = exboard[fileindex]
  if (fileexplicit[cols[0]] !== pawn && fileexplicit[cols[1]] !== pawn) return false
  for (var j = board.length; j--;) {
    if (j === fileindex) continue;
    var bfile = board[j]
    var y = ''
    for (var i = bfile.length; i--;) {
      var c = bfile.charAt(i)
      if (typeof n[c] === 'undefined') {
        // Not a number, add the piece
        y = c + y
      } else {
        while (c--) y = ' ' + y
      }
    }
    exboard[j] = y
  }
  const filemap = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0,
    8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1,
    16: 2, 17: 2, 18: 2, 19: 2, 20: 2, 21: 2, 22: 2, 23: 2,
    24: 3, 25: 3, 26: 3, 27: 3, 28: 3, 29: 3, 30: 3, 31: 3,
    32: 4, 33: 4, 34: 4, 35: 4, 36: 4, 37: 4, 38: 4, 39: 4,
    40: 5, 41: 5, 42: 5, 43: 5, 44: 5, 45: 5, 46: 5, 47: 5,
    48: 6, 49: 6, 50: 6, 51: 6, 52: 6, 53: 6, 54: 6, 55: 6,
    56: 7, 57: 7, 58: 7, 59: 7, 60: 7, 61: 7, 62: 7, 63: 7,
  }
  const king = { w: 'K', b: 'k' }[side]
  const queen = { w: 'q', b: 'Q' }[side]
  const rook = { w: 'r', b: 'R' }[side]
  const bishop = { w: 'b', b: 'B' }[side]
  var legal = false
  for (var i = cols.length; i--;) {
    var col = cols[i]
    if (fileexplicit[col] === pawn) {
      // Here it would be possible to make the move, so make it and check if own king is in danger after making the move
      var incheck = false
      // step 1 get board after the move
      var filei = { w: exboard[3], b: exboard[4] }[side]
      var filef = { w: exboard[2], b: exboard[5] }[side]
      filei = filei.split('')
      filef = filef.split('')
      filei[col] = ' '; filei[target] = ' ';
      filef[target] = pawn;
      filei = filei.join('')
      filef = filef.join('')
      // step 2 get own king and enemy pieces positions
      var boardf = [exboard[0], exboard[1], , , , , exboard[6], exboard[7]]
      if (side === 'w') { boardf[3] = filei; boardf[2] = filef; boardf[4] = exboard[4]; boardf[5] = exboard[5] }
      if (side === 'b') { boardf[4] = filei; boardf[5] = filef; boardf[2] = exboard[2]; boardf[3] = exboard[3] }
      // Contact checks and knight checks are not possible after ep!
      boardf = boardf.join('')
      const startpos = boardf.indexOf(king)
      // step 3 see if in check
      // For S direction
      var ico = filemap[startpos]
      var isq = startpos + 8
      while (isq < 64 && filemap[isq] === ico + 1) {
        var sq = boardf[isq]
        if (sq === queen || sq === rook) { incheck = true; break; }
        if (sq !== ' ') break;
        ico = filemap[isq]
        isq = isq + 8;
      }
      if (incheck === true) continue;
      // For N direction
      var ico = filemap[startpos]
      var isq = startpos - 8
      while (isq > -1 && filemap[isq] === ico - 1) {
        var sq = boardf[isq]
        if (sq === queen || sq === rook) { incheck = true; break; }
        if (sq !== ' ') break;
        ico = filemap[isq]
        isq = isq - 8;
      }
      if (incheck === true) continue;
      // For SW direction
      var ico = filemap[startpos]
      var isq = startpos + 7
      while (isq < 64 && filemap[isq] === ico + 1) {
        var sq = boardf[isq]
        if (sq === queen || sq === bishop) { incheck = true; break; }
        if (sq !== ' ') break;
        ico = filemap[isq]
        isq = isq + 7;
      }
      if (incheck === true) continue;
      // For SE direction
      var ico = filemap[startpos]
      var isq = startpos + 9
      while (isq < 64 && filemap[isq] === ico + 1) {
        var sq = boardf[isq]
        if (sq === queen || sq === bishop) { incheck = true; break; }
        if (sq !== ' ') break;
        ico = filemap[isq]
        isq = isq + 9;
      }
      if (incheck === true) continue;
      // For NW direction
      var ico = filemap[startpos]
      var isq = startpos - 9
      while (isq > -1 && filemap[isq] === ico - 1) {
        var sq = boardf[isq]
        if (sq === queen || sq === bishop) { incheck = true; break; }
        if (sq !== ' ') break;
        ico = filemap[isq]
        isq = isq - 9;
      }
      if (incheck === true) continue;
      // For NE direction
      var ico = filemap[startpos]
      var isq = startpos - 7
      while (isq > -1 && filemap[isq] === ico - 1) {
        var sq = boardf[isq]
        if (sq === queen || sq === bishop) { incheck = true; break; }
        if (sq !== ' ') break;
        ico = filemap[isq]
        isq = isq - 7;
      }
      if (incheck === true) continue;
      // For W direction
      var lim = 8 * filemap[startpos]
      var isq = startpos - 1
      while (isq >= lim) {
        var sq = boardf[isq]
        if (sq === queen || sq === rook) { incheck = true; break; }
        if (sq !== ' ') break;
        isq = isq - 1;
      }
      if (incheck === true) continue;
      // For E direction
      lim = 8 + lim
      var isq = startpos + 1
      while (isq < lim) {
        var sq = boardf[isq]
        if (sq === queen || sq === rook) { incheck = true; break; }
        if (sq !== ' ') break;
        isq = isq + 1;
      }
      if (incheck === true) continue;
      legal = true
    }
  }
  return legal
}

function ucifen(uci) {
  var ifen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    epsq = '-',
    turn = 'w',
    castle = 'KQkq',
    halfmove = 0,
    fullmove = 1,
    csf = { wk: 'K', wq: 'Q', bk: 'k', bq: 'q' },
    capture = false,
    board = { "a8": { "p": "r", "c": "b" }, "b8": { "p": "n", "c": "b" }, "c8": { "p": "b", "c": "b" }, "d8": { "p": "q", "c": "b" }, "e8": { "p": "k", "c": "b" }, "f8": { "p": "b", "c": "b" }, "g8": { "p": "n", "c": "b" }, "h8": { "p": "r", "c": "b" }, "a7": { "p": "p", "c": "b" }, "b7": { "p": "p", "c": "b" }, "c7": { "p": "p", "c": "b" }, "d7": { "p": "p", "c": "b" }, "e7": { "p": "p", "c": "b" }, "f7": { "p": "p", "c": "b" }, "g7": { "p": "p", "c": "b" }, "h7": { "p": "p", "c": "b" }, "a6": { "p": " ", "c": " " }, "b6": { "p": " ", "c": " " }, "c6": { "p": " ", "c": " " }, "d6": { "p": " ", "c": " " }, "e6": { "p": " ", "c": " " }, "f6": { "p": " ", "c": " " }, "g6": { "p": " ", "c": " " }, "h6": { "p": " ", "c": " " }, "a5": { "p": " ", "c": " " }, "b5": { "p": " ", "c": " " }, "c5": { "p": " ", "c": " " }, "d5": { "p": " ", "c": " " }, "e5": { "p": " ", "c": " " }, "f5": { "p": " ", "c": " " }, "g5": { "p": " ", "c": " " }, "h5": { "p": " ", "c": " " }, "a4": { "p": " ", "c": " " }, "b4": { "p": " ", "c": " " }, "c4": { "p": " ", "c": " " }, "d4": { "p": " ", "c": " " }, "e4": { "p": " ", "c": " " }, "f4": { "p": " ", "c": " " }, "g4": { "p": " ", "c": " " }, "h4": { "p": " ", "c": " " }, "a3": { "p": " ", "c": " " }, "b3": { "p": " ", "c": " " }, "c3": { "p": " ", "c": " " }, "d3": { "p": " ", "c": " " }, "e3": { "p": " ", "c": " " }, "f3": { "p": " ", "c": " " }, "g3": { "p": " ", "c": " " }, "h3": { "p": " ", "c": " " }, "a2": { "p": "p", "c": "w" }, "b2": { "p": "p", "c": "w" }, "c2": { "p": "p", "c": "w" }, "d2": { "p": "p", "c": "w" }, "e2": { "p": "p", "c": "w" }, "f2": { "p": "p", "c": "w" }, "g2": { "p": "p", "c": "w" }, "h2": { "p": "p", "c": "w" }, "a1": { "p": "r", "c": "w" }, "b1": { "p": "n", "c": "w" }, "c1": { "p": "b", "c": "w" }, "d1": { "p": "q", "c": "w" }, "e1": { "p": "k", "c": "w" }, "f1": { "p": "b", "c": "w" }, "g1": { "p": "n", "c": "w" }, "h1": { "p": "r", "c": "w" } };

  const moves = uci.split(' '),
    len = moves.length,
    col = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    file = [1, 2, 3, 4, 5, 6, 7, 8],
    epi = { 2: 4, 7: 5 },
    epc = { 3: 4, 6: 5 },
    epm = { 2: 3, 7: 6 },
    csq = { 'e1g1': 'h1f1', 'e1c1': 'a1d1', 'e8g8': 'h8f8', 'e8c8': 'a8d8' },
    casp = { 'k': 2, 'r': 1 },
    sfen = { wk: 'K', wq: 'Q', wr: 'R', wb: 'B', wn: 'N', wp: 'P', bk: 'k', bq: 'q', br: 'r', bb: 'b', bn: 'n', bp: 'p' },
    ud = 'undefined';

  for (var i = 0; i < len; ++i) {
    // Board movement
    const move = moves[i],
      ini = move[0] + move[1],
      fin = move[2] + move[3],
      isq = board[ini],
      pc = isq.p,
      nop = { "p": " ", "c": " " };

    if (board[fin].p !== ' ') capture = true
    board[fin] = isq
    board[ini] = nop
    // en passant capture
    if (epsq !== '-' && fin === epsq && pc === 'p') { board[move[2] + epc[move[3]]] = nop; capture = true }
    // castling,
    if (typeof csq[move] !== ud && pc === 'k') {
      const rmove = csq[move],
        rini = rmove[0] + rmove[1],
        rfin = rmove[2] + rmove[3];
      board[rfin] = board[rini]
      board[rini] = nop
    }
    // promotion if we only update p aka the piece, all pawns will turn into that piece, somehow
    if (typeof move[4] !== ud) board[fin] = { p: move[4], c: turn }
    // After the move, update fen variables

    // 3. Castling availability: If neither side has the ability to castle, this field uses the character "-". Otherwise, this field contains one or more letters: "K" if White can castle kingside, "Q" if White can castle queenside, "k" if Black can castle kingside, and "q" if Black can castle queenside. A situation that temporarily prevents castling does not prevent the use of this notation.,
    if (castle !== '-') {
      if (pc === 'k') {
        csf[turn + 'k'] = ''; csf[turn + 'q'] = ''
      }
      if (board.h1.c !== 'w') csf.wk = '';
      if (board.a1.c !== 'w') csf.wq = '';
      if (board.h8.c !== 'b') csf.bk = '';
      if (board.a8.c !== 'b') csf.bq = '';
      castle = csf.wk + csf.wq + csf.bk + csf.bq; if (castle.length === 0) castle = '-'
    }

    // 6. Fullmove number: The number of the full moves. It starts at 1 and is incremented after Black's move.
    // 2. Active colour: "w" means that White is to move; "b" means that Black is to move.
    if (turn === 'w') { turn = 'b' } else { ++fullmove; turn = 'w' }

    // 4. En passant target square: This is a square over which a pawn has just passed while moving two squares; it is given in algebraic notation. If there is no en passant target square, this field uses the character "-". This is recorded regardless of whether there is a pawn in position to capture en passant. An updated version of the spec has since made it so the target square is only recorded if a legal en passant move is possible but the old version of the standard is the one most commonly used. In this function we use the updated version
    epsq = '-'
    if (pc === 'p' && typeof epi[move[1]] !== ud && move[3] == epi[move[1]]) {
      var next = { a: "b", b: ['a', 'c'], c: ['b', 'd'], d: ['c', 'e'], e: ['d', 'f'], f: ['e', 'g'], g: ['f', 'h'], h: "g" }[move[2]]
      for (var v = next.length; v--;) {
        // a or h pawn moved
        const nsq = board[next[v] + move[3]]
        if (nsq.p === 'p' && nsq.c === turn) {
          epsq = move[0] + (epm[move[1]])
          break
        }
      }
    }

    // 5. Halfmove clock: The number of halfmoves since the last capture or pawn advance, used for the fifty-move rule.
    if (capture === true || pc === 'p') { halfmove = 0; capture = false } else { ++halfmove }

    // 1. Piece placement data: Each rank is described, starting with rank 8 and ending with rank 1, with a "/" between each one; within each rank, the contents of the squares are described in order from the a-file to the h-file. Each piece is identified by a single letter taken from the standard English names in algebraic notation (pawn = "P", knight = "N", bishop = "B", rook = "R", queen = "Q" and king = "K"). White pieces are designated using uppercase letters ("PNBRQK"), while black pieces use lowercase letters ("pnbrqk"). A set of one or more consecutive empty squares within a rank is denoted by a digit from "1" to "8", corresponding to the number of squares.
    var emptysq = 0,
      filestr = '',
      pieceplacement = [];
    for (var h = 8; h--;) {
      for (var g = 0; g < 8; ++g) {
        const square = board[col[g] + file[h]],
          pcsq = sfen[square.c + square.p];
        if (typeof pcsq === ud) { ++emptysq } else {
          if (emptysq > 0) { filestr += emptysq; emptysq = 0 }
          filestr += pcsq
        }
      }
      if (emptysq > 0) { filestr += emptysq; emptysq = 0 }
      pieceplacement.push(filestr)
      filestr = ''
    }
  }
  return [pieceplacement.join('/'), turn, castle, epsq, halfmove, fullmove].join(' ')
}
function boardgen(fenstr) {
  const board = fenstr.split('/')
  var exboard = []
  const n = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 }
  var initialboard = {}
  const col = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const file = [1, 2, 3, 4, 5, 6, 7, 8]
  var sqc = 0
  const filemap = {}
  for (var h = 8; h--;) {
    for (var g = 0; g < 8; ++g) {
      const square = col[g] + file[h]
      initialboard[square] = {
        'p': ' ',
        'c': ' '
      }
      filemap[sqc] = square
      sqc++
    }
  }
  for (var j = board.length; j--;) {
    var bfile = board[j]
    var y = ''
    for (var i = bfile.length; i--;) {
      var c = bfile.charAt(i)
      if (typeof n[c] === 'undefined') {
        // Not a number, add the piece
        y = c + y
      } else {
        while (c--) y = ' ' + y
      }
    }
    exboard[j] = y
  }
  exboard = exboard.join('')
  const tr = {
    'K': { 'p': 'k', 'c': 'w' },
    'Q': { 'p': 'q', 'c': 'w' },
    'R': { 'p': 'r', 'c': 'w' },
    'B': { 'p': 'b', 'c': 'w' },
    'N': { 'p': 'n', 'c': 'w' },
    'P': { 'p': 'p', 'c': 'w' },
    'k': { 'p': 'k', 'c': 'b' },
    'q': { 'p': 'q', 'c': 'b' },
    'r': { 'p': 'r', 'c': 'b' },
    'b': { 'p': 'b', 'c': 'b' },
    'n': { 'p': 'n', 'c': 'b' },
    'p': { 'p': 'p', 'c': 'b' },
    ' ': { 'p': ' ', 'c': ' ' }
  }
  for (var k = 64; k--;) {
    initialboard[filemap[k]] = tr[exboard[k]]
  }

  return initialboard

}
function mg(fen) {
  // What is really needed - the board, side to move, castling rights and en passant square
  const a = fen.split(' ')
  const square = a[3]
  const side = a[1]
  const castle = a[2]
  const board = a[0].split('/')
  const n = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 }
  var boardf = Array(8)
  for (var j = board.length; j--;) {
    var bfile = board[j]
    var y = ''
    for (var i = bfile.length; i--;) {
      var c = bfile.charAt(i)
      if (typeof n[c] === 'undefined') {
        // Not a number, add the piece
        y = c + y
      } else {
        while (c--) y = ' ' + y
      }
    }
    boardf[j] = y
  }
  boardf = boardf.join('')
  const king = { w: 'K', b: 'k' }[side]
  const queen = { w: 'Q', b: 'q' }[side]
  const rook = { w: 'R', b: 'r' }[side]
  const bishop = { w: 'B', b: 'b' }[side]
  const knight = { w: 'N', b: 'n' }[side]
  const pawn = { w: 'P', b: 'p' }[side]
  const equeen = { w: 'q', b: 'Q' }[side]
  const erook = { w: 'r', b: 'R' }[side]
  const ebishop = { w: 'b', b: 'B' }[side]
  const eknight = { w: 'n', b: 'N' }[side]
  const epawn = { w: 'p', b: 'P' }[side]
  const eking = { w: 'k', b: 'K' }[side]
  const ownpieces = { w: { K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N', P: 'P' }, b: { k: 'k', q: 'q', r: 'r', b: 'b', n: 'n', p: 'p' } }[side]
  const epieces = { b: { K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N', P: 'P' }, w: { k: 'k', q: 'q', r: 'r', b: 'b', n: 'n', p: 'p' } }[side]
  const filemap = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0,
    8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1,
    16: 2, 17: 2, 18: 2, 19: 2, 20: 2, 21: 2, 22: 2, 23: 2,
    24: 3, 25: 3, 26: 3, 27: 3, 28: 3, 29: 3, 30: 3, 31: 3,
    32: 4, 33: 4, 34: 4, 35: 4, 36: 4, 37: 4, 38: 4, 39: 4,
    40: 5, 41: 5, 42: 5, 43: 5, 44: 5, 45: 5, 46: 5, 47: 5,
    48: 6, 49: 6, 50: 6, 51: 6, 52: 6, 53: 6, 54: 6, 55: 6,
    56: 7, 57: 7, 58: 7, 59: 7, 60: 7, 61: 7, 62: 7, 63: 7,
  }
  const m = { 0: "a8", 1: "b8", 2: "c8", 3: "d8", 4: "e8", 5: "f8", 6: "g8", 7: "h8", 8: "a7", 9: "b7", 10: "c7", 11: "d7", 12: "e7", 13: "f7", 14: "g7", 15: "h7", 16: "a6", 17: "b6", 18: "c6", 19: "d6", 20: "e6", 21: "f6", 22: "g6", 23: "h6", 24: "a5", 25: "b5", 26: "c5", 27: "d5", 28: "e5", 29: "f5", 30: "g5", 31: "h5", 32: "a4", 33: "b4", 34: "c4", 35: "d4", 36: "e4", 37: "f4", 38: "g4", 39: "h4", 40: "a3", 41: "b3", 42: "c3", 43: "d3", 44: "e3", 45: "f3", 46: "g3", 47: "h3", 48: "a2", 49: "b2", 50: "c2", 51: "d2", 52: "e2", 53: "f2", 54: "g2", 55: "h2", 56: "a1", 57: "b1", 58: "c1", 59: "d1", 60: "e1", 61: "f1", 62: "g1", 63: "h1" }
  const moves = []
  var l = 64
  const ps = {}
  ps[pawn] = []
  ps[knight] = []
  ps[bishop] = []
  ps[rook] = []
  ps[queen] = []
  ps[king] = []
  while (l--) {
    const p = boardf[l]
    if (typeof ownpieces[p] !== 'undefined') ps[ownpieces[p]].push(l)
  }
  // Look for king moves always
  const startpos = ps[king][0]
  const startfile = filemap[startpos]
  // For S direction
  var isq = startpos + 8
  if (isq < 64) {
    var b = boardf.split('');
    if (typeof ownpieces[b[isq]] === 'undefined') {
      b[isq] = king; b[startpos] = ' '
      if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
    }
  }
  // For N direction
  var isq = startpos - 8
  if (isq > -1) {
    var b = boardf.split('');
    if (typeof ownpieces[b[isq]] === 'undefined') {
      b[isq] = king; b[startpos] = ' '
      if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
    }
  }
  // For SW direction
  var isq = startpos + 7
  if (isq < 64 && filemap[isq] === startfile + 1) {
    var b = boardf.split('');
    if (typeof ownpieces[b[isq]] === 'undefined') {
      b[isq] = king; b[startpos] = ' '
      if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
    }
  }
  // For SE direction
  var isq = startpos + 9
  if (isq < 64 && filemap[isq] === startfile + 1) {
    var b = boardf.split('');
    if (typeof ownpieces[b[isq]] === 'undefined') {
      b[isq] = king; b[startpos] = ' '
      if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
    }
  }
  // For NW direction
  var isq = startpos - 9
  if (isq > -1 && filemap[isq] === startfile - 1) {
    var b = boardf.split('');
    if (typeof ownpieces[b[isq]] === 'undefined') {
      b[isq] = king; b[startpos] = ' '
      if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
    }
  }
  // For NE direction
  var isq = startpos - 7
  if (isq > -1 && filemap[isq] === startfile - 1) {
    var b = boardf.split('');
    if (typeof ownpieces[b[isq]] === 'undefined') {
      b[isq] = king; b[startpos] = ' '
      if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
    }
  }
  // For E direction
  var isq = startpos + 1
  if (isq < 64 && filemap[isq] === startfile) {
    var b = boardf.split('');
    if (typeof ownpieces[b[isq]] === 'undefined') {
      b[isq] = king; b[startpos] = ' '
      if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
    }
  }
  // For W direction
  var isq = startpos - 1
  if (isq > -1 && filemap[isq] === startfile) {
    var b = boardf.split('');
    if (typeof ownpieces[b[isq]] === 'undefined') {
      b[isq] = king; b[startpos] = ' '
      if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
    }
  }

  const checkingp = icp(boardf, side)
  if (checkingp.length === 0) {
    //Not in check
    // Look for castling moves
    const csf = {}
    for (var t = castle.length; t--;) {
      csf[castle[t]] = 1
    }
    if (typeof csf[king] !== 'undefined') {
      // We have kingside castle rights
      var isq = startpos + 1
      var isqf = startpos + 2
      var b = boardf.split('')
      if (b[isq] === ' ' && b[isqf] === ' ') {
        b[isq] = king; b[startpos] = ' ';
        if (ic(b.join(''), side) === false) {
          b[isqf] = king; b[isq] = rook; b[isqf + 1] = ' '
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isqf])
        }
      }
    }
    if (typeof csf[queen] !== 'undefined') {
      // We have queenside castle rights
      var isq = startpos - 1
      var isqf = startpos - 2
      var b = boardf.split('')
      if (b[isq] === ' ' && b[isqf] === ' ' && b[isqf - 1] === ' ') {
        b[isq] = king; b[startpos] = ' ';
        if (ic(b.join(''), side) === false) {
          b[isqf] = king; b[isq] = rook; b[isqf - 2] = ' '
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isqf])
        }
      }
    }

    // Look for pawn moves
    const pawns = ps[pawn]
    var l = pawns.length
    if (side === 'w') {
      while (l--) {
        // For each pawn
        const startpos = pawns[l]
        const startfile = filemap[startpos]
        // For N direction
        var isq = startpos - 8
        var b = boardf.split('');
        if (b[isq] === ' ') {
          b[startpos] = ' '
          //   If promotion
          if (startfile === 1) {
            b[isq] = queen
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
            b[isq] = rook
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
            b[isq] = bishop
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
            b[isq] = knight
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
          } else {
            b[isq] = pawn;
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            if (startfile === 6 && b[isq - 8] === ' ') {
              b[isq] = ' '; b[isq - 8] = pawn
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq - 8])
            }
          }
        }
        // For NE direction
        var isq = startpos - 7
        var b = boardf.split('');
        if (startfile === filemap[isq] + 1 && typeof epieces[b[isq]] !== 'undefined') {
          b[startpos] = ' '
          //   If promotion
          if (startfile === 1) {
            b[isq] = queen
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
            b[isq] = rook
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
            b[isq] = bishop
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
            b[isq] = knight
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
          } else {
            b[isq] = pawn;
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          }
        }
        // For NW direction
        var isq = startpos - 9
        var b = boardf.split('');
        if (startfile === filemap[isq] + 1 && typeof epieces[b[isq]] !== 'undefined') {
          b[startpos] = ' '
          //   If promotion
          if (startfile === 1) {
            b[isq] = queen
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
            b[isq] = rook
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
            b[isq] = bishop
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
            b[isq] = knight
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
          } else {
            b[isq] = pawn;
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          }
        }
      }
    } else {
      while (l--) {
        // For each pawn
        const startpos = pawns[l]
        const startfile = filemap[startpos]
        // For S direction
        var isq = startpos + 8
        var b = boardf.split('');
        if (b[isq] === ' ') {
          b[startpos] = ' '
          //   If promotion
          if (startfile === 6) {
            b[isq] = queen
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
            b[isq] = rook
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
            b[isq] = bishop
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
            b[isq] = knight
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
          } else {
            b[isq] = pawn;
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            if (startfile === 1 && b[isq + 8] === ' ') {
              b[isq] = ' '; b[isq + 8] = pawn
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq + 8])
            }
          }
        }
        // For SW direction
        var isq = startpos + 7
        var b = boardf.split('');
        if (startfile === filemap[isq] - 1 && typeof epieces[b[isq]] !== 'undefined') {
          b[startpos] = ' '
          //   If promotion
          if (startfile === 6) {
            b[isq] = queen
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
            b[isq] = rook
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
            b[isq] = bishop
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
            b[isq] = knight
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
          } else {
            b[isq] = pawn;
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          }
        }
        // For SE direction
        var isq = startpos + 9
        var b = boardf.split('');
        if (startfile === filemap[isq] - 1 && typeof epieces[b[isq]] !== 'undefined') {
          b[startpos] = ' '
          //   If promotion
          if (startfile === 6) {
            b[isq] = queen
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
            b[isq] = rook
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
            b[isq] = bishop
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
            b[isq] = knight
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
          } else {
            b[isq] = pawn;
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          }
        }
      }
    }
    // Look for ep capture moves
    if (square !== '-') {
      const mep = { w: { a6: [25], b6: [24, 26], c6: [25, 27], d6: [26, 28], e6: [27, 29], f6: [28, 30], g6: [29, 31], h6: [30] }, b: { a3: [33], b3: [32, 34], c3: [33, 35], d3: [34, 36], e3: [35, 37], f3: [36, 38], g3: [37, 39], h3: [38] } }[side][square]
      var l = mep.length
      while (l--) {
        const startpos = mep[l]
        var b = boardf.split('');
        if (b[startpos] === pawn) {
          const isq = { w: { a6: 16, b6: 17, c6: 18, d6: 19, e6: 20, f6: 21, g6: 22, h6: 23 }, b: { a3: 40, b3: 41, c3: 42, d3: 43, e3: 44, f3: 45, g3: 46, h3: 47 } }[side][square]
          b[startpos] = ' '; b[isq] = pawn;
          b[{ w: isq + 8, b: isq - 8 }[side]] = ' '
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + square)
        }
      }
    }
    // Look for queen moves
    const queens = ps[queen]
    var l = queens.length
    while (l--) {
      // For each queen
      const startpos = queens[l]
      const startfile = filemap[startpos]
      // For N direction
      var isq = startpos - 8
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq > -1 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          isq = isq - 8
        } else {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For S direction
      var isq = startpos + 8
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq < 64 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          isq = isq + 8
        } else {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For NW direction
      var ico = filemap[startpos]
      var isq = startpos - 9
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq > -1 && filemap[isq] === ico - 1 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          ico = filemap[isq]
          isq = isq - 9
        } else {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For NE direction
      var ico = filemap[startpos]
      var isq = startpos - 7
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq > -1 && filemap[isq] === ico - 1 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          ico = filemap[isq]
          isq = isq - 7
        } else {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For SE direction
      var ico = filemap[startpos]
      var isq = startpos + 9
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq < 64 && filemap[isq] === ico + 1 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          ico = filemap[isq]
          isq = isq + 9
        } else {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For SW direction
      var ico = filemap[startpos]
      var isq = startpos + 7
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq < 64 && filemap[isq] === ico + 1 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          ico = filemap[isq]
          isq = isq + 7
        } else {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For W direction
      var ico = filemap[startpos]
      var isq = startpos - 1
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq > -1 && filemap[isq] === ico && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          isq = isq - 1
        } else {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For E direction
      var ico = filemap[startpos]
      var isq = startpos + 1
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq < 64 && filemap[isq] === ico && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          isq = isq + 1
        } else {
          b[isq] = queen
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
    }
    // Look for rook moves
    const rooks = ps[rook]
    var l = rooks.length
    while (l--) {
      // For each rook
      const startpos = rooks[l]
      const startfile = filemap[startpos]
      // For N direction
      var isq = startpos - 8
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq > -1 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = rook
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          isq = isq - 8
        } else {
          b[isq] = rook
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For S direction
      var isq = startpos + 8
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq < 64 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = rook
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          isq = isq + 8
        } else {
          b[isq] = rook
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For E direction
      var ico = filemap[startpos]
      var isq = startpos + 1
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq < 64 && filemap[isq] === ico && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = rook
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          isq = isq + 1
        } else {
          b[isq] = rook
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For W direction
      var ico = filemap[startpos]
      var isq = startpos - 1
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq > -1 && filemap[isq] === ico && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = rook
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          isq = isq - 1
        } else {
          b[isq] = rook
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
    }
    // Look for bishop moves
    const bishops = ps[bishop]
    var l = bishops.length
    while (l--) {
      // For each bishop
      const startpos = bishops[l]
      const startfile = filemap[startpos]
      // For NW direction
      var ico = filemap[startpos]
      var isq = startpos - 9
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq > -1 && filemap[isq] === ico - 1 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = bishop
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          ico = filemap[isq]
          isq = isq - 9
        } else {
          b[isq] = bishop
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For NE direction
      var ico = filemap[startpos]
      var isq = startpos - 7
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq > -1 && filemap[isq] === ico - 1 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = bishop
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          ico = filemap[isq]
          isq = isq - 7
        } else {
          b[isq] = bishop
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For SE direction
      var ico = filemap[startpos]
      var isq = startpos + 9
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq < 64 && filemap[isq] === ico + 1 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = bishop
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          ico = filemap[isq]
          isq = isq + 9
        } else {
          b[isq] = bishop
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
      // For SW direction
      var ico = filemap[startpos]
      var isq = startpos + 7
      var b = boardf.split('');
      b[startpos] = ' '
      while (isq < 64 && filemap[isq] === ico + 1 && typeof ownpieces[b[isq]] === 'undefined') {
        if (b[isq] === ' ') {
          b[isq] = bishop
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b[isq] = ' '
          ico = filemap[isq]
          isq = isq + 7
        } else {
          b[isq] = bishop
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          break
        }
      }
    }
    // Look for knight moves
    const knights = ps[knight]
    var l = knights.length
    while (l--) {
      // For each knight
      const startpos = knights[l]
      const startfile = filemap[startpos]
      var b = boardf.split('');
      var isq = startpos + 10
      if (isq < 64 && filemap[isq] === startfile + 1 && typeof ownpieces[b[isq]] === 'undefined') {
        b[startpos] = ' '
        b[isq] = knight
        if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
        b = boardf.split('');
      }
      isq = startpos + 6
      if (isq < 64 && filemap[isq] === startfile + 1 && typeof ownpieces[b[isq]] === 'undefined') {
        b[startpos] = ' '
        b[isq] = knight
        if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
        b = boardf.split('');
      }
      isq = startpos + 15
      if (isq < 64 && filemap[isq] === startfile + 2 && typeof ownpieces[b[isq]] === 'undefined') {
        b[startpos] = ' '
        b[isq] = knight
        if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
        b = boardf.split('');
      }
      isq = startpos + 17
      if (isq < 64 && filemap[isq] === startfile + 2 && typeof ownpieces[b[isq]] === 'undefined') {
        b[startpos] = ' '
        b[isq] = knight
        if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
        b = boardf.split('');
      }
      isq = startpos - 6
      if (isq > -1 && filemap[isq] === startfile - 1 && typeof ownpieces[b[isq]] === 'undefined') {
        b[startpos] = ' '
        b[isq] = knight
        if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
        b = boardf.split('');
      }
      isq = startpos - 10
      if (isq > -1 && filemap[isq] === startfile - 1 && typeof ownpieces[b[isq]] === 'undefined') {
        b[startpos] = ' '
        b[isq] = knight
        if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
        b = boardf.split('');
      }
      isq = startpos - 15
      if (isq > -1 && filemap[isq] === startfile - 2 && typeof ownpieces[b[isq]] === 'undefined') {
        b[startpos] = ' '
        b[isq] = knight
        if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
        b = boardf.split('');
      }
      isq = startpos - 17
      if (isq > -1 && filemap[isq] === startfile - 2 && typeof ownpieces[b[isq]] === 'undefined') {
        b[startpos] = ' '
        b[isq] = knight
        if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
        b = boardf.split('');
      }
    }
  } else {
    // In check, look for the source(s)
    if (checkingp.length === 1) {
      const c = checkingp[0]
      const cp = c[0]
      // Look for piece captures, 
      const cisq = c.slice(1) * 1
      // Anything arriving at a index defined in ca is ok (captures and interceptions where possible)
      const ca = {}
      ca[cisq] = 1
      const isqrb = {}
      isqrb[equeen] = 1
      isqrb[erook] = 1
      isqrb[ebishop] = 1
      // If queen, rook or bishop look for moves that end between them and king
      if (typeof isqrb[cp] !== 'undefined') {
        // startpos is still the start index of our king
        const samecol = m[cisq][0] === m[startpos][0]
        const samefile = m[cisq][1] === m[startpos][1]
        if (samecol === true) {
          if (startpos > cisq) {
            // Check N direction
            var csq = startpos - 8
            ca[csq] = 1
            while (csq !== cisq) {
              csq = csq - 8
              ca[csq] = 1
            }
          } else {
            // Check S direction
            var csq = startpos + 8
            ca[csq] = 1
            while (csq !== cisq) {
              csq = csq + 8
              ca[csq] = 1
            }
          }

        }
        if (samefile === true) {
          if (startpos > cisq) {
            var csq = startpos - 1
            ca[csq] = 1
            while (csq !== cisq) {
              csq = csq - 1
              ca[csq] = 1
            }
          } else {
            var csq = startpos + 1
            ca[csq] = 1
            while (csq !== cisq) {
              csq = csq + 1
              ca[csq] = 1
            }
          }
        }
        if (samecol === false && samefile === false) {

          const coldiff = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 }[m[cisq][0]] - { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 }[m[startpos][0]]
          const filediff = filemap[cisq] - filemap[startpos]
          const east = coldiff > 0
          const south = filediff > 0
          if (east === true) {
            if (south === true) {
              // checker is SE from king
              var csq = startpos + 9
              if (csq !== cisq) {
                ca[csq] = 1
                while (csq !== cisq) {
                  csq = csq + 9
                  ca[csq] = 1
                }
              }
            } else {
              // NE
              var csq = startpos - 7
              if (csq !== cisq) {
                ca[csq] = 1
                while (csq !== cisq) {
                  csq = csq - 7
                  ca[csq] = 1
                }
              }
            }
          } else {
            if (south === true) {
              // SW
              var csq = startpos + 7
              if (csq !== cisq) {
                ca[csq] = 1
                while (csq !== cisq) {
                  csq = csq + 7
                  ca[csq] = 1
                }
              }
            } else {
              // NW
              var csq = startpos - 9
              if (csq !== cisq) {
                ca[csq] = 1
                while (csq !== cisq) {
                  csq = csq - 9
                  ca[csq] = 1
                }
              }
            }
          }
        }
      }
      // No castling moves while in check
      // Look for pawn moves
      const pawns = ps[pawn]
      var l = pawns.length
      if (side === 'w') {
        while (l--) {
          // For each pawn
          const startpos = pawns[l]
          const startfile = filemap[startpos]
          // For N direction
          var isq = startpos - 8
          var b = boardf.split('');
          if (b[isq] === ' ') {
            b[startpos] = ' '
            // If promotion
            if (startfile === 1) {
              if (typeof ca[isq] !== 'undefined') {
                b[isq] = queen
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
                b[isq] = rook
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
                b[isq] = bishop
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
                b[isq] = knight
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
              }
            } else {
              b[isq] = pawn;
              if (typeof ca[isq] !== 'undefined' && ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              if (startfile === 6 && typeof ca[isq - 8] !== 'undefined' && b[isq - 8] === ' ') {
                b[isq] = ' '; b[isq - 8] = pawn
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq - 8])
              }
            }
          }
          // For NE direction
          var isq = startpos - 7
          if (typeof ca[isq] !== 'undefined') {
            var b = boardf.split('');
            if (startfile === filemap[isq] + 1 && typeof epieces[b[isq]] !== 'undefined') {
              b[startpos] = ' '
              // If promotion
              if (startfile === 1) {
                b[isq] = queen
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
                b[isq] = rook
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
                b[isq] = bishop
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
                b[isq] = knight
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
              } else {
                b[isq] = pawn;
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              }
            }
          }
          // For NW direction
          var isq = startpos - 9
          if (typeof ca[isq] !== 'undefined') {
            var b = boardf.split('');
            if (startfile === filemap[isq] + 1 && typeof epieces[b[isq]] !== 'undefined') {
              b[startpos] = ' '
              // If promotion
              if (startfile === 1) {
                b[isq] = queen
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
                b[isq] = rook
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
                b[isq] = bishop
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
                b[isq] = knight
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
              } else {
                b[isq] = pawn;
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              }
            }
          }
        }
      } else {
        while (l--) {
          // For each pawn
          const startpos = pawns[l]
          const startfile = filemap[startpos]
          // For N direction
          var isq = startpos + 8
          var b = boardf.split('');
          if (b[isq] === ' ') {
            b[startpos] = ' '
            // If promotion
            if (startfile === 6) {
              if (typeof ca[isq] !== 'undefined') {
                b[isq] = queen
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
                b[isq] = rook
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
                b[isq] = bishop
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
                b[isq] = knight
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
              }
            } else {
              b[isq] = pawn;
              if (typeof ca[isq] !== 'undefined' && ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              if (startfile === 1 && typeof ca[isq + 8] !== 'undefined' && b[isq + 8] === ' ') {
                b[isq] = ' '; b[isq + 8] = pawn
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq + 8])
              }
            }
          }
          // For SW direction
          var isq = startpos + 7
          if (typeof ca[isq] !== 'undefined') {
            var b = boardf.split('');
            if (startfile === filemap[isq] - 1 && typeof epieces[b[isq]] !== 'undefined') {
              b[startpos] = ' '
              // If promotion
              if (startfile === 6) {
                b[isq] = queen
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
                b[isq] = rook
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
                b[isq] = bishop
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
                b[isq] = knight
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
              } else {
                b[isq] = pawn;
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              }
            }
          }
          // For SE direction
          var isq = startpos + 9
          if (typeof ca[isq] !== 'undefined') {
            var b = boardf.split('');
            if (startfile === filemap[isq] - 1 && typeof epieces[b[isq]] !== 'undefined') {
              b[startpos] = ' '
              // If promotion
              if (startfile === 6) {
                b[isq] = queen
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'q')
                b[isq] = rook
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'r')
                b[isq] = bishop
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'b')
                b[isq] = knight
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq] + 'n')
              } else {
                b[isq] = pawn;
                if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              }
            }
          }
        }
      }
      // Look for ep capture moves
      if (square !== '-') {
        const mep = { w: { a6: [25], b6: [24, 26], c6: [25, 27], d6: [26, 28], e6: [27, 29], f6: [28, 30], g6: [29, 31], h6: [30] }, b: { a3: [33], b3: [32, 34], c3: [33, 35], d3: [34, 36], e3: [35, 37], f3: [36, 38], g3: [37, 39], h3: [38] } }[side][square]
        var l = mep.length
        while (l--) {
          const startpos = mep[l]
          var b = boardf.split('');
          if (b[startpos] === pawn) {
            const isq = { w: { a6: 16, b6: 17, c6: 18, d6: 19, e6: 20, f6: 21, g6: 22, h6: 23 }, b: { a3: 40, b3: 41, c3: 42, d3: 43, e3: 44, f3: 45, g3: 46, h3: 47 } }[side][square]
            b[startpos] = ' '; b[isq] = pawn;
            b[{ w: isq + 8, b: isq - 8 }[side]] = ' '
            if (ic(b.join(''), side) === false) moves.push(m[startpos] + square)
          }
        }
      }
      // Look for queen moves
      const queens = ps[queen]
      var l = queens.length
      while (l--) {
        // For each queen
        const startpos = queens[l]
        const startfile = filemap[startpos]
        // For N direction
        var isq = startpos - 8
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq > -1 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            isq = isq - 8
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For S direction
        var isq = startpos + 8
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq < 64 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            isq = isq + 8
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For NW direction
        var isq = startpos - 9
        var ico = filemap[startpos]
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq > -1 && filemap[isq] === ico - 1 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            ico = filemap[isq]
            isq = isq - 9
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For NE direction
        var ico = filemap[startpos]
        var isq = startpos - 7
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq > -1 && filemap[isq] === ico - 1 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            ico = filemap[isq]
            isq = isq - 7
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For SE direction
        var ico = filemap[startpos]
        var isq = startpos + 9
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq < 64 && filemap[isq] === ico + 1 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            ico = filemap[isq]
            isq = isq + 9
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For SW direction
        var ico = filemap[startpos]
        var isq = startpos + 7
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq < 64 && filemap[isq] === ico + 1 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            ico = filemap[isq]
            isq = isq + 7
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For W direction
        var ico = filemap[startpos]
        var isq = startpos - 1
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq > -1 && filemap[isq] === ico && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            isq = isq - 1
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For E direction
        var ico = filemap[startpos]
        var isq = startpos + 1
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq < 64 && filemap[isq] === ico && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            isq = isq + 1
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = queen
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
      }
      // Look for rook moves
      const rooks = ps[rook]
      var l = rooks.length
      while (l--) {
        // For each rook
        const startpos = rooks[l]
        const startfile = filemap[startpos]
        // For N direction
        var isq = startpos - 8
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq > -1 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = rook
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            isq = isq - 8
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = rook
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For S direction
        var isq = startpos + 8
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq < 64 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = rook
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            isq = isq + 8
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = rook
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For E direction
        var ico = filemap[startpos]
        var isq = startpos + 1
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq < 64 && filemap[isq] === ico && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = rook
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            isq = isq + 1
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = rook
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For W direction
        var ico = filemap[startpos]
        var isq = startpos - 1
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq > -1 && filemap[isq] === ico && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = rook
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            isq = isq - 1
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = rook
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
      }
      // Look for bishop moves
      const bishops = ps[bishop]
      var l = bishops.length
      while (l--) {
        // For each bishop
        const startpos = bishops[l]
        const startfile = filemap[startpos]
        // For NW direction
        var ico = filemap[startpos]
        var isq = startpos - 9
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq > -1 && filemap[isq] === ico - 1 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = bishop
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            ico = filemap[isq]
            isq = isq - 9
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = bishop
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For NE direction
        var ico = filemap[startpos]
        var isq = startpos - 7
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq > -1 && filemap[isq] === ico - 1 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = bishop
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            ico = filemap[isq]
            isq = isq - 7
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = bishop
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For SE direction
        var ico = filemap[startpos]
        var isq = startpos + 9
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq < 64 && filemap[isq] === ico + 1 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = bishop
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            ico = filemap[isq]
            isq = isq + 9
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = bishop
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
        // For SW direction
        var ico = filemap[startpos]
        var isq = startpos + 7
        var b = boardf.split('');
        b[startpos] = ' '
        while (isq < 64 && filemap[isq] === ico + 1 && typeof ownpieces[b[isq]] === 'undefined') {
          if (b[isq] === ' ') {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = bishop
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
              b[isq] = ' '
            }
            ico = filemap[isq]
            isq = isq + 7
          } else {
            if (typeof ca[isq] !== 'undefined') {
              b[isq] = bishop
              if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
            }
            break
          }
        }
      }
      // Look for knight moves
      const knights = ps[knight]
      var l = knights.length
      while (l--) {
        // For each knight
        const startpos = knights[l]
        const startfile = filemap[startpos]
        var b = boardf.split('');
        var isq = startpos + 10
        if (isq < 64 && filemap[isq] === startfile + 1 && typeof ca[isq] !== 'undefined') {
          b[startpos] = ' '
          b[isq] = knight
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b = boardf.split('');
        }
        isq = startpos + 6
        if (isq < 64 && filemap[isq] === startfile + 1 && typeof ca[isq] !== 'undefined') {
          b[startpos] = ' '
          b[isq] = knight
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b = boardf.split('');
        }
        isq = startpos + 15
        if (isq < 64 && filemap[isq] === startfile + 2 && typeof ca[isq] !== 'undefined') {
          b[startpos] = ' '
          b[isq] = knight
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b = boardf.split('');
        }
        isq = startpos + 17
        if (isq < 64 && filemap[isq] === startfile + 2 && typeof ca[isq] !== 'undefined') {
          b[startpos] = ' '
          b[isq] = knight
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b = boardf.split('');
        }
        isq = startpos - 6
        if (isq > -1 && filemap[isq] === startfile - 1 && typeof ca[isq] !== 'undefined') {
          b[startpos] = ' '
          b[isq] = knight
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b = boardf.split('');
        }
        isq = startpos - 10
        if (isq > -1 && filemap[isq] === startfile - 1 && typeof ca[isq] !== 'undefined') {
          b[startpos] = ' '
          b[isq] = knight
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b = boardf.split('');
        }
        isq = startpos - 15
        if (isq > -1 && filemap[isq] === startfile - 2 && typeof ca[isq] !== 'undefined') {
          b[startpos] = ' '
          b[isq] = knight
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b = boardf.split('');
        }
        isq = startpos - 17
        if (isq > -1 && filemap[isq] === startfile - 2 && typeof ca[isq] !== 'undefined') {
          b[startpos] = ' '
          b[isq] = knight
          if (ic(b.join(''), side) === false) moves.push(m[startpos] + m[isq])
          b = boardf.split('');
        }
      }
    } else {
      // If more than one source, look for king moves only (return early)
      return moves
    }
  }
  return moves
}
function icp(boardf, side) {
  const filemap = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0,
    8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1,
    16: 2, 17: 2, 18: 2, 19: 2, 20: 2, 21: 2, 22: 2, 23: 2,
    24: 3, 25: 3, 26: 3, 27: 3, 28: 3, 29: 3, 30: 3, 31: 3,
    32: 4, 33: 4, 34: 4, 35: 4, 36: 4, 37: 4, 38: 4, 39: 4,
    40: 5, 41: 5, 42: 5, 43: 5, 44: 5, 45: 5, 46: 5, 47: 5,
    48: 6, 49: 6, 50: 6, 51: 6, 52: 6, 53: 6, 54: 6, 55: 6,
    56: 7, 57: 7, 58: 7, 59: 7, 60: 7, 61: 7, 62: 7, 63: 7,
  }
  const king = { w: 'K', b: 'k' }[side]
  const equeen = { w: 'q', b: 'Q' }[side]
  const erook = { w: 'r', b: 'R' }[side]
  const ebishop = { w: 'b', b: 'B' }[side]
  const eknight = { w: 'n', b: 'N' }[side]
  const startpos = boardf.indexOf(king)
  const startfile = filemap[startpos]
  var ret = []
  // For S direction
  var ico = startfile
  var isq = startpos + 8
  while (isq < 64 && filemap[isq] === ico + 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === erook) { ret.push(sq + isq); break; }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq + 8;
  }
  // For N direction
  var ico = startfile
  var isq = startpos - 8
  while (isq > -1 && filemap[isq] === ico - 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === erook) { ret.push(sq + isq); break; }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq - 8;
  }
  const starta = startfile + 1
  const startb = startfile - 1
  // For Knight checks
  var isq = startpos + 10
  if (isq < 64 && filemap[isq] === starta && boardf[isq] === eknight) ret.push(eknight + isq)
  isq = startpos + 6
  if (isq < 64 && filemap[isq] === starta && boardf[isq] === eknight) ret.push(eknight + isq)
  isq = startpos + 15
  if (isq < 64 && filemap[isq] === startfile + 2 && boardf[isq] === eknight) ret.push(eknight + isq)
  isq = startpos + 17
  if (isq < 64 && filemap[isq] === startfile + 2 && boardf[isq] === eknight) ret.push(eknight + isq)
  isq = startpos - 6
  if (isq > -1 && filemap[isq] === startb && boardf[isq] === eknight) ret.push(eknight + isq)
  isq = startpos - 10
  if (isq > -1 && filemap[isq] === startb && boardf[isq] === eknight) ret.push(eknight + isq)
  isq = startpos - 15
  if (isq > -1 && filemap[isq] === startfile - 2 && boardf[isq] === eknight) ret.push(eknight + isq)
  isq = startpos - 17
  if (isq > -1 && filemap[isq] === startfile - 2 && boardf[isq] === eknight) ret.push(eknight + isq)
  // For SW direction
  var ico = startfile
  var isq = startpos + 7
  if (isq < 64 && filemap[isq] === starta && boardf[isq] === 'P' && side === 'b') ret.push('P' + isq)
  while (isq < 64 && filemap[isq] === ico + 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === ebishop) { ret.push(sq + isq); break; }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq + 7;
  }
  // For SE direction
  var ico = startfile
  var isq = startpos + 9
  if (isq < 64 && filemap[isq] === starta && boardf[isq] === 'P' && side === 'b') ret.push('P' + isq)
  while (isq < 64 && filemap[isq] === ico + 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === ebishop) { ret.push(sq + isq); break; }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq + 9;
  }
  // For NW direction
  var ico = startfile
  var isq = startpos - 9
  if (isq > -1 && filemap[isq] === startb && boardf[isq] === 'p' && side === 'w') ret.push('p' + isq)
  while (isq > -1 && filemap[isq] === ico - 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === ebishop) { ret.push(sq + isq); break; }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq - 9;
  }
  // For NE direction
  var ico = startfile
  var isq = startpos - 7
  if (isq > -1 && filemap[isq] === startb && boardf[isq] === 'p' && side === 'w') ret.push('p' + isq)
  while (isq > -1 && filemap[isq] === ico - 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === ebishop) { ret.push(sq + isq); break; }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq - 7;
  }
  // For W direction
  var lim = 8 * startfile
  var isq = startpos - 1
  while (isq >= lim) {
    var sq = boardf[isq]
    if (sq === equeen || sq === erook) { ret.push(sq + isq); break; }
    if (sq !== ' ') break;
    isq = isq - 1;
  }
  // For E direction
  lim = 8 + lim
  var isq = startpos + 1
  while (isq < lim) {
    var sq = boardf[isq]
    if (sq === equeen || sq === erook) { ret.push(sq + isq); break; }
    if (sq !== ' ') break;
    isq = isq + 1;
  }
  return ret
}
function ic(boardf, side) {
  const filemap = {
    0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0,
    8: 1, 9: 1, 10: 1, 11: 1, 12: 1, 13: 1, 14: 1, 15: 1,
    16: 2, 17: 2, 18: 2, 19: 2, 20: 2, 21: 2, 22: 2, 23: 2,
    24: 3, 25: 3, 26: 3, 27: 3, 28: 3, 29: 3, 30: 3, 31: 3,
    32: 4, 33: 4, 34: 4, 35: 4, 36: 4, 37: 4, 38: 4, 39: 4,
    40: 5, 41: 5, 42: 5, 43: 5, 44: 5, 45: 5, 46: 5, 47: 5,
    48: 6, 49: 6, 50: 6, 51: 6, 52: 6, 53: 6, 54: 6, 55: 6,
    56: 7, 57: 7, 58: 7, 59: 7, 60: 7, 61: 7, 62: 7, 63: 7,
  }
  const king = { w: 'K', b: 'k' }[side]
  const eking = { w: 'k', b: 'K' }[side]
  const equeen = { w: 'q', b: 'Q' }[side]
  const erook = { w: 'r', b: 'R' }[side]
  const ebishop = { w: 'b', b: 'B' }[side]
  const eknight = { w: 'n', b: 'N' }[side]
  const startpos = boardf.indexOf(king)
  const startfile = filemap[startpos]
  // For S direction
  var ico = startfile
  var isq = startpos + 8
  if (isq < 64 && filemap[isq] === ico + 1 && boardf[isq] === eking) return true
  while (isq < 64 && filemap[isq] === ico + 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === erook) { return true }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq + 8;
  }
  // For N direction
  var ico = startfile
  var isq = startpos - 8
  if (isq > -1 && filemap[isq] === ico - 1 && boardf[isq] === eking) return true
  while (isq > -1 && filemap[isq] === ico - 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === erook) { return true }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq - 8;
  }
  const starta = startfile + 1
  const startb = startfile - 1
  // For Knight checks
  var isq = startpos + 10
  if (isq < 64 && filemap[isq] === starta && boardf[isq] === eknight) return true
  isq = startpos + 6
  if (isq < 64 && filemap[isq] === starta && boardf[isq] === eknight) return true
  isq = startpos + 15
  if (isq < 64 && filemap[isq] === startfile + 2 && boardf[isq] === eknight) return true
  isq = startpos + 17
  if (isq < 64 && filemap[isq] === startfile + 2 && boardf[isq] === eknight) return true
  isq = startpos - 6
  if (isq > -1 && filemap[isq] === startb && boardf[isq] === eknight) return true
  isq = startpos - 10
  if (isq > -1 && filemap[isq] === startb && boardf[isq] === eknight) return true
  isq = startpos - 15
  if (isq > -1 && filemap[isq] === startfile - 2 && boardf[isq] === eknight) return true
  isq = startpos - 17
  if (isq > -1 && filemap[isq] === startfile - 2 && boardf[isq] === eknight) return true
  // For SW direction
  var ico = startfile
  var isq = startpos + 7
  if (isq < 64 && filemap[isq] === starta && boardf[isq] === 'P' && side === 'b') return true
  if (isq < 64 && filemap[isq] === ico + 1 && boardf[isq] === eking) return true
  while (isq < 64 && filemap[isq] === ico + 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === ebishop) { return true }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq + 7;
  }
  // For SE direction
  var ico = startfile
  var isq = startpos + 9
  if (isq < 64 && filemap[isq] === starta && boardf[isq] === 'P' && side === 'b') return true
  if (isq < 64 && filemap[isq] === ico + 1 && boardf[isq] === eking) return true
  while (isq < 64 && filemap[isq] === ico + 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === ebishop) { return true }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq + 9;
  }
  // For NW direction
  var ico = startfile
  var isq = startpos - 9
  if (isq > -1 && filemap[isq] === startb && boardf[isq] === 'p' && side === 'w') return true
  if (isq > -1 && filemap[isq] === ico - 1 && boardf[isq] === eking) return true
  while (isq > -1 && filemap[isq] === ico - 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === ebishop) { return true }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq - 9;
  }
  // For NE direction
  var ico = startfile
  var isq = startpos - 7
  if (isq > -1 && filemap[isq] === startb && boardf[isq] === 'p' && side === 'w') return true
  if (isq > -1 && filemap[isq] === ico - 1 && boardf[isq] === eking) return true
  while (isq > -1 && filemap[isq] === ico - 1) {
    var sq = boardf[isq]
    if (sq === equeen || sq === ebishop) { return true }
    if (sq !== ' ') break;
    ico = filemap[isq]
    isq = isq - 7;
  }
  // For W direction
  var lim = 8 * startfile
  var isq = startpos - 1
  if (isq >= lim && boardf[isq] === eking) return true
  while (isq >= lim) {
    var sq = boardf[isq]
    if (sq === equeen || sq === erook) { return true }
    if (sq !== ' ') break;
    isq = isq - 1;
  }
  // For E direction
  lim = 8 + lim
  var isq = startpos + 1
  while (isq < lim && boardf[isq] === eking) return true
  while (isq < lim) {
    var sq = boardf[isq]
    if (sq === equeen || sq === erook) { return true }
    if (sq !== ' ') break;
    isq = isq + 1;
  }
  return false
}
function wpiececount(str) {
  let pieces = 1;
  for (let i = str.length; i--;) {
    pieces = pieces + { P: 1, N: 1, B: 1, R: 1, Q: 1 }[str.charAt(i)] || pieces
  }
  return pieces;
}
function bpiececount(str) {
  let pieces = 1;
  for (let i = str.length; i--;) {
    pieces = pieces + { p: 1, n: 1, b: 1, r: 1, q: 1 }[str.charAt(i)] || pieces
  }
  return pieces;
}

let shuttingDown = false;

function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  obs.log('info', 'shutdown_start', { reason: reason });

  server.close(() => {
    obs.log('info', 'shutdown_server_closed', {});
  });

  wss.close(() => {
    obs.log('info', 'shutdown_ws_closed', {});
  });

  clearInterval(timeoutPoller);

  Object.keys(subs).forEach((gameid) => {
    const websockets = subs[gameid];
    ['w', 'b', 's'].forEach((side) => {
      const group = websockets[side];
      if (!group) return;
      for (var user in group) {
        group[user].terminate();
      }
    });
  });
  Object.keys(subs).forEach((gameid) => delete subs[gameid]);
  Object.keys(wsconnections).forEach((id) => delete wsconnections[id]);

  redisSub.quit().catch(() => {});
  redis.quit().catch(() => {});

  setTimeout(() => {
    obs.log('info', 'shutdown_forced_exit', {});
    process.exit(0);
  }, 30000);
}

process.on('SIGTERM', () => shutdown('sigterm'));
process.on('SIGINT', () => shutdown('sigint'));
