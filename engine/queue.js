// This program is a queue of stockfish analysis requests.
// It should not be exposed to the outside internet, it's for intranet or localhost usage
// Enables popping with multiple node instances, each with a sf process attached
// It holds off the request until a stockfish produces the result, and then responds
// The stockfish analysis requests can be for different purposes, eg. to check for cheating, or for a human to spar against, or for post game analysis
// Depending on the purpose, different settings should be specified, eg. elo
// settings are 
// uuidhm: id of the game plus '-' plus halfmoves plus '-' plus side to move w or b
// ms: 128-512 max time (in ms) to calculate a move. As a reference with 12 threads at 4400MHz 120 ms is enough to keep up with the best machines in 2022. 
// We run 1 thread at 2200 MHz, but we don't need so much precision, just good enough
// elo: elo setting 
// szg: 0-7. 0 disables syzygy
// The value val contains the following values separated by a space, in order:
// uuidhm wtime btime winc binc mtime elo szg

const http = require('http');
const url = require('url');
const envPort = parseInt(process.env.PORT || '', 10);
const port = Number.isFinite(envPort) ? envPort : 8092;
const observability = require('../observability');
const obs = observability.createObserver('engine-queue');
obs.installProcessHandlers();

const MAX_QUEUE_LENGTH = 5000;
const ANSWER_TTL_MS = 2 * 60 * 1000;
const LISTENER_TTL_MS = 2 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 1000;

var path;

var queue = {
  
  line: [],
  
  // skip games that have ended already
  skip: [],
  
  rpush(val) {
    this.line.push (val);
  },
  
  lpush(val) {
    this.line.unshift (val);
  },
  
  lpop() {
    if ( this.line.length ) return this.line.shift();
  },

  spush(val) {
    if ( this.skip.length > 65536 ) this.skip.shift();
    this.skip.push(val);
  },
  scheck(val) {
    if ( this.skip.indexOf(val) === -1 ) return false
    return true
  },

  
};

var answers = {
  ts: {},
  lts: {},
  
  set(uuidhm,val) {
    this[uuidhm] = val
    this.ts[uuidhm] = Date.now()
    try {
      
      this['listener'+uuidhm](); //call the listener when uuidhm was set
    
    } catch (error) {
    
      //console.log(o.uuidhm);
      //console.log(error);
    
    }
    
  },
  forget(uuidhm) {
    this[uuidhm] = ''
    this.ts[uuidhm] = Date.now()
    try {
      
      this['listener'+uuidhm](); //call the listener when uuidhm was set
    
    } catch (error) {
    
      //console.log(o.uuidhm);
      //console.log(error);
    
    }
    
  },
  lset(uuidhm) {
    this.lts[uuidhm] = Date.now()
  },
  cleanup() {
    const now = Date.now()
    for (const key in this.ts) {
      if (now - this.ts[key] > ANSWER_TTL_MS) {
        delete this[key]
        delete this.ts[key]
      }
    }
    for (const key in this.lts) {
      if (now - this.lts[key] > LISTENER_TTL_MS) {
        this[key] = ''
        try {
          this['listener'+key]();
        } catch (error) {
          // ignore
        }
        delete this[key]
        delete this.ts[key]
        delete this['listener'+key]
        delete this.lts[key]
      }
    }
  },
  
};

const server = http.createServer(function(req, res) {
  
  path= url.parse(req.url).pathname
  
  switch (path) {
    
    case '/set': {
    // Set content for original request, call the set function, which will call the listener
      answers.set(req.headers['uuidhm'],
	      '{"uuidhm":"'+req.headers['uuidhm']+
	      '","bestmove":"'+req.headers['bm']+
	      '","eval":"'+req.headers['eval']+
	      '"}')
      // Response to worker set request 
      res.end()
      return
      
      break;
      
    }
    
    case '/lpush': {
      // Priority request goes to the front of line
      if (queue.line.length >= MAX_QUEUE_LENGTH) {
        res.writeHead(429, {"Content-Type": "text/plain"});
        res.end()
        return
      }
      let uuidhm = req.headers['sf'].split(' ')[0]
      
      answers['listener'+uuidhm]=function () {
        // Response to original request 
        res.end(answers[uuidhm])
        delete answers[uuidhm]; // free memory
        delete answers.ts[uuidhm];
        delete answers['listener'+uuidhm];  // free memory
        delete answers.lts[uuidhm];
        return
      }
      answers.lset(uuidhm)
      
      queue.lpush(req.headers['sf'])
      
      break;
      
    }
    
    case '/lpop': {
      // The front of the line is processed
      let lollipop = queue.lpop()
      if ( typeof lollipop !== 'undefined' ) {
        let uuidhm = lollipop.split(' ')[0]
        if (queue.scheck(uuidhm.split('-')[0])){
          answers.forget(uuidhm)
          res.writeHead(404, {"Content-Type": "text/plain"});
          res.end()
          return
        } else {
          res.end(lollipop)
          return
	}
      } else {
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.end()
        return
      }
      
      break;
      
    }
    
    case '/rpush': {
      // Normal request goes to the back of the line
      if (queue.line.length >= MAX_QUEUE_LENGTH) {
        res.writeHead(429, {"Content-Type": "text/plain"});
        res.end()
        return
      }
      let uuidhm = req.headers['sf'].split(' ')[0]
      
      answers['listener'+uuidhm]=function () {
        // Response to original request 
        res.end(answers[uuidhm])
        delete answers[uuidhm]; // free memory
        delete answers.ts[uuidhm];
        delete answers['listener'+uuidhm];  // free memory
        delete answers.lts[uuidhm];
        return 
      }
      answers.lset(uuidhm)
      
      queue.rpush(req.headers['sf'])
      
      break;
      
    }
    case '/spush': {
      // Skip fg finished games. The gameid is pushed to skip array which can't exceed a certain length
      queue.spush(req.headers['fg'])
      res.writeHead(200, {"Content-Type": "text/plain"});
      res.end()
      break;
      
    }
    case '/health': {
      res.writeHead(200, {"Content-Type": "application/json"});
      res.end(JSON.stringify({
        status: 'ok',
        queue: queue.line.length,
        skip: queue.skip.length,
      }));
      break;
    }
  
  }
  
});

server.listen(port);
obs.log('info', 'server_listen', { port: port });

server.on('error', (err) => {
  obs.count('server_error');
  obs.log('error', 'server_error', { error: err && err.stack ? err.stack : String(err) });
});

let shuttingDown = false;
const cleanupInterval = setInterval(function () {
  answers.cleanup()
}, CLEANUP_INTERVAL_MS);

function shutdown(reason) {
  if (shuttingDown) return;
  shuttingDown = true;
  obs.log('info', 'shutdown_start', { reason: reason });

  server.close(() => {
    obs.log('info', 'shutdown_server_closed', {});
  });

  clearInterval(cleanupInterval);

  setTimeout(() => {
    obs.log('info', 'shutdown_forced_exit', {});
    process.exit(0);
  }, 30000);
}

process.on('SIGTERM', () => shutdown('sigterm'));
process.on('SIGINT', () => shutdown('sigint'));
