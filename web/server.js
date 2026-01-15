// nodejs libraries
const http = require('http');
const https = require('https');
const fs = require('fs');
var path = require("path");
const zlib = require('zlib');
const crypto = require('crypto');
const querystring = require('querystring');
const observability = require('../observability');

// Using Redis as Sessions database
const Redis = require("ioredis");
const redis = new Redis();

// Using PostgreSQL as main database for storing information about: users, game seeks, game data, etc.
const pg = require("pg");
const config = require("../config.json");

// const conString = 'postgres://user:password@host:port/db?sslmode=require'
const conString = config.shared.postgresUrl;

// Password complexity calculator
const zxcvbn = require('zxcvbn');
// Argon2id password hashing
const argon2 = require('argon2');

// To check for and limit user input
const usernameregex = new RegExp('^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9]$')
const gameidregex = new RegExp('^[a-zA-Z0-9]{9}$')
const randidregex = new RegExp('^[1234567890abcdef]{32}$')
const isodateregex = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')

// The IPs of one or more websocket servers
const websocketserver = config.web.websocketServerIps;

// This could be a very long random string, but it has to match in both the web server and the websocket server. For example:
// const websocketpassword = '4n729fm8dwyb475tynferh7w8qb7qwnrhmfx4362trgb627f3yg4n2f67svgb26734gnfb6weuysdf4738pzn1'
const websocketpassword = config.shared.websocketPassword;

const domainname = config.web.domainName;
const authRateLimits = config.web.authRateLimits;
const gameServerHost = config.engine.gameHost;
const gameServerName = config.game.serverName;
const gameServerAuthToken = config.shared.gameServerAuthToken;
const lobbyWatchers = new Map();

function getGameServerAuthIp() {
  const entries = Object.entries(config.game.myServers || {});
  for (var i = 0; i < entries.length; i++) {
    if (entries[i][1] === 'http') {
      return entries[i][0];
    }
  }
  if (entries.length === 0) {
    throw new Error('Missing config.game.myServers entries');
  }
  throw new Error('Missing http entry in config.game.myServers');
}

const gameServerAuthIp = getGameServerAuthIp();

const languages = {
  en: true,
  es: true,
  zh: true,
}

// Maintenance mode switch
const maintenance = config.web.maintenance;
// The IPs that are allowed when server is down for maintenance
const maintenanceips = config.web.maintenanceIps;

// This is the root directory of the website, everything inside here could be requested
// The name of the folder, which must be in the same directory as this file (server.js)
var folder = 'web'
var dir = path.join(__dirname, folder)

// This port is closed to the outside, but connected to our nginx instance
const port = config.web.port;
const obs = observability.createObserver('web');
obs.installProcessHandlers();

// The mime types of files that can be served, and which ones are to be gzipped or cached. It is limited on purpose and can be expanded as needed
const mime = require('./mime.js')

process.chdir(dir);

if (!authRateLimits || !authRateLimits.register || !authRateLimits.login || !authRateLimits.registered || !authRateLimits.logout) {
  throw new Error('Missing authRateLimits config');
}

var server = http.createServer(function (req, res) {

  if (maintenance === true) {
    if (typeof req.headers['x-real-ip'] === 'undefined') {
      res.writeHead(503, { "Content-Type": "text/html" });
      res.end();
      return;
    } else {
      if (typeof maintenanceips[req.headers['x-real-ip']] === 'undefined') {
        res.writeHead(503, { "Content-Type": "text/html" });
        res.end();
        return;
      }
    }
  }

  var filename;
  var url = req.url;
  var endOfPath = url.indexOf("?");
  if (endOfPath > -1) {
    url = url.substr(0, endOfPath);
  }

  try {
    url = decodeURI(url);
  } catch (e) {
    console.log(e, url)
    res.writeHead(400, { "Content-Type": "text/html" });
    res.end();
    return;
  }

  /// Redirect dirs to index.html.
  if (url.slice(-1) === '/') {
    url += 'index.html'
  }

  filename = path.join(dir, url);

  /// Make sure that the request is within the allowed directory.
  if (url.indexOf("..") !== -1 || url.substr(0, 1) !== "/" || path.relative(dir, filename).indexOf("..") !== -1) {
    return false;
  }

  /// Redirect no extension url paths to index.html.
  var ext = path.extname(filename);
  if (ext.length === 0) {
    filename += '/index.html'
    ext = '.html'
  }

  // user-agent can get big, up to 8k with nginx header limits. If stored on a 2GB memory system, the maximum is 250000 user-agents
  // truncating user-agent to 255 characters gives way to 32 times 250000 user-agents
  var useragent = sanitizeUserAgent(req.headers['user-agent'])
  // If ip changes, and user-agent is the same, check that geographical area or country is the same
  var cookie = req.headers['cookie'];
  // The sessionid must always be of length 32 (16 random bytes as hex string)
  var sessionid;
  var sessiondata;
  /* var sessionparams = {
     //u means userid, if it's n it's anon
     userid:'n',
     //t means theme, l for light and d for dark theme
     theme:'l',
     //l means language, en for english, es for spanish... ISO code 2
     lang:'en',
     //unix timestamp of when the cookie was set in redis
     created:1,
     useragent:'',
   };*/
  const resHeaders = {};

  if (req.url === '/websocket' && req.method === 'POST') {
    wsauth(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }

  if (typeof cookie === 'undefined') {
    // No cookies, so set the s cookie for session id
    newsession(filename, mime, ext, res, req, resHeaders, sessiondata)
  } else {
    //  37.181.67.5 1 l en 1695652108 Flamerare Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36
    // Check that the cookie is normal and not forged. 16 bytes at 2 hex chars per byte plus the s= cookie name assignment results in length 34
    if (cookie.length === 34 && cookie.slice(0, 2) === 's=') {
      sessionid = cookie.slice(2)
      // Check the sessionid with Redis, if found or not. Proceed as normal in each case
      redis.get(sessionid, (err, result) => {
        if (err) {
          console.error(err);
        } else {
          if (result === null) {
            // Not found or expired session id
            newsession(filename, mime, ext, res, req, resHeaders, sessiondata)
          } else {
            // In case sessionid is found on redis
            sessiondata = parseSessionData(result)
            if (!sessiondata) {
              newsession(filename, mime, ext, res, req, resHeaders, sessiondata)
              return
            }
            if (Math.floor(Date.now() / 1000) - sessiondata[4] > 31536000) {
              // Hard limit absolute timeout of 1 year
              newsession(filename, mime, ext, res, req, resHeaders, sessiondata)
            } else {
              // Idle timeout 1 week
              redis.expire(sessionid, '604800', (err, result) => { if (err) { console.error(err) } })
              if (req.headers['x-real-ip'] === sessiondata[0]) {
                // Same IP, same cookie - serve normally as that user or as n (nn, noname, anon)
                route(filename, mime, ext, res, req, resHeaders, sessiondata) //use sessiondata[1] which is the user id, to customise the html dynamically
              } else {
                // Different IP, same cookie - cookie theft or dynamic IP reassignment?
                if (useragent === sessiondata[6]) {
                  // If same user agent, assuming dynamic IP case, but can be further checked to be in the same location or country
                  route(filename, mime, ext, res, req, resHeaders, sessiondata) //use sessiondata[1] which is the user id, to customise the html dynamically
                } else {
                  // Different IP, different user agent, same cookie - cookie theft most probably! Set new cookie
                  newsession(filename, mime, ext, res, req, resHeaders, sessiondata)
                }
              }
            }
          }
        }
      });
    } else {
      //console.log('Bad or forged cookie');
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end();
    }
  }
})

server.listen(port);
obs.log('info', 'server_listen', { port: port });

server.on('error', function (e) {
  obs.count('server_error');
  obs.log('error', 'server_error', { error: e && e.stack ? e.stack : String(e) });
});

function sanitizeUserAgent(useragent) {
  if (typeof useragent !== 'string') {
    return ''
  }
  return useragent.replace(/[\r\n]/g, ' ').slice(0, 255)
}

function logAuthEvent(event, req, details) {
  const entry = {
    ip: req.headers['x-real-ip'],
    ua: sanitizeUserAgent(req.headers['user-agent']),
    session: typeof req.headers['cookie'] === 'string' ? req.headers['cookie'].slice(2) : '',
  }
  if (details && typeof details === 'object') {
    Object.keys(details).forEach((key) => {
      entry[key] = details[key]
    })
  }
  obs.log('info', 'auth_' + event, entry)
}

function applyAuthRateLimit(action, req, res, resHeaders, callback) {
  const limit = authRateLimits[action];
  const ip = req.headers['x-real-ip'];
  const key = 'rl:auth:' + action + ':' + ip;
  redis.incr(key, (err, count) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      console.error(err);
      return;
    }
    if (count === 1) {
      redis.expire(key, limit.windowSec, (expireErr) => {
        if (expireErr) {
          console.error(expireErr);
        }
      });
    }
    if (count > limit.max) {
      logAuthEvent('rate_limit', req, { action: action });
      res.writeHead(429, { "Content-Type": "text/html" });
      res.end();
      return;
    }
    callback();
  });
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

function getUserRole(userid, callback) {
  if (!userid || userid === '0') return callback(null, 0)
  var client = new pg.Client(conString)
  client.connect()
  client.query('SELECT role FROM users WHERE id = $1', [userid], (err, response) => {
    client.end()
    if (err) return callback(err)
    if (response.rows.length !== 1) return callback(null, 0)
    return callback(null, Number(response.rows[0].role) || 0)
  })
}

function denyAdmin(res, responseType) {
  if (responseType === 'json') {
    res.writeHead(403, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: 'admin_only' }))
  } else {
    res.writeHead(403, { "Content-Type": "text/html" })
    res.end()
  }
}

function requireAdmin(sessiondata, req, res, responseType, callback) {
  if (!sessiondata || sessiondata[1] === '0') {
    logAuthEvent('admin_reject', req, { reason: 'not_logged_in' })
    return denyAdmin(res, responseType)
  }
  getUserRole(sessiondata[1], (err, role) => {
    if (err) {
      res.writeHead(500, { "Content-Type": responseType === 'json' ? "application/json" : "text/html" })
      res.end(responseType === 'json' ? JSON.stringify({ error: 'db_error' }) : '')
      return
    }
    if (role !== 2) {
      logAuthEvent('admin_reject', req, { reason: 'not_admin', userid: sessiondata[1] })
      return denyAdmin(res, responseType)
    }
    callback()
  })
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

function serializeSessionData(sessiondata) {
  return JSON.stringify({
    ip: sessiondata[0] || sessiondata.ip || '',
    userid: sessiondata[1] || sessiondata.userid || '0',
    theme: sessiondata[2] || sessiondata.theme || 'n',
    lang: sessiondata[3] || sessiondata.lang || 'en',
    created: sessiondata[4] || sessiondata.created || '0',
    username: sessiondata[5] || sessiondata.username || 'u',
    useragent: sessiondata[6] || sessiondata.useragent || ''
  })
}

function storeSessionData(sessionid, sessiondata, callback) {
  redis.set(sessionid, serializeSessionData(sessiondata), 'EX', '604800', callback)
}

function newsession(filename, mime, ext, res, req, resHeaders, sessiondata) {
  crypto.randomBytes(16, (err, buf) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      console.log(err);
    } else {
      var sessionid = buf.toString('hex')
      var useragent = sanitizeUserAgent(req.headers['user-agent'])
      // Ensure it is a new id, not in use
      redis.get(sessionid, (err, result) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          console.error(err);
        } else {
          if (result === null) {
            const oldcookie = req.headers['cookie']
            if (typeof oldcookie !== 'undefined') {
              const oldsessionid = oldcookie.slice(2)
              var client = new pg.Client(conString);
              client.connect();
              // Will disrupt seeks in the unlikely event of a cookie theft
              client.query('DELETE FROM seeks WHERE sessionid = $1', [oldsessionid], (err, response) => {
                if (err) { console.log(err); }
                client.query('DELETE FROM connections WHERE sessionid = $1', [oldsessionid], (err, response) => {
                  if (err) { console.log(err); }
                  client.end()
                  resHeaders["Set-Cookie"] = "s=" + sessionid + '; Domain=.chessil.com; Max-Age=31536000; HttpOnly; Path=/; Secure; SameSite=Lax'
                  // Set it in Redis and keep going normally
                  const sessiondata = buildSessionData(req.headers['x-real-ip'], '0', 'n', 'en', Math.floor(Date.now() / 1000), 'u', useragent)
                  storeSessionData(sessionid, sessiondata, (err, result) => {
                    if (err) {
                      res.writeHead(500, { "Content-Type": "text/html" });
                      res.end();
                      console.error(err);
                    } else {
                      resHeaders["Location"] = req.url
                      res.writeHead(307, resHeaders);
                      res.end();
                    }
                  });
                })
              })
            } else {
              // There is no old cookie or sessionid to delete
              resHeaders["Set-Cookie"] = "s=" + sessionid + '; Domain=.chessil.com; Max-Age=31536000; HttpOnly; Path=/; Secure; SameSite=Lax'
              // Set it in Redis and keep going normally
              const sessiondata = buildSessionData(req.headers['x-real-ip'], '0', 'n', 'en', Math.floor(Date.now() / 1000), 'u', useragent)
              storeSessionData(sessionid, sessiondata, (err, result) => {
                if (err) {
                  res.writeHead(500, { "Content-Type": "text/html" });
                  res.end();
                  console.error(err);
                } else {
                  resHeaders["Location"] = req.url
                  res.writeHead(307, resHeaders);
                  res.end();
                }
              });
            }
          } else {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end();
          }
        }
      })
    }
  });
}

function routelanguage(filename, mime, ext, res, req, resHeaders, sessiondata) {
  resHeaders["Location"] = req.url.slice(3)
  if (resHeaders["Location"] === '') resHeaders["Location"] = '/'
  // Accepted set language. Update in session...
  sessiondata[3] = req.url.slice(1, 3)
  storeSessionData(req.headers['cookie'].slice(2), sessiondata, (err, result) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      console.error(err);
    } else {
      // Check if logged in as a user, and write preference in database if so.
      if (sessiondata[1] !== '0') {
        var client = new pg.Client(conString);
        client.connect();
        client.query('UPDATE users SET language = $1 WHERE id = $2', [sessiondata[3], sessiondata[1]], (err, response) => {
          client.end()
          res.writeHead(307, resHeaders);
          res.end();
        })
      } else {
        res.writeHead(307, resHeaders);
        res.end();
      }
    }
  });
}

function route(filename, mime, ext, res, req, resHeaders, sessiondata) {
  // Public endpoints are served here; internal-only endpoint is /websocket (restricted by auth + IP allowlist in wsauth).
  // Manage language part of url
  if (typeof languages[req.url.slice(1, 3)] !== 'undefined') {
    routelanguage(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  // User page
  if (req.url.slice(0, 3) === '/@/') {
    userpage(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url.slice(0, 5) === '/user') {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end();
    return
  }

  if (req.url.slice(0, 6) === '/game/') {
    gamepage(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url.slice(0, 5) === '/play') {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end();
    return
  }
  if (req.url === '/loggedin' && req.method === 'POST') {
    loggedin(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/admin/user' && req.method === 'POST') {
    adminUser(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url.slice(0, 6) === '/admin') {
    adminPage(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  // If the request is a POST for account creation (config nginx to rate limit this one for all languages)
  if (req.url === '/register' && req.method === 'POST') {
    applyAuthRateLimit('register', req, res, resHeaders, () => {
      registration(filename, mime, ext, res, req, resHeaders, sessiondata)
    })
    return
  }
  if (req.url === '/login' && req.method === 'POST') {
    applyAuthRateLimit('login', req, res, resHeaders, () => {
      login(filename, mime, ext, res, req, resHeaders, sessiondata)
    })
    return
  }
  if (req.url === '/logout' && req.method === 'POST') {
    applyAuthRateLimit('logout', req, res, resHeaders, () => {
      logout(filename, mime, ext, res, req, resHeaders, sessiondata)
    })
    return
  }
  if (req.url === '/language' && req.method === 'POST') {
    setlanguage(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/registered' && req.method === 'POST') {
    applyAuthRateLimit('registered', req, res, resHeaders, () => {
      checknewuser(filename, mime, ext, res, req, resHeaders, sessiondata)
    })
    return
  }
  if (req.url === '/search' && req.method === 'POST') {
    searchuser(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/lobby/create' && req.method === 'POST') {
    return handleLobbyCreate(filename, mime, ext, res, req, resHeaders, sessiondata);
  }
  if (req.url === '/easy/bots' && req.method === 'POST') {
    return handleEasyBots(filename, mime, ext, res, req, resHeaders, sessiondata);
  }
  if (req.url === '/easy/start' && req.method === 'POST') {
    return handleEasyStart(filename, mime, ext, res, req, resHeaders, sessiondata);
  }
  if (req.url === '/lobby/list' && req.method === 'POST') {
    return handleLobbyList(filename, mime, ext, res, req, resHeaders, sessiondata);
  }
  if (req.url === '/lobby/status' && req.method === 'POST') {
    return handleLobbyStatus(filename, mime, ext, res, req, resHeaders, sessiondata);
  }
  if (req.url.slice(0, 12) === '/lobby/watch' && req.method === 'GET') {
    return handleLobbyWatch(filename, mime, ext, res, req, resHeaders, sessiondata);
  }
  if (req.url === '/lobby/action' && req.method === 'POST') {
    return handleLobbyAction(filename, mime, ext, res, req, resHeaders, sessiondata);
  }
  if (req.url === '/light' && req.method === 'POST') {
    lightmode(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/dark' && req.method === 'POST') {
    darkmode(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/gamestate' && req.method === 'POST') {
    gamedata(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/gameinfo' && req.method === 'POST') {
    gameinfo(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/userinfo' && req.method === 'POST') {
    userinfo(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/ratings' && req.method === 'POST') {
    userratings(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/gamecount' && req.method === 'POST') {
    usergamecount(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/livegamecount' && req.method === 'POST') {
    userlivegamecount(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }
  if (req.url === '/gamehistory' && req.method === 'POST') {
    usergames(filename, mime, ext, res, req, resHeaders, sessiondata)
    return
  }

  serve(filename, mime, ext, res, req, resHeaders, sessiondata)
}


function userpage(filename, mime, ext, res, req, resHeaders, sessiondata) {
  // Select user from database
  if (usernameregex.test(req.url.slice(3)) === false) {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end();
    return
  }
  var client = new pg.Client(conString);
  client.connect();
  client.query('SELECT username FROM users WHERE canonical = $1', [req.url.slice(3).toLowerCase()], (err, response) => {
    if (response.rows.length === 1) {
      const template = '/user/index.html'
      if (ext === '.html') {
        // Serve the correct language and template
        filename = filename.slice(0, dir.length) + '/' + sessiondata[3] + template
      }
      fs.stat(filename, function (err, stats) {
        if (!err && !stats.isDirectory()) {
          /// Client cache all except some file types
          if (typeof mime.cache[ext] === 'undefined') {
            resHeaders["Cache-Control"] = 'max-age=9999';
          }
          if (typeof mime.data[ext] === 'undefined') {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end();
            return
          }
          resHeaders["Content-Type"] = mime.data[ext];
          fs.readFile(filename, function (err, data) {
            if (!err) {
              // gzip compression only to text
              if (typeof req.headers['accept-encoding'] !== 'undefined' && req.headers['accept-encoding'].indexOf('gzip') !== -1 && typeof mime.gzip[ext] !== 'undefined') {
                resHeaders["Content-Encoding"] = "gzip";
                res.writeHead(200, resHeaders);
                zlib.gzip(data, function (_, result) {
                  res.end(result);
                });
              } else {
                res.writeHead(200, resHeaders);
                res.end(data);
              }
            } else {
              res.writeHead(404, { "Content-Type": "text/html" });
              res.end();
              console.log(err);
            }
          });
        } else {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end();
        }
      });
      client.end()
    } else {
      // User not found 
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end();
      return
    }
  })
}
function gamepage(filename, mime, ext, res, req, resHeaders, sessiondata) {
  // Select game from database
  if (gameidregex.test(req.url.slice(6, 15)) === false) {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end();
    return
  }
  var client = new pg.Client(conString);
  client.connect();
  client.query('SELECT g.userid1, g.userid2, u1.username as username1, u2.username as username2, g.gameserver, g.rated, g.state, g.initialtime, g.increment, ROUND(g.rating1) as rating1, ROUND(g.rating2) as rating2, g.created, g.session1, g.session2 FROM games g LEFT JOIN users u1 ON u1.id = g.userid1 LEFT JOIN users u2 ON u2.id = g.userid2 WHERE g.gameid = $1', [req.url.slice(6, 15)], (err, response) => {
    if (response.rows.length === 1) {
      const template = '/play/index.html'
      if (ext === '.html') {
        // Serve the correct language and template
        filename = filename.slice(0, dir.length) + '/' + sessiondata[3] + template
      }
      fs.stat(filename, function (err, stats) {
        if (!err && !stats.isDirectory()) {
          /// Client cache all except some file types
          if (typeof mime.cache[ext] === 'undefined') {
            resHeaders["Cache-Control"] = 'max-age=9999';
          }
          if (typeof mime.data[ext] === 'undefined') {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end();
            return
          }
          resHeaders["Content-Type"] = mime.data[ext];
          fs.readFile(filename, function (err, data) {
            if (!err) {
              // gzip compression only to text
              if (typeof req.headers['accept-encoding'] !== 'undefined' && req.headers['accept-encoding'].indexOf('gzip') !== -1 && typeof mime.gzip[ext] !== 'undefined') {
                resHeaders["Content-Encoding"] = "gzip";
                res.writeHead(200, resHeaders);
                zlib.gzip(data, function (_, result) {
                  res.end(result);
                });
              } else {
                res.writeHead(200, resHeaders);
                res.end(data);
              }
            } else {
              res.writeHead(404, { "Content-Type": "text/html" });
              res.end();
              console.log(err);
            }
          });
        } else {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end();
        }
      });
      client.end()
    } else {
      // Game not found 
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end();
      return
    }
  })
}

function serve(filename, mime, ext, res, req, resHeaders, sessiondata) {
  if (ext === '.html') {
    // Serve the correct language
    filename = filename.slice(0, dir.length) + '/' + sessiondata[3] + filename.slice(dir.length)
  }
  fs.stat(filename, function (err, stats) {
    if (!err && !stats.isDirectory()) {
      /// Client cache all except some file types
      if (typeof mime.cache[ext] === 'undefined') {
        resHeaders["Cache-Control"] = 'max-age=9999';
      }
      if (typeof mime.data[ext] === 'undefined') {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end();
        return
      }
      resHeaders["Content-Type"] = mime.data[ext];
      fs.readFile(filename, function (err, data) {
        if (!err) {
          // gzip compression only to text
          if (typeof req.headers['accept-encoding'] !== 'undefined' && req.headers['accept-encoding'].indexOf('gzip') !== -1 && typeof mime.gzip[ext] !== 'undefined') {
            resHeaders["Content-Encoding"] = "gzip";
            res.writeHead(200, resHeaders);
            zlib.gzip(data, function (_, result) {
              res.end(result);
            });
          } else {
            res.writeHead(200, resHeaders);
            res.end(data);
          }
        } else {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end();
          console.log(err);
        }
      });
    } else {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end();
    }
  });
}

function registration(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', registercheck)
  function registercheck(chunk) {
    req.removeListener('data', registercheck);
    const postcontent = querystring.parse(chunk.toString())
    if (typeof postcontent === 'object') {
      logAuthEvent('register_attempt', req, { username: postcontent.username || '' });
      if (postcontent.nocheating === 'true' &&
        postcontent.treatotherswell === 'true' &&
        postcontent.nomultiaccount === 'true' &&
        postcontent.noattacks === 'true') {
        if (typeof postcontent.username !== 'undefined' &&
          typeof postcontent.password !== 'undefined'
          //&& typeof postcontent.email !== 'undefined'
        ) {
          if (postcontent.username.length > 2 && postcontent.username.length < 21 && usernameregex.test(postcontent.username)) {
            if (postcontent.password.length > 3 && postcontent.password.length < 256) {
              //if (postcontent.email.length > 5 && postcontent.email.length < 256 && postcontent.email.split('@').length > 1 && postcontent.email.split('.').length > 1) {
              // Check password strength
              if (zxcvbn(postcontent.password).score === 4) {
                // Check that it is not a disposable email, the list is kept refreshed and updated
                //delete require.cache['/home/ubuntu/blacklist.js']
                //var emailblacklist = require('/home/ubuntu/blacklist.js')
                //if (emailblacklist.blacklist[postcontent.email.split('@')[postcontent.email.split('@').length - 1]]) {
                //  // Blacklisted email found
                //  console.log('Blacklisted email found')
                //  serve(filename,mime,ext,res,req,resHeaders,sessiondata)
                //} else {
                // Email passed the checks
                // Check if username exists in database already
                var client = new pg.Client(conString);
                client.connect();
                client.query("SELECT id FROM connections WHERE sessionid = $1 AND updated < NOW() - INTERVAL '2 second'", [req.headers['cookie'].slice(2)], (err, rere) => {
                  if (err) {
                    res.writeHead(500, { "Content-Type": "text/html" });
                    res.end();
                    client.end();
                    console.log(err);
                    return
                  }
                  if (rere.rows.length === 0) {
                    // Makes sure a user opened the page, and connected to ws, and took 2 seconds or more to fill the form
                    // Bot and spam account creation protection number 1
                    logAuthEvent('register_reject', req, { reason: 'missing_ws_handshake', username: postcontent.username });
                    res.writeHead(401, { "Content-Type": "text/html" });
                    res.end();
                    client.end();
                    return
                  }
                  client.query("SELECT count(id) as c FROM users WHERE ip = $1 AND created > NOW() - INTERVAL '1 month'", [sessiondata[0]], (err, respo) => {
                    if (err) {
                      res.writeHead(500, { "Content-Type": "text/html" });
                      res.end();
                      client.end();
                      console.log(err);
                      return
                    }
                    if (respo.rows.length === 1) {
                      // If there are more than 70 accounts created from the same IP in the last month, deny further account creations
                      // Bot and spam account creation protection number 2
                      if (respo.rows[0].c > 70) {
                        logAuthEvent('register_reject', req, { reason: 'ip_quota', username: postcontent.username });
                        res.writeHead(401, { "Content-Type": "text/html" });
                        res.end();
                        client.end();
                        return
                      }
                      client.query('SELECT id FROM users WHERE canonical = $1', [postcontent.username.toLowerCase()], (err, response) => {
                        if (err) {
                          res.writeHead(500, { "Content-Type": "text/html" });
                          res.end();
                          client.end();
                          console.log(err);
                          return
                        }
                        if (response.rows.length === 0) {
                          // Username is available
                          try {
                            argon2.hash(postcontent.password).then(hashedpassword => {
                              const rating = '1500'; const ratings = [rating, rating, rating, rating, rating].join(',')
                              const deviation = '350'; const deviations = [deviation, deviation, deviation, deviation, deviation].join(',')
                              const volatility = '0.06'; const volatilities = [volatility, volatility, volatility, volatility, volatility].join(',')
                              client.query('INSERT INTO users (id,username,canonical,password,email,created,ip,theme,language,role,ultrabullet_rating,bullet_rating,blitz_rating,rapid_rating,classical_rating,ultrabullet_deviation,bullet_deviation,blitz_deviation,rapid_deviation,classical_deviation,ultrabullet_volatility,bullet_volatility,blitz_volatility,rapid_volatility,classical_volatility) VALUES (DEFAULT,$1,$2,$3,$4,NOW(),$5,$6,$7,$8,' + ratings + ',' + deviations + ',' + volatilities + ')', [postcontent.username, postcontent.username.toLowerCase(), hashedpassword,
                                //postcontent.email
                                null, sessiondata[0]
                                , sessiondata[2], sessiondata[3], 1], (err, respo) => {
                                  if (err) {
                                    // Account creation unsuccessful
                                    logAuthEvent('register_error', req, { reason: 'db_insert', username: postcontent.username });
                                    res.writeHead(500, { "Content-Type": "text/html" });
                                    res.end();
                                    console.log(err);
                                    client.end()
                                  } else {
                                    // Account creation successful, autoperform login and go to main page
                                    client.query('SELECT * FROM users WHERE canonical = $1', [postcontent.username.toLowerCase()], (err, response2) => {
                                      if (response2.rows.length === 1) {
                                        // Authenticated sessionid to userid, make new sessionid, expire old session, assign new sessionid which is linked to userid
                                        sessiondata[1] = response2.rows[0].id
                                        sessiondata[2] = response2.rows[0].theme
                                        sessiondata[3] = response2.rows[0].language
                                        sessiondata[5] = response2.rows[0].username
                                        logAuthEvent('register_success', req, { userid: sessiondata[1], username: sessiondata[5] });
                                        newsessionwithloginuser(filename, mime, ext, res, req, resHeaders, sessiondata)
                                        client.end()
                                        return
                                      } else {
                                        // Username not found 
                                        resHeaders["Location"] = domainname + '/login'
                                        res.writeHead(303, resHeaders);
                                        res.end();
                                        client.end()
                                        //serve(filename,mime,ext,res,req,resHeaders,sessiondata)
                                      }
                                    })
                                  }
                                })
                            });
                          } catch (err) {
                            res.writeHead(500, { "Content-Type": "text/html" });
                            res.end();
                            console.log('Password hashing error')
                            console.log(err)
                            return;
                          }

                        } else {
                          // Username already exists
                          logAuthEvent('register_reject', req, { reason: 'username_exists', username: postcontent.username });
                          console.log('Username already exists')
                          client.end()
                          serve(filename, mime, ext, res, req, resHeaders, sessiondata)
                        }
                      })
                    } else {
                      res.writeHead(500, { "Content-Type": "text/html" });
                      res.end();
                      client.end();
                      return
                    }
                  })
                })
                //}
              } else {
                res.writeHead(500, { "Content-Type": "text/html" });
                res.end();
                logAuthEvent('register_reject', req, { reason: 'weak_password', username: postcontent.username || '' });
                console.log('Low password strength, not normal user behaviour')
                return;
              }
              //} else {
              //  res.writeHead(500, {"Content-Type": "text/html"});
              //  res.end();
              //  console.log('Incorrect email length, not normal user behaviour')
              //  return;
              //}
            } else {
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end();
              logAuthEvent('register_reject', req, { reason: 'password_length', username: postcontent.username || '' });
              console.log('Incorrect password length, not normal user behaviour')
              return;
            }
          } else {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end();
            logAuthEvent('register_reject', req, { reason: 'username_invalid', username: postcontent.username || '' });
            console.log('Incorrect username length, or not conforming to the rules. not normal user behaviour')
            return;
          }
        } else {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          logAuthEvent('register_reject', req, { reason: 'missing_fields' });
          console.log('postcontent not fully defined, this is not normal user behaviour, but rather a custom packet send')
          return;
        }

      } else {
        // Could result in a web page message, you have to agree to the terms of service
        logAuthEvent('register_reject', req, { reason: 'agreements_missing', username: postcontent.username || '' });
        console.log('Not all agreements were true or defined')
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end();
        //serve(filename,mime,ext,res,req,resHeaders,sessiondata)
        return;
      }

    } else {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      logAuthEvent('register_error', req, { reason: 'parse_failed' });
      console.log('failed to parse registration POST')
      return;
    }
  }
}
function checknewuser(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', newusercheck)
  function newusercheck(chunk) {
    req.removeListener('data', newusercheck);
    const uname = chunk.toString()
    if (uname.length > 1 && uname.length < 21 && usernameregex.test(uname)) {
      // Check if username exists in database already
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT id FROM users WHERE canonical = $1', [uname.toLowerCase()], (err, response) => {
        if (response.rows.length === 0) {
          // Username is available
          logAuthEvent('register_check', req, { username: uname, available: true });
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end('false');
          client.end();
          return;
        } else {
          // Username already exists
          logAuthEvent('register_check', req, { username: uname, available: false });
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end('true');
          client.end();
          return;
        }
      })
    } else {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      logAuthEvent('register_check_reject', req, { reason: 'username_invalid', username: uname || '' });
      console.log('Incorrect username length, or not conforming to the rules. not normal user behaviour')
      return;
    }
  }
}
function searchuser(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', searchbyname)
  function searchbyname(chunk) {
    req.removeListener('data', searchbyname);
    const uname = chunk.toString()
    if (uname.length > 1 && uname.length < 21 && usernameregex.test(uname)) {
      // Check if username exists in database already
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT username FROM users WHERE canonical LIKE $1 ORDER BY (CASE WHEN canonical = $2 THEN 1 ELSE 2 END), canonical LIMIT 12', [(uname.toLowerCase()) + '%', uname.toLowerCase()], (err, response) => {
        const resp = []
        const rr = response.rows
        for (var i = rr.length; i--;) {
          resp.unshift(rr[i].username)
        }
        res.writeHead(200, { "Content-Type": "text/javascript" });
        res.end(JSON.stringify(resp));
        client.end();
        return;
      })
    } else {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      console.log('Incorrect username length, or not conforming to the rules. not normal user behaviour')
      return;
    }
  }
}

function newsessionwithloginuser(filename, mime, ext, res, req, resHeaders, sessiondata) {
  crypto.randomBytes(16, (err, buf) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      console.log(err);
    } else {
      var sessionid = buf.toString('hex')
      var useragent = sanitizeUserAgent(req.headers['user-agent'])
      // Ensure it is a new id, not in use
      redis.get(sessionid, (err, result) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          console.error(err);
        } else {
          if (result === null) {
            const oldcookie = req.headers['cookie']
            const oldsessionid = oldcookie.slice(2)
            var client = new pg.Client(conString);
            client.connect();
            client.query('DELETE FROM seeks WHERE sessionid = $1', [oldsessionid], (err, response) => {
              if (err) { console.log(err); }
              client.query('DELETE FROM connections WHERE sessionid = $1', [oldsessionid], (err, response) => {
                if (err) { console.log(err); }
                client.end()
                // Delete old cookie at server
                redis.del(oldsessionid, (err, result) => {
                  if (err) {
                    res.writeHead(500, { "Content-Type": "text/html" });
                    res.end();
                    console.error(err);
                  } else {
                    // Delete old cookie at client by overwriting new cookie
                    resHeaders["Set-Cookie"] = "s=" + sessionid + '; Domain=.chessil.com; Max-Age=31536000; HttpOnly; Path=/; Secure; SameSite=Lax'
                    // Register in Redis and keep going normally
                    const newdata = buildSessionData(req.headers['x-real-ip'], sessiondata[1], sessiondata[2], sessiondata[3], Math.floor(Date.now() / 1000), sessiondata[5], useragent)
                    storeSessionData(sessionid, newdata, (err, result) => {
                      if (err) {
                        res.writeHead(500, { "Content-Type": "text/html" });
                        res.end();
                        console.error(err);
                      } else {
                        resHeaders["Location"] = domainname
                        res.writeHead(303, resHeaders);
                        res.end();
                      }
                    });
                  }
                })
              })
            })
          } else {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end();
          }
        }
      })
    }
  });
}

function login(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', logincheck)
  function logincheck(chunk) {
    req.removeListener('data', logincheck);
    const postcontent = querystring.parse(chunk.toString())
    if (typeof postcontent === 'object') {
      logAuthEvent('login_attempt', req, { username: postcontent.username || '' });
      if (typeof postcontent.username !== 'undefined' && typeof postcontent.password !== 'undefined') {
        if (postcontent.username.length > 1 && postcontent.username.length < 21 && usernameregex.test(postcontent.username)) {
          if (postcontent.password.length > 3 && postcontent.password.length < 256) {
            // Check if username exists in database already
            var client = new pg.Client(conString);
            client.connect();
            client.query('SELECT * FROM users WHERE canonical = $1', [postcontent.username.toLowerCase()], (err, response) => {
              if (response.rows.length === 1) {
                try {
                  argon2.verify(response.rows[0].password, postcontent.password).then(passwordmatch => {
                    // Compare password hashes
                    if (passwordmatch === true) {
                      // Authenticated sessionid to userid, make new sessionid, expire old session, assign new sessionid which is linked to userid
                      sessiondata[1] = response.rows[0].id
                      sessiondata[2] = response.rows[0].theme
                      sessiondata[3] = response.rows[0].language
                      sessiondata[5] = response.rows[0].username
                      logAuthEvent('login_success', req, { userid: sessiondata[1], username: sessiondata[5] });
                      newsessionwithloginuser(filename, mime, ext, res, req, resHeaders, sessiondata)
                      client.end()
                      return
                    } else {
                      // Wrong password
                      logAuthEvent('login_failure', req, { reason: 'wrong_password', username: postcontent.username });
                      client.end()
                      serve(filename, mime, ext, res, req, resHeaders, sessiondata)
                    }
                  });
                } catch (err) {
                  res.writeHead(500, { "Content-Type": "text/html" });
                  res.end();
                  console.log('Password hashing error')
                  console.log(err)
                  return;
                }
              } else {
                // Username not found 
                logAuthEvent('login_failure', req, { reason: 'username_not_found', username: postcontent.username });
                client.end()
                serve(filename, mime, ext, res, req, resHeaders, sessiondata)
              }
            })
          } else {
            logAuthEvent('login_reject', req, { reason: 'password_length', username: postcontent.username });
            serve(filename, mime, ext, res, req, resHeaders, sessiondata)
            // console.log('Incorrect password length, not normal user behaviour')
            return;
          }
        } else {
          logAuthEvent('login_reject', req, { reason: 'username_invalid', username: postcontent.username });
          serve(filename, mime, ext, res, req, resHeaders, sessiondata)
          //console.log('Incorrect username length, not normal user behaviour')
          return;
        }
      } else {
        logAuthEvent('login_reject', req, { reason: 'missing_fields' });
        serve(filename, mime, ext, res, req, resHeaders, sessiondata)
        //console.log('Username or password missing')
        return;
      }
    } else {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      logAuthEvent('login_error', req, { reason: 'parse_failed' });
      console.log('postcontent not fully defined, this is not normal user behaviour, but rather a custom packet send')
      return;
    }
  }
}

function logout(filename, mime, ext, res, req, resHeaders, sessiondata) {
  logAuthEvent('logout_attempt', req, { userid: sessiondata[1] || '0', username: sessiondata[5] || 'u' });
  crypto.randomBytes(16, (err, buf) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      console.log(err);
    } else {
      var sessionid = buf.toString('hex')
      var useragent = sanitizeUserAgent(req.headers['user-agent'])
      // Ensure it is a new id, not in use
      redis.get(sessionid, (err, result) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          console.error(err);
        } else {
          if (result === null) {
            const oldcookie = req.headers['cookie']
            const oldsessionid = oldcookie.slice(2)
            var client = new pg.Client(conString);
            client.connect();
            client.query('DELETE FROM seeks WHERE sessionid = $1', [oldsessionid], (err, response) => {
              if (err) { console.log(err); }
              client.query('DELETE FROM connections WHERE sessionid = $1', [oldsessionid], (err, response) => {
                if (err) { console.log(err); }
                client.end()
                // Delete old cookie at server
                redis.del(oldsessionid, (err, result) => {
                  if (err) {
                    res.writeHead(500, { "Content-Type": "text/html" });
                    res.end();
                    console.error(err);
                  } else {
                    // Delete old cookie at client by overwriting new cookie
                    resHeaders["Set-Cookie"] = "s=" + sessionid + '; Domain=.chessil.com; Max-Age=31536000; HttpOnly; Path=/; Secure; SameSite=Lax'
                    // Register logged out cookie in Redis
                    const newdata = buildSessionData(req.headers['x-real-ip'], '0', sessiondata[2], sessiondata[3], Math.floor(Date.now() / 1000), 'u', useragent)
                    storeSessionData(sessionid, newdata, (err, result) => {
                      if (err) {
                        res.writeHead(500, { "Content-Type": "text/html" });
                        res.end();
                        console.error(err);
                      } else {
                        resHeaders["Location"] = domainname
                        logAuthEvent('logout_success', req, { userid: sessiondata[1] || '0', username: sessiondata[5] || 'u' });
                        res.writeHead(303, resHeaders);
                        res.end();
                      }
                    });
                  }
                })
              })
            })
          } else {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end();
          }
        }
      })
    }
  });
}

function loggedin(filename, mime, ext, res, req, resHeaders, sessiondata) {
  if (sessiondata.userid !== '0') {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end('1');
  } else {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end('0');
  }
}

function adminPage(filename, mime, ext, res, req, resHeaders, sessiondata) {
  if (req.method !== 'GET') {
    res.writeHead(405, { "Content-Type": "text/html" })
    res.end()
    return
  }
  requireAdmin(sessiondata, req, res, 'html', () => {
    const adminSession = setSessionProps(sessiondata.slice())
    adminSession[3] = 'en'
    adminSession.lang = 'en'
    serve(filename, mime, ext, res, req, resHeaders, adminSession)
  })
}

function adminUser(filename, mime, ext, res, req, resHeaders, sessiondata) {
  requireAdmin(sessiondata, req, res, 'json', () => {
    let body = ''
    req.on('data', chunk => {
      body += chunk
      if (body.length > 2000000) {
        res.writeHead(413, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: 'payload_too_large' }))
        req.destroy()
      }
    })
    req.on('end', () => {
      let payload
      if (body.trim() === '') {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: 'missing_payload' }))
        return
      }
      try {
        payload = JSON.parse(body)
      } catch (err) {
        payload = querystring.parse(body)
      }
      const action = payload.action
      const identifier = payload.identifier === 'username' ? 'username' : 'id'
      const target = payload.target
      let data = payload.data
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: 'invalid_data_json' }))
          return
        }
      }
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: 'invalid_data' }))
        return
      }
      if (action !== 'create' && action !== 'update') {
        res.writeHead(400, { "Content-Type": "application/json" })
        res.end(JSON.stringify({ error: 'invalid_action' }))
        return
      }
      if (data.username && !data.canonical) {
        data.canonical = String(data.username).toLowerCase()
      }
      if (typeof data.role !== 'undefined') {
        data.role = Number(data.role)
      }
      const applyChanges = () => {
        const keys = Object.keys(data)
        if (keys.length === 0) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: 'empty_data' }))
          return
        }
        var client = new pg.Client(conString)
        client.connect()
        client.query(
          "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'",
          [],
          (err, response) => {
            if (err) {
              client.end()
              res.writeHead(500, { "Content-Type": "application/json" })
              res.end(JSON.stringify({ error: 'db_error' }))
              return
            }
            const columns = response.rows
            const columnSet = new Set(columns.map(row => row.column_name))
            const invalid = keys.filter(key => !columnSet.has(key))
            if (invalid.length) {
              client.end()
              res.writeHead(400, { "Content-Type": "application/json" })
              res.end(JSON.stringify({ error: 'unknown_columns', columns: invalid }))
              return
            }
            if (action === 'create') {
              const missingRequired = columns
                .filter(row => row.is_nullable === 'NO' && row.column_default === null)
                .map(row => row.column_name)
                .filter(col => !Object.prototype.hasOwnProperty.call(data, col))
              if (missingRequired.length) {
                client.end()
                res.writeHead(400, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ error: 'missing_required_columns', columns: missingRequired }))
                return
              }
              const values = keys.map(key => data[key])
              const placeholders = keys.map((_, idx) => '$' + (idx + 1))
              const sql = 'INSERT INTO users (' + keys.join(',') + ') VALUES (' + placeholders.join(',') + ') RETURNING id'
              client.query(sql, values, (err2, response2) => {
                client.end()
                if (err2) {
                  res.writeHead(500, { "Content-Type": "application/json" })
                  res.end(JSON.stringify({ error: 'db_insert_error' }))
                  return
                }
                res.writeHead(200, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ ok: true, id: response2.rows[0] ? response2.rows[0].id : null }))
              })
              return
            }
            if (action === 'update') {
              if (!target) {
                client.end()
                res.writeHead(400, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ error: 'missing_target' }))
                return
              }
              const values = keys.map(key => data[key])
              let whereValue = target
              let whereColumn = 'id'
              if (identifier === 'username') {
                whereColumn = 'canonical'
                whereValue = String(target).toLowerCase()
              }
              values.push(whereValue)
              const setSql = keys.map((key, idx) => key + ' = $' + (idx + 1)).join(',')
              const sql = 'UPDATE users SET ' + setSql + ' WHERE ' + whereColumn + ' = $' + (keys.length + 1) + ' RETURNING id'
              client.query(sql, values, (err2, response2) => {
                client.end()
                if (err2) {
                  res.writeHead(500, { "Content-Type": "application/json" })
                  res.end(JSON.stringify({ error: 'db_update_error' }))
                  return
                }
                if (response2.rows.length === 0) {
                  res.writeHead(404, { "Content-Type": "application/json" })
                  res.end(JSON.stringify({ error: 'user_not_found' }))
                  return
                }
                res.writeHead(200, { "Content-Type": "application/json" })
                res.end(JSON.stringify({ ok: true, id: response2.rows[0].id }))
              })
              return
            }
          }
        )
      }
      if (typeof data.password !== 'undefined') {
        if (typeof data.password !== 'string' || data.password.length < 4) {
          res.writeHead(400, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: 'password_too_short' }))
          return
        }
        try {
          argon2.hash(data.password).then(hashedpassword => {
            data.password = hashedpassword
            applyChanges()
          }).catch(() => {
            res.writeHead(500, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: 'password_hash_error' }))
          })
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: 'password_hash_error' }))
        }
        return
      }
      applyChanges()
    })
  })
}

function setlanguage(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', setlang)
  function setlang(chunk) {
    req.removeListener('data', setlang);
    const postcontent = querystring.parse(chunk.toString())
    if (typeof postcontent === 'object') {
      if (typeof postcontent.lang !== 'undefined' && postcontent.lang.length === 2 && typeof languages[postcontent.lang] !== 'undefined') {
        // Check that the referer is from https://chessil.com
        if (typeof req.headers.referer !== 'undefined' && req.headers.referer.slice(0, domainname.length) === domainname) {
          resHeaders["Location"] = req.headers.referer.slice(domainname.length)
          // Accepted set language. Update in session...
          sessiondata[3] = postcontent.lang
          storeSessionData(req.headers['cookie'].slice(2), sessiondata, (err, result) => {
            if (err) {
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end();
              console.error(err);
            } else {
              // Check if logged in as a user, and write preference in database if so.
              if (sessiondata[1] !== '0') {
                var client = new pg.Client(conString);
                client.connect();
                client.query('UPDATE users SET language = $1 WHERE id = $2', [sessiondata[3], sessiondata[1]], (err, response) => {
                  client.end()
                  res.writeHead(303, resHeaders);
                  res.end();
                })
              } else {
                res.writeHead(303, resHeaders);
                res.end();
              }
            }
          });
        } else {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          console.log('Strange referer or non existent')
          return;
        }
      } else {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end();
        console.log('postcontent without lang or erratic length, or trying an undefined language... this is not normal user behaviour, but rather a custom packet send')
        return;
      }
    } else {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      console.log('postcontent not fully defined, this is not normal user behaviour, but rather a custom packet send')
      return;
    }
  }
}

function wsauth(filename, mime, ext, res, req, resHeaders, sessiondata) {
  if (typeof req.headers['authorization'] === 'undefined' || req.headers['authorization'] !== websocketpassword || typeof websocketserver[req.headers['x-real-ip']] === 'undefined') {
    res.writeHead(401, { "Content-Type": "text/html" });
    res.end();
    return;
  }
  req.on('data', wsdata)
  function wsdata(chunk) {
    req.removeListener('data', wsdata);
    const postcontent = chunk.toString()

    if (typeof postcontent === 'string' && postcontent.length === 34 && postcontent.slice(0, 2) === 's=') {
      const sessionid = postcontent.slice(2)
      redis.get(sessionid, (err, result) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          console.error(err);
        } else {
          if (result === null) {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end();
          } else {
            const parsed = parseSessionData(result)
            if (!parsed) {
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end();
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(serializeSessionData(parsed));
          }
        }
      })
    } else {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      return;
    }
  }
}
// tcs is used for validating seek insertion values
const tcs = {}
const validtimes = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]
const validincrs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40, 45, 60, 90, 120, 150, 180]
const validmodes = ['r', 'u']
const validcolours = ['r', 'w', 'b']
for (var i = validtimes.length; i--;) {
  for (var j = validincrs.length; j--;) {
    if (validtimes[i] !== 0 || validincrs[j] !== 0) {
      for (var k = validmodes.length; k--;) {
        for (var l = validcolours.length; l--;) {
          tcs[validtimes[i] + '+' + validincrs[j] + validmodes[k] + validcolours[l]] = 1
        }
      }
    }
  }
}
function usergames(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', getusergames)
  function getusergames(chunk) {
    req.removeListener('data', getusergames);
    const postcontent = querystring.parse(chunk.toString())
    if (typeof postcontent === 'object' && (typeof postcontent.u === 'string' && parseInt(postcontent.p) > 0) && typeof { all: 1, rated: 1, win: 1, loss: 1, draw: 1, playing: 1 }[postcontent.q] !== 'undefined') {
      if (usernameregex.test(postcontent.u) !== false) {
        // User input validated
        var client = new pg.Client(conString);
        client.connect();
        client.query('SELECT g.gameid, g.gameserver, g.moves, g.rated, g.state, g.result, g.initialtime, g.increment, ROUND(g.rating1) as r1, ROUND(g.rating2) as r2, ROUND(g.ratingdiff1) as d1, ROUND(g.ratingdiff2) as d2, g.created, w.username as w, b.username as b FROM games g LEFT JOIN users w ON w.id = g.userid1 LEFT JOIN users b ON b.id = g.userid2 WHERE ' + { all: '', rated: 'g.rated is true AND ', win: '((w.canonical = $1 AND g.result = true) OR (b.canonical = $1 AND g.result = false)) AND ', loss: '((w.canonical = $1 AND g.result = false) OR (b.canonical = $1 AND g.result = true)) AND ', draw: 'g.state != 0 AND g.result is null AND ', playing: 'g.state = 0 AND ' }[postcontent.q] + '(w.canonical = $1 OR b.canonical = $1) ORDER BY g.created DESC LIMIT 7 OFFSET $2', [postcontent.u.toLowerCase(), 7 * postcontent.p - 7], (err, response) => {
          if (err) {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end();
            client.end();
            console.log(err);
            return
          }
          const games = []
          for (var i = response.rows.length; i--;) {
            const re = response.rows[i]
            games.unshift({ i: re.gameid, s: re.gameserver, m: re.moves, r: re.rated, f: re.state, e: re.result, t: re.initialtime, n: re.increment, d: re.created, w: re.w, b: re.b, v: re.r1, x: re.r2, y: re.d1, z: re.d2 })
          }
          res.writeHead(200, { "Content-Type": "text/javascript" });
          res.end(JSON.stringify(games))
          client.end()
        })
      } else {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end();
        return;
      }
    } else {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end();
      return;
    }
  }
}
function usergamecount(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', getusergamecount)
  function getusergamecount(chunk) {
    req.removeListener('data', getusergamecount);
    //     xhr.send('u='+userid+'&t='+tc+'&w='+wdl+'&r='+rated+'&f='+finished)
    const postcontent = querystring.parse(chunk.toString())
    if (typeof postcontent === 'object'
      && typeof postcontent.u === 'string'
      && typeof { all: 1, ultrabullet: 1, bullet: 1, blitz: 1, rapid: 1, classical: 1 }[postcontent.t] !== 'undefined'
      && typeof { all: 1, win: 1, loss: 1, draw: 1 }[postcontent.w] !== 'undefined'
      && typeof { all: 1, true: 1, false: 1 }[postcontent.r] !== 'undefined'
      && typeof { all: 1, true: 1, false: 1 }[postcontent.f] !== 'undefined'
    ) {
      if (usernameregex.test(postcontent.u) !== false) {
        // User input validated
        var client = new pg.Client(conString);
        client.connect();
        client.query('SELECT count(g.id) as n FROM games g LEFT JOIN users w ON w.id = g.userid1 LEFT JOIN users b ON b.id = g.userid2 WHERE '
          + { all: '', true: 'g.state != 0 AND ', false: 'g.state = 0 AND ' }[postcontent.f]
          + { all: '', true: 'g.rated is true AND ', false: 'g.rated is false AND ' }[postcontent.r]
          + {
            all: '',
            win: '((w.canonical = $1 AND g.result = true) OR (b.canonical = $1 AND g.result = false)) AND ',
            loss: '((w.canonical = $1 AND g.result = false) OR (b.canonical = $1 AND g.result = true)) AND ',
            draw: 'g.state != 0 AND g.result is null AND '
          }[postcontent.w]
          + {
            all: '',
            ultrabullet: 'g.initialtime*60+g.increment*40 <= 15 AND ',
            bullet: 'g.initialtime*60+g.increment*40 <= 180 AND g.initialtime*60+g.increment*40 > 15 AND ',
            blitz: 'g.initialtime*60+g.increment*40 <= 480 AND g.initialtime*60+g.increment*40 > 180 AND ',
            rapid: 'g.initialtime*60+g.increment*40 <= 1500 AND g.initialtime*60+g.increment*40 > 480 AND ',
            classical: 'g.initialtime*60+g.increment*40 > 1500 AND '
          }[postcontent.t]
          + '(w.canonical = $1 OR b.canonical = $1)', [postcontent.u.toLowerCase()], (err, response) => {
            if (err) {
              res.writeHead(500, { "Content-Type": "text/html" });
              res.end();
              client.end();
              console.log(err);
              return
            }
            if (response.rows.length === 1) {
              const re = response.rows[0]
              res.writeHead(200, { "Content-Type": "text/javascript" });
              res.end(re.n)
            }
            client.end()
          })
      } else {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end();
        return;
      }
    } else {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end();
      return;
    }
  }
}
function userlivegamecount(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', getusergamecount)
  function getusergamecount(chunk) {
    req.removeListener('data', getusergamecount);
    const postcontent = chunk.toString();
    if (usernameregex.test(postcontent) !== false) {
      // User input validated
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT count(g.id) as n FROM games g LEFT JOIN users w ON w.id = g.userid1 LEFT JOIN users b ON b.id = g.userid2 WHERE g.state = 0 AND (w.canonical = $1 OR b.canonical = $1)', [postcontent.toLowerCase()], (err, response) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          client.end();
          console.log(err);
          return
        }
        if (response.rows.length === 1) {
          const re = response.rows[0]
          res.writeHead(200, { "Content-Type": "text/javascript" });
          res.end(re.n)
        }
        client.end()
      })
    } else {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end();
      return;
    }
  }
}
function userinfo(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', getuserinfo)
  function getuserinfo(chunk) {
    req.removeListener('data', getuserinfo);
    const postcontent = chunk.toString();
    if (usernameregex.test(postcontent) !== false) {
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT username FROM users WHERE canonical = $1', [postcontent.toLowerCase()], (err, response) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          client.end();
          console.log(err);
          return
        }
        if (response.rows.length === 1) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ username: response.rows[0].username }))
        } else {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end();
        }
        client.end()
      })
    } else {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end();
      return;
    }
  }
}
function userratings(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', ff)
  function ff(chunk) {
    req.removeListener('data', ff);
    const postcontent = chunk.toString();
    if (usernameregex.test(postcontent) !== false) {
      // User input validated
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT ROUND(ultrabullet_rating) as a, ROUND(bullet_rating) as b, ROUND(blitz_rating) as c, ROUND(rapid_rating) as d, ROUND(classical_rating) as e FROM users WHERE canonical = $1', [postcontent.toLowerCase()], (err, response) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          client.end();
          console.log(err);
          return
        }
        if (response.rows.length === 1) {
          const re = response.rows[0]
          res.writeHead(200, { "Content-Type": "text/javascript" });
          res.end(JSON.stringify({ a: re.a, b: re.b, c: re.c, d: re.d, e: re.e }))
        }
        client.end()
      })
    } else {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end();
      return;
    }
  }
}
function gameinfo(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', getgameinfo)
  function getgameinfo(chunk) {
    req.removeListener('data', getgameinfo);
    const gameid = chunk.toString();
    if (gameidregex.test(gameid) !== false) {
      var client = new pg.Client(conString);
      client.connect();
      client.query(
        'SELECT g.userid1, g.userid2, u1.username as username1, u2.username as username2, g.gameserver, g.rated, g.state, g.initialtime, g.increment, ROUND(g.rating1) as rating1, ROUND(g.rating2) as rating2, g.sessionid1, g.sessionid2, g.color1, g.color2 FROM games g LEFT JOIN users u1 ON u1.id = g.userid1 LEFT JOIN users u2 ON u2.id = g.userid2 WHERE g.gameid = $1',
        [gameid],
        (err, response) => {
          if (err) {
            res.writeHead(500, { "Content-Type": "text/html" });
            res.end();
            client.end();
            console.log(err);
            return
          }
          if (response.rows.length === 1) {
            const row = response.rows[0]
            const botLabel = { en: 'Bot', es: 'Bot', zh: '\u673a\u5668\u4eba' }[sessiondata[3]] || 'Bot'
            const username1 = row.username1
            const username2 = (row.sessionid2 && row.sessionid2.indexOf('bot:') === 0) ? botLabel : row.username2
            const sessionId = req.headers['cookie'] ? req.headers['cookie'].slice(2) : ''
            const userId = String(sessiondata[1] || '0')
            const color1Side = row.color1 === 'black' ? 'b' : (row.color1 === 'white' ? 'w' : '')
            const color2Side = row.color2 === 'black' ? 'b' : (row.color2 === 'white' ? 'w' : '')
            let side = 's'

            if (userId !== '0' && String(row.userid1 || '0') === userId && color1Side) {
              side = color1Side
            } else if (userId !== '0' && String(row.userid2 || '0') === userId && color2Side) {
              side = color2Side
            } else if (sessionId && row.sessionid1 === sessionId && color1Side) {
              side = color1Side
            } else if (sessionId && row.sessionid2 === sessionId && color2Side) {
              side = color2Side
            }

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              username1: username1,
              username2: username2,
              rating1: row.rating1,
              rating2: row.rating2,
              state: row.state,
              initialtime: row.initialtime,
              increment: row.increment,
              rated: row.rated,
              gameserver: row.gameserver,
              side: side
            }))
          } else {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end();
          }
          client.end()
        }
      )
    } else {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end();
      return;
    }
  }
}
function gamedata(filename, mime, ext, res, req, resHeaders, sessiondata) {
  req.on('data', getgameinfo)
  function getgameinfo(chunk) {
    req.removeListener('data', getgameinfo);
    const postcontent = chunk.toString();
    if (gameidregex.test(postcontent) !== false) {
      // User input validated
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT id, gameid, moves, clock, events, eventsclock, result, ROUND(ratingdiff1) as ratingdiff1, ROUND(ratingdiff2) as ratingdiff2, clock1, clock2 FROM games WHERE gameid = $1', [postcontent], (err, response) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/html" });
          res.end();
          client.end();
          console.log(err);
          return
        }
        if (response.rows.length === 1) {
          const re = response.rows[0]
          res.writeHead(200, { "Content-Type": "text/javascript" });
          res.end(JSON.stringify({ m: re.moves, c: re.clock, e: re.events, d: re.eventsclock, r: re.result, w: re.ratingdiff1, b: re.ratingdiff2, t: re.clock1, u: re.clock2 }))
        }
        client.end()
      })
    } else {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end();
      return;
    }
  }
}

function lightmode(filename, mime, ext, res, req, resHeaders, sessiondata) {
  sessiondata[2] = 'l'
  storeSessionData(req.headers['cookie'].slice(2), sessiondata, (err, result) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      console.error(err);
    } else {
      // Check if logged in as a user, and write preference in database if so.
      if (sessiondata[1] !== '0') {
        var client = new pg.Client(conString);
        client.connect();
        client.query('UPDATE users SET theme = $1 WHERE id = $2', [sessiondata[2], sessiondata[1]], (err, response) => {
          client.end()
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end();
        })
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end();
      }
    }
  });
}
function darkmode(filename, mime, ext, res, req, resHeaders, sessiondata) {
  sessiondata[2] = 'd'
  storeSessionData(req.headers['cookie'].slice(2), sessiondata, (err, result) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end();
      console.error(err);
    } else {
      // Check if logged in as a user, and write preference in database if so.
      if (sessiondata[1] !== '0') {
        var client = new pg.Client(conString);
        client.connect();
        client.query('UPDATE users SET theme = $1 WHERE id = $2', [sessiondata[2], sessiondata[1]], (err, response) => {
          client.end()
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end();
        })
      } else {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end();
      }
    }
  });
}

function randomString(length, chars) {
  var result = '';
  for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
  return result;
}

function notifyLobbyWatchers(gameid) {
  const watchers = lobbyWatchers.get(gameid);
  if (!watchers || watchers.size === 0) return;
  const payload = 'data: ' + JSON.stringify({ started: true, gameid: gameid }) + '\n\n';
  watchers.forEach((entry) => {
    entry.res.write(payload);
    entry.res.end();
    clearInterval(entry.keepalive);
  });
  lobbyWatchers.delete(gameid);
}

function parseTimeControl(timecontrol) {
  if (typeof timecontrol !== 'string') {
    return { minutes: 5, increment: 0, raw: '5+0' };
  }
  var parts = timecontrol.split('+');
  if (parts.length !== 2) {
    return { minutes: 5, increment: 0, raw: '5+0' };
  }
  var minutes = parseInt(parts[0], 10);
  var increment = parseInt(parts[1], 10);
  if (!Number.isFinite(minutes) || minutes < 0) {
    minutes = 5;
  }
  if (!Number.isFinite(increment) || increment < 0) {
    increment = 0;
  }
  return { minutes: minutes, increment: increment, raw: timecontrol };
}

function normalizeTimeControl(timecontrol) {
  const allowedTimes = ['1+0', '3+0', '3+2', '5+0', '10+0', '15+10'];
  if (allowedTimes.includes(timecontrol)) return timecontrol;
  return '5+0';
}

function ratingModeForTime(minutes, increment) {
  var total = minutes * 60 + increment * 40;
  if (total <= 15) return 'ultrabullet';
  if (total <= 180) return 'bullet';
  if (total <= 480) return 'blitz';
  if (total <= 1500) return 'rapid';
  return 'classical';
}

function getPlayerIdentity(userid, sessionid) {
  if (userid && userid !== '0') return String(userid);
  return String(sessionid);
}

function assignColorsForGame(game) {
  var color1 = game.color1;
  var color2 = game.color2;
  if (game.randomcolor || (color1 !== 'white' && color1 !== 'black')) {
    if (Math.random() < 0.5) {
      color1 = 'white';
      color2 = 'black';
    } else {
      color1 = 'black';
      color2 = 'white';
    }
  } else {
    color2 = color1 === 'white' ? 'black' : 'white';
  }
  return { color1: color1, color2: color2, whiteIsPlayer1: color1 === 'white' };
}

function selectUserRatings(client, userIds, mode, callback) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    callback(null, {});
    return;
  }
  const ratingField = mode + '_rating';
  const deviationField = mode + '_deviation';
  const volatilityField = mode + '_volatility';
  const sql = 'SELECT id, ' + ratingField + ' AS rating, ' + deviationField + ' AS deviation, ' + volatilityField + ' AS volatility FROM users WHERE id = ANY($1)';
  client.query(sql, [userIds], (err, result) => {
    if (err) return callback(err);
    const map = {};
    for (var i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      map[String(row.id)] = {
        rating: Number(row.rating),
        deviation: Number(row.deviation),
        volatility: Number(row.volatility)
      };
    }
    callback(null, map);
  });
}

function startGameOnServer(payload, callback) {
  const headers = {
    'authorization': gameServerAuthToken,
    'x-real-ip': gameServerAuthIp,
    'gn': payload.gameid,
    'w': payload.whitePlayerId,
    'b': payload.blackPlayerId,
    'wt': String(payload.time.minutes),
    'bt': String(payload.time.minutes),
    'wi': String(payload.time.increment),
    'bi': String(payload.time.increment),
    'wr': String(payload.whiteRatings.rating),
    'br': String(payload.blackRatings.rating),
    'wd': String(payload.whiteRatings.deviation),
    'bd': String(payload.blackRatings.deviation),
    'wv': String(payload.whiteRatings.volatility),
    'bv': String(payload.blackRatings.volatility)
  };
  if (payload.bot && payload.bot.side) {
    headers['bs'] = payload.bot.side;
  }
  if (payload.bot && payload.bot.elo) {
    headers['be'] = String(payload.bot.elo);
  }
  const req = https.request(
    {
      hostname: gameServerHost,
      path: '/ng',
      method: 'POST',
      port: 443,
      headers: headers
    },
    (re) => {
      re.resume();
      if (re.statusCode === 200) {
        callback(null);
        return;
      }
      callback(new Error('game server /ng failed: ' + re.statusCode));
    }
  );
  req.on('error', (err) => callback(err));
  req.end();
}

function validateFilters(filters) {
  const safe = {};

  // rated: must be boolean or null
  if (filters.rated === '1' || filters.rated === true) safe.rated = true;
  else if (filters.rated === '0' || filters.rated === false) safe.rated = false;
  else safe.rated = null;

  // eloMin/eloMax: must be numbers within reasonable range
  safe.eloMin = (Number.isFinite(Number(filters.eloMin)) && filters.eloMin >= 0 && filters.eloMin <= 4000)
    ? Number(filters.eloMin) : null;
  safe.eloMax = (Number.isFinite(Number(filters.eloMax)) && filters.eloMax >= 0 && filters.eloMax <= 4000)
    ? Number(filters.eloMax) : null;

  // username: only allow safe characters (letters, numbers, underscores)
  if (typeof filters.username === 'string' && /^[a-zA-Z0-9_]{1,30}$/.test(filters.username)) {
    safe.username = filters.username;
  } else {
    safe.username = null;
  }

  // color: must be one of the expected values
  if (['white', 'black', 'random'].includes(filters.color)) {
    safe.color = filters.color;
  } else {
    safe.color = null;
  }

  // time: allow only whitelisted formats
  const allowedTimes = ['1+0', '3+0', '3+2', '5+0', '10+0', '15+10']; // you decide
  safe.time = allowedTimes.includes(filters.time) ? filters.time : null;

  // mode: play / watch / finished
  if (['play', 'watch', 'finished'].includes(filters.mode)) {
    safe.mode = filters.mode;
  } else {
    safe.mode = null;
  }

  // timestamps: must be valid ISO dates
  function parseDate(d) {
    if (!d) return null;
    const t = new Date(d);
    return isNaN(t.getTime()) ? null : t.toISOString();
  }
  safe.createdFrom = parseDate(filters.createdFrom);
  safe.createdTo = parseDate(filters.createdTo);
  safe.startedFrom = parseDate(filters.startedFrom);
  safe.startedTo = parseDate(filters.startedTo);
  safe.finishedFrom = parseDate(filters.finishedFrom);
  safe.finishedTo = parseDate(filters.finishedTo);

  return safe;
}

function handleLobbyList(filename, mime, ext, res, req, resHeaders, sessiondata) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let rawFilters;
    try {
      rawFilters = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    const filters = validateFilters(rawFilters);

    const values = [
      typeof filters.rated === 'boolean' ? filters.rated : null,
      filters.eloMin ? Number(filters.eloMin) : null,
      filters.eloMax ? Number(filters.eloMax) : null,
      filters.username || null,
      filters.color || null,
      filters.time || null,
      filters.mode || null,
      filters.createdFrom || null,
      filters.createdTo || null,
      filters.startedFrom || null,
      filters.startedTo || null,
      filters.finishedFrom || null,
      filters.finishedTo || null,
      100
    ];

    const sql = `
      SELECT g.id, g.gameid, g.rated, g.timecontrol1, g.randomcolor,
             g.color1, g.color2, g.created, g.started, g.finished,
             u1.id AS userid1, u1.username AS username1, u1.rating AS rating1,
             u2.id AS userid2, u2.username AS username2, u2.rating AS rating2
      FROM games g
      JOIN users u1 ON g.userid1 = u1.id
      LEFT JOIN users u2 ON g.userid2 = u2.id
      WHERE 1=1
        AND ($1::boolean IS NULL OR g.rated = $1)
        AND ($2::numeric IS NULL OR u1.rating >= $2)
        AND ($3::numeric IS NULL OR u1.rating <= $3)
        AND ($4::text IS NULL OR u1.username ILIKE '%' || $4 || '%' OR u2.username ILIKE '%' || $4 || '%')
        AND (
          $5::text IS NULL
          OR ($5 = 'random' AND g.randomcolor = TRUE)
          OR ($5 IN ('white','black') AND g.randomcolor = FALSE AND g.color1 = $5)
        )
        AND ($6::text IS NULL OR g.timecontrol1 = $6)
        AND (
          $7::text IS NULL
          OR ($7 = 'play'     AND g.started IS NULL AND g.finished IS NULL)
          OR ($7 = 'watch'    AND g.started IS NOT NULL AND g.finished IS NULL)
          OR ($7 = 'finished' AND g.finished IS NOT NULL)
        )
        AND ($8::timestamptz IS NULL OR g.created  >= $8)
        AND ($9::timestamptz IS NULL OR g.created  <= $9)
        AND ($10::timestamptz IS NULL OR g.started >= $10)
        AND ($11::timestamptz IS NULL OR g.started <= $11)
        AND ($12::timestamptz IS NULL OR g.finished >= $12)
        AND ($13::timestamptz IS NULL OR g.finished <= $13)
      ORDER BY g.created DESC
      LIMIT $14;
    `;
    var client = new pg.Client(conString);
    client.connect();
    client.query(sql, values, (err, result) => {
      if (err) {
        console.error('lobby/list error', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        client.end()
        return res.end(JSON.stringify({ error: 'Internal error' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.rows));
      client.end()
    });
  });
}

function handleLobbyStatus(filename, mime, ext, res, req, resHeaders, sessiondata) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
    if (!data || typeof data.gameid !== 'string' || gameidregex.test(data.gameid) === false) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid gameid' }));
    }
    var client = new pg.Client(conString);
    client.connect();
    client.query('SELECT started, finished FROM games WHERE gameid = $1', [data.gameid], (err, result) => {
      if (err) {
        console.error('lobby/status error', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        client.end()
        return res.end(JSON.stringify({ error: 'Internal error' }));
      }
      if (result.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        client.end()
        return res.end(JSON.stringify({ error: 'Game not found' }));
      }
      const row = result.rows[0];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ started: !!row.started, finished: !!row.finished, gameid: data.gameid }));
      client.end()
    });
  });
}

function handleLobbyWatch(filename, mime, ext, res, req, resHeaders, sessiondata) {
  const url = new URL(req.url, domainname);
  const gameid = url.searchParams.get('gameid') || '';
  if (gameidregex.test(gameid) === false) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid gameid' }));
  }

  resHeaders["Content-Type"] = 'text/event-stream';
  resHeaders["Cache-Control"] = 'no-cache';
  resHeaders["Connection"] = 'keep-alive';
  resHeaders["X-Accel-Buffering"] = 'no';
  res.writeHead(200, resHeaders);

  var client = new pg.Client(conString);
  client.connect();
  client.query('SELECT started, finished FROM games WHERE gameid = $1', [gameid], (err, result) => {
    if (err) {
      console.error('lobby/watch error', err);
      res.write('data: ' + JSON.stringify({ error: 'Internal error' }) + '\n\n');
      res.end();
      client.end()
      return;
    }
    if (result.rows.length === 0) {
      res.write('data: ' + JSON.stringify({ error: 'Game not found' }) + '\n\n');
      res.end();
      client.end()
      return;
    }
    const row = result.rows[0];
    if (row.started || row.finished) {
      res.write('data: ' + JSON.stringify({ started: !!row.started, finished: !!row.finished, gameid: gameid }) + '\n\n');
      res.end();
      client.end()
      return;
    }

    const entry = {
      res: res,
      keepalive: setInterval(() => {
        res.write(':\n\n');
      }, 15000)
    };

    if (!lobbyWatchers.has(gameid)) {
      lobbyWatchers.set(gameid, new Set());
    }
    lobbyWatchers.get(gameid).add(entry);
    client.end()

    req.on('close', () => {
      clearInterval(entry.keepalive);
      const watchers = lobbyWatchers.get(gameid);
      if (watchers) {
        watchers.delete(entry);
        if (watchers.size === 0) {
          lobbyWatchers.delete(gameid);
        }
      }
    });
  });
}

function handleLobbyAction(filename, mime, ext, res, req, resHeaders, sessiondata) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    const { id, action } = data;
    if (!id || !action) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Missing parameters' }));
    }

    var client = new pg.Client(conString);
    client.connect();
    client.query('SELECT id, gameid, userid1, userid2, sessionid1, sessionid2, rated, timecontrol1, randomcolor, color1, color2, started, finished FROM games WHERE id = $1', [id], (err, result) => {
      if (err) {
        console.error('lobby/action select error', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        client.end()
        return res.end(JSON.stringify({ error: 'Internal error' }));
      }

      if (result.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        client.end()
        return res.end(JSON.stringify({ error: 'Game not found' }));
      }

      const game = result.rows[0];
      const defaultRatings = { rating: 1500, deviation: 200, volatility: 0.06 };
      const originalColors = { color1: game.color1, color2: game.color2 };

      function finalizeJoin() {
        const time = parseTimeControl(game.timecontrol1);
        const colors = assignColorsForGame(game);
        const player1UserId = String(game.userid1 || '0');
        const player2UserId = String(sessiondata[1] || '0');
        const player1SessionId = game.sessionid1;
        const player2SessionId = req.headers['cookie'].slice(2);

        const whitePlayerId = colors.whiteIsPlayer1
          ? getPlayerIdentity(player1UserId, player1SessionId)
          : getPlayerIdentity(player2UserId, player2SessionId);
        const blackPlayerId = colors.whiteIsPlayer1
          ? getPlayerIdentity(player2UserId, player2SessionId)
          : getPlayerIdentity(player1UserId, player1SessionId);

        const updateSql = 'UPDATE games SET userid2 = $1, sessionid2 = $2, color1 = $3, color2 = $4, initialtime = $5, increment = $6, gameserver = $7 WHERE id = $8';
        const updateValues = [player2UserId, player2SessionId, colors.color1, colors.color2, time.minutes, time.increment, gameServerName, id];

        client.query(updateSql, updateValues, (err2) => {
          if (err2) {
            console.error('lobby/action update error', err2);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            client.end()
            return res.end(JSON.stringify({ error: 'Internal error' }));
          }

          const mode = ratingModeForTime(time.minutes, time.increment);
          const userIds = [];
          if (player1UserId !== '0') userIds.push(Number(player1UserId));
          if (player2UserId !== '0') userIds.push(Number(player2UserId));

          selectUserRatings(client, userIds, mode, (err3, ratingsMap) => {
            if (err3) {
              console.error('lobby/action rating error', err3);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              client.end()
              return res.end(JSON.stringify({ error: 'Internal error' }));
            }

            const p1Ratings = player1UserId !== '0' && ratingsMap[player1UserId] ? ratingsMap[player1UserId] : defaultRatings;
            const p2Ratings = player2UserId !== '0' && ratingsMap[player2UserId] ? ratingsMap[player2UserId] : defaultRatings;
            const whiteRatings = colors.whiteIsPlayer1 ? p1Ratings : p2Ratings;
            const blackRatings = colors.whiteIsPlayer1 ? p2Ratings : p1Ratings;

            startGameOnServer(
              {
                gameid: game.gameid,
                whitePlayerId: whitePlayerId,
                blackPlayerId: blackPlayerId,
                time: time,
                whiteRatings: whiteRatings,
                blackRatings: blackRatings
              },
              (err4) => {
                if (err4) {
                  console.error('lobby/action game server error', err4);
                  const revertSql = 'UPDATE games SET userid2 = NULL, sessionid2 = NULL, started = NULL, color1 = $1, color2 = $2 WHERE id = $3';
                  client.query(revertSql, [originalColors.color1, originalColors.color2, id], (err5) => {
                    if (err5) {
                      console.error('lobby/action revert error', err5);
                    }
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Game server unavailable' }));
                    client.end()
                  });
                  return;
                }
                client.query('UPDATE games SET started = NOW() WHERE id = $1', [id], (err6) => {
                  if (err6) {
                    console.error('lobby/action start update error', err6);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal error' }));
                    client.end()
                    return;
                  }
                  notifyLobbyWatchers(game.gameid);
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ success: true, mode: 'join', gameid: game.gameid }));
                  client.end()
                });
              }
            );
          });
        });
      }
      if (action === 'join') {
        if (game.finished || game.started) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          client.end()
          return res.end(JSON.stringify({ error: 'Game already started or finished' }));
        }
        if (game.userid2) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          client.end()
          return res.end(JSON.stringify({ error: 'Game already full' }));
        }


        // If rated, enforce rating difference restriction
        if (game.rated) {
          // First fetch ratings of both users
          client.query(
            'SELECT rating FROM users WHERE id = $1',
            [game.userid1],
            (err3, result1) => {
              if (err3 || result1.rows.length === 0) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                client.end()
                return res.end(JSON.stringify({ error: 'Error fetching ratings' }));
              }
              const rating1 = result1.rows[0].rating || 1200;

              // Current player (the one joining)
              if (sessiondata[1] === '0') {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                client.end()
                return res.end(JSON.stringify({ error: 'Anonymous users cannot join rated games' }));
              }

              client.query(
                'SELECT rating FROM users WHERE id = $1',
                [sessiondata[1]],
                (err4, result2) => {
                  if (err4 || result2.rows.length === 0) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    client.end()
                    return res.end(JSON.stringify({ error: 'Error fetching rating' }));
                  }
                  const rating2 = result2.rows[0].rating || 1200;

                  const diff = Math.abs(rating1 - rating2);
                  const maxDiff = 500; // configurable

                  if (diff > maxDiff) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    client.end()
                    return res.end(JSON.stringify({ error: 'Rating difference too large' }));
                  }

                  finalizeJoin();
                }
              );
            }
          );
          return; // stop here, don't run default join code
        }

        finalizeJoin();
      } else if (action === 'watch') {
        if (game.started && !game.finished) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, mode: 'watch', gameid: game.gameid }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Game not available to watch' }));
        }
        client.end()
      } else {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unknown action' }));
        client.end()
      }
    });
  });
}
// === END LOBBY HANDLERS ===
function handleLobbyCreate(filename, mime, ext, res, req, resHeaders, sessiondata) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    const rated = data.rated === true || data.rated === '1';

    if (rated && sessiondata[1] === '0') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Anonymous users cannot create rated games' }));
    }

    const timecontrol = typeof data.timecontrol === 'string' ? data.timecontrol : '5+0';
    let color = null, randomcolor = true;

    if (!rated && (data.color === 'white' || data.color === 'black')) {
      color = data.color;
      randomcolor = false;
    }

    // Pick a random lowercase letter (a–z)
    const prefix = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    const gameid = prefix + Date.now().toString(36);

    const sql = `
      INSERT INTO games (gameid, userid1, sessionid1, rated, timecontrol1, randomcolor, color1, created)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, gameid
    `;

    const values = [
      gameid,
      sessiondata[1],
      req.headers['cookie'].slice(2),
      rated,
      timecontrol,
      randomcolor,
      color
    ];

    var client = new pg.Client(conString);
    client.connect();
    client.query(sql, values, (err, result) => {
      if (err) {
        console.error('lobby/create error', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        client.end()
        return res.end(JSON.stringify({ error: 'Internal error' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, id: result.rows[0].id, gameid: result.rows[0].gameid }));
      client.end()
    });
  });
}

function handleEasyBots(filename, mime, ext, res, req, resHeaders, sessiondata) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    const timecontrol = normalizeTimeControl(data.timecontrol);
    const time = parseTimeControl(timecontrol);
    const mode = ratingModeForTime(time.minutes, time.increment);
    const ratingField = mode + '_rating';

    const rawMin = Number(data.eloMin);
    const rawMax = Number(data.eloMax);
    const eloMin = Number.isFinite(rawMin) && rawMin >= 0 && rawMin <= 4000 ? rawMin : null;
    const eloMax = Number.isFinite(rawMax) && rawMax >= 0 && rawMax <= 4000 ? rawMax : null;

    const sql = `
      SELECT id, username, ROUND(${ratingField}) AS rating
      FROM users
      WHERE role = 3
        AND ($1::numeric IS NULL OR ${ratingField} >= $1)
        AND ($2::numeric IS NULL OR ${ratingField} <= $2)
      ORDER BY ${ratingField} ASC
      LIMIT 200
    `;

    var client = new pg.Client(conString);
    client.connect();
    client.query(sql, [eloMin, eloMax], (err, result) => {
      if (err) {
        console.error('easy/bots error', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        client.end();
        return res.end(JSON.stringify({ error: 'Internal error' }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.rows));
      client.end();
    });
  });
}

function handleEasyStart(filename, mime, ext, res, req, resHeaders, sessiondata) {
  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    const botId = Number(data.botId);
    if (!Number.isFinite(botId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid bot' }));
    }

    const rated = data.rated === true || data.rated === '1';
    if (rated && sessiondata[1] === '0') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Anonymous users cannot play rated games' }));
    }

    const timecontrol = normalizeTimeControl(data.timecontrol);
    const time = parseTimeControl(timecontrol);
    const mode = ratingModeForTime(time.minutes, time.increment);

    let randomcolor = true;
    let color1 = null;
    if (!rated && (data.color === 'white' || data.color === 'black')) {
      randomcolor = false;
      color1 = data.color === 'white' ? 'black' : 'white';
    }
    const colors = assignColorsForGame({ randomcolor: randomcolor, color1: color1, color2: null });

    const prefix = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    const gameid = prefix + Date.now().toString(36);
    const sessionId = req.headers['cookie'].slice(2);
    const botSessionId = 'bot:' + botId;
    const userId = String(sessiondata[1] || '0');
    const botUserId = String(botId);

    const whitePlayerId = colors.whiteIsPlayer1
      ? getPlayerIdentity(botUserId, botSessionId)
      : getPlayerIdentity(userId, sessionId);
    const blackPlayerId = colors.whiteIsPlayer1
      ? getPlayerIdentity(userId, sessionId)
      : getPlayerIdentity(botUserId, botSessionId);
    const botSide = colors.whiteIsPlayer1 ? 'w' : 'b';

    var client = new pg.Client(conString);
    client.connect();
    client.query('SELECT id FROM users WHERE id = $1 AND role = 3', [botId], (err, botResult) => {
      if (err) {
        console.error('easy/start bot check error', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        client.end();
        return res.end(JSON.stringify({ error: 'Internal error' }));
      }
      if (botResult.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        client.end();
        return res.end(JSON.stringify({ error: 'Bot not found' }));
      }

      const insertSql = `
        INSERT INTO games (gameid, userid1, sessionid1, rated, timecontrol1, randomcolor, color1, created)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id, gameid
      `;
      const insertValues = [gameid, botUserId, botSessionId, rated, time.raw, randomcolor, colors.color1];

      client.query(insertSql, insertValues, (err2, insertResult) => {
        if (err2) {
          console.error('easy/start insert error', err2);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          client.end();
          return res.end(JSON.stringify({ error: 'Internal error' }));
        }

        const defaultRatings = { rating: 1500, deviation: 200, volatility: 0.06 };
        const unratedRatings = { rating: -1, deviation: 0, volatility: 0 };
        const userIds = [Number(botUserId)];
        if (rated && userId !== '0') userIds.push(Number(userId));

        const finalizeStart = (botRatings, userRatings) => {
          const whiteRatings = colors.whiteIsPlayer1 ? botRatings : userRatings;
          const blackRatings = colors.whiteIsPlayer1 ? userRatings : botRatings;

          const rating1 = rated ? botRatings.rating : null;
          const rating2 = rated ? userRatings.rating : null;
          const botElo = Number.isFinite(botRatings.rating) ? Math.round(botRatings.rating) : 1500;

          const updateValues = [
            userId,
            sessionId,
            colors.color1,
            colors.color2,
            time.minutes,
            time.increment,
            gameServerName,
            rating1,
            rating2,
            insertResult.rows[0].id
          ];

          const updateSql = `
            UPDATE games
            SET userid2 = $1,
                sessionid2 = $2,
                color1 = $3,
                color2 = $4,
                initialtime = $5,
                increment = $6,
                gameserver = $7,
                rating1 = $8,
                rating2 = $9,
                started = NOW()
            WHERE id = $10
          `;

          client.query(updateSql, updateValues, (err3) => {
            if (err3) {
              console.error('easy/start update error', err3);
              res.writeHead(500, { 'Content-Type': 'application/json' });
              client.end();
              return res.end(JSON.stringify({ error: 'Internal error' }));
            }

            startGameOnServer(
              {
                gameid: gameid,
                whitePlayerId: whitePlayerId,
                blackPlayerId: blackPlayerId,
                time: time,
                whiteRatings: rated ? whiteRatings : unratedRatings,
                blackRatings: rated ? blackRatings : unratedRatings,
                bot: { side: botSide, elo: botElo }
              },
              (err4) => {
                if (err4) {
                  console.error('easy/start game server error', err4);
                  client.query('DELETE FROM games WHERE id = $1', [insertResult.rows[0].id], (err5) => {
                    if (err5) {
                      console.error('easy/start cleanup error', err5);
                    }
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Game server unavailable' }));
                    client.end();
                  });
                  return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, gameid: gameid }));
                client.end();
              }
            );
          });
        };

        selectUserRatings(client, userIds, mode, (err4, ratingsMap) => {
          if (err4) {
            console.error('easy/start ratings error', err4);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            client.end();
            return res.end(JSON.stringify({ error: 'Internal error' }));
          }
          const botRatings = ratingsMap[botUserId] || defaultRatings;
          const userRatings = rated ? (ratingsMap[userId] || defaultRatings) : unratedRatings;
          finalizeStart(botRatings, userRatings);
        });
      });
    });
  });
}
