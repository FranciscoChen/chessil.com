const http = require('http');
const fs = require('fs');
const cp = require('child_process');
var os = require("os");
const observability = require('../observability');
const obs = observability.createObserver('engine-worker');
obs.installProcessHandlers();

var bestmoveregexp=/bestmove\s\w{4,5}/;
var uciregexp=/uciok/;
var sfregexp=/Stockfish/;
var sfname
var stockfish
var retry=0
var sfstdout = ''
var restarting = false
var analysing = false

var dirfiles = fs.readdirSync('.')
var files = dirfiles.filter(fn => fn.startsWith('stockfish'));
sfname = files[files.length-1]

function restartStockfish() {
  if (restarting) return
  restarting = true
  analysing = false
  retry = 0
  obs.count('stockfish_restart');
  obs.log('warn', 'stockfish_restart', { stockfish: sfname });
  setTimeout(function () {
    restarting = false
    sfstdout = ''
    startStockfish()
  }, 1000)
}

function startStockfish() {
  stockfish = cp.execFile('./'+sfname);
  stockfish.stdout.on('data', (data) => {
    var da = `${data}`;
    if (sfregexp.exec(da) !== null){
      stockfish.stdin.write('uci')
      stockfish.stdin.write(os.EOL)
    }
    if (uciregexp.exec(da) !== null){
      stockfish.stdin.write('setoption name SyzygyPath value syzygy')
      stockfish.stdin.write(os.EOL)
      stockfish.stdin.write('setoption name Threads value 1')
      stockfish.stdin.write(os.EOL)
      stockfish.stdin.write('setoption name Hash value 64') //HT[KB] = 2.0 * PFreq[MHz] * t[s]
      stockfish.stdin.write(os.EOL)
      stockfish.stdin.write('setoption name Move Overhead value 20') //HT[KB] = 2.0 * PFreq[MHz] * t[s]
      stockfish.stdin.write(os.EOL)
      stockfish.stdout.removeAllListeners('data');
      analyse()
    }
  });
  stockfish.on('error', restartStockfish);
  stockfish.on('exit', restartStockfish);
}

startStockfish()
obs.log('info', 'worker_start', { stockfish: sfname });

function analyse(){
  if (analysing) return
  analysing = true
  
  const req = http.request({hostname: '127.0.0.1', path:'/lpop', port: 8092}, (res) => {
    if (res.statusCode == 404) {
      analysing = false
      if (retry < 32) retry++
      setTimeout(function() {analyse()}, retry*32);
    }
    if (res.statusCode == 200) {
      retry=0
      res.setEncoding('utf8');
      var reply = '';
      res.on('data', (chunk) => { reply += chunk; });
      res.on('end', () => {
        
        //Code start
        var input = reply.split(' ')
        const uuidhm = input.shift()
        var wtime = input.shift()
        var btime = input.shift()
        const winc = input.shift()
        const binc = input.shift()
        const mtime = input.shift()
	  if (uuidhm[uuidhm.length-1] === 'w') {
	    if (wtime*1 > mtime*1) {
              wtime = mtime
            }
	  } else {
            if (btime*1 > mtime*1) {
              btime = mtime
            }
	  }
        const elo = input.shift()
        if ( elo === '0' ) {
          stockfish.stdin.write('setoption name UCI_LimitStrength value false')
          stockfish.stdin.write(os.EOL)
	} else {
          stockfish.stdin.write('setoption name UCI_LimitStrength value true')
          stockfish.stdin.write(os.EOL)
          stockfish.stdin.write('setoption name UCI_Elo value '+elo)
          stockfish.stdin.write(os.EOL)
	}
        const syzygy = input.shift()
        stockfish.stdin.write('setoption name SyzygyProbeLimit value '+syzygy)
        stockfish.stdin.write(os.EOL)
        const moves = input.join(' ')
        if (moves === '') {
          stockfish.stdin.write('position startpos')
        } else {
          stockfish.stdin.write('position startpos moves '+moves)
        }
        stockfish.stdin.write(os.EOL)

        stockfish.stdout.on('data', (data) => {
          sfstdout += data;
          var bm = bestmoveregexp.exec(data)
          //We got bestmove
          if (bm !== null) {
            const bestmove = /bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/g.exec(sfstdout)[1];
            let score = /score (.*) nodes/g.exec(sfstdout.substring(sfstdout.lastIndexOf('info ')))[1];
            sfstdout = '';
            score = score.split(' ');
            score = [score[0],score[1]].join(' ');
            obs.log('info', 'analysis_result', { uuidhm: uuidhm, bm: bestmove, eval: score });
            const setReq = http.request({hostname: '127.0.0.1', path:'/set', port: 8092, headers:{'uuidhm': uuidhm, 'bm': bestmove, 'eval': score}}, (resp) => {});
            setReq.on('error', (err) => {
              obs.count('queue_set_error');
              obs.log('error', 'queue_set_error', { error: err && err.stack ? err.stack : String(err) });
            });
            setReq.end();

            stockfish.stdout.removeAllListeners('data');
            analysing = false
            analyse();
            
            return true
            
          }
        })
        
        stockfish.stdin.write('go wtime '+wtime+' btime '+btime+' winc '+winc+' binc '+binc)
        sfstdout=''
        stockfish.stdin.write(os.EOL)

      })
    } else {
      analysing = false
    }
  });
  req.on('error', (err) => {
    analysing = false
    obs.count('queue_request_error');
    obs.log('error', 'queue_request_error', { error: err && err.stack ? err.stack : String(err) });
    setTimeout(function() { analyse() }, 1000);
  });
  req.end();
}
