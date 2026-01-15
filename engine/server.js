// This server takes requests to calculate with stockfish
// Responds with gameid bestmove eval
// Only takes requests from known servers
// Also has handcrafted functions to determine if someone is cheating, based on the data

const http = require('http');
const https = require('https');
const fs = require('fs');
var path = require("path");
const observability = require('../observability');

// Frequent moves database (for the early game)
const Redis = require("ioredis");
const redis = new Redis();

// To connect to user database and sanction cheaters
const pg = require("pg");

const config = require('../config.json');
const conString = config.shared.postgresUrl;

const gameidregex= new RegExp ('^[a-zA-Z0-9]{9}$')
const randidregex = new RegExp ('^[1234567890abcdef]{32}$')
const isodateregex= new RegExp ('^[0-9]{4}-[0-9]{2}-[0-9]{2}$')

const myServers = config.engine.myServers;

const domainname = config.engine.domainName;
const port = config.engine.port;
const obs = observability.createObserver('engine');
obs.installProcessHandlers();

var server = http.createServer(function(req, res) {
  // Only accepts POST requests authenticated from my own servers
  if (req.method !== 'POST' || typeof req.headers['authorization'] === undefined || req.headers['authorization'] !== config.shared.engineAuthToken || typeof myServers[req.headers['x-real-ip']] === 'undefined'){
    res.writeHead(401, {"Content-Type": "text/html"});
    res.end();
    return;
  }

  // The game server requests a check for cheating. also analyse the position with max strength.
  if (req.url === '/check' && req.method === 'POST') {
    check(req,res)
    return
  }
  
  // The game server requests a move for a bot game. Adaptive strength
  if (req.url === '/play' && req.method === 'POST') {
    play(req,res)
    return
  }
  /*
  // Any server requests for a reverse analysis. Max strength, dedicated stockfish process queue. (Order of moves will be reversed, hopping 3 half moves at a time.)
  if (req.url === '/analyse' && req.method === 'POST') {
    analyse(req,res)
    return
  }
  */
 
})

server.listen(port);
obs.log('info', 'server_listen', { port: port });

server.on('error', function(e) {
  obs.count('server_error');
  obs.log('error', 'server_error', { error: e && e.stack ? e.stack : String(e) });
});


function detectcheating(game){
  // ### Storing moves, when something stands out. Always expressed as halfmove number -1 (0 starting index).
  // cp
  // High eval diff, hed: player move eval when compared to engine eval has a huge diff. For example, at half move 21 white had engine eval of cp 121, and at half move 22 black has engine eval of cp 70. It means that the white player did a move so bad that lost 121 points and game 70 more to black, total diff 191 > 150. All horrible moves losing +150 cp belong here. For this move of white, deserves special attention maybe white was cheating but failed and misclicked, resulting in a horrendous position.
  const hed = []
  // Mid eval diff, med: same as hed but moves losing 101-150 cp go here. They are mistakes that lose a pawn at least.
  const med = []
  // Small eval diff, sed. The slightly not so accurate moves, with 50 cp as threshold. Moves losing 50-100 cp go here. Helps us quantify how many accurate moves there are.
  //const sed = []
  // inaccuracies, ina. The inaccuracies. Moves losing 25-49 cp go here. Helps seeing the accuracy% in more detail. If all the arrays above are empty, the person is playing like stockfish
  //const ina = []
  const wr = []
  const accu = []
  // Huge game turning point: the halfmove index that made it. When a player has earned 150cp or more since his last turn. And made a game even when it was lost, or won when it was even. For example, white is playing a calm game and eval is cp 12 nothing special, then his opponent makes a mistake and then the player plays best move punishing the blunder, and finds a free knight down the line. The machine eval shows cp -198 on the opponents turn, Lets say halfmove 17 w cp 12, 18 b blunder cp -9, 19 w punish cp 212, 20 b cp -198. Detect 18 and 20 diff, return 19 the 'best move'. What if the person just turned on the machine using up 7 seconds to move. It is worth checking for all the moves following this and their times
  const htp = []
  // middle game turning point advantage moves: same as htp, but player earns a pawn+ equivalent amount of cp instead, 101-150.
  const mtp = []
  // small turning point. We are slowly grinding back: same as htp, but player earns a small amount of cp instead, 50-100
  //const stp = []
  
  // fast move speed in less than 1 second. Cheaters usually have none or very low number of moves this.
  const fms = []
  // mms middle move speed, betweeen 3 seconds and 10 seconds. A key indicator is when a player spends a very consistent, and often very short, amount of time (e.g., 3-10 seconds) on every move, regardless of whether it's a simple recapture or a complex tactical sequence. 
  const mms = []
  // ems engine move speed, betweeen 2 seconds and 7 seconds. Engine moves usually take this time. If a move  matches engine move and was done in this time, it is pretty sus.
  const ems = []
  // We will ignore slower moves, cheaters won't use so much time per move usually

  // the moves that match engine bestmove mem. Maguns Carlsen best is 75% match.
  const mem = []
  
  // ### Storing moves end

  // #### Game data parsing start
  // am array of moves
  const am = game.m.split(' ')
  // amt array of move times
  const amt = game.i.split(' ')
  const wincrement = game.o
  const bincrement = game.z
  const nmoves = am.length
  const nmovesw = {0:nmoves/2, 1:(nmoves+1)/2}[nmoves % 2]
  const nmovesb = {0:nmoves/2, 1:(nmoves-1)/2}[nmoves % 2]
  // aem array of engine moves
  const aem = []
  // aee array of engine evals and types
  const aee = []
  const aeet = []
  for (var i = 0; i < nmoves; i++){
  // game[hm] halfmove number starts at 1, but we push to new arrays starting at zero index
    if (typeof game[i] !== 'undefined'){
      const eout = game[i];
      aem.push(eout.split(' ')[0])
      const engineeval = eout.substring(eout.indexOf(' ')+1).split(' ')
      aee.push(engineeval[1])
      aeet.push(engineeval[0])
    } else {
      aem.push('')
      aee.push('')
      aeet.push('')
    }
    wr.push('')
    accu.push('')
  }
  // Draw offer harassment better somewhere else like in game server.
  // const ae = game.e.split(' ')
  // const aet = game.k.split(' ')
  // Last move time, lmt, to check for afk. Warn when intentionally afk when losing, especially if still online. Better after a game actually ends.
  // const lmt = game.s
  // How many premove attempts wpc whitepremovecount
  var wpc = 0;
  if (typeof game.qc !== 'undefined'){
    wpc = game.qc;
  }
  var bpc = 0;
  if (typeof game.rc !== 'undefined'){
    bpc = game.rc;
  }
  
  // #### Game data parsing end
  const otherplayer = -1;
  const evalunit = {'cp':1,'mate':1000};
  // ##### Going throught game data start
  for (var i = 0; i < nmoves; i++){
    const evalnow = evalunit[aeet[i]]*aee[i]
    if ( i >= 2 && aee[i].length > 0 && aee[i-1].length > 0){
      // calculate eval diff
      const evalbefore = evalunit[aeet[i-1]]*aee[i-1]*otherplayer
      const evaldiff = evalnow - evalbefore
      // calculate winrate for this move
      var winrate = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * evalnow)) - 1)
      wr[i] = winrate
      // calculate accuracy for this move
      if (wr[i-1] !== ''){
        var accuracy = Math.max(Math.min(103.1668 * Math.exp(-0.04354 * ((1-wr[i-1]) - wr[i])) - 3.1669,100),0)
        accu[i] = accuracy
      }
      // classify move according to eval diff
      if (evaldiff > 150) {
        hed.push(i)
      }
      if (evaldiff > 100 && evaldiff <= 150) {
        med.push(i)
      }
    }
    if ( i >= 3 && aee[i].length > 0 && aee[i-1].length > 0 && aee[i-2].length > 0){
      // calculate and see if there is a game turning point
      const gameturningdiff = evalnow - evalunit[aeet[i-2]]*aee[i-2]
      // classify move according to eval diff
      if (gameturningdiff > 150) {
        htp.push(i-1)
      }
      if (gameturningdiff > 100 && gameturningdiff <= 150) {
        mtp.push(i-1)
      }
    //  if (gameturningdiff >= 50 && gameturningdiff <= 100) {
    //   stp.push(i-1)
    //  }
    }
    if ( i >= 2 ){
      // Ignore first two moves of the game
      var timeused = 0
      if ( i % 2 === 0 ) {
        timeused = (amt[i] - amt[i-1] - wincrement) * -1
      } else {
        timeused = (amt[i] - amt[i-1] - bincrement) * -1
      }
      if (timeused < 1000) {
        fms.push(i)
      }
      if (timeused >= 3000 && timeused <= 10000) {
        mms.push(i)
      }
      if (timeused >= 2000 && timeused <= 7000) {
        ems.push(i)
      }
      if (aem[i] == am[i]) {//Match engine move
        mem.push(i)
      }
    }
  }
  // ##### Going throught game data end
 
  // ###### Cheat detection logic start
  // White suspicion wsus and Black suspicion bsus. Suspicion of 7 or above will abort game and issue warnings and apologies accordingly
  // Made it so it's hard to trigger an abort by one reason alone, and hard to trigger by luck
  var wsus = 0
  var bsus = 0
 
  // If a player has near zero premove usage AND near zero fast moves AND all moves use similar time
  if (wpc < 2) {
    // White player, has near zero premoves
    var fmsl = fms.length
    var fastmoves = 0
    for (var i = 0; i < fmsl; i++ ) {
      if (fms[i] % 2 === 0) {
        //Even numberindexes are odd halfmoves so they are white player moves
        fastmoves++;
      }
    }
    // White player, has near zero fastmoves
    if (fastmoves < 2) {
      var mmsl = mms.length
      var middlemovespeed = 0
      for (var i = 0; i < mmsl; i++){
        if (mms[i] % 2 === 0) {
          middlemovespeed++;
        }
      }

      const mmsratio = middlemovespeed / nmovesw
      if (mmsratio > 0.95) {
        // For every 4 moves, suspicion rises by 1
        wsus += Math.min(nmovesw*0.25, 4)
      }
    }
  }
  if (bpc < 2) {
    // Black player, has zero or 1 premove
    var fmsl = fms.length
    var fastmoves = 0
    for (var i = 0; i < fmsl; i++ ) {
      if (fms[i] % 2 === 1) {
        //Odd numberindexes are even halfmoves so they are black player moves
        fastmoves++;
      }
    }
    // Black player, has near zero fastmoves
    if (fastmoves < 2) {
      var mmsl = mms.length
      var middlemovespeed = 0
      for (var i = 0; i < mmsl; i++){
        if (mms[i] % 2 === 1) {
          middlemovespeed++;
        }
      }

      const mmsratio = middlemovespeed / nmovesb
      if (mmsratio > 0.95) {
        // For every 4 moves, suspicion rises by 1
        bsus += Math.min(nmovesb*0.25, 4)
      }
    }
  }
  
  // Misclick detection
  //Weird single move evokes suspicion
  //If there is a spike down in win% from a single move, which has the same origin but a destination different to engine best move or the other way around
  const wrdown = hed.concat(med)
  const wrdownl = wrdown.length
  for (var i = 0; i < wrdownl; i++){
    const moveindex = wrdown[i]
    // Disregarding pawn promotions, suspicion rises by 3 for each move like this. Equivalent of 12 moves at middle speed with 0 premoves and below 1 second moves.
    // It's pretty sus but cannot determine alone that someone is cheating and abort the game, after all people can be unlucky to hit the square on their blunder legit.
    if (aem[moveindex].length === 4) {
      if (aem[moveindex].substring(0,2) === am[moveindex].substring(0,2)) {
        if (moveindex % 2 === 0) {
          wsus += 2
        } else {
          bsus += 2
        }
      }
      // Same destination but different origin, less likely but can happen
      if (aem[moveindex].substring(2) === am[moveindex].substring(2)) {
        if (moveindex % 2 === 0) {
          wsus += 1
        } else {
          bsus += 1
        }
      }
    }
  }

  // Going through the moves that match engine move mem
  const meml = mem.length
  if (meml > 0) {
    let wmem = 0;
    let bmem = 0;
    let wmemems = 0;
    let bmemems = 0;
    for (var i = 0; i < meml; i++ ){
      // If the suspected engine move has a delay of 2-7 seconds. You just did a engine best move! Oh it took 2-7 seconds! Was it luck or you were interacting with the engine?
      const moveindex = mem[i]
      if (moveindex % 2 === 0) {
        if (ems.indexOf(moveindex) > -1) {
          wmemems++;
        }
        wmem++
      } else {
        if (ems.indexOf(moveindex) > -1) {
          bmemems++;
        }
        bmem++
      }
    }
    // Each is penalised with 0.5 sus, max 3
    wsus += Math.min(0.5*wmemems, 3)
    bsus += Math.min(0.5*bmemems, 3)
    // white matching engine moves ratio = white matching engine moves / number of moves of white
    let wmemratio = wmem / nmovesw
    let bmemratio = bmem / nmovesb
    // 75%+ Mean of same as engine best move is above Carlsens best - red flag!!!!
    if (wmemratio >= 0.74) {
      wsus += Math.min(wmem*0.6*wmemratio,5)
    }
    if (bmemratio >= 0.74) {
      bsus += Math.min(bmem*0.6*bmemratio,5)
    }
  }
  
  // Unusual sequence of moves evokes suspicion
  const accul =  accu.length
  let accuw = 0
  let accuwcounter = 0
  let accub = 0
  let accubcounter = 0
  if (accul > 0) {
    for (var i = 0; i < accul; i++){
      const accupercent = accu[i]
      if (accupercent !== ''){
        if (i % 2 === 0) {
          accuw += 1*accupercent
          accuwcounter++
        } else {
          accub += 1*accupercent
          accubcounter++
        }
      }
    }
    // If all moves are accurate... Win rate not dropping. Accuracy "Near perfect games" 92%+ If more than 5% of games are like this, red flag
    let waccuratio = accuw / accuwcounter / 100
    let baccuratio = accub / accubcounter / 100
    if (waccuratio >= 0.92) {
      // Not suspicious unless the certainty grows with more moves. A full game at 92% accuracy, could be 30 moves. It stops growing at 5 sus.
      wsus += Math.min(0.7*waccuratio*accuwcounter,5) 
    }
    if (baccuratio >= 0.92) {
      bsus += Math.min(0.7*baccuratio*accubcounter,5)
    }
  }
  // If there is a series of continuous high accuracy moves especially when losing, and after that it's winning
  // tps turning points
  const tps = htp.concat() 
  const tpsl = tps.length
  if (tpsl > 0) {
    for (var i = 0; i < tpsl; i++){
      const moveindex = tps[i]
      if (moveindex % 2 === 0) {
        if (moveindex >= 2 && accu[moveindex-2] > 0.92) {
          wsus += 0.5
          if (moveindex >= 4 && accu[moveindex-4] > 0.92) {
            wsus += 0.5
            if (moveindex >= 6 && accu[moveindex-6] > 0.92) {
              wsus += 1
              if (moveindex >= 8 && accu[moveindex-8] > 0.92) {
                wsus += 1
              }
   	    }
	  }
	}
      } else {
        if (moveindex >= 2 && accu[moveindex-2] > 0.92) {
          bsus += 0.5
          if (moveindex >= 4 && accu[moveindex-4] > 0.92) {
            bsus += 0.5
            if (moveindex >= 6 && accu[moveindex-6] > 0.92) {
              bsus += 1
              if (moveindex >= 8 && accu[moveindex-8] > 0.92) {
                bsus += 1
              }
   	    }
	  }
	}
      }
    }
  }
 // console.log('White sus: '+wsus)
 // console.log('Black sus: '+bsus)
  if (wsus >= 7) {
    return 'w'
  }
  if (bsus >= 7) {
    return 'b'
  }
  // ###### Cheat detection logic end
    return 0
}

function check(req,res){
  let gamedata = '';
  req.on('data', (chunk) => { 
    gamedata += chunk; 
  });
  req.on('end', () => {
    if (gamedata.length > 0){
      const game = JSON.parse(gamedata)
      // Try to detect cheating using variables readily available
      var cheater = detectcheating(game)
      res.writeHead(200, {"Content-Type": "text/plain"});
      res.end()
      if (cheater !== 0){
        abortgamecheater(req.headers['id'],cheater)
        return;
      } 
      var hm = game.m.split(' ').length
      if (game.m == '') {hm = 0}
      //gameid+halfmoves+turn(w or b)
      const uuidhm = req.headers['id']+'-'+hm+'-'+game.t
      
      // Check first with local database / redis db if they have the value computed already
      var pathstr = '/rpush'
      var queue = http.request(
        {
          hostname: '127.0.0.1',
          path:pathstr,
          port: 8092,
          headers:{
            'sf': [uuidhm,game.l,game.n,game.o,game.z,256,0,7,game.m].join(' ')
          }
        }, (re) => {
          re.setEncoding('utf8');
          var sfresult = '';
          re.on('data', (chunk) => { sfresult += chunk; });
          re.on('end', () => {
            if (sfresult.length > 0){
              const result = JSON.parse(sfresult)
              // result is in format {bestmove: 'e2e4', eval: 'cp 202'}
              // result is in format {bestmove: 'e2e4', eval: 'cp -22'}
              // result is in format {bestmove: 'e2e4', eval: 'mate 5'}
              // result is in format {bestmove: 'e2e4', eval: 'mate -3'}
              updategame(req.headers['id'],hm,result)
            }
          })
        }
      );
      queue.on('error', (error) => {
        console.log(error)
      });
      queue.end()
    }
  })
}

function updategame(gameid,hm,result){
  var checkgame = https.request(
    {
      hostname: config.engine.gameHost,
      path:'/cg',
      method:'POST',
      port: 443,
      headers:{
        'gameid': gameid,
        'hm': hm,
        'bm': result.bestmove,
        'ev': result.eval,
        'authorization': config.shared.gameServerAuthToken,
      }
    },
    (re) => {
      if (re.statCode === 410){
        // Game is finished, notify the queue so they can skip tasks by gameid
        var pathstr = '/spush'
        var queue = http.request(
          {
            hostname: '127.0.0.1',
            path:pathstr,
            port: 8092,
            headers:{
              'fg': gameid
            }
          }, (re) => {}
        );
        queue.on('error', (error) => {
          console.log(error)
        });
        queue.end()
      }
    }
  )
  checkgame.on('error', (error) => {
    console.log(error)
  });
  checkgame.end()
}

function abortgamecheater(gameid,side){
  var checkgame = https.request(
    {
      hostname: config.engine.gameHost,
      path:'/ag',
      method:'POST',
      port: 443,
      headers:{
        'gameid': gameid,
        'side': side,
        'authorization': config.shared.gameServerAuthToken,
      }
    },
    (re) => {
      if (re.statCode === 410){
        // Game is finished, notify the queue so they can skip tasks by gameid
        var pathstr = '/spush'
        var queue = http.request(
          {
            hostname: '127.0.0.1',
            path:pathstr,
            port: 8092,
            headers:{
              'fg': gameid
            }
          }, (re) => {}
        );
        queue.on('error', (error) => {
          console.log(error)
        });
        queue.end()
      }
    }
  )
  checkgame.on('error', (error) => {
    console.log(error)
  });
  checkgame.end()
}



function play(req,res){
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    if (!payload || typeof payload.gameid !== 'string' || gameidregex.test(payload.gameid) === false) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: 'Invalid gameid' }));
    }

    const turn = payload.turn === 'b' ? 'b' : 'w';
    const moves = typeof payload.moves === 'string' ? payload.moves : '';
    const hm = moves.length ? moves.split(' ').length : 0;
    const uuidhm = typeof payload.uuidhm === 'string' ? payload.uuidhm : payload.gameid + '-' + hm + '-' + turn;

    const wtime = Number(payload.wtime);
    const btime = Number(payload.btime);
    const winc = Number(payload.winc);
    const binc = Number(payload.binc);
    const elo = Number(payload.elo);
    if (!Number.isFinite(wtime) || !Number.isFinite(btime) || !Number.isFinite(winc) || !Number.isFinite(binc) || !Number.isFinite(elo)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: 'Invalid parameters' }));
    }

    const mtime = 256;
    const syzygy = 7;
    const sfPayload = [uuidhm, wtime, btime, winc, binc, mtime, elo, syzygy, moves].join(' ');

    var queue = http.request(
      {
        hostname: '127.0.0.1',
        path: '/lpush',
        port: 8092,
        headers: {
          'sf': sfPayload
        }
      },
      (re) => {
        re.setEncoding('utf8');
        var sfresult = '';
        re.on('data', (chunk) => { sfresult += chunk; });
        re.on('end', () => {
          if (!sfresult) {
            res.writeHead(502, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: 'Engine unavailable' }));
          }
          let result;
          try {
            result = JSON.parse(sfresult);
          } catch (e) {
            res.writeHead(502, { "Content-Type": "application/json" });
            return res.end(JSON.stringify({ error: 'Invalid engine response' }));
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            uuidhm: result.uuidhm,
            bestmove: result.bestmove,
            eval: result.eval
          }));
        });
      }
    );
    queue.on('error', (error) => {
      console.log(error)
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: 'Queue error' }));
    });
    queue.end()
  });
}
