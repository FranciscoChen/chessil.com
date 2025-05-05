// nodejs libraries
const http = require('http');
const https = require('https');
const fs = require('fs');
var path = require("path");
const zlib = require('zlib');
const crypto = require('crypto');
const querystring = require('querystring');

// Using Redis as Sessions database
const Redis = require("ioredis");
const redis = new Redis();

// Using PostgreSQL as main database for storing information about: users, game seeks, game data, etc.
const pg = require("pg");

// database.js is not included, because it contains the password to the database in plain text, but it should be a string as follows:
// const conString = 'postgres://user:password@host:port/db?sslmode=require'
const database = require('./database.js')
const conString = database.credentials

// Password complexity calculator
const zxcvbn = require('zxcvbn');
// Argon2id password hashing
const argon2 = require('argon2');

// To check for and limit user input
const usernameregex = new RegExp ('^[a-zA-Z][a-zA-Z0-9_-]*[a-zA-Z0-9]$')
const gameidregex= new RegExp ('^[a-zA-Z0-9]{9}$')
const randidregex = new RegExp ('^[1234567890abcdef]{32}$')
const isodateregex= new RegExp ('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')

// The IPs of one or more websocket servers
const websocketserver = {'51.68.190.27':true}

// This could be a very long random string, but it has to match in both the web server and the websocket server. For example:
// const websocketpassword = '4n729fm8dwyb475tynferh7w8qb7qwnrhmfx4362trgb627f3yg4n2f67svgb26734gnfb6weuysdf4738pzn1'
const websocket = require('./websocket.js')
const websocketpassword = websocket.credentials


const domainname = 'https://chessil.com'

const languages = {
  en:{dir:'/en',en:'English'},
  es:{dir:'/es',es:'Español'},
  zh:{dir:'/zh',zh:'中文'}
}
const loginword= {
  en:'Login',
  es:'Iniciar Sesión',
  zh:'登录'
}
const signoutword= {
  en:'Sign out',
  es:'Cerrar Sesión',
  zh:'登出'
}
const profileword= {
  en:'Profile',
  es:'Perfil',
  zh:'资料'
}

// This is the root directory of the website, everything inside here could be requested
// The name of the folder, which must be in the same directory as this file (server.js)
var folder = 'web'
var dir = path.join(__dirname, folder)

// This port is closed to the outside, but connected to our nginx instance
const port = 8080;

// The mime types of files that can be served, and which ones are to be gzipped or cached. It is limited on purpose and can be expanded as needed
const mime = require('./mime.js')

process.chdir(dir);

var server = http.createServer(function(req, res) {
  
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
    res.writeHead(400, {"Content-Type": "text/html"});
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
  var useragent = ''
  if (typeof req.headers['user-agent'] !== 'undefined'){
    useragent = req.headers['user-agent']
  }
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
    wsauth(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
 
  if (typeof cookie === 'undefined') {
    // No cookies, so set the s cookie for session id
    newsession(filename,mime,ext,res,req,resHeaders,sessiondata)
  } else {
	//  37.181.67.5 1 l en 1695652108 Flamerare Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36
    // Check that the cookie is normal and not forged. 16 bytes at 2 hex chars per byte plus the s= cookie name assignment results in length 34
    if (cookie.length === 34 && cookie.slice(0,2) === 's='){
      sessionid = cookie.slice(2)
      // Check the sessionid with Redis, if found or not. Proceed as normal in each case
      redis.get(sessionid,(err,result) => {
        if (err) {
          console.error(err);
        } else {
          if (result === null){
            // Not found or expired session id
            newsession(filename,mime,ext,res,req,resHeaders,sessiondata)
          } else {
            // In case sessionid is found on redis
            sessiondata = result.split(' ')
            if (Math.floor(Date.now() / 1000) - sessiondata[4] > 31536000) {
              // Hard limit absolute timeout of 1 year
              newsession(filename,mime,ext,res,req,resHeaders,sessiondata)
            } else {
              // Idle timeout 1 week
              redis.expire(sessionid, '604800', (err, result) => {if (err) {console.error(err)}})
              if (req.headers['x-real-ip'] === sessiondata[0]) {
                // Same IP, same cookie - serve normally as that user or as n (nn, noname, anon)
                route(filename,mime,ext,res,req,resHeaders,sessiondata) //use sessiondata[1] which is the user id, to customise the html dynamically
              } else {
                // Different IP, same cookie - cookie theft or dynamic IP reassignment?
                if (useragent === sessiondata.slice(6).join(' ')) {
                  // If same user agent, assuming dynamic IP case, but can be further checked to be in the same location or country
                  route(filename,mime,ext,res,req,resHeaders,sessiondata) //use sessiondata[1] which is the user id, to customise the html dynamically
                } else {
                  // Different IP, different user agent, same cookie - cookie theft most probably! Set new cookie
                  newsession(filename,mime,ext,res,req,resHeaders,sessiondata)
                }
              }
            }
          }
        }
      });
    } else {
      //console.log('Bad or forged cookie');
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
    }
  }
})

server.listen(port);

server.on('error', function(e) {
  console.log(e)
});

function newsession(filename,mime,ext,res,req,resHeaders,sessiondata){
  crypto.randomBytes(16, (err, buf) => {
    if (err) {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.log(err);
    } else {
      var sessionid = buf.toString('hex')
      var useragent = ''
      if (typeof req.headers['user-agent'] !== 'undefined'){
        useragent = req.headers['user-agent']
      }
      // Ensure it is a new id, not in use
      redis.get(sessionid,(err,result) => {
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          console.error(err);
        } else {
          if (result === null){
            const oldcookie = req.headers['cookie']
            if (typeof oldcookie !== 'undefined'){
              const oldsessionid = oldcookie.slice(2)
              var client = new pg.Client(conString);
              client.connect();
              // Will disrupt seeks in the unlikely event of a cookie theft
              client.query('DELETE FROM seeks WHERE sessionid = $1', [oldsessionid], (err, response)=>{
                if (err) {console.log(err);}
                client.query('DELETE FROM connections WHERE sessionid = $1', [oldsessionid], (err, response)=>{
                  if (err) {console.log(err);}
                  client.end()
                  resHeaders["Set-Cookie"] = "s="+sessionid+'; Domain=.chessil.com; Max-Age=31536000; HttpOnly; Path=/; Secure; SameSite=Lax'
                  // Set it in Redis and keep going normally
                  redis.set(sessionid, req.headers['x-real-ip']+' 0 n en '+Math.floor(Date.now() / 1000)+' u '+useragent, 'EX', '604800', (err,result) => {
                    if (err) {
                      res.writeHead(500, {"Content-Type": "text/html"});
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
              resHeaders["Set-Cookie"] = "s="+sessionid+'; Domain=.chessil.com; Max-Age=31536000; HttpOnly; Path=/; Secure; SameSite=Lax'
              // Set it in Redis and keep going normally
              redis.set(sessionid, req.headers['x-real-ip']+' 0 n en '+Math.floor(Date.now() / 1000)+' u '+useragent, 'EX', '604800', (err,result) => {
                if (err) {
                  res.writeHead(500, {"Content-Type": "text/html"});
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
            res.writeHead(500, {"Content-Type": "text/html"});
            res.end();
          }
        }
      })
    }
  });
}

function routelanguage(filename,mime,ext,res,req,resHeaders,sessiondata){
  resHeaders["Location"] = req.url.slice(3)
  if (resHeaders["Location"] === '') resHeaders["Location"] = '/'
  // Accepted set language. Update in session...
  sessiondata[3] = req.url.slice(1,3)
  redis.set(req.headers['cookie'].slice(2), sessiondata[0]+' '+sessiondata[1]+' '+sessiondata[2]+' '+sessiondata[3]+' '+sessiondata[4]+' '+sessiondata[5]+' '+sessiondata.slice(6).join(), 'EX', '604800', (err,result) => {
    if (err) {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.error(err);
    } else {
      // Check if logged in as a user, and write preference in database if so.
      if (sessiondata[1] !== '0') {
        var client = new pg.Client(conString);
        client.connect();
        client.query('UPDATE users SET language = $1 WHERE id = $2', [sessiondata[3],sessiondata[1]], (err, response)=>{
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

function route(filename,mime,ext,res,req,resHeaders,sessiondata){
  // Manage language part of url
  if (typeof languages[req.url.slice(1,3)] !== 'undefined'){
    routelanguage(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  // User page
  if (req.url.slice(0,3) === '/@/'){
    userpage(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url.slice(0,5) === '/user'){
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end();
    return
  }
  // Blog page
  if (req.url.slice(0,5) === '/copy'){
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end();
    return
  }
  if (req.url.slice(0,6) === '/blog/'){
    blogpage(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/newblogs'){
    recentblogs(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url.slice(0,6) === '/game/'){
    gamepage(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url.slice(0,5) === '/play'){
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end();
    return
  }
  // If the request is a POST for account creation (config nginx to rate limit this one for all languages)
  if (req.url === '/register' && req.method === 'POST') {
    registration(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/login' && req.method === 'POST') {
    login(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/logout' && req.method === 'POST') {
    logout(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/language' && req.method === 'POST') {
    setlanguage(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/registered' && req.method === 'POST') {
    checknewuser(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/search' && req.method === 'POST') {
    searchuser(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/seek' && req.method === 'POST') {
    insertseek(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/pairing' && req.method === 'POST') {
    pairseeks(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/challenge' && req.method === 'POST') {
    inserttargetedseek(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/accept' && req.method === 'POST') {
    insertacceptedseek(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/startchallenge' && req.method === 'POST') {
    pairtargetedseek(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/getseeks' && req.method === 'POST') {
    getuserseeks(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/cancel' && req.method === 'POST') {
    cancelseek(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/light' && req.method === 'POST') {
    lightmode(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/dark' && req.method === 'POST') {
    darkmode(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/gamestate' && req.method === 'POST') {
    gamedata(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/ratings' && req.method === 'POST') {
    userratings(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/gamecount' && req.method === 'POST') {
    usergamecount(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/livegamecount' && req.method === 'POST') {
    userlivegamecount(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }
  if (req.url === '/gamehistory' && req.method === 'POST') {
    usergames(filename,mime,ext,res,req,resHeaders,sessiondata)
    return
  }

  serve(filename,mime,ext,res,req,resHeaders,sessiondata)
}

function findtitle(rows){
  const l = rows.length
  for (var i = 0; i < l; ++i){
    if (rows[i].tag === 'title') return rows[i].copy
  }
}

function finddescription(rows){
  const l = rows.length
  for (var i = 0; i < l; ++i){
    if (rows[i].tag === 'description') return rows[i].copy
  }
}

function findkeywords(rows){
  const l = rows.length
  for (var i = 0; i < l; ++i){
    if (rows[i].tag === 'keywords') return rows[i].copy
  }
}

function constructcopy(rows){
  const l = rows.length
  var ret = ''
  for (var i = 0; i < l; ++i){
    const srw = rows[i]
    if (typeof {'keywords':1,'title':1,'description':1}[srw.tag] === 'undefined' ) {
      ret += '<'+srw.tag
      if (srw.attributes != null) ret += ' '+srw.attributes
      ret += '>'
      if (srw.copy != null) ret += srw.copy
      if (srw.closetag == true) ret += '</'+srw.tag+'>'
    }
  }
  return ret
}
function blogpage(filename,mime,ext,res,req,resHeaders,sessiondata){
  // Select user from database
  if (isodateregex.test(req.url.slice(6)) === false) {
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end();
    return
  }
  var client = new pg.Client(conString);
  client.connect();
  client.query('SELECT c.tag, c.attributes, c.copy, c.closetag FROM content c INNER JOIN blogs b ON b.id = c.blogid WHERE DATE(b.created) = $1 AND language = $2 AND b.'+sessiondata[3]+'_proofread is true ORDER BY position ASC', [req.url.slice(6),sessiondata[3]], (err, response)=>{
    if (response.rows.length > 0) {
      const template = '/copy/index.html'
      if (ext === '.html'){
        // Serve the correct language and template
        filename = filename.slice(0,dir.length) + '/'+sessiondata[3]+template
      }
      fs.stat(filename, function (err, stats)
      {
        if (!err && !stats.isDirectory()) {
          /// Client cache all except some file types
          if ( typeof mime.cache[ext] === 'undefined') {
            resHeaders["Cache-Control"] = 'max-age=9999';
          }
          if ( typeof mime.data[ext] === 'undefined') {
            res.writeHead(404, {"Content-Type": "text/html"});
            res.end();
            return
          }
          resHeaders["Content-Type"] = mime.data[ext];
          fs.readFile(filename, function(err, data) {
            if (!err) {
              // customise html data with user variables
              var loginoruserhtml
              if (sessiondata[5] === 'u') {
                loginoruserhtml = '<a href="/login" class="signin button button-empty">'+loginword[sessiondata[3]]+'</a>'
	      } else {
                loginoruserhtml = '<div id="user_button"><a id="user_tag" class="toggle link">'+sessiondata[5]+'</a><div id="dasher_user_app" class="dropdown"><div><div class="links"><a class="user-link online text is-green" href="/@/'+sessiondata[5]+'" >'+profileword[sessiondata[3]]+'</a><form class="logout" method="post" action="/logout"><button class="text" type="submit" >'+signoutword[sessiondata[3]]+'</button></form></div></div></div></div>'
	      }
              data = Buffer.from(
                data.toString('utf8')
                 .replaceAll('$loginoruserbutton',loginoruserhtml)
                 .replaceAll('light.css',{l:'light.css',d:'dark.css',n:'default.css'}[sessiondata[2]])

                 .replaceAll('$username',response.rows[0].username)

                 .replaceAll('$title',findtitle(response.rows))
                 .replaceAll('$description',finddescription(response.rows))
                 .replaceAll('$keywords',findkeywords(response.rows))
                 .replaceAll('$copy',constructcopy(response.rows))
              ,'utf8')
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
              res.writeHead(404, {"Content-Type": "text/html"});
              res.end();
              console.log(err);
            }
          });
        } else {
          res.writeHead(404, {"Content-Type": "text/html"});
          res.end();
        }
      });
      client.end()
    } else {
      // Content not found 
      res.writeHead(404, {"Content-Type": "text/html"});
      res.end();
      return
    }
  })
}
function recentblogs(filename,mime,ext,res,req,resHeaders,sessiondata){
  var client = new pg.Client(conString);
  client.connect();
  client.query('SELECT b.created as d, b.img as i, c.copy as t FROM content c INNER JOIN blogs b ON b.id = c.blogid WHERE c.language = $1 AND b.'+sessiondata[3]+'_proofread is true AND c.position = 1 ORDER BY b.created DESC LIMIT 7', [sessiondata[3]], (err, response)=>{
    if (err) {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      client.end();
      console.log(err);
      return
    } else {
      const resp = []
      const rr = response.rows
      for (var i = rr.length; i--;){
        resp.unshift(rr[i])
      }
      res.writeHead(200, {"Content-Type": "text/javascript"});
      res.end(JSON.stringify(resp));
      client.end();
      return;
    }
  })
}
function userpage(filename,mime,ext,res,req,resHeaders,sessiondata){
  // Select user from database
  if (usernameregex.test(req.url.slice(3)) === false) {
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end();
    return
  }
  var client = new pg.Client(conString);
  client.connect();
  client.query('SELECT username FROM users WHERE canonical = $1', [req.url.slice(3).toLowerCase()], (err, response)=>{
    if (response.rows.length === 1) {
      const template = '/user/index.html'
      if (ext === '.html'){
        // Serve the correct language and template
        filename = filename.slice(0,dir.length) + '/'+sessiondata[3]+template
      }
      fs.stat(filename, function (err, stats)
      {
        if (!err && !stats.isDirectory()) {
          /// Client cache all except some file types
          if ( typeof mime.cache[ext] === 'undefined') {
            resHeaders["Cache-Control"] = 'max-age=9999';
          }
          if ( typeof mime.data[ext] === 'undefined') {
            res.writeHead(404, {"Content-Type": "text/html"});
            res.end();
            return
          }
          resHeaders["Content-Type"] = mime.data[ext];
          fs.readFile(filename, function(err, data) {
            if (!err) {
              // customise html data with user variables
              var loginoruserhtml
              if (sessiondata[5] === 'u') {
                loginoruserhtml = '<a href="/login" class="signin button button-empty">'+loginword[sessiondata[3]]+'</a>'
	      } else {
                loginoruserhtml = '<div id="user_button"><a id="user_tag" class="toggle link">'+sessiondata[5]+'</a><div id="dasher_user_app" class="dropdown"><div><div class="links"><a class="user-link online text is-green" href="/@/'+sessiondata[5]+'" >'+profileword[sessiondata[3]]+'</a><form class="logout" method="post" action="/logout"><button class="text" type="submit" >'+signoutword[sessiondata[3]]+'</button></form></div></div></div></div>'
	      }
              data = Buffer.from(
                data.toString('utf8')
                 .replaceAll('$loginoruserbutton',loginoruserhtml)
                 .replaceAll('light.css',{l:'light.css',d:'dark.css',n:'default.css'}[sessiondata[2]])

                 .replaceAll('$username',response.rows[0].username)
              ,'utf8')
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
              res.writeHead(404, {"Content-Type": "text/html"});
              res.end();
              console.log(err);
            }
          });
        } else {
          res.writeHead(404, {"Content-Type": "text/html"});
          res.end();
        }
      });
      client.end()
    } else {
      // User not found 
      res.writeHead(404, {"Content-Type": "text/html"});
      res.end();
      return
    }
  })
}
function gamepage(filename,mime,ext,res,req,resHeaders,sessiondata){
  // Select game from database
  if (gameidregex.test(req.url.slice(6,15)) === false) {
    res.writeHead(404, {"Content-Type": "text/html"});
    res.end();
    return
  }
  var client = new pg.Client(conString);
  client.connect();
  client.query('SELECT g.userid1, g.userid2, u1.username as username1, u2.username as username2, g.gameserver, g.rated, g.state, g.initialtime, g.increment, ROUND(g.rating1) as rating1, ROUND(g.rating2) as rating2, g.created, g.session1, g.session2 FROM games g LEFT JOIN users u1 ON u1.id = g.userid1 LEFT JOIN users u2 ON u2.id = g.userid2 WHERE g.gameid = $1', [req.url.slice(6,15)], (err, response)=>{
    if (response.rows.length === 1) {
      const template = '/play/index.html'
      if (ext === '.html'){
        // Serve the correct language and template
        filename = filename.slice(0,dir.length) + '/'+sessiondata[3]+template
      }
      fs.stat(filename, function (err, stats)
      {
        if (!err && !stats.isDirectory()) {
          /// Client cache all except some file types
          if ( typeof mime.cache[ext] === 'undefined') {
            resHeaders["Cache-Control"] = 'max-age=9999';
          }
          if ( typeof mime.data[ext] === 'undefined') {
            res.writeHead(404, {"Content-Type": "text/html"});
            res.end();
            return
          }
          resHeaders["Content-Type"] = mime.data[ext];
          fs.readFile(filename, function(err, data) {
            if (!err) {
              // customise html data with user variables
              var loginoruserhtml
              if (sessiondata[5] === 'u') {
                loginoruserhtml = '<a href="/login" class="signin button button-empty">'+loginword[sessiondata[3]]+'</a>'
	      } else {
                loginoruserhtml = '<div id="user_button"><a id="user_tag" class="toggle link">'+sessiondata[5]+'</a><div id="dasher_user_app" class="dropdown"><div><div class="links"><a class="user-link online text is-green" href="/@/'+sessiondata[5]+'" >'+profileword[sessiondata[3]]+'</a><form class="logout" method="post" action="/logout"><button class="text" type="submit" >'+signoutword[sessiondata[3]]+'</button></form></div></div></div></div>'
	      }
	      var side = 's'
	      if (sessiondata[1] == 0) {
                // Anon
                if (req.headers['cookie'].slice(2) === response.rows[0].session1) side = 'w'
                if (req.headers['cookie'].slice(2) === response.rows[0].session2) side = 'b'
              } else {
                // Registered user
                if (sessiondata[1] === response.rows[0].userid1) side = 'w'
                if (sessiondata[1] === response.rows[0].userid2) side = 'b'
              }
              data = Buffer.from(
                data.toString('utf8')
                 .replaceAll('$loginoruserbutton',loginoruserhtml)
                 .replaceAll('light.css',{l:'light.css',d:'dark.css',n:'default.css'}[sessiondata[2]])

                 .replaceAll('$username1',response.rows[0].username1 || 'NN')
                 .replaceAll('$username2',response.rows[0].username2 || 'NN')
                 .replaceAll('$gameserver',response.rows[0].gameserver)
       //          .replaceAll('$moves',response.rows[0].moves)
       //          .replaceAll('$clock',response.rows[0].clock)
   //              .replaceAll('$events',response.rows[0].events)
     //            .replaceAll('$eclock',response.rows[0].eventsclock)
                 .replaceAll('$rated',response.rows[0].rated)
                 .replaceAll('$state',response.rows[0].state)
        //         .replaceAll('$result',response.rows[0].result)
                 .replaceAll('$initialtime',response.rows[0].initialtime)
                 .replaceAll('$increment',response.rows[0].increment)
                 .replaceAll('$rating1',response.rows[0].rating1 || '')
                 .replaceAll('$rating2',response.rows[0].rating2 || '')
 //                .replaceAll('$ratingdiff1',response.rows[0].ratingdiff1)
 //                .replaceAll('$ratingdiff2',response.rows[0].ratingdiff2)
                 .replaceAll('$created',response.rows[0].created)
                 .replaceAll('$side',side)

              ,'utf8')
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
              res.writeHead(404, {"Content-Type": "text/html"});
              res.end();
              console.log(err);
            }
          });
        } else {
          res.writeHead(404, {"Content-Type": "text/html"});
          res.end();
        }
      });
      client.end()
    } else {
      // Game not found 
      res.writeHead(404, {"Content-Type": "text/html"});
      res.end();
      return
    }
  })
}

function serve(filename,mime,ext,res,req,resHeaders,sessiondata){
  if (ext === '.html'){
    // Serve the correct language
    filename = filename.slice(0,dir.length) + '/'+sessiondata[3]+filename.slice(dir.length)
  }
  fs.stat(filename, function (err, stats)
  {
    if (!err && !stats.isDirectory()) {
      /// Client cache all except some file types
      if ( typeof mime.cache[ext] === 'undefined') {
        resHeaders["Cache-Control"] = 'max-age=9999';
      }
      if ( typeof mime.data[ext] === 'undefined') {
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end();
        return
      }
      resHeaders["Content-Type"] = mime.data[ext];
      fs.readFile(filename, function(err, data) {
        if (!err) {
          if (ext === '.html'){
            // customise html data with user variables
            var loginoruserhtml
            if (sessiondata[5] === 'u') {
              loginoruserhtml = '<a href="/login" class="signin button button-empty">'+loginword[sessiondata[3]]+'</a>'
	    } else {
              loginoruserhtml = '<div id="user_button"><a id="user_tag" class="toggle link">'+sessiondata[5]+'</a><div id="dasher_user_app" class="dropdown"><div><div class="links"><a class="user-link online text is-green" href="/@/'+sessiondata[5]+'" >'+profileword[sessiondata[3]]+'</a><form class="logout" method="post" action="/logout"><button class="text" type="submit" >'+signoutword[sessiondata[3]]+'</button></form></div></div></div></div>'
	    }
            data = Buffer.from(
              data.toString('utf8')
               .replaceAll('$loginoruserbutton',loginoruserhtml)
               .replaceAll('light.css',{l:'light.css',d:'dark.css',n:'default.css'}[sessiondata[2]])
            ,'utf8')
          }
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
          res.writeHead(404, {"Content-Type": "text/html"});
          res.end();
          console.log(err);
        }
      });
    } else {
      res.writeHead(404, {"Content-Type": "text/html"});
      res.end();
    }
  });
}

function registration(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', registercheck)
  function registercheck(chunk) {
    req.removeListener('data',registercheck);
    const postcontent = querystring.parse(chunk.toString())
    if (typeof postcontent === 'object') {
      if (postcontent.nocheating === 'true' &&
      postcontent.treatotherswell === 'true' &&
      postcontent.nomultiaccount === 'true' &&
      postcontent.noattacks === 'true') {
        if (typeof postcontent.username !== 'undefined' &&
            typeof postcontent.password !== 'undefined'
            //&& typeof postcontent.email !== 'undefined'
           ) 
        {
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
                    client.query("SELECT id FROM connections WHERE sessionid = $1 AND updated < NOW() - INTERVAL '2 second'", [req.headers['cookie'].slice(2)], (err, rere)=>{
                      if (err) {
                        res.writeHead(500, {"Content-Type": "text/html"});
                        res.end();
                        client.end();
                        console.log(err);
                        return
                      }
                      if (rere.rows.length === 0) {
                        // Makes sure a user opened the page, and connected to ws, and took 2 seconds or more to fill the form
                        // Bot and spam account creation protection number 1
                        res.writeHead(401, {"Content-Type": "text/html"});
                        res.end();
                        client.end();
                        return
		      }
                      client.query("SELECT count(id) as c FROM users WHERE ip = $1 AND created > NOW() - INTERVAL '1 month'", [sessiondata[0]], (err, respo)=>{
                        if (err) {
                          res.writeHead(500, {"Content-Type": "text/html"});
                          res.end();
                          client.end();
                          console.log(err);
                          return
                        }
                        if (respo.rows.length === 1) {
                          // If there are more than 70 accounts created from the same IP in the last month, deny further account creations
                          // Bot and spam account creation protection number 2
                          if (respo.rows[0].c > 70) {
                            res.writeHead(401, {"Content-Type": "text/html"});
                            res.end();
                            client.end();
                            return
		          }
                          client.query('SELECT id FROM users WHERE canonical = $1', [postcontent.username.toLowerCase()], (err, response)=>{
                            if (err) {
                              res.writeHead(500, {"Content-Type": "text/html"});
                              res.end();
                              client.end();
                              console.log(err);
                              return
                            }
                            if (response.rows.length === 0) {
                              // Username is available
                              try {
                                argon2.hash(postcontent.password).then( hashedpassword => {
                                  const rating = '1500'; const ratings = [rating,rating,rating,rating,rating].join(',')
                                  const deviation = '350'; const deviations = [deviation,deviation,deviation,deviation,deviation].join(',')
                                  const volatility = '0.06'; const volatilities = [volatility,volatility,volatility,volatility,volatility].join(',')
                                  client.query('INSERT INTO users (id,username,canonical,password,email,created,ip,theme,language,ultrabullet_rating,bullet_rating,blitz_rating,rapid_rating,classical_rating,ultrabullet_deviation,bullet_deviation,blitz_deviation,rapid_deviation,classical_deviation,ultrabullet_volatility,bullet_volatility,blitz_volatility,rapid_volatility,classical_volatility) VALUES (DEFAULT,$1,$2,$3,$4,NOW(),$5,$6,$7,'+ratings+','+deviations+','+volatilities+')', [postcontent.username,postcontent.username.toLowerCase(),hashedpassword,
				          //postcontent.email
				          null, sessiondata[0]
				          ,sessiondata[2],sessiondata[3]], (err, respo)=>{
                                    if (err) {
                                      // Account creation unsuccessful
                                      res.writeHead(500, {"Content-Type": "text/html"});
                                      res.end();
                                      console.log(err);
                                      client.end()
                                    } else {
                                      // Account creation successful, autoperform login and go to main page
                                      client.query('SELECT * FROM users WHERE canonical = $1', [postcontent.username.toLowerCase()], (err, response2)=>{
                                        if (response2.rows.length === 1) {
                                          // Authenticated sessionid to userid, make new sessionid, expire old session, assign new sessionid which is linked to userid
                                          sessiondata[1] = response2.rows[0].id
                                          sessiondata[2] = response2.rows[0].theme
                                          sessiondata[3] = response2.rows[0].language
                                          sessiondata[5] = response2.rows[0].username
                                          newsessionwithloginuser(filename,mime,ext,res,req,resHeaders,sessiondata)
                                          client.end()
                                          return
                                        } else {
                                          // Username not found 
                                          resHeaders["Location"] = domainname+'/login'
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
                                res.writeHead(500, {"Content-Type": "text/html"});
                                res.end();
                                console.log('Password hashing error')
                                console.log(err)
                                return;
                              }

                            } else {
                              // Username already exists
                              console.log('Username already exists')
                              client.end()
                              serve(filename,mime,ext,res,req,resHeaders,sessiondata)
                            }
                          })
		        } else {
                          res.writeHead(500, {"Content-Type": "text/html"});
                          res.end();
                          client.end();
                          return
		        }
                      })
                    })
                  //}
                } else {
                  res.writeHead(500, {"Content-Type": "text/html"});
                  res.end();
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
              res.writeHead(500, {"Content-Type": "text/html"});
              res.end();
              console.log('Incorrect password length, not normal user behaviour')
              return;
            }
          } else {
            res.writeHead(500, {"Content-Type": "text/html"});
            res.end();
            console.log('Incorrect username length, or not conforming to the rules. not normal user behaviour')
            return;
          }
        } else {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          console.log('postcontent not fully defined, this is not normal user behaviour, but rather a custom packet send')
          return;
        }

      } else {
        // Could result in a web page message, you have to agree to the terms of service
        console.log('Not all agreements were true or defined')
        res.writeHead(500, {"Content-Type": "text/html"});
        res.end();
        //serve(filename,mime,ext,res,req,resHeaders,sessiondata)
        return;
      }
      
      } else {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.log('failed to parse registration POST')
      return;
    } 
  }
}
function checknewuser(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', newusercheck)
  function newusercheck(chunk) {
    req.removeListener('data',newusercheck);
    const uname = chunk.toString()
    if (uname.length > 1 && uname.length < 21 && usernameregex.test(uname)) {
      // Check if username exists in database already
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT id FROM users WHERE canonical = $1', [uname.toLowerCase()], (err, response)=>{
        if (response.rows.length === 0) {
          // Username is available
          res.writeHead(200, {"Content-Type": "text/html"});
          res.end('false');
          client.end();
          return;
        } else {
          // Username already exists
          res.writeHead(200, {"Content-Type": "text/html"});
          res.end('true');
          client.end();
          return;
        }
      })
    } else {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.log('Incorrect username length, or not conforming to the rules. not normal user behaviour')
      return;
    }
  }
}
function searchuser(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', searchbyname)
  function searchbyname(chunk) {
    req.removeListener('data',searchbyname);
    const uname = chunk.toString()
    if (uname.length > 1 && uname.length < 21 && usernameregex.test(uname)) {
      // Check if username exists in database already
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT username FROM users WHERE canonical LIKE $1 ORDER BY (CASE WHEN canonical = $2 THEN 1 ELSE 2 END), canonical LIMIT 12', [(uname.toLowerCase())+'%',uname.toLowerCase()], (err, response)=>{
        const resp = []
        const rr = response.rows
        for (var i = rr.length; i--;){
          resp.unshift(rr[i].username)
        }
        res.writeHead(200, {"Content-Type": "text/javascript"});
        res.end(JSON.stringify(resp));
        client.end();
        return;
      })
    } else {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.log('Incorrect username length, or not conforming to the rules. not normal user behaviour')
      return;
    }
  }
}

function newsessionwithloginuser (filename,mime,ext,res,req,resHeaders,sessiondata){
  crypto.randomBytes(16, (err, buf) => {
    if (err) {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.log(err);
    } else {
      var sessionid = buf.toString('hex')
      var useragent = ''
      if (typeof req.headers['user-agent'] !== 'undefined'){
        useragent = req.headers['user-agent']
      }
      // Ensure it is a new id, not in use
      redis.get(sessionid,(err,result) => {
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          console.error(err);
        } else {
          if (result === null){
            const oldcookie = req.headers['cookie']
            const oldsessionid = oldcookie.slice(2)
            var client = new pg.Client(conString);
            client.connect();
            client.query('DELETE FROM seeks WHERE sessionid = $1', [oldsessionid], (err, response)=>{
              if (err) {console.log(err);}
              client.query('DELETE FROM connections WHERE sessionid = $1', [oldsessionid], (err, response)=>{
                if (err) {console.log(err);}
                client.end()
                // Delete old cookie at server
                redis.del(oldsessionid,(err,result) => {
                  if (err) {
                    res.writeHead(500, {"Content-Type": "text/html"});
                    res.end();
                    console.error(err);
                  } else {
                    // Delete old cookie at client by overwriting new cookie
                    resHeaders["Set-Cookie"] = "s="+sessionid+'; Domain=.chessil.com; Max-Age=31536000; HttpOnly; Path=/; Secure; SameSite=Lax'
                    // Register in Redis and keep going normally
                    redis.set(sessionid, req.headers['x-real-ip']+' '+sessiondata[1]+' '+sessiondata[2]+' '+sessiondata[3]+' '+Math.floor(Date.now() / 1000)+' '+sessiondata[5]+' '+useragent, 'EX', '604800', (err,result) => {
                      if (err) {
                        res.writeHead(500, {"Content-Type": "text/html"});
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
            res.writeHead(500, {"Content-Type": "text/html"});
            res.end();
          }
        }
      })
    }
  });
}

function login(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', logincheck)
  function logincheck(chunk) {
    req.removeListener('data',logincheck);
    const postcontent = querystring.parse(chunk.toString())
    if (typeof postcontent === 'object') {
      if (typeof postcontent.username !== 'undefined' && typeof postcontent.password !== 'undefined') {
        if (postcontent.username.length > 1 && postcontent.username.length < 21 && usernameregex.test(postcontent.username)) {
          if (postcontent.password.length > 3 && postcontent.password.length < 256) {
            // Check if username exists in database already
            var client = new pg.Client(conString);
            client.connect();
            client.query('SELECT * FROM users WHERE canonical = $1', [postcontent.username.toLowerCase()], (err, response)=>{
              if (response.rows.length === 1) {
                try {
                  argon2.verify(response.rows[0].password,postcontent.password).then( passwordmatch => {
                  // Compare password hashes
                      if (passwordmatch === true) {
                        // Authenticated sessionid to userid, make new sessionid, expire old session, assign new sessionid which is linked to userid
                        sessiondata[1] = response.rows[0].id
                        sessiondata[2] = response.rows[0].theme
                        sessiondata[3] = response.rows[0].language
                        sessiondata[5] = response.rows[0].username
                        newsessionwithloginuser(filename,mime,ext,res,req,resHeaders,sessiondata)
                        client.end()
                        return
                      } else {
                        // Wrong password
                        client.end()
                        serve(filename,mime,ext,res,req,resHeaders,sessiondata)
                      }
                  });
                } catch (err) {
                  res.writeHead(500, {"Content-Type": "text/html"});
                  res.end();
                  console.log('Password hashing error')
                  console.log(err)
                  return;
                }
              } else {
                // Username not found 
                client.end()
                serve(filename,mime,ext,res,req,resHeaders,sessiondata)
              }
            })
          } else {
            serve(filename,mime,ext,res,req,resHeaders,sessiondata)
            // console.log('Incorrect password length, not normal user behaviour')
            return;
          }
        } else {
          serve(filename,mime,ext,res,req,resHeaders,sessiondata)
          //console.log('Incorrect username length, not normal user behaviour')
          return;
        }
      } else {
          serve(filename,mime,ext,res,req,resHeaders,sessiondata)
          //console.log('Username or password missing')
          return;
      }
    } else {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.log('postcontent not fully defined, this is not normal user behaviour, but rather a custom packet send')
      return;
    }
  }
}

function logout(filename,mime,ext,res,req,resHeaders,sessiondata){
  crypto.randomBytes(16, (err, buf) => {
    if (err) {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.log(err);
    } else {
      var sessionid = buf.toString('hex')
      var useragent = ''
      if (typeof req.headers['user-agent'] !== 'undefined'){
        useragent = req.headers['user-agent']
      }
      // Ensure it is a new id, not in use
      redis.get(sessionid,(err,result) => {
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          console.error(err);
        } else {
          if (result === null){
            const oldcookie = req.headers['cookie']
            const oldsessionid = oldcookie.slice(2)
            var client = new pg.Client(conString);
            client.connect();
            client.query('DELETE FROM seeks WHERE sessionid = $1', [oldsessionid], (err, response)=>{
              if (err) {console.log(err);}
              client.query('DELETE FROM connections WHERE sessionid = $1', [oldsessionid], (err, response)=>{
                if (err) {console.log(err);}
                client.end()
                // Delete old cookie at server
                redis.del(oldsessionid,(err,result) => {
                  if (err) {
                    res.writeHead(500, {"Content-Type": "text/html"});
                    res.end();
                    console.error(err);
                  } else {
                    // Delete old cookie at client by overwriting new cookie
                    resHeaders["Set-Cookie"] = "s="+sessionid+'; Domain=.chessil.com; Max-Age=31536000; HttpOnly; Path=/; Secure; SameSite=Lax'
                    // Register logged out cookie in Redis
                    redis.set(sessionid, req.headers['x-real-ip']+' 0 '+sessiondata[2]+' '+sessiondata[3]+' '+Math.floor(Date.now() / 1000)+' u '+useragent, 'EX', '604800', (err,result) => {
                      if (err) {
                        res.writeHead(500, {"Content-Type": "text/html"});
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
            res.writeHead(500, {"Content-Type": "text/html"});
            res.end();
          }
        }
      })
    }
  });
}
function setlanguage(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', setlang)
  function setlang(chunk) {
    req.removeListener('data',setlang);
    const postcontent = querystring.parse(chunk.toString())
    if (typeof postcontent === 'object') {
      if (typeof postcontent.lang !== 'undefined' && postcontent.lang.length === 2 && typeof languages[postcontent.lang] !== 'undefined') {
        // Check that the referer is from https://chessil.com
        if (typeof req.headers.referer !== 'undefined' && req.headers.referer.slice(0,domainname.length) === domainname) {
	  resHeaders["Location"] = req.headers.referer.slice(domainname.length)
          // Accepted set language. Update in session...
          sessiondata[3] = postcontent.lang
          redis.set(req.headers['cookie'].slice(2), sessiondata[0]+' '+sessiondata[1]+' '+sessiondata[2]+' '+sessiondata[3]+' '+sessiondata[4]+' '+sessiondata[5]+' '+sessiondata.slice(6).join(), 'EX', '604800', (err,result) => {
            if (err) {
              res.writeHead(500, {"Content-Type": "text/html"});
              res.end();
              console.error(err);
            } else {
              // Check if logged in as a user, and write preference in database if so.
              if (sessiondata[1] !== '0') {
                var client = new pg.Client(conString);
                client.connect();
                client.query('UPDATE users SET language = $1 WHERE id = $2', [sessiondata[3],sessiondata[1]], (err, response)=>{
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
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          console.log('Strange referer or non existent')
          return;
	}
      } else {
        res.writeHead(500, {"Content-Type": "text/html"});
        res.end();
        console.log('postcontent without lang or erratic length, or trying an undefined language... this is not normal user behaviour, but rather a custom packet send')
        return;
      }
    } else {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.log('postcontent not fully defined, this is not normal user behaviour, but rather a custom packet send')
      return;
    }
  }
}

function wsauth(filename,mime,ext,res,req,resHeaders,sessiondata){
  if (typeof req.headers['authorization'] === 'undefined' || req.headers['authorization'] !== websocketpassword || typeof websocketserver[req.headers['x-real-ip']] === 'undefined' ){
    res.writeHead(401, {"Content-Type": "text/html"});
    res.end();
    return;
  }
  req.on('data', wsdata)
  function wsdata(chunk) {
    req.removeListener('data',wsdata);
    const postcontent = chunk.toString()
    
    if (typeof postcontent === 'string' && postcontent.length === 34 && postcontent.slice(0,2) === 's='){
      redis.get(postcontent.slice(2),(err,result) => {
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          console.error(err);
        } else {
          if (result === null){
            res.writeHead(404, {"Content-Type": "text/html"});
            res.end();
          } else {
            res.writeHead(200, {"Content-Type": "text/html"});
            res.end(result);
          }
        }
      })
    } else {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}
// tcs is used for validating seek insertion values
const tcs = {}
const validtimes = [0,0.25,0.5,0.75,1,1.5,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25,30,35,40,45,60,75,90,105,120,135,150,165,180]
const validincrs = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25,30,35,40,45,60,90,120,150,180]
const validmodes = ['r','u']
const validcolours = ['r','w','b']
for (var i = validtimes.length; i--;){
  for (var j = validincrs.length; j--;){
    if (validtimes[i] !== 0 || validincrs[j] !== 0) {
      for (var k = validmodes.length; k--;){
        for (var l = validcolours.length; l--;){
          tcs[validtimes[i] + '+' + validincrs[j] + validmodes[k] + validcolours[l]] = 1
        }
      }
    }
  }
}
function usergames(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', getusergames)
  function getusergames(chunk) {
    req.removeListener('data',getusergames);
    const postcontent = querystring.parse(chunk.toString())
    if (typeof postcontent === 'object' && (typeof postcontent.u === 'string' && parseInt(postcontent.p) > 0) && typeof{all:1,rated:1,win:1,loss:1,draw:1,playing:1}[postcontent.q] !== 'undefined') {
      if (usernameregex.test(postcontent.u) !== false) {
        // User input validated
        var client = new pg.Client(conString);
        client.connect();
        client.query('SELECT g.gameid, g.gameserver, g.moves, g.rated, g.state, g.result, g.initialtime, g.increment, ROUND(g.rating1) as r1, ROUND(g.rating2) as r2, ROUND(g.ratingdiff1) as d1, ROUND(g.ratingdiff2) as d2, g.created, w.username as w, b.username as b FROM games g LEFT JOIN users w ON w.id = g.userid1 LEFT JOIN users b ON b.id = g.userid2 WHERE '+{all:'',rated:'g.rated is true AND ',win:'((w.canonical = $1 AND g.result = true) OR (b.canonical = $1 AND g.result = false)) AND ',loss:'((w.canonical = $1 AND g.result = false) OR (b.canonical = $1 AND g.result = true)) AND ',draw:'g.state != 0 AND g.result is null AND ', playing:'g.state = 0 AND '}[postcontent.q]+'(w.canonical = $1 OR b.canonical = $1) ORDER BY g.created DESC LIMIT 7 OFFSET $2', [postcontent.u.toLowerCase(), 7*postcontent.p - 7], (err, response)=>{
          if (err) {
            res.writeHead(500, {"Content-Type": "text/html"});
            res.end();
            client.end();
            console.log(err);
            return
          }
          const games = []
          for (var i = response.rows.length; i--;) {
            const re = response.rows[i]
            games.unshift({i:re.gameid,s:re.gameserver,m:re.moves,r:re.rated,f:re.state,e:re.result,t:re.initialtime,n:re.increment,d:re.created,w:re.w,b:re.b,v:re.r1,x:re.r2,y:re.d1,z:re.d2})
          }
          res.writeHead(200, {"Content-Type": "text/javascript"});
          res.end(JSON.stringify(games))
          client.end()
        })
      } else {
        res.writeHead(400, {"Content-Type": "text/html"});
        res.end();
        return;
      }
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}
function usergamecount(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', getusergamecount)
  function getusergamecount(chunk) {
    req.removeListener('data',getusergamecount);
//     xhr.send('u='+userid+'&t='+tc+'&w='+wdl+'&r='+rated+'&f='+finished)
    const postcontent = querystring.parse(chunk.toString())
    if (typeof postcontent === 'object' 
     && typeof postcontent.u === 'string' 
     && typeof{all:1,ultrabullet:1,bullet:1,blitz:1,rapid:1,classical:1}[postcontent.t] !== 'undefined'
     && typeof{all:1,win:1,loss:1,draw:1}[postcontent.w] !== 'undefined'
     && typeof{all:1,true:1,false:1}[postcontent.r] !== 'undefined'
     && typeof{all:1,true:1,false:1}[postcontent.f] !== 'undefined'
    ) {
      if (usernameregex.test(postcontent.u) !== false) {
        // User input validated
        var client = new pg.Client(conString);
        client.connect();
        client.query('SELECT count(g.id) as n FROM games g LEFT JOIN users w ON w.id = g.userid1 LEFT JOIN users b ON b.id = g.userid2 WHERE '
+{all:'', true:'g.state != 0 AND ', false:'g.state = 0 AND '}[postcontent.f]
+{all:'', true:'g.rated is true AND ', false:'g.rated is false AND '}[postcontent.r]
+{all:'', 
  win:'((w.canonical = $1 AND g.result = true) OR (b.canonical = $1 AND g.result = false)) AND ', 
  loss:'((w.canonical = $1 AND g.result = false) OR (b.canonical = $1 AND g.result = true)) AND ',
  draw:'g.state != 0 AND g.result is null AND '
  }[postcontent.w]
+{all:'', 
  ultrabullet:'g.initialtime*60+g.increment*40 <= 15 AND ',
  bullet:'g.initialtime*60+g.increment*40 <= 180 AND g.initialtime*60+g.increment*40 > 15 AND ',
  blitz:'g.initialtime*60+g.increment*40 <= 480 AND g.initialtime*60+g.increment*40 > 180 AND ',
  rapid:'g.initialtime*60+g.increment*40 <= 1500 AND g.initialtime*60+g.increment*40 > 480 AND ',
  classical:'g.initialtime*60+g.increment*40 > 1500 AND '
  }[postcontent.t]
+'(w.canonical = $1 OR b.canonical = $1)', [postcontent.u.toLowerCase()], (err, response)=>{
          if (err) {
            res.writeHead(500, {"Content-Type": "text/html"});
            res.end();
            client.end();
            console.log(err);
            return
          }
          if (response.rows.length === 1) {
            const re = response.rows[0]
            res.writeHead(200, {"Content-Type": "text/javascript"});
            res.end(re.n)
          }
          client.end()
        })
      } else {
        res.writeHead(400, {"Content-Type": "text/html"});
        res.end();
        return;
      }
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}
function userlivegamecount(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', getusergamecount)
  function getusergamecount(chunk) {
    req.removeListener('data',getusergamecount);
    const postcontent = chunk.toString();
    if (usernameregex.test(postcontent) !== false) {
      // User input validated
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT count(g.id) as n FROM games g LEFT JOIN users w ON w.id = g.userid1 LEFT JOIN users b ON b.id = g.userid2 WHERE g.state = 0 AND (w.canonical = $1 OR b.canonical = $1)', [postcontent.toLowerCase()], (err, response)=>{
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          client.end();
          console.log(err);
          return
        }
        if (response.rows.length === 1) {
          const re = response.rows[0]
          res.writeHead(200, {"Content-Type": "text/javascript"});
          res.end(re.n)
        }
        client.end()
      })
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}
/*
function usergamecount(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', getusergamecount)
  function getusergamecount(chunk) {
    req.removeListener('data',getusergamecount);
    const postcontent = chunk.toString();
    if (usernameregex.test(postcontent) !== false) {
      // User input validated
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT ultrabullet_win as a, ultrabullet_draw as b, ultrabullet_loss as c, bullet_win as d, bullet_draw as e, bullet_loss as f, blitz_win as g, blitz_draw as h, blitz_loss as i, rapid_win as j, rapid_draw as k, rapid_loss as l, classical_win as m, classical_draw as n, classical_loss as o, unrated_win as p, unrated_draw as q, unrated_loss as r FROM users WHERE canonical = $1', [postcontent.toLowerCase()], (err, response)=>{
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          client.end();
          console.log(err);
          return
        }
        if (response.rows.length === 1) {
          const re = response.rows[0]
          res.writeHead(200, {"Content-Type": "text/javascript"});
          res.end(JSON.stringify({a:re.a,b:re.b,c:re.c,d:re.d,e:re.e,f:re.f,g:re.g,h:re.h,i:re.i,j:re.j,k:re.k,l:re.l,m:re.m,n:re.n,o:re.o,p:re.p,q:re.q,r:re.r}))
        }
        client.end()
      })
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}*/
function userratings(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', ff)
  function ff(chunk) {
    req.removeListener('data',ff);
    const postcontent = chunk.toString();
    if (usernameregex.test(postcontent) !== false) {
      // User input validated
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT ROUND(ultrabullet_rating) as a, ROUND(bullet_rating) as b, ROUND(blitz_rating) as c, ROUND(rapid_rating) as d, ROUND(classical_rating) as e FROM users WHERE canonical = $1', [postcontent.toLowerCase()], (err, response)=>{
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          client.end();
          console.log(err);
          return
        }
        if (response.rows.length === 1) {
          const re = response.rows[0]
          res.writeHead(200, {"Content-Type": "text/javascript"});
          res.end(JSON.stringify({a:re.a,b:re.b,c:re.c,d:re.d,e:re.e}))
        }
        client.end()
      })
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}
function gamedata(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', getgameinfo)
  function getgameinfo(chunk) {
    req.removeListener('data',getgameinfo);
    const postcontent = chunk.toString();
    if (gameidregex.test(postcontent) !== false) {
      // User input validated
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT id, gameid, moves, clock, events, eventsclock, result, ROUND(ratingdiff1) as ratingdiff1, ROUND(ratingdiff2) as ratingdiff2, clock1, clock2 FROM games WHERE gameid = $1', [postcontent], (err, response)=>{
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          client.end();
          console.log(err);
          return
        }
        if (response.rows.length === 1) {
          const re = response.rows[0]
          res.writeHead(200, {"Content-Type": "text/javascript"});
          res.end(JSON.stringify({m:re.moves,c:re.clock,e:re.events,d:re.eventsclock,r:re.result,w:re.ratingdiff1,b:re.ratingdiff2,t:re.clock1,u:re.clock2}))
        }
        client.end()
      })
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}
function insertseek(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', timecontrol)
  function timecontrol(chunk) {
    req.removeListener('data',timecontrol);
    const postcontent = chunk.toString();
    if (typeof tcs[postcontent] !== 'undefined') {
      // User input validated
      const colour = postcontent.slice(-1)
      const rated = postcontent.slice(-2,-1)
      const tc = postcontent.slice(0,-2).split('+')
      if (tc[0] == 0 && tc[1] == 0) {
        res.writeHead(400, {"Content-Type": "text/html"});
        res.end();
        return
      }
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          console.log(err);
        } else {
          var seekid = buf.toString('hex')
          var client = new pg.Client(conString);
          client.connect();
          client.query('INSERT INTO seeks (id,seekid,sessionid,userid,initialtime,increment,rated,side,created) VALUES (DEFAULT,$1,$2,$3,$4,$5,$6,$7,NOW())', [seekid,req.headers['cookie'].slice(2),sessiondata[1],tc[0],tc[1],{'r':true,'u':false}[rated],{'r':null,'w':true,'b':false}[colour]], (err, response)=>{
            if (err) {
              res.writeHead(500, {"Content-Type": "text/html"});
              res.end();
              client.end();
              console.log(err);
              return
            } else {
              // Seek creation successful return 200 code
              res.writeHead(200, {"Content-Type": "text/html"});
              res.end(seekid);
              client.end()
            }
          })
        }
      })
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}
function inserttargetedseek(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', timecontrol)
  function timecontrol(chunk) {
    req.removeListener('data',timecontrol);
    const pcnt = chunk.toString().split(':');
    const postcontent = pcnt[0]
    const target = pcnt[1]
    if (typeof tcs[postcontent] !== 'undefined' && usernameregex.test(target) === true) {
      // User input validated
      const colour = postcontent.slice(-1)
      const rated = postcontent.slice(-2,-1)
      const tc = postcontent.slice(0,-2).split('+')
      if (tc[0] == 0 && tc[1] == 0) {
        res.writeHead(400, {"Content-Type": "text/html"});
        res.end();
        return
      }
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          console.log(err);
        } else {
          var seekid = buf.toString('hex')
          var client = new pg.Client(conString);
          client.connect();
          client.query('INSERT INTO seeks (id,seekid,sessionid,userid,initialtime,increment,rated,side,target,created) VALUES (DEFAULT,$1,$2,$3,$4,$5,$6,$7,$8,NOW())', [seekid,req.headers['cookie'].slice(2),sessiondata[1],tc[0],tc[1],{'r':true,'u':false}[rated],{'r':null,'w':true,'b':false}[colour],target], (err, response)=>{
            if (err) {
              res.writeHead(500, {"Content-Type": "text/html"});
              res.end();
              client.end();
              console.log(err);
              return
            } else {
              // Seek creation successful return 200 code
              res.writeHead(200, {"Content-Type": "text/html"});
              res.end(seekid);
              client.end()
            }
          })
        }
      })
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}
function insertacceptedseek(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', timecontrol)
  function timecontrol(chunk) {
    req.removeListener('data',timecontrol);
    const pcnt = chunk.toString().split(':');
    const postcontent = pcnt[0]
    const target = pcnt[1] // target is now the original seek
    if (typeof tcs[postcontent] !== 'undefined' && randidregex.test(target) === true) {
      // User input validated
      const colour = postcontent.slice(-1)
      const rated = postcontent.slice(-2,-1)
      const tc = postcontent.slice(0,-2).split('+')
      if (tc[0] == 0 && tc[1] == 0) {
        res.writeHead(400, {"Content-Type": "text/html"});
        res.end();
        return
      }
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          console.log(err);
        } else {
          var seekid = buf.toString('hex')
          var client = new pg.Client(conString);
          client.connect();
          client.query('INSERT INTO seeks (id,seekid,sessionid,userid,initialtime,increment,rated,side,acceptedseek,created) VALUES (DEFAULT,$1,$2,$3,$4,$5,$6,$7,$8,NOW())', [seekid,req.headers['cookie'].slice(2),sessiondata[1],tc[0],tc[1],{'r':true,'u':false}[rated],{'r':null,'w':true,'b':false}[colour],target], (err, response)=>{
            if (err) {
              res.writeHead(500, {"Content-Type": "text/html"});
              res.end();
              client.end();
              console.log(err);
              return
            } else {
              // Seek creation successful return 200 code
              res.writeHead(200, {"Content-Type": "text/html"});
              res.end(seekid);
              client.end()
            }
          })
        }
      })
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}
function getuserseeks(filename,mime,ext,res,req,resHeaders,sessiondata){
  var client = new pg.Client(conString);
  client.connect();
  client.query('SELECT s.seekid,s.initialtime,s.increment,s.rated,s.side,s.gameid,s.created, u.username, t.username as target FROM seeks s LEFT JOIN users u ON u.id = s.userid LEFT JOIN users t ON t.username = s.target WHERE s.gameid is null AND (u.username is null OR u.username != t.username) AND (s.sessionid = $1 OR( u.username is not null AND s.userid = $2) OR t.id = $2)', [req.headers['cookie'].slice(2),sessiondata[1]], (err, response)=>{
 // client.query('SELECT s.seekid,s.initialtime,s.increment,s.rated,s.side,s.gameid,s.created, u.username, t.username as target FROM seeks s LEFT JOIN users u ON u.id = s.userid LEFT JOIN users t ON t.username = s.target WHERE s.gameid is null AND (s.sessionid = $1 OR s.userid = $2 OR t.id = $2)', [req.headers['cookie'].slice(2),sessiondata[1]], (err, response)=>{
    if (err) {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      client.end();
      console.log(err);
      return
    } else {
      // Seek creation successful return 200 code
      const resp = []
      const rr = response.rows
      for (var i = rr.length; i--;){
        resp.unshift(rr[i])
      }
      res.writeHead(200, {"Content-Type": "text/javascript"});
      res.end(JSON.stringify(resp));
      client.end();
      return;
    }
  })
}
function cancelseek(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', seekid)
  function seekid(chunk) {
    req.removeListener('data',seekid);
    const postcontent = chunk.toString();
    if (randidregex.test(postcontent) === true) {
      // User input validated
      var client = new pg.Client(conString);
      client.connect();
      client.query('DELETE FROM seeks WHERE seekid = $1', [postcontent], (err, response)=>{
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          client.end();
          console.log(err);
          return
        }
        // Sucessfuly deleted seek
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end();
        client.end()
        return
      })
    }
  }
}
function lightmode(filename,mime,ext,res,req,resHeaders,sessiondata){
  sessiondata[2] = 'l'
  redis.set(req.headers['cookie'].slice(2), sessiondata[0]+' '+sessiondata[1]+' '+sessiondata[2]+' '+sessiondata[3]+' '+sessiondata[4]+' '+sessiondata[5]+' '+sessiondata.slice(6).join(), 'EX', '604800', (err,result) => {
    if (err) {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.error(err);
    } else {
      // Check if logged in as a user, and write preference in database if so.
      if (sessiondata[1] !== '0') {
        var client = new pg.Client(conString);
        client.connect();
        client.query('UPDATE users SET theme = $1 WHERE id = $2', [sessiondata[2],sessiondata[1]], (err, response)=>{
          client.end()
          res.writeHead(200, {"Content-Type": "text/html"});
          res.end();
        })
      } else {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end();
      }
    }
  });
}
function darkmode(filename,mime,ext,res,req,resHeaders,sessiondata){
  sessiondata[2] = 'd'
  redis.set(req.headers['cookie'].slice(2), sessiondata[0]+' '+sessiondata[1]+' '+sessiondata[2]+' '+sessiondata[3]+' '+sessiondata[4]+' '+sessiondata[5]+' '+sessiondata.slice(6).join(), 'EX', '604800', (err,result) => {
    if (err) {
      res.writeHead(500, {"Content-Type": "text/html"});
      res.end();
      console.error(err);
    } else {
      // Check if logged in as a user, and write preference in database if so.
      if (sessiondata[1] !== '0') {
        var client = new pg.Client(conString);
        client.connect();
        client.query('UPDATE users SET theme = $1 WHERE id = $2', [sessiondata[2],sessiondata[1]], (err, response)=>{
          client.end()
          res.writeHead(200, {"Content-Type": "text/html"});
          res.end();
        })
      } else {
        res.writeHead(200, {"Content-Type": "text/html"});
        res.end();
      }
    }
  });
}
function pairseeks(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', seekid)
  function seekid(chunk) {
    req.removeListener('data',seekid);
    const postcontent = chunk.toString();
    if (randidregex.test(postcontent) === true) {
      // User input validated
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT s.seekid, s.initialtime, s.increment, s.rated, s.side, s.userid, s.gameid, s.created, s.sessionid, c.ws0, c.ws1, u.ultrabullet_rating, u.bullet_rating, u.blitz_rating, u.rapid_rating, u.classical_rating, u.ultrabullet_deviation, u.bullet_deviation, u.blitz_deviation, u.rapid_deviation, u.classical_deviation, u.ultrabullet_volatility, u.bullet_volatility, u.blitz_volatility, u.rapid_volatility, u.classical_volatility FROM seeks s LEFT JOIN connections c ON c.sessionid = s.sessionid LEFT JOIN users u ON u.id = s.userid WHERE s.seekid = $1 AND s.target is null AND s.acceptedseek is null', [postcontent], (err, response)=>{
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          client.end();
          console.log(err);
          return
        }
        if (response.rows.length === 1) {
        // Select was good, seek is found
          const re = response.rows[0]
          if (re.gameid !== null) {
            // The seek is paired already, do a SELECT of games to confirm it has been created
            client.query('SELECT gameid, gameserver FROM games WHERE gameid = $1', [re.gameid], (err, resp)=>{
              if (err) {
                res.writeHead(500, {"Content-Type": "text/html"});
                res.end();
                client.end();
                console.log(err);
                return
              }
              if (resp.rows.length === 1) {
                // Check on the gameserver... if game ready, forward to it
                const myURL = new URL('https://ws'+resp.rows[0].gameserver+'.chessil.com/game')
                const options = {
                  hostname: myURL.hostname,
                  port: 443,
                  path: myURL.pathname,
                  method: 'POST',
                  headers: {
                    'authorization': 'fds3DRvdnoqwerr3565tfdaERTYRev4gFRTR5P8Zbnerw123fd63',
                    'gn': re.gameid,
                  }
                };

                const newreq = https.request(options, (newres) => {
                  if (newres.statusCode === 200) {
                    // Sucessfuly created new game
                    res.writeHead(201, {"Content-Type": "text/html"});
                    res.end(domainname+'/game/'+resp.rows[0].gameid);
                    client.end()
                    return
                  } else {
                    // Game not yet created in the gameserver. Retry
                    res.writeHead(202, {"Content-Type": "text/html"});
                    res.end();
                    client.end()
                    return
                  }
                });
                newreq.on('error', (e) => {
                  // Error,
                    res.writeHead(500, {"Content-Type": "text/html"});
                    res.end();
                    client.end()
                    return
                });
                newreq.end();
	      } else {
                // Game not found in table games, means it is just paired up but not yet created. Retry
                res.writeHead(202, {"Content-Type": "text/html"});
                res.end();
                client.end()
                return
	      }
	    
	    })
	  } else {
            // No gameid yet, time to find a pairing to make a game, and insert it into games
            var Arated = re.rated
            var Auserid = re.userid
            var Aws0 = re.ws0
            var Aws1 = re.ws1
            var Acreated = re.created
            var Ainitialtime = parseInt(re.initialtime)
            var Aincrement = parseInt(re.increment)
            var Aside = re.side
            var Aseekid = re.seekid
            // Determine the rating mode ultrabullet, bullet or blitz etc.
            var totaltime = Ainitialtime*60 + Aincrement*40
            var ratingmode = 'classical'
            if (totaltime <= 1500) ratingmode = 'rapid'
            if (totaltime <= 480) ratingmode = 'blitz'
            if (totaltime <= 180) ratingmode = 'bullet'
            if (totaltime <= 15) ratingmode = 'ultrabullet'
            var dbratingcol = ratingmode+'_rating'
            var Arating = 1*(re[ratingmode+'_rating'])
            var Adeviation = 1*(re[ratingmode+'_deviation'])
            var Avolatility = 1*(re[ratingmode+'_volatility'])
            var ratingrange = 2*Adeviation
            var targetside = {true:false,false:true,null:null}[Aside]

            if (Arated === true) {
              //rated game
              client.query('SELECT s.seekid, c.ws0, c.ws1, s.userid, u.'+dbratingcol+', u.'+ratingmode+'_deviation, u.'+ratingmode+'_volatility FROM seeks s LEFT JOIN connections c ON c.sessionid = s.sessionid LEFT JOIN users u ON u.id = s.userid WHERE s.rated is true AND s.side is '+targetside+' AND s.initialtime = $1 AND s.increment = $2 AND s.sessionid != $3 AND s.userid != $4 AND s.userid != 0 AND s.gameid is null AND u.'+dbratingcol+' <= $5 AND u.'+dbratingcol+' >= $6 AND (u.'+dbratingcol+' + u.'+ratingmode+'_deviation * 2) >= $7 AND (u.'+dbratingcol+' - u.'+ratingmode+'_deviation * 2) <= $7 AND s.target is null AND s.acceptedseek is null ORDER BY s.created ASC LIMIT 9', [Ainitialtime,Aincrement,req.headers['cookie'].slice(2),Auserid,Arating+ratingrange, Arating-ratingrange,Arating], (err, Bdata)=>{
                if (err) {
                  res.writeHead(500, {"Content-Type": "text/html"});
                  res.end();
                  client.end();
                  console.log(err);
                  return
                }
                if (Bdata.rows.length === 0) {
                  // Found nobody. keep trying
                  res.writeHead(202, {"Content-Type": "text/html"});
                  res.end();
                  client.end()
                  return
		} else {
                  // Found candidates (Bs)
                  const nB = Bdata.rows.length
                  var minallowedlatency = {'classical':700,'rapid':500,'blitz':400,"bullet":350,'ultrabullet':300}[ratingmode]
                  var Bd = null
                  var gameserver = null
                  for (var i = 0; i < nB; ++i){
                    const rttArray = []
                    const rttMap = {}
                    Bd = Bdata.rows[i]
                    if (Aws0 !== null && Bd.ws0 !== null) {
                      const rtt0 = 1*Aws0 + 1*Bd.ws0
                      rttArray.push(rtt0)
                      rttMap[rtt0] = 0
		    }
                    if (Aws1 !== null && Bd.ws1 !== null) {
                      const rtt1 = 1*Aws1 + 1*Bd.ws1
                      rttArray.push(rtt1)
                      rttMap[rtt1] = 1
		    }
                    // Determining game server with lowest latency for both parties
                    const minrtt = Math.min.apply(Math, rttArray)
                    if (minrtt < minallowedlatency) {
                      gameserver = rttMap[minrtt]
                      break; // First decent found for the timecontrol is a deal, because this B had been waiting for the longest time
                    }
                  }
                  // If none found, keep waiting
                  if (gameserver === null){
                    res.writeHead(202, {"Content-Type": "text/html"});
                    res.end();
                    client.end();
                    return
                  }
                  // Random game name
                  var gamename = randomString(9, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
                  client.query('UPDATE seeks SET gameid = $1 WHERE seekid = $2 OR seekid = $3 AND gameid is null', [gamename, Bd.seekid, Aseekid], (err, respons) =>{
                    if (err) {
                      res.writeHead(500, {"Content-Type": "text/html"});
                      res.end();
                      client.end();
                      console.log(err);
                      return
                    }
		    if (respons.rowCount === 2) {
                      // Both seeks got their game normally 
                      // Determining random side, 
                      crypto.randomBytes(1, (err, buf) => {
                        if (err) {
                          res.writeHead(500, {"Content-Type": "text/html"});
                          res.end();
                          client.end();
                          console.log(err);
                          return
                        }
                        var singlehex = buf.toString('hex')
                        var whiteplayer = Auserid
                        var blackplayer = Bd.userid
                        var whiterating = Arating
                        var blackrating = Bd[dbratingcol]
                        var whitedeviation = Adeviation
                        var blackdeviation = Bd[ratingmode+'_deviation']
                        var whitevolatility = Avolatility
                        var blackvolatility = Bd[ratingmode+'_volatility']

                        if (Aside === false || (Aside === null && buf.toString('hex') < 8)){
                          // Give B White, A Black if A chose black, or got black by chance
                          whiteplayer = Bd.userid 
                          blackplayer = Auserid 
                          whiterating = Bd[dbratingcol]
                          blackrating = Arating 
                          whitedeviation = Bd[ratingmode+'_deviation']
                          blackdeviation = Adeviation
                          whitevolatility = Bd[ratingmode+'_volatility']
                          blackvolatility = Avolatility
                        }
                        client.query('INSERT INTO games (id, gameid, userid1, userid2, gameserver, rated, state, initialtime, increment, rating1, rating2, created) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())', [gamename, whiteplayer, blackplayer,gameserver,true,0,Ainitialtime,Aincrement,whiterating,blackrating], (err, nginsertion)=>{
                          if (err) {
                            client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                              if (err) {
                                // A cron deletes all seeks older than 1 hour
                                res.writeHead(500, {"Content-Type": "text/html"});
                                res.end();
                                client.end();
                                console.log(err);
                                return
                              }
                              res.writeHead(202, {"Content-Type": "text/html"});
                              res.end();
                              client.end();
                              console.log(err);
                              return
                            })
                          }
                          if (nginsertion.rowCount === 1){
                            const myURL = new URL('https://ws'+gameserver+'.chessil.com/ng')
                            const options = {
                              hostname: myURL.hostname,
                              port: 443,
                              path: myURL.pathname,
                              method: 'POST',
                              headers: {
                                'authorization': '6y5gFD345resdfgdfh45yppcmaqzj92Eesac3534565yfdSR23',
                                'gn': gamename,
                                'w': whiteplayer,
                                'b': blackplayer,
                                'wt': Ainitialtime,
                                'bt': Ainitialtime,
                                'wi': Aincrement,
                                'bi': Aincrement,
                                'wr': whiterating,
                                'br': blackrating,
                                'wd': whitedeviation,
                                'bd': blackdeviation,
                                'wv': whitevolatility,
                                'bv': blackvolatility,
                              }
                            };

                            const newreq = https.request(options, (newres) => {
                              if (newres.statusCode !== 200) {
                                // Error, also delete from games table
                                client.query('DELETE FROM games WHERE gameid = $1', [gamename], (err, respon) =>{
                                  if (err) {
                                    res.writeHead(500, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  }
                                  client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                                    if (err) {
                                      res.writeHead(500, {"Content-Type": "text/html"});
                                      res.end();
                                      client.end();
                                      console.log(err);
                                      return
                                    }
                                    res.writeHead(202, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  })
                                })
                              } else {
                                // Sucessfuly created new game
                                res.writeHead(201, {"Content-Type": "text/html"});
                                res.end(domainname+'/game/'+gamename);
                                client.end()
                                return
                              }
                            });
                            newreq.on('error', (e) => {
                              // Error, delete also inserted game in games table
                              client.query('DELETE FROM games WHERE gameid = $1', [gamename], (err, respon) =>{
                                if (err) {
                                  res.writeHead(500, {"Content-Type": "text/html"});
                                  res.end();
                                  client.end();
                                  console.log(err);
                                  return
                                }
                                client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                                  if (err) {
                                    res.writeHead(500, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  }
                                  res.writeHead(202, {"Content-Type": "text/html"});
                                  res.end();
                                  client.end();
                                  console.log(err);
                                  return
                                })
                              })
                              return
                            });
                            newreq.end();
                          } else {
                            // Very rare failure of duplicated gameid UPDATE A and B with NULL where gameid is gameID. Respond with code 202. DELETE unstarted games from time to time by cron
                            client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                              if (err) {
                                res.writeHead(500, {"Content-Type": "text/html"});
                                res.end();
                                client.end();
                                console.log(err);
                                return
                              }
                              res.writeHead(202, {"Content-Type": "text/html"});
                              res.end();
                              client.end();
                              console.log(err);
                              return
                            })
			  }
                        })
                      })
		    } else {
                      // At least 1 seek got assigned first. Another person won the race so we roll back
                      client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                        if (err) {
                          res.writeHead(500, {"Content-Type": "text/html"}); 
                          res.end();
                          client.end();
                          console.log(err);
                          return
                        }
                        res.writeHead(202, {"Content-Type": "text/html"});
                        res.end();
                        client.end();
                        console.log(err);
                        return
                      })
		    }
                  })
                }
              })
	    } else {
              //unrated game TODO
              client.query('SELECT s.seekid, c.ws0, c.ws1, s.userid, s.sessionid FROM seeks s LEFT JOIN connections c ON c.sessionid = s.sessionid WHERE s.rated is false AND s.side is '+targetside+' AND s.initialtime = $1 AND s.increment = $2 AND s.sessionid != $3 AND (s.userid != $4 OR s.userid = 0) AND s.gameid is null AND s.target is null AND s.acceptedseek is null ORDER BY s.created ASC LIMIT 9', [Ainitialtime,Aincrement,req.headers['cookie'].slice(2),Auserid], (err, Bdata)=>{
                if (err) {
                  res.writeHead(500, {"Content-Type": "text/html"});
                  res.end();
                  client.end();
                  console.log(err);
                  return
                }
                if (Bdata.rows.length === 0) {
                  // Found nobody. keep trying
                  res.writeHead(202, {"Content-Type": "text/html"});
                  res.end();
                  client.end()
                  return
		} else {
                  // Found candidates (Bs)
                  const nB = Bdata.rows.length
                  var minallowedlatency = {'classical':700,'rapid':500,'blitz':400,"bullet":350,'ultrabullet':300}[ratingmode]
                  var Bd = null
                  var gameserver = null
                  for (var i = 0; i < nB; ++i){
                    const rttArray = []
                    const rttMap = {}
                    Bd = Bdata.rows[i]
                    if (Aws0 !== null && Bd.ws0 !== null) {
                      const rtt0 = 1*Aws0 + 1*Bd.ws0
                      rttArray.push(rtt0)
                      rttMap[rtt0] = 0
		    }
                    if (Aws1 !== null && Bd.ws1 !== null) {
                      const rtt1 = 1*Aws1 + 1*Bd.ws1
                      rttArray.push(rtt1)
                      rttMap[rtt1] = 1
		    }
                    // Determining game server with lowest latency for both parties
                    const minrtt = Math.min.apply(Math, rttArray)
                    if (minrtt < minallowedlatency) {
                      gameserver = rttMap[minrtt]
                      break; // First decent found for the timecontrol is a deal, because this B had been waiting for the longest time
                    }
                  }
                  // If none found, keep waiting
                  if (gameserver === null){
                    res.writeHead(202, {"Content-Type": "text/html"});
                    res.end();
                    client.end();
                    return
                  }
                  // Random game name
                  var gamename = randomString(9, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
                  client.query('UPDATE seeks SET gameid = $1 WHERE seekid = $2 OR seekid = $3 AND gameid is null', [gamename, Bd.seekid, Aseekid], (err, respons) =>{
                    if (err) {
                      res.writeHead(500, {"Content-Type": "text/html"});
                      res.end();
                      client.end();
                      console.log(err);
                      return
                    }
		    if (respons.rowCount === 2) {
                      // Both seeks got their game normally 
                      // Determining random side, 
                      crypto.randomBytes(1, (err, buf) => {
                        if (err) {
                          res.writeHead(500, {"Content-Type": "text/html"});
                          res.end();
                          client.end();
                          console.log(err);
                          return
                        }
                        var singlehex = buf.toString('hex')
                        var whiteplayer = Auserid
                        var blackplayer = Bd.userid
                        var whitesessid = re.sessionid
                        var blacksessid = Bd.sessionid

                        if (Aside === false || (Aside === null && buf.toString('hex') < 8)){
                          // Give B White, A Black if A chose black, or got black by chance
                          whiteplayer = Bd.userid 
                          blackplayer = Auserid 
                          whitesessid = Bd.sessionid
                          blacksessid = re.sessionid
                        }
			if (whiteplayer != 0) whitesessid = null
			if (blackplayer != 0) blacksessid = null
                        client.query('INSERT INTO games (id, gameid, userid1, userid2, gameserver, rated, state, initialtime, increment, created, session1, session2) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)', [gamename, whiteplayer, blackplayer,gameserver,false,0,Ainitialtime,Aincrement,whitesessid,blacksessid], (err, nginsertion)=>{
                          if (err) {
                            client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                              if (err) {
                                // A cron deletes all seeks older than 1 hour
                                res.writeHead(500, {"Content-Type": "text/html"});
                                res.end();
                                client.end();
                                console.log(err);
                                return
                              }
                              res.writeHead(202, {"Content-Type": "text/html"});
                              res.end();
                              client.end();
                              console.log(err);
                              return
                            })
                          }
                          if (nginsertion.rowCount === 1){
                            if (whiteplayer == 0) whiteplayer = whitesessid
                            if (blackplayer == 0) blackplayer = blacksessid
                            const myURL = new URL('https://ws'+gameserver+'.chessil.com/ng')
                            const options = {
                              hostname: myURL.hostname,
                              port: 443,
                              path: myURL.pathname,
                              method: 'POST',
                              headers: {
                                'authorization': '6y5gFD345resdfgdfh45yppcmaqzj92Eesac3534565yfdSR23',
                                'gn': gamename,
                                'w': whiteplayer,
                                'b': blackplayer,
                                'wt': Ainitialtime,
                                'bt': Ainitialtime,
                                'wi': Aincrement,
                                'bi': Aincrement,
                                'wr': '-1',
                                'br': '-1',
                                'wd': '-1',
                                'bd': '-1',
                                'wv': '-1',
                                'bv': '-1',
                              }
                            };

                            const newreq = https.request(options, (newres) => {
                              if (newres.statusCode !== 200) {
                                // Error, also delete from games table
                                client.query('DELETE FROM games WHERE gameid = $1', [gamename], (err, respon) =>{
                                  if (err) {
                                    res.writeHead(500, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  }
                                  client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                                    if (err) {
                                      res.writeHead(500, {"Content-Type": "text/html"});
                                      res.end();
                                      client.end();
                                      console.log(err);
                                      return
                                    }
                                    res.writeHead(202, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  })
                                })
                              } else {
                                // Sucessfuly created new game
                                res.writeHead(201, {"Content-Type": "text/html"});
                                res.end(domainname+'/game/'+gamename);
                                client.end()
                                return
                              }
                            });
                            newreq.on('error', (e) => {
                              // Error, delete also inserted game in games table
                              client.query('DELETE FROM games WHERE gameid = $1', [gamename], (err, respon) =>{
                                if (err) {
                                  res.writeHead(500, {"Content-Type": "text/html"});
                                  res.end();
                                  client.end();
                                  console.log(err);
                                  return
                                }
                                client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                                  if (err) {
                                    res.writeHead(500, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  }
                                  res.writeHead(202, {"Content-Type": "text/html"});
                                  res.end();
                                  client.end();
                                  console.log(err);
                                  return
                                })
                              })
                              return
                            });
                            newreq.end();
                          } else {
                            // Very rare failure of duplicated gameid UPDATE A and B with NULL where gameid is gameID. Respond with code 202. DELETE unstarted games from time to time by cron
                            client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                              if (err) {
                                res.writeHead(500, {"Content-Type": "text/html"});
                                res.end();
                                client.end();
                                console.log(err);
                                return
                              }
                              res.writeHead(202, {"Content-Type": "text/html"});
                              res.end();
                              client.end();
                              console.log(err);
                              return
                            })
			  }
                        })
                      })
		    } else {
                      // At least 1 seek got assigned first. Another person won the race so we roll back
                      client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                        if (err) {
                          res.writeHead(500, {"Content-Type": "text/html"}); 
                          res.end();
                          client.end();
                          console.log(err);
                          return
                        }
                        res.writeHead(202, {"Content-Type": "text/html"});
                        res.end();
                        client.end();
                        console.log(err);
                        return
                      })
		    }
                  })
                }
              })
	    }
	  }
        } else {
          // Seek not found 
          res.writeHead(404, {"Content-Type": "text/html"});
          res.end();
          client.end()
          return
        }
      })
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}

// Accepting a targeted seek must insert a new seek first, with the same time control as the first one, but with a reference field 'acceptedseekid' to the seekid it answers to
// Then use this function to do the pairing and start the game
function pairtargetedseek(filename,mime,ext,res,req,resHeaders,sessiondata){
  req.on('data', seekid)
  function seekid(chunk) {
    req.removeListener('data',seekid);
    const postcontent = chunk.toString();
    if (randidregex.test(postcontent) === true) {
      // User input validated
      var client = new pg.Client(conString);
      client.connect();
      client.query('SELECT s.seekid, s.initialtime, s.increment, s.rated, s.side, s.userid, s.gameid, s.created, s.sessionid, s.acceptedseek, c.ws0, c.ws1, u.ultrabullet_rating, u.bullet_rating, u.blitz_rating, u.rapid_rating, u.classical_rating, u.ultrabullet_deviation, u.bullet_deviation, u.blitz_deviation, u.rapid_deviation, u.classical_deviation, u.ultrabullet_volatility, u.bullet_volatility, u.blitz_volatility, u.rapid_volatility, u.classical_volatility FROM seeks s LEFT JOIN connections c ON c.sessionid = s.sessionid LEFT JOIN users u ON u.id = s.userid WHERE s.seekid = $1 AND (s.target is not null OR s.acceptedseek is not null)', [postcontent], (err, response)=>{
        if (err) {
          res.writeHead(500, {"Content-Type": "text/html"});
          res.end();
          client.end();
          console.log(err);
          return
        }
        if (response.rows.length === 1) {
        // Select was good, seek is found
          const re = response.rows[0]
          if (re.gameid !== null) {
            // The seek is paired already, do a SELECT of games to confirm it has been created
            client.query('SELECT gameid, gameserver FROM games WHERE gameid = $1', [re.gameid], (err, resp)=>{
              if (err) {
                res.writeHead(500, {"Content-Type": "text/html"});
                res.end();
                client.end();
                console.log(err);
                return
              }
              if (resp.rows.length === 1) {
                // Check on the gameserver... if game ready, forward to it
                const myURL = new URL('https://ws'+resp.rows[0].gameserver+'.chessil.com/game')
                const options = {
                  hostname: myURL.hostname,
                  port: 443,
                  path: myURL.pathname,
                  method: 'POST',
                  headers: {
                    'authorization': 'fds3DRvdnoqwerr3565tfdaERTYRev4gFRTR5P8Zbnerw123fd63',
                    'gn': re.gameid,
                  }
                };

                const newreq = https.request(options, (newres) => {
                  if (newres.statusCode === 200) {
                    // Sucessfuly created new game
                    res.writeHead(201, {"Content-Type": "text/html"});
                    res.end(domainname+'/game/'+resp.rows[0].gameid);
                    client.end()
                    return
                  } else {
                    // Game not yet created in the gameserver. Retry
                    res.writeHead(202, {"Content-Type": "text/html"});
                    res.end();
                    client.end()
                    return
                  }
                });
                newreq.on('error', (e) => {
                  // Error,
                    res.writeHead(500, {"Content-Type": "text/html"});
                    res.end();
                    client.end()
                    return
                });
                newreq.end();
	      } else {
                // Game not found in table games, means it is just paired up but not yet created. Retry
                res.writeHead(202, {"Content-Type": "text/html"});
                res.end();
                client.end()
                return
	      }
	    
	    })
	  } else {
            // No gameid yet, time to find a pairing to make a game, and insert it into games
            var Arated = re.rated
            var Auserid = re.userid
            var Aws0 = re.ws0
            var Aws1 = re.ws1
            var Acreated = re.created
            var Ainitialtime = parseInt(re.initialtime)
            var Aincrement = parseInt(re.increment)
            var Aside = re.side
            var Aseekid = re.seekid
            var Aacceptedseek = re.acceptedseek
            // Determine the rating mode ultrabullet, bullet or blitz etc.
            var totaltime = Ainitialtime*60 + Aincrement*40
            var ratingmode = 'classical'
            if (totaltime <= 1500) ratingmode = 'rapid'
            if (totaltime <= 480) ratingmode = 'blitz'
            if (totaltime <= 180) ratingmode = 'bullet'
            if (totaltime <= 15) ratingmode = 'ultrabullet'
            var dbratingcol = ratingmode+'_rating'
            var Arating = 1*(re[ratingmode+'_rating'])
            var Adeviation = 1*(re[ratingmode+'_deviation'])
            var Avolatility = 1*(re[ratingmode+'_volatility'])
            var ratingrange = 2*Adeviation
            var targetside = {true:false,false:true,null:null}[Aside]

            if (Arated === true) {
              //rated game
              client.query('SELECT s.seekid, c.ws0, c.ws1, s.userid, u.'+dbratingcol+', u.'+ratingmode+'_deviation, u.'+ratingmode+'_volatility FROM seeks s LEFT JOIN connections c ON c.sessionid = s.sessionid LEFT JOIN users u ON u.id = s.userid WHERE s.rated is true AND s.side is '+targetside+' AND s.initialtime = $1 AND s.increment = $2 AND s.sessionid != $3 AND s.userid != $4 AND s.userid != 0 AND s.gameid is null AND (s.acceptedseek = $5 OR s.seekid = $6) ORDER BY s.created ASC LIMIT 9', [Ainitialtime,Aincrement,req.headers['cookie'].slice(2),Auserid,Aseekid,Aacceptedseek], (err, Bdata)=>{
                if (err) {
                  res.writeHead(500, {"Content-Type": "text/html"});
                  res.end();
                  client.end();
                  console.log(err);
                  return
                }
                if (Bdata.rows.length === 0) {
                  // Found nobody. keep trying
                  res.writeHead(202, {"Content-Type": "text/html"});
                  res.end();
                  client.end()
                  return
		} else {
                  // Found candidates (Bs)
                  const nB = Bdata.rows.length
                  var minallowedlatency = {'classical':700,'rapid':500,'blitz':400,"bullet":350,'ultrabullet':300}[ratingmode]
                  var Bd = null
                  var gameserver = null
                  for (var i = 0; i < nB; ++i){
                    const rttArray = []
                    const rttMap = {}
                    Bd = Bdata.rows[i]
                    if (Aws0 !== null && Bd.ws0 !== null) {
                      const rtt0 = 1*Aws0 + 1*Bd.ws0
                      rttArray.push(rtt0)
                      rttMap[rtt0] = 0
		    }
                    if (Aws1 !== null && Bd.ws1 !== null) {
                      const rtt1 = 1*Aws1 + 1*Bd.ws1
                      rttArray.push(rtt1)
                      rttMap[rtt1] = 1
		    }
                    // Determining game server with lowest latency for both parties
                    const minrtt = Math.min.apply(Math, rttArray)
                    if (minrtt < minallowedlatency) {
                      gameserver = rttMap[minrtt]
                      break; // First decent found for the timecontrol is a deal, because this B had been waiting for the longest time
                    }
                  }
                  // If none found, keep waiting
                  if (gameserver === null){
                    res.writeHead(202, {"Content-Type": "text/html"});
                    res.end();
                    client.end();
                    return
                  }
                  // Random game name
                  var gamename = randomString(9, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
                  client.query('UPDATE seeks SET gameid = $1 WHERE seekid = $2 OR seekid = $3 AND gameid is null', [gamename, Bd.seekid, Aseekid], (err, respons) =>{
                    if (err) {
                      res.writeHead(500, {"Content-Type": "text/html"});
                      res.end();
                      client.end();
                      console.log(err);
                      return
                    }
		    if (respons.rowCount === 2) {
                      // Both seeks got their game normally 
                      // Determining random side, 
                      crypto.randomBytes(1, (err, buf) => {
                        if (err) {
                          res.writeHead(500, {"Content-Type": "text/html"});
                          res.end();
                          client.end();
                          console.log(err);
                          return
                        }
                        var singlehex = buf.toString('hex')
                        var whiteplayer = Auserid
                        var blackplayer = Bd.userid
                        var whiterating = Arating
                        var blackrating = Bd[dbratingcol]
                        var whitedeviation = Adeviation
                        var blackdeviation = Bd[ratingmode+'_deviation']
                        var whitevolatility = Avolatility
                        var blackvolatility = Bd[ratingmode+'_volatility']

                        if (Aside === false || (Aside === null && buf.toString('hex') < 8)){
                          // Give B White, A Black if A chose black, or got black by chance
                          whiteplayer = Bd.userid 
                          blackplayer = Auserid 
                          whiterating = Bd[dbratingcol]
                          blackrating = Arating 
                          whitedeviation = Bd[ratingmode+'_deviation']
                          blackdeviation = Adeviation
                          whitevolatility = Bd[ratingmode+'_volatility']
                          blackvolatility = Avolatility
                        }
                        client.query('INSERT INTO games (id, gameid, userid1, userid2, gameserver, rated, state, initialtime, increment, rating1, rating2, created) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())', [gamename, whiteplayer, blackplayer,gameserver,true,0,Ainitialtime,Aincrement,whiterating,blackrating], (err, nginsertion)=>{
                          if (err) {
                            client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                              if (err) {
                                // A cron deletes all seeks older than 1 hour
                                res.writeHead(500, {"Content-Type": "text/html"});
                                res.end();
                                client.end();
                                console.log(err);
                                return
                              }
                              res.writeHead(202, {"Content-Type": "text/html"});
                              res.end();
                              client.end();
                              console.log(err);
                              return
                            })
                          }
                          if (nginsertion.rowCount === 1){
                            const myURL = new URL('https://ws'+gameserver+'.chessil.com/ng')
                            const options = {
                              hostname: myURL.hostname,
                              port: 443,
                              path: myURL.pathname,
                              method: 'POST',
                              headers: {
                                'authorization': '6y5gFD345resdfgdfh45yppcmaqzj92Eesac3534565yfdSR23',
                                'gn': gamename,
                                'w': whiteplayer,
                                'b': blackplayer,
                                'wt': Ainitialtime,
                                'bt': Ainitialtime,
                                'wi': Aincrement,
                                'bi': Aincrement,
                                'wr': whiterating,
                                'br': blackrating,
                                'wd': whitedeviation,
                                'bd': blackdeviation,
                                'wv': whitevolatility,
                                'bv': blackvolatility,
                              }
                            };

                            const newreq = https.request(options, (newres) => {
                              if (newres.statusCode !== 200) {
                                // Error, also delete from games table
                                client.query('DELETE FROM games WHERE gameid = $1', [gamename], (err, respon) =>{
                                  if (err) {
                                    res.writeHead(500, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  }
                                  client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                                    if (err) {
                                      res.writeHead(500, {"Content-Type": "text/html"});
                                      res.end();
                                      client.end();
                                      console.log(err);
                                      return
                                    }
                                    res.writeHead(202, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  })
                                })
                              } else {
                                // Sucessfuly created new game
                                res.writeHead(201, {"Content-Type": "text/html"});
                                res.end(domainname+'/game/'+gamename);
                                client.end()
                                return
                              }
                            });
                            newreq.on('error', (e) => {
                              // Error, delete also inserted game in games table
                              client.query('DELETE FROM games WHERE gameid = $1', [gamename], (err, respon) =>{
                                if (err) {
                                  res.writeHead(500, {"Content-Type": "text/html"});
                                  res.end();
                                  client.end();
                                  console.log(err);
                                  return
                                }
                                client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                                  if (err) {
                                    res.writeHead(500, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  }
                                  res.writeHead(202, {"Content-Type": "text/html"});
                                  res.end();
                                  client.end();
                                  console.log(err);
                                  return
                                })
                              })
                              return
                            });
                            newreq.end();
                          } else {
                            // Very rare failure of duplicated gameid UPDATE A and B with NULL where gameid is gameID. Respond with code 202. DELETE unstarted games from time to time by cron
                            client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                              if (err) {
                                res.writeHead(500, {"Content-Type": "text/html"});
                                res.end();
                                client.end();
                                console.log(err);
                                return
                              }
                              res.writeHead(202, {"Content-Type": "text/html"});
                              res.end();
                              client.end();
                              console.log(err);
                              return
                            })
			  }
                        })
                      })
		    } else {
                      // At least 1 seek got assigned first. Another person won the race so we roll back
                      client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                        if (err) {
                          res.writeHead(500, {"Content-Type": "text/html"}); 
                          res.end();
                          client.end();
                          console.log(err);
                          return
                        }
                        res.writeHead(202, {"Content-Type": "text/html"});
                        res.end();
                        client.end();
                        console.log(err);
                        return
                      })
		    }
                  })
                }
              })
	    } else {
              //unrated game TODO
              client.query('SELECT s.seekid, c.ws0, c.ws1, s.userid, s.sessionid, s.target, s.acceptedseek FROM seeks s LEFT JOIN connections c ON c.sessionid = s.sessionid WHERE s.rated is false AND s.side is '+targetside+' AND s.initialtime = $1 AND s.increment = $2 AND s.sessionid != $3 AND (s.userid != $4 OR s.userid = 0) AND s.gameid is null AND (s.acceptedseek = $5 OR s.seekid = $6) ORDER BY s.created ASC LIMIT 9', [Ainitialtime,Aincrement,req.headers['cookie'].slice(2),Auserid,Aseekid,Aacceptedseek], (err, Bdata)=>{
                if (err) {
                  res.writeHead(500, {"Content-Type": "text/html"});
                  res.end();
                  client.end();
                  console.log(err);
                  return
                }
                if (Bdata.rows.length === 0) {
                  // Found nobody. keep trying
                  res.writeHead(202, {"Content-Type": "text/html"});
                  res.end();
                  client.end()
                  return
		} else {
                  // Found candidates (Bs)
                  const nB = Bdata.rows.length
                  var minallowedlatency = {'classical':700,'rapid':500,'blitz':400,"bullet":350,'ultrabullet':300}[ratingmode]
                  var Bd = null
                  var gameserver = null
                  for (var i = 0; i < nB; ++i){
                    const rttArray = []
                    const rttMap = {}
                    Bd = Bdata.rows[i]
                    if (Aws0 !== null && Bd.ws0 !== null) {
                      const rtt0 = 1*Aws0 + 1*Bd.ws0
                      rttArray.push(rtt0)
                      rttMap[rtt0] = 0
		    }
                    if (Aws1 !== null && Bd.ws1 !== null) {
                      const rtt1 = 1*Aws1 + 1*Bd.ws1
                      rttArray.push(rtt1)
                      rttMap[rtt1] = 1
		    }
                    // Determining game server with lowest latency for both parties
                    const minrtt = Math.min.apply(Math, rttArray)
                    if (minrtt < minallowedlatency) {
                      gameserver = rttMap[minrtt]
                      break; // First decent found for the timecontrol is a deal, because this B had been waiting for the longest time
                    }
                  }
                  // If none found, keep waiting
                  if (gameserver === null){
                    res.writeHead(202, {"Content-Type": "text/html"});
                    res.end();
                    client.end();
                    return
                  }
                  // Random game name
                  var gamename = randomString(9, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
                  client.query('UPDATE seeks SET gameid = $1 WHERE seekid = $2 OR seekid = $3 AND gameid is null', [gamename, Bd.seekid, Aseekid], (err, respons) =>{
                    if (err) {
                      res.writeHead(500, {"Content-Type": "text/html"});
                      res.end();
                      client.end();
                      console.log(err);
                      return
                    }
		    if (respons.rowCount === 2) {
                      // Both seeks got their game normally 
                      // Determining random side, 
                      crypto.randomBytes(1, (err, buf) => {
                        if (err) {
                          res.writeHead(500, {"Content-Type": "text/html"});
                          res.end();
                          client.end();
                          console.log(err);
                          return
                        }
                        var singlehex = buf.toString('hex')
                        var whiteplayer = Auserid
                        var blackplayer = Bd.userid
                        var whitesessid = re.sessionid
                        var blacksessid = Bd.sessionid

                        if (Aside === false || (Aside === null && buf.toString('hex') < 8)){
                          // Give B White, A Black if A chose black, or got black by chance
                          whiteplayer = Bd.userid 
                          blackplayer = Auserid 
                          whitesessid = Bd.sessionid
                          blacksessid = re.sessionid
                        }
			if (whiteplayer != 0) whitesessid = null
			if (blackplayer != 0) blacksessid = null
                        client.query('INSERT INTO games (id, gameid, userid1, userid2, gameserver, rated, state, initialtime, increment, created, session1, session2) VALUES (DEFAULT, $1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10)', [gamename, whiteplayer, blackplayer,gameserver,false,0,Ainitialtime,Aincrement,whitesessid,blacksessid], (err, nginsertion)=>{
                          if (err) {
                            client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                              if (err) {
                                // A cron deletes all seeks older than 1 hour
                                res.writeHead(500, {"Content-Type": "text/html"});
                                res.end();
                                client.end();
                                console.log(err);
                                return
                              }
                              res.writeHead(202, {"Content-Type": "text/html"});
                              res.end();
                              client.end();
                              console.log(err);
                              return
                            })
                          }
                          if (nginsertion.rowCount === 1){
                            if (whiteplayer == 0) whiteplayer = whitesessid
                            if (blackplayer == 0) blackplayer = blacksessid
                            const myURL = new URL('https://ws'+gameserver+'.chessil.com/ng')
                            const options = {
                              hostname: myURL.hostname,
                              port: 443,
                              path: myURL.pathname,
                              method: 'POST',
                              headers: {
                                'authorization': '6y5gFD345resdfgdfh45yppcmaqzj92Eesac3534565yfdSR23',
                                'gn': gamename,
                                'w': whiteplayer,
                                'b': blackplayer,
                                'wt': Ainitialtime,
                                'bt': Ainitialtime,
                                'wi': Aincrement,
                                'bi': Aincrement,
                                'wr': '-1',
                                'br': '-1',
                                'wd': '-1',
                                'bd': '-1',
                                'wv': '-1',
                                'bv': '-1',
                              }
                            };

                            const newreq = https.request(options, (newres) => {
                              if (newres.statusCode !== 200) {
                                // Error, also delete from games table
                                client.query('DELETE FROM games WHERE gameid = $1', [gamename], (err, respon) =>{
                                  if (err) {
                                    res.writeHead(500, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  }
                                  client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                                    if (err) {
                                      res.writeHead(500, {"Content-Type": "text/html"});
                                      res.end();
                                      client.end();
                                      console.log(err);
                                      return
                                    }
                                    res.writeHead(202, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  })
                                })
                              } else {
                                // Sucessfuly created new game
                                res.writeHead(201, {"Content-Type": "text/html"});
                                res.end(domainname+'/game/'+gamename);
                                client.end()
                                return
                              }
                            });
                            newreq.on('error', (e) => {
                              // Error, delete also inserted game in games table
                              client.query('DELETE FROM games WHERE gameid = $1', [gamename], (err, respon) =>{
                                if (err) {
                                  res.writeHead(500, {"Content-Type": "text/html"});
                                  res.end();
                                  client.end();
                                  console.log(err);
                                  return
                                }
                                client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                                  if (err) {
                                    res.writeHead(500, {"Content-Type": "text/html"});
                                    res.end();
                                    client.end();
                                    console.log(err);
                                    return
                                  }
                                  res.writeHead(202, {"Content-Type": "text/html"});
                                  res.end();
                                  client.end();
                                  console.log(err);
                                  return
                                })
                              })
                              return
                            });
                            newreq.end();
                          } else {
                            // Very rare failure of duplicated gameid UPDATE A and B with NULL where gameid is gameID. Respond with code 202. DELETE unstarted games from time to time by cron
                            client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                              if (err) {
                                res.writeHead(500, {"Content-Type": "text/html"});
                                res.end();
                                client.end();
                                console.log(err);
                                return
                              }
                              res.writeHead(202, {"Content-Type": "text/html"});
                              res.end();
                              client.end();
                              console.log(err);
                              return
                            })
			  }
                        })
                      })
		    } else {
                      // At least 1 seek got assigned first. Another person won the race so we roll back
                      client.query('UPDATE seeks SET gameid = null WHERE gameid = $1', [gamename], (err, respon) =>{
                        if (err) {
                          res.writeHead(500, {"Content-Type": "text/html"}); 
                          res.end();
                          client.end();
                          console.log(err);
                          return
                        }
                        res.writeHead(202, {"Content-Type": "text/html"});
                        res.end();
                        client.end();
                        console.log(err);
                        return
                      })
		    }
                  })
                }
              })
	    }
	  }
        } else {
          // Seek not found 
          res.writeHead(404, {"Content-Type": "text/html"});
          res.end();
          client.end()
          return
        }
      })
    } else {
      res.writeHead(400, {"Content-Type": "text/html"});
      res.end();
      return;
    }
  }
}
function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}
