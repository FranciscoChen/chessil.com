function heartbeat(connection) {
  clearTimeout(connection.pingTimeout);
  connection.pingTimeout = setTimeout(() => {
    connection.close()
  }, 4000 + 3000);
}

var clock = {}
var clocktick
var lastmovetime = -1
var displaytime = ''
var turn = 'w'
var movs, mclk, evts, eclk, rslt, stat, rt1, rt2, rd1, rd2, rtd, tc, drawbtn, resignbtn
var events = []
var eventstimes = []
var buttons, l4x, rm6
var a1ti = 0
function msToTime(duration) {
  // var milliseconds = Math.floor((duration % 1000) / 100),
  var seconds = Math.floor((duration / 1000) % 60),
    minutes = Math.floor((duration / (1000 * 60)) % 60),
    hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;
  if (hours === '00') {
    if (minutes === '00') {
      if (seconds[0] === '0') {
        return "<bad>" + minutes + "<sep>:</sep>" + seconds + "<sep>.</sep>" + Math.floor((duration % 1000) / 100) + "</bad>";
      } else {
        return minutes + "<sep>:</sep>" + seconds + "<sep>.</sep>" + Math.floor((duration % 1000) / 100);
      }
    } else {
      return minutes + "<sep>:</sep>" + seconds;
    }
  } else {
    return hours + "<sep>:</sep>" + minutes + "<sep>:</sep>" + seconds;
  }
}
function msUntilNextSecond(duration) {
  return Math.floor((duration % 1000))
}

function gamereplay(ply) {
  fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  moves = mg(fen)
  board = boardgen(fen)
  history = {}
  for (var i = 0; i < ply; ++i) {
    const mstr = uci.slice(i, i + 1)[0]
    const san1 = gensanbase(mstr, board, fen, moves)
    const ucf = ucifen(mstr, fen, board, history)
    fen = ucf.f
    history = ucf.h
    board = ucf.b
    moves = mg(fen)
    /*const s = pieceElements[mstr.slice(0,2)]
    const square = mstr.slice(2,4)
    if (typeof pieceElements[square] !== 'undefined') {
      cgboard.removeChild(pieceElements[square])
      delete pieceElements[square]
    }
    s.setAttribute('class',trside[board[square].c]+' '+trpiece[board[square].p])
    s.setAttribute('style','transform: translate('+trcol[playerside][square[0]]*dim+'px, '+trrow[playerside][square[1]]*dim+'px);')
    pieceElements[mstr.slice(2,4)] = s
    delete pieceElements[mstr.slice(0,2)]
    var diffFrom = 0, diffTo = 0;
    for (squ in board){
      if (board[squ].p === ' ' && typeof pieceElements[squ] !== 'undefined') diffFrom = squ
      if (board[squ].p !== ' ' && typeof pieceElements[squ] === 'undefined') diffTo = squ
    }
    if (diffTo === 0) {
      if (diffFrom !== 0) {
        // It went nowhere: en passant captured
        cgboard.removeChild(pieceElements[diffFrom])
        delete pieceElements[diffFrom]
      } 
    } else {
      // It went somewhere: castling rook switch
      const el = pieceElements[diffFrom]
      el.setAttribute('class',trside[board[diffTo].c]+' '+trpiece[board[diffTo].p])
      el.setAttribute('style','transform: translate('+trcol[playerside][diffTo[0]]*dim+'px, '+trrow[playerside][diffTo[1]]*dim+'px);')
      pieceElements[diffTo] = el
      delete pieceElements[diffFrom]
    }*/
  }
  moves = mg(fen)
  //premoves = pmg(fen,moves,uci.slice(0,ply))
  turn = fen.split(' ')[1]
  cgboard.innerHTML = ''
  pieceElements = {}
  for (square in board) {
    const s = board[square]
    if (s.p !== ' ') {
      //populate board
      const newelement = document.createElement('piece')
      newelement.setAttribute('class', trside[s.c] + ' ' + trpiece[s.p])
      newelement.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
      pieceElements[square] = newelement
      cgboard.appendChild(newelement)
    }
  }
}

function displayTermination(code) {
  stat = code
  if (code > 0) {
    gamefinished = true;
    clearInterval(clocktick)
  }
  var rw = document.createElement('div')
  rw.setAttribute('class', 'result-wrap')
  var rsl = document.createElement('p')
  rsl.setAttribute('class', 'result')
  // Finished code
  // 0 - Not finished
  // 1 - Checkmate, turn player loses
  // 2 - Stalemate draw
  // 3 - Insufficient Material draw
  // 4 - Threefold draw
  // 5 - 50 move rule draw
  // 6 - timeout or clock flag loss, or draw if winning side has only a king
  // 7 - Resign, the resigning side loses
  // 8 - Draw agreement
  // 9 - Game aborted
  var gameresult = '½-½'
  if (code == 1) {
    gameresult = { w: '0-1', b: '1-0' }[fen.split(' ')[1]]
  }
  if (code == 6) {
    if (turn == 'w') {
      if (bpiececount(fen.split(' ')[0]) > 1) gameresult = '0-1'
    }
    if (turn == 'b') {
      if (wpiececount(fen.split(' ')[0]) > 1) gameresult = '1-0'
    }
  }
  if (code == 7) {
    gameresult = { w: '0-1', b: '1-0' }[events[events.length - 1][0]]
    drawbtn.style.background = ''
    drawbtn.style.color = ''
    resignbtn.style.background = '#cdd675'
    resignbtn.style.color = { w: '#fff', b: '#000' }[events[events.length - 1][0]]
  }
  if (code == 8) {
    drawbtn.style.background = '#00a2ff'
    drawbtn.style.color = { w: '#fff', b: '#000' }[events[events.length - 1][0]]
  }
  if (code == 0) gameresult = ''
  if (code == 9) gameresult = '-'
  rsl.innerHTML = gameresult
  rw.appendChild(rsl)
  //var sts = document.createElement('p')
  //sts.setAttribute('class','status')
  //rw.appendChild(sts)
  //sts.innerHTML = {}
  l4x.appendChild(rw)
  if (a1ti === uci.length) {
    l4x.scrollTop = l4x.scrollHeight;
    l4x.scrollLeft = l4x.scrollWidth;
  }
}

var wsc

function wsgame(gameid, server = 'ws0') {
  if (typeof gameid === 'undefined') {
    gameid = document.location.href.slice(25, 34)
  }
  if (document.getElementsByClassName('setup').length > 0) {
    server = 'ws' + document.getElementsByClassName('setup')[0].innerHTML.split(' • ')[2]
  }
  wsc = new WebSocket("wss://" + server + ".chessil.com/game/" + gameid);
  wsc.onopen = (event) => {
    heartbeat(wsc)
    wsc.send('s')
  }
  wsc.onmessage = (event) => {
    switch (event.data[0]) {
      case '1': {
        wsc.send('0')
        heartbeat(wsc)
        break;
      }
      case 'a': {
        wsc.send('b')
        break;
      }
      case 'm': {
        if (event.data[1] === ':') {
          const rawmove = event.data.slice(2).split(':')
          // We got a new move or premove
          // var moveinfo = 'm:'+clientmove+':'+side+':'+timeleft+':'+newuci.split(' ').length+':'+movereceived+':'+finishedstatus
          if (uci.length + 1 >= rawmove[3]) {
            // Normal order of moves received
            if (l4x.childElementCount > 0) l4x.childNodes[l4x.childElementCount - 1].className = ''
            if (fen.split(' ')[1] === 'w') {
              var tur = document.createElement('i5z')
              tur.innerHTML = fen.split(' ')[5]
              l4x.appendChild(tur)
            }
            const san1 = gensanbase(rawmove[0], board, fen, moves)
            uci[rawmove[3] - 1] = rawmove[0]
            const ucf = ucifen(uci.join(' '))
            fen = ucf.f
            history = ucf.h
            board = ucf.b
            moves = mg(fen)
            premoves = pmg(fen, moves, uci)
            const san2 = gensancheck(moves, fen)
            var nmo = document.createElement('kwdb')
            nmo.innerHTML = san1 + san2
            if (a1ti === uci.length - 1) {
              nmo.setAttribute('class', 'a1t')
              a1ti = uci.length
            }
            nmo.setAttribute('ply', uci.length)
            l4x.appendChild(nmo)
            if (a1ti === uci.length) {
              l4x.scrollTop = l4x.scrollHeight;
              l4x.scrollLeft = l4x.scrollWidth;
            }
            turn = { w: 'b', b: 'w' }[rawmove[1]]
            const fromSq = rawmove[0].slice(0, 2)
            const s = pieceElements[fromSq]
            const square = rawmove[0].slice(2, 4)
            if (typeof pieceElements[square] !== 'undefined') {
              cgboard.removeChild(pieceElements[square])
              delete pieceElements[square]
            }
            s.setAttribute('class', trside[board[square].c] + ' ' + trpiece[board[square].p])
            s.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
            if (typeof selectedElement[fromSq] !== 'undefined') cgboard.removeChild(selectedElement[fromSq])
            pieceElements[square] = s
            delete pieceElements[fromSq]
            // Remove premove squares highlighting
            for (squ in premovedElement) {
              cgboard.removeChild(premovedElement[squ])
              delete premovedElement[squ]
            }
            // Consider also the en passant and the castling
            // loop through board to see if there is any discrepancy
            var diffFrom = 0, diffTo = 0;
            for (squ in board) {
              if (board[squ].p === ' ' && typeof pieceElements[squ] !== 'undefined') diffFrom = squ
              if (board[squ].p !== ' ' && typeof pieceElements[squ] === 'undefined') diffTo = squ
            }
            if (diffTo === 0) {
              if (diffFrom !== 0) {
                // It went nowhere: en passant captured
                cgboard.removeChild(pieceElements[diffFrom])
                delete pieceElements[diffFrom]
              }
            } else {
              // It went somewhere: castling rook switch
              const el = pieceElements[diffFrom]
              el.setAttribute('class', trside[board[diffTo].c] + ' ' + trpiece[board[diffTo].p])
              el.setAttribute('style', 'transform: translate(' + trcol[playerside][diffTo[0]] * dim + 'px, ' + trrow[playerside][diffTo[1]] * dim + 'px);')
              pieceElements[diffTo] = el
              delete pieceElements[diffFrom]
            }
            // Update clock
            document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[rawmove[1]])[0].getElementsByClassName('time')[0].innerHTML = msToTime(rawmove[2])
            clock[rawmove[1]] = 1 * rawmove[2]
            allmovetimes.push(rawmove[2])
            lastmovetime = rawmove[4]
            // Is it checkmate or stalemate?
            if (rawmove.length > 5) {
              clearInterval(clocktick)
              displayTermination(rawmove[5])
            }
            // Draw rejected by moving
            drawbtn.style.background = ''
            drawbtn.style.color = ''
          } else {
            // Reset board? refresh the page could do the trick
            console.log('Received out of order moves')
          }
        } else {
          // We got all moves so far
          if (event.data.slice(1).length > 0) {
            uci = event.data.slice(1).split(' ')
            const ucil = uci.length
            for (var i = 0; i < ucil; ++i) {
              if (l4x.childElementCount > 0) l4x.childNodes[l4x.childElementCount - 1].className = ''
              if (fen.split(' ')[1] === 'w') {
                var tur = document.createElement('i5z')
                tur.innerHTML = fen.split(' ')[5]
                l4x.appendChild(tur)
              }
              const mstr = uci.slice(i, i + 1)[0]
              const san1 = gensanbase(mstr, board, fen, moves)
              const ucf = ucifen(mstr, fen, board, history)
              fen = ucf.f
              history = ucf.h
              board = ucf.b
              moves = mg(fen)
              const san2 = gensancheck(moves, fen)
              var nmo = document.createElement('kwdb')
              nmo.setAttribute('class', 'a1t')
              nmo.setAttribute('ply', i + 1)
              a1ti = i + 1
              nmo.innerHTML = san1 + san2
              l4x.appendChild(nmo)
              l4x.scrollTop = l4x.scrollHeight;
              l4x.scrollLeft = l4x.scrollWidth;
              const s = pieceElements[mstr.slice(0, 2)]
              const square = mstr.slice(2, 4)
              if (typeof pieceElements[square] !== 'undefined') {
                cgboard.removeChild(pieceElements[square])
                delete pieceElements[square]
              }
              s.setAttribute('class', trside[board[square].c] + ' ' + trpiece[board[square].p])
              s.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
              pieceElements[mstr.slice(2, 4)] = s
              delete pieceElements[mstr.slice(0, 2)]
              var diffFrom = 0, diffTo = 0;
              for (squ in board) {
                if (board[squ].p === ' ' && typeof pieceElements[squ] !== 'undefined') diffFrom = squ
                if (board[squ].p !== ' ' && typeof pieceElements[squ] === 'undefined') diffTo = squ
              }
              if (diffTo === 0) {
                if (diffFrom !== 0) {
                  // It went nowhere: en passant captured
                  cgboard.removeChild(pieceElements[diffFrom])
                  delete pieceElements[diffFrom]
                }
              } else {
                // It went somewhere: castling rook switch
                const el = pieceElements[diffFrom]
                el.setAttribute('class', trside[board[diffTo].c] + ' ' + trpiece[board[diffTo].p])
                el.setAttribute('style', 'transform: translate(' + trcol[playerside][diffTo[0]] * dim + 'px, ' + trrow[playerside][diffTo[1]] * dim + 'px);')
                pieceElements[diffTo] = el
                delete pieceElements[diffFrom]
              }
            }
            moves = mg(fen)
            premoves = pmg(fen, moves, uci)
            turn = fen.split(' ')[1]
          }
        }
        break;
      }
      case 'i': {
        // We got all move times
        if (event.data.slice(1).length === 0) {
          allmovetimes = []
        } else {
          allmovetimes = event.data.slice(1).split(' ')
        }
        break;
      }
      case 'e': {
        if (event.data[1] === ':') {
          // We got a new event var eventinfo = 'e:'+clientevent+':'+side+':'+eventtime+':'+finished
          var aev = event.data.slice(2).split(':')
          events.push(aev[1] + aev[0])
          eventstimes.push(aev[2])
          if (aev[0] == 1) {
            // Resign
            resignbtn.style.background = '#cdd675'
            resignbtn.style.color = { w: '#fff', b: '#000' }[aev[1]]
            nowtime = msToTime(clock[turn] - (eventstimes[eventstimes.length - 1] - lastmovetime))
            if (displaytime !== nowtime) {
              document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = nowtime
              displaytime = nowtime
            }
            displayTermination(aev[3])
          }
          if (aev[0] == 2) {
            // Willing to Draw
            if (aev[3] > 0) {
              // Agreement to draw
              drawbtn.style.background = '#cdd675'
              drawbtn.style.color = { w: '#fff', b: '#000' }[aev[1]]
              nowtime = msToTime(clock[turn] - (eventstimes[eventstimes.length - 1] - lastmovetime))
              if (displaytime !== nowtime) {
                document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = nowtime
                displaytime = nowtime
              }
              displayTermination(aev[3])
            } else {
              // One sided offer
              drawbtn.style.background = '#00a2ff'
              drawbtn.style.color = { w: '#fff', b: '#000' }[aev[1]]
            }
          }
        } else {
          // We got all events
          // Coded as side+event
          // Events are 1 Resign, 2 Yes Draw, 3 No Draw
          // b2w3b1 means black offers draw, white rejects draw and finally black resigns
          // split into 2 char strings
          events = event.data.slice(1).match(/[\s\S]{1,2}/g) || [];
        }
        break;
      }
      case 'k': {
        // We got all events times, but how to display? No need? // Prevent spamming offers I guess...
        eventstimes = { true: event.data.slice(1).split(' '), false: [] }[event.data.slice(1).length > 0]
        // Process all events until now, look at the last event
        if (events.length > 0 && events[events.length - 1][1] == 2 && gamefinished === false) {
          // We got a one sided draw offer, see if it is from this turn
          if (eventstimes.length > 0 && eventstimes[eventstimes.length - 1] > lastmovetime) {
            drawbtn.style.background = '#00a2ff'
            drawbtn.style.color = { w: '#fff', b: '#000' }[events.slice(-1)[0][0]]
          }
        }
        break;
      }
      case 'l': {
        // We got white time left on the clock
        clock['w'] = 1 * event.data.slice(1)
        document.getElementsByClassName('rclock-white')[0].getElementsByClassName('time')[0].innerHTML = msToTime(clock['w'])
        break;
      }
      case 'n': {
        // We got black time left on the clock
        clock['b'] = 1 * event.data.slice(1)
        document.getElementsByClassName('rclock-black')[0].getElementsByClassName('time')[0].innerHTML = msToTime(clock['b'])
        break;
      }
      case 'f': {
        // We got finished status
        var finished = event.data.slice(1)
        if (finished == 0) {
          // Game is ongoing, clocks are ticking
          clearInterval(clocktick)
          clocktick = setInterval(function () {
            if (uci.length > 1) {
              timeleft = clock[turn] - (Date.now() - lastmovetime)
              if (timeleft <= 0) timeleft = 0
              nowtime = msToTime(timeleft)
              if (displaytime !== nowtime) {
                document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = nowtime
                displaytime = nowtime
              }
            }
          }, 100)
        } else {
          displayTermination(finished)
        }
        break;
      }
      case 't': {
        // We got time out clock flag status var moveinfo = 't:'+side+':'+timeleft+':'+finished
        var timecheck = event.data.slice(2).split(':')
        if (timecheck[2] == 0) {
          document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[timecheck[0]])[0].getElementsByClassName('time')[0].innerHTML = msToTime(timecheck[1])
        } else {
          clearInterval(clocktick)
          document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[timecheck[0]])[0].getElementsByClassName('time')[0].innerHTML = msToTime(0)
          displayTermination(timecheck[2])
        }
        break;
      }
      case 'p': {
        // Our premove feedback
        premoved = event.data.slice(1)
        // Remove premove squares highlighting
        for (squ in premovedElement) {
          cgboard.removeChild(premovedElement[squ])
          delete premovedElement[squ]
        }
        if (premoved.length > 0) {
          var square = premoved[0] + premoved[1]
          var selected = document.createElement('square')
          selected.setAttribute('class', 'current-premove')
          selected.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
          premovedElement[square] = selected
          cgboard.appendChild(selected)
          var square = premoved[2] + premoved[3]
          var selected = document.createElement('square')
          selected.setAttribute('class', 'current-premove')
          selected.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
          premovedElement[square] = selected
          cgboard.appendChild(selected)
        }
        break;
      }
      case 's': {
        // Last move unix time
        lastmovetime = event.data.slice(1)
        break;
      }
      case 'z': {
        // Our side
        if (typeof { w: 1, b: 1 }[event.data.slice(1)] !== 'undefined') {
          playerside = event.data.slice(1)
        } else {
          watcher = true
        }
        break;
      }
      case 'd': {
        var diffs = event.data.slice(2).split(':')
        var ddd = { w: diffs[0], b: diffs[1] }
        var wrat, brat
        if (ddd.w >= 0) {
          wrat = document.createElement('good')
          wrat.innerHTML = '+' + ddd.w
        } else {
          wrat = document.createElement('bad')
          wrat.innerHTML = ddd.w
        }
        if (ddd.b >= 0) {
          brat = document.createElement('good')
          brat.innerHTML = '+' + ddd.b
        } else {
          brat = document.createElement('bad')
          brat.innerHTML = ddd.b
        }
        document.getElementsByClassName('ruser-bottom')[0].appendChild({ w: wrat, b: brat }[playerside])
        document.getElementsByClassName('ruser-top')[0].appendChild({ w: brat, b: wrat }[playerside])
        break;
      }
      case '9': {
        displayTermination('9')
        wsc.close()
        break;
      }
      default: {
        break;
      }
    }
  }
  wsc.onclose = (event) => {
    clearTimeout(wsc.pingTimeout);
    if (gamefinished === true) location.reload();
  }
  drawbtn.onclick = function () { wsc.send('e2') }
  resignbtn.onclick = function () { wsc.send('e1') }
}

var fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
var moves = mg(fen)
var uci = []
var premoves = pmg(fen, moves, uci)
var board = boardgen(fen)
var pieceElements = {}
var selectedElement = {}
var selectedSquare = ''
var highlightedElement = {}
var highlightedSquare = ''
var premovedElement = {}
var destinationElements = {}
var draggingPiece = 0
var cgboard, wrap, container, dim, halfdim, dimensions, boardtop, boardleft, pixelperfect, htmldim
const trside = { w: 'white', b: 'black' }
const trpiece = { r: 'rook', b: 'bishop', n: 'knight', p: 'pawn', q: 'queen', k: 'king' }
var gamehistory = {}
var playerside, watcher
var gamefinished = false
var premoved = ''
var promotionPiece = 'q'
var promoElement
var promoElementQ
var promoElementR
var promoElementB
var promoElementN
var destinationSquares = {}
const trcol = { w: { 'h': 7, 'g': 6, 'f': 5, 'e': 4, 'd': 3, 'c': 2, 'b': 1, 'a': 0 }, b: { 'h': 0, 'g': 1, 'f': 2, 'e': 3, 'd': 4, 'c': 5, 'b': 6, 'a': 7 } }
const trrow = { w: [8, 7, 6, 5, 4, 3, 2, 1, 0], b: [0, 0, 1, 2, 3, 4, 5, 6, 7] }
const coordtocol = { b: ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'], w: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] }
const coordtorow = { w: [8, 7, 6, 5, 4, 3, 2, 1], b: [1, 2, 3, 4, 5, 6, 7, 8] }

function isPromotion(sqFrom, sqTo) {
  if (board[sqFrom].p === 'p' && board[sqFrom].c === 'w' && sqTo[1] === '8') return true
  if (board[sqFrom].p === 'p' && board[sqFrom].c === 'b' && sqTo[1] === '1') return true
  return false
}
function isAlmostPromotion(sqFrom, sqTo) {
  if (board[sqFrom].p === 'p' && board[sqFrom].c === 'w' && sqTo[1] === '7') return true
  if (board[sqFrom].p === 'p' && board[sqFrom].c === 'b' && sqTo[1] === '2') return true
  return false
}
function highlightdestination(square) {
  if (square !== highlightedSquare) {
    if (typeof highlightedElement[highlightedSquare] !== 'undefined') {
      cgboard.removeChild(highlightedElement[highlightedSquare])
      highlightedElement = {}
    }
    if (square.length === 2) {
      const selected = document.createElement('square')
      selected.setAttribute('class', 'selected')
      selected.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
      highlightedElement[square] = selected
      cgboard.appendChild(selected)
    }
    highlightedSquare = square
  }
}
function dragelement(ele) {
  //ele.addEventListener('touchstart', piecetouch);
  //ele.addEventListener('mousedown', piecetouch);
  //ele.addEventListener('click', piecetouch);
  ele.addEventListener('pointerdown', piecetouch);
  ele.addEventListener('pointermove', piecedrag);
  ele.addEventListener('touchmove', piecedrag);
  ele.addEventListener('pointerup', piecedrop);
  ele.addEventListener('touchend', piecedrop);
  //ele.addEventListener('pointerover', endDrag);
  //ele.addEventListener('', piecetouch);
  /*
  click
  keydown
  keypress
  keyup
  mousedown
  mousemove
  mouseover
  touchend
  touchmove
  touchstart
  */
  var pointx = 0
  var pointy = 0
  function piecedrop(e) {
    if (typeof highlightedElement[highlightedSquare] !== 'undefined') {
      cgboard.removeChild(highlightedElement[highlightedSquare])
      highlightedElement = {}
    }
    if (typeof e.changedTouches !== 'undefined') {
      pointx = e.changedTouches[0].pageX - boardleft
      pointy = e.changedTouches[0].pageY - boardtop
    } else {
      pointx = e.pageX - boardleft
      pointy = e.pageY - boardtop
    }
    if (selectedSquare !== '') {
      const square = coordtocol[playerside][Math.floor(pointx / dim)] + coordtorow[playerside][Math.floor(pointy / dim)]
      // Moving a piece that was selected, dragged and dropped into a possible destination
      if (selectedSquare !== square) {
        if (turn !== playerside) {
          const s = pieceElements[selectedSquare]
          s.setAttribute('class', trside[board[selectedSquare].c] + ' ' + trpiece[board[selectedSquare].p])
          s.setAttribute('style', 'transform: translate(' + trcol[playerside][selectedSquare[0]] * dim + 'px, ' + trrow[playerside][selectedSquare[1]] * dim + 'px);')
        }
        var inputmove
        if (isPromotion(selectedSquare, square) === true) {
          inputmove = selectedSquare + square + promotionPiece
        } else {
          inputmove = selectedSquare + square
        }
        if (isAlmostPromotion(selectedSquare, square) === true) {
          promoElement.className = 'material material-bottom'
        } else {
          promoElement.className = 'material material-bottom material-no'
        }
        if ({ w: { w: moves.indexOf(inputmove), b: premoves.indexOf(inputmove) }, b: { w: premoves.indexOf(inputmove), b: moves.indexOf(inputmove) } }[turn][playerside] > -1) {
          wsc.send({ w: { w: 'm', b: 'p' }, b: { w: 'p', b: 'm' } }[turn][playerside] + inputmove)
        } else {
          const s = pieceElements[selectedSquare]
          s.setAttribute('class', trside[board[selectedSquare].c] + ' ' + trpiece[board[selectedSquare].p])
          s.setAttribute('style', 'transform: translate(' + trcol[playerside][selectedSquare[0]] * dim + 'px, ' + trrow[playerside][selectedSquare[1]] * dim + 'px);')
        }
        cgboard.removeChild(selectedElement[selectedSquare])
        selectedSquare = ''
        draggingPiece = 0
        selectedElement = {}
      } else {
        // We dragged a piece into the same initial square. Turn off the dragging flag, and reposition the piece squarely
        draggingPiece = 0
        const s = pieceElements[selectedSquare]
        s.setAttribute('class', trside[board[selectedSquare].c] + ' ' + trpiece[board[selectedSquare].p])
        s.setAttribute('style', 'transform: translate(' + trcol[playerside][selectedSquare[0]] * dim + 'px, ' + trrow[playerside][selectedSquare[1]] * dim + 'px);')
      }
    }
  }
  function piecedrag(e) {
    if (typeof e.changedTouches !== 'undefined') {
      pointx = e.changedTouches[0].pageX - boardleft
      pointy = e.changedTouches[0].pageY - boardtop
    } else {
      pointx = e.pageX - boardleft
      pointy = e.pageY - boardtop
    }
    if (selectedSquare !== '' && draggingPiece === 1) {
      pieceElements[selectedSquare].setAttribute('style', 'transform: translate(' + (pointx - halfdim) + 'px, ' + (pointy - halfdim) + 'px);')
      highlightdestination(coordtocol[playerside][Math.floor(pointx / dim)] + coordtorow[playerside][Math.floor(pointy / dim)])
      //s.setAttribute('style','transform: translate('+(e.offsetX - halfdim)+'px, '+(e.offsetY - halfdim)+'px);')
    }
  }
  function piecetouch(e) {
    if (watcher || gamefinished) return false
    if (typeof e.changedTouches !== 'undefined') {
      pointx = e.changedTouches[0].pageX - boardleft
      pointy = e.changedTouches[0].pageY - boardtop
    } else {
      pointx = e.pageX - boardleft
      pointy = e.pageY - boardtop
    }
    // A square is touched
    const square = coordtocol[playerside][Math.floor(pointx / dim)] + coordtorow[playerside][Math.floor(pointy / dim)]
    // If no piece on square
    if (typeof board[square] !== 'undefined' && board[square].p === ' ') {
      // If a square was selected
      if (selectedSquare !== '') {
        if (turn !== playerside) {
          const s = pieceElements[selectedSquare]
          s.setAttribute('class', trside[board[selectedSquare].c] + ' ' + trpiece[board[selectedSquare].p])
          s.setAttribute('style', 'transform: translate(' + trcol[playerside][selectedSquare[0]] * dim + 'px, ' + trrow[playerside][selectedSquare[1]] * dim + 'px);')
        }
        var inputmove
        if (isPromotion(selectedSquare, square) === true) {
          inputmove = selectedSquare + square + promotionPiece
        } else {
          inputmove = selectedSquare + square
        }
        if (isAlmostPromotion(selectedSquare, square) === true) {
          promoElement.className = 'material material-bottom'
        } else {
          promoElement.className = 'material material-bottom material-no'
        }
        if ({ w: { w: moves.indexOf(inputmove), b: premoves.indexOf(inputmove) }, b: { w: premoves.indexOf(inputmove), b: moves.indexOf(inputmove) } }[turn][playerside] > -1) {
          wsc.send({ w: { w: 'm', b: 'p' }, b: { w: 'p', b: 'm' } }[turn][playerside] + inputmove)
        } else {
          const s = pieceElements[selectedSquare]
          s.setAttribute('class', trside[board[selectedSquare].c] + ' ' + trpiece[board[selectedSquare].p])
          s.setAttribute('style', 'transform: translate(' + trcol[playerside][selectedSquare[0]] * dim + 'px, ' + trrow[playerside][selectedSquare[1]] * dim + 'px);')
        }
        cgboard.removeChild(selectedElement[selectedSquare])
        selectedSquare = ''
        draggingPiece = 0
        selectedElement = {}
      } else {
        // If no square was selected, cancel premoves
        wsc.send('p')
      }
    } else {
      // If there is a piece on square
      if (selectedSquare.length === 0) {
        // If no prior piece was selected, piece becomes selected
        if (typeof board[square] !== 'undefined' && board[square].c === playerside) {
          // If it is our piece, that square becomes selected
          selectedSquare = square
          const s = pieceElements[square]
          s.setAttribute('class', trside[board[square].c] + ' ' + trpiece[board[square].p] + ' dragging')
          s.setAttribute('style', 'transform: translate(' + (pointx - halfdim) + 'px, ' + (pointy - halfdim) + 'px);')
          draggingPiece = 1
          const selected = document.createElement('square')
          selected.setAttribute('class', 'selected')
          selected.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
          selectedElement[square] = selected
          cgboard.appendChild(selected)
        }
      } else {
        // If a piece was already selected, and we click on a piece
        if (square === selectedSquare) {
          // Clicking on the selected piece will start dragging it
          selectedSquare = square
          const s = pieceElements[square]
          s.setAttribute('class', trside[board[square].c] + ' ' + trpiece[board[square].p] + ' dragging')
          s.setAttribute('style', 'transform: translate(' + (pointx - halfdim) + 'px, ' + (pointy - halfdim) + 'px);')
          draggingPiece = 1
        } else {
          if (typeof board[square] !== 'undefined' && board[square].c === playerside) {
            // Own pieces, we switch the piece selection. Unless it is a legal premove during opponent's turn 
            if (turn !== playerside) pieceElements[selectedSquare].setAttribute('class', trside[board[selectedSquare].c] + ' ' + trpiece[board[selectedSquare].p])
            var inputmove
            if (isPromotion(selectedSquare, square) === true) {
              inputmove = selectedSquare + square + promotionPiece
            } else {
              inputmove = selectedSquare + square
            }
            if (isAlmostPromotion(selectedSquare, square) === true) {
              promoElement.className = 'material material-bottom'
            } else {
              promoElement.className = 'material material-bottom material-no'
            }
            cgboard.removeChild(selectedElement[selectedSquare])
            selectedSquare = ''
            draggingPiece = 0
            selectedElement = {}
            if (turn !== playerside && premoves.indexOf(inputmove) > -1) {
              wsc.send({ w: { w: 'm', b: 'p' }, b: { w: 'p', b: 'm' } }[turn][playerside] + inputmove)
            } else {
              selectedSquare = square
              const s = pieceElements[square]
              s.setAttribute('class', trside[board[square].c] + ' ' + trpiece[board[square].p] + ' dragging')
              s.setAttribute('style', 'transform: translate(' + (pointx - halfdim) + 'px, ' + (pointy - halfdim) + 'px);')
              draggingPiece = 1
              const selected = document.createElement('square')
              selected.setAttribute('class', 'selected')
              selected.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
              selectedElement[square] = selected
              cgboard.appendChild(selected)
            }
          } else {
            // Clicked on opponent piece
            if (turn !== playerside) {
              const s = pieceElements[selectedSquare]
              s.setAttribute('class', trside[board[selectedSquare].c] + ' ' + trpiece[board[selectedSquare].p])
              s.setAttribute('style', 'transform: translate(' + trcol[playerside][selectedSquare[0]] * dim + 'px, ' + trrow[playerside][selectedSquare[1]] * dim + 'px);')
            }
            var inputmove
            if (isPromotion(selectedSquare, square) === true) {
              inputmove = selectedSquare + square + promotionPiece
            } else {
              inputmove = selectedSquare + square
            }
            if (isAlmostPromotion(selectedSquare, square) === true) {
              promoElement.className = 'material material-bottom'
            } else {
              promoElement.className = 'material material-bottom material-no'
            }
            if ({ w: { w: moves.indexOf(inputmove), b: premoves.indexOf(inputmove) }, b: { w: premoves.indexOf(inputmove), b: moves.indexOf(inputmove) } }[turn][playerside] > -1) {
              wsc.send({ w: { w: 'm', b: 'p' }, b: { w: 'p', b: 'm' } }[turn][playerside] + inputmove)
            } else {
              const s = pieceElements[selectedSquare]
              s.setAttribute('class', trside[board[selectedSquare].c] + ' ' + trpiece[board[selectedSquare].p])
              s.setAttribute('style', 'transform: translate(' + trcol[playerside][selectedSquare[0]] * dim + 'px, ' + trrow[playerside][selectedSquare[1]] * dim + 'px);')
            }
            cgboard.removeChild(selectedElement[selectedSquare])
            selectedSquare = ''
            draggingPiece = 0
            selectedElement = {}
          }
        }
      }
    }
  }
}
function dbgame(gameid) {
  if (typeof gameid === 'undefined') {
    gameid = document.location.href.slice(25, 34)
  }
  var xhr = new XMLHttpRequest();
  xhr.open("POST", '/gamestate', true);
  xhr.send(gameid)
  xhr.onreadystatechange = function () {
    if (this.readyState != 4) return;
    if (this.status == 200) {
      const gdt = JSON.parse(this.responseText)
      // We got all moves so far
      if (gdt.m.length > 0) {
        uci = gdt.m.split(' ')
        const ucil = uci.length
        for (var i = 0; i < ucil; ++i) {
          if (l4x.childElementCount > 0) l4x.childNodes[l4x.childElementCount - 1].className = ''
          if (fen.split(' ')[1] === 'w') {
            var tur = document.createElement('i5z')
            tur.innerHTML = fen.split(' ')[5]
            l4x.appendChild(tur)
          }
          const mstr = uci.slice(i, i + 1)[0]
          const san1 = gensanbase(mstr, board, fen, moves)
          const ucf = ucifen(mstr, fen, board, history)
          fen = ucf.f
          history = ucf.h
          board = ucf.b
          moves = mg(fen)
          const san2 = gensancheck(moves, fen)
          var nmo = document.createElement('kwdb')
          nmo.setAttribute('class', 'a1t')
          nmo.setAttribute('ply', i + 1)
          a1ti = i + 1
          nmo.innerHTML = san1 + san2
          l4x.appendChild(nmo)
          l4x.scrollTop = l4x.scrollHeight;
          l4x.scrollLeft = l4x.scrollWidth;
          const s = pieceElements[mstr.slice(0, 2)]
          const square = mstr.slice(2, 4)
          if (typeof pieceElements[square] !== 'undefined') {
            cgboard.removeChild(pieceElements[square])
            delete pieceElements[square]
          }
          s.setAttribute('class', trside[board[square].c] + ' ' + trpiece[board[square].p])
          s.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
          pieceElements[mstr.slice(2, 4)] = s
          delete pieceElements[mstr.slice(0, 2)]
          var diffFrom = 0, diffTo = 0;
          for (squ in board) {
            if (board[squ].p === ' ' && typeof pieceElements[squ] !== 'undefined') diffFrom = squ
            if (board[squ].p !== ' ' && typeof pieceElements[squ] === 'undefined') diffTo = squ
          }
          if (diffTo === 0) {
            if (diffFrom !== 0) {
              // It went nowhere: en passant captured
              cgboard.removeChild(pieceElements[diffFrom])
              delete pieceElements[diffFrom]
            }
          } else {
            // It went somewhere: castling rook switch
            const el = pieceElements[diffFrom]
            el.setAttribute('class', trside[board[diffTo].c] + ' ' + trpiece[board[diffTo].p])
            el.setAttribute('style', 'transform: translate(' + trcol[playerside][diffTo[0]] * dim + 'px, ' + trrow[playerside][diffTo[1]] * dim + 'px);')
            pieceElements[diffTo] = el
            delete pieceElements[diffFrom]
          }
        }
        moves = mg(fen)
        premoves = pmg(fen, moves, uci)
        turn = fen.split(' ')[1]
      }
      // We got all move times
      if (gdt.c.length === 0) {
        allmovetimes = []
      } else {
        allmovetimes = gdt.c.split(' ')
      }
      // We got all events
      // Coded as side+event
      // Events are 1 Resign, 2 Yes Draw, 3 No Draw
      // b2w3b1 means black offers draw, white rejects draw and finally black resigns
      // split into 2 char strings
      events = gdt.e.match(/[\s\S]{1,2}/g) || [];
      // We got all events times
      eventstimes = { true: gdt.d.split(' '), false: [] }[gdt.d.length > 0]

      // We got white time left on the clock
      clock['w'] = 1 * gdt.t
      document.getElementsByClassName('rclock-white')[0].getElementsByClassName('time')[0].innerHTML = msToTime(clock['w'])
      // We got black time left on the clock
      clock['b'] = 1 * gdt.u
      document.getElementsByClassName('rclock-black')[0].getElementsByClassName('time')[0].innerHTML = msToTime(clock['b'])
      // We got rating diffs
      if (gdt.w !== null) {
        // When rating is null, for unrated games, do not display
        var wrat, brat
        if (gdt.w >= 0) {
          wrat = document.createElement('good')
          wrat.innerHTML = '+' + gdt.w
        } else {
          wrat = document.createElement('bad')
          wrat.innerHTML = gdt.w
        }
        if (gdt.b >= 0) {
          brat = document.createElement('good')
          brat.innerHTML = '+' + gdt.b
        } else {
          brat = document.createElement('bad')
          brat.innerHTML = gdt.b
        }
        document.getElementsByClassName('ruser-bottom')[0].appendChild({ w: wrat, b: brat }[playerside])
        document.getElementsByClassName('ruser-top')[0].appendChild({ w: brat, b: wrat }[playerside])
      }

      displayTermination(stat)
    }
  }
}
function roundstart() {
  buttons = document.getElementsByClassName('buttons')[0];
  l4x = document.getElementsByTagName('l4x')[0]
  rm6 = document.getElementsByTagName('rm6')[0]
  if (window.getComputedStyle(buttons).display === "none") {
    if (document.getElementsByClassName('col1-moves').length === 0) {
      const newelement = document.createElement('div')
      newelement.setAttribute('class', 'col1-moves')
      rm6.appendChild(newelement)
      newelement.appendChild(document.getElementsByClassName('fbt')[1].cloneNode(true))
      newelement.appendChild(l4x)
      newelement.appendChild(document.getElementsByClassName('fbt')[2].cloneNode(true))
    }
  } else {
    if (document.getElementsByClassName('col1-moves').length > 0) {
      rm6.appendChild(l4x)
      rm6.removeChild(document.getElementsByClassName('col1-moves')[0])
    }
  }
  rm6.onclick = function (event) {
    if (stat == 0) return
    if (event.target.getAttribute('id') === 'rw') {
      a1ti = 0
      if (a1ti < 0) a1ti = 0
      if (a1ti > uci.length) a1ti = uci.length
      if (l4x.getElementsByClassName('a1t').length > 0) l4x.getElementsByClassName('a1t')[0].classList.toggle('a1t')
      gamereplay(a1ti)
      document.getElementsByClassName('rclock-' + { b: 'white', w: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = msToTime(allmovetimes[a1ti - 1] || 1000 * 60 * tc.split('+')[0])
      document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = msToTime(allmovetimes[a1ti - 2] || 1000 * 60 * tc.split('+')[0])
      if (a1ti > 0 && a1ti <= uci.length) {
        l4x.querySelector("[ply='" + a1ti + "']").classList.toggle('a1t');
        l4x.querySelector("[ply='" + a1ti + "']").scrollIntoView()
      }
    }
    if (event.target.getAttribute('id') === 'ff') {
      a1ti = uci.length + 1
      if (a1ti < 0) a1ti = 0
      if (a1ti > uci.length) a1ti = uci.length + 1
      if (l4x.getElementsByClassName('a1t').length > 0) l4x.getElementsByClassName('a1t')[0].classList.toggle('a1t')
      if (a1ti > uci.length) {
        gamereplay(uci.length)
        document.getElementsByClassName('rclock-white')[0].getElementsByClassName('time')[0].innerHTML = msToTime(clock.w)
        document.getElementsByClassName('rclock-black')[0].getElementsByClassName('time')[0].innerHTML = msToTime(clock.b)
      } else {
        gamereplay(a1ti)
        document.getElementsByClassName('rclock-' + { b: 'white', w: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = msToTime(allmovetimes[a1ti - 1] || 1000 * 60 * tc.split('+')[0])
        document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = msToTime(allmovetimes[a1ti - 2] || 1000 * 60 * tc.split('+')[0])
      }
      if (a1ti > 0 && a1ti <= uci.length) {
        l4x.querySelector("[ply='" + a1ti + "']").classList.toggle('a1t');
        l4x.querySelector("[ply='" + a1ti + "']").scrollIntoView()
      }
    }
    if (event.target.getAttribute('id') === 'sb') {
      a1ti -= 1
      if (a1ti < 0) a1ti = 0
      if (a1ti > uci.length) a1ti = uci.length
      if (l4x.getElementsByClassName('a1t').length > 0) l4x.getElementsByClassName('a1t')[0].classList.toggle('a1t')
      gamereplay(a1ti)
      document.getElementsByClassName('rclock-' + { b: 'white', w: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = msToTime(allmovetimes[a1ti - 1] || 1000 * 60 * tc.split('+')[0])
      document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = msToTime(allmovetimes[a1ti - 2] || 1000 * 60 * tc.split('+')[0])
      if (a1ti > 0 && a1ti <= uci.length) {
        l4x.querySelector("[ply='" + a1ti + "']").classList.toggle('a1t');
        l4x.querySelector("[ply='" + a1ti + "']").scrollIntoView()
      }
    }
    if (event.target.getAttribute('id') === 'fw') {
      a1ti += 1
      if (a1ti < 1) a1ti = 1
      if (a1ti > uci.length) a1ti = uci.length + 1
      if (l4x.getElementsByClassName('a1t').length > 0) l4x.getElementsByClassName('a1t')[0].classList.toggle('a1t')
      if (a1ti > uci.length) {
        gamereplay(uci.length)
        document.getElementsByClassName('rclock-white')[0].getElementsByClassName('time')[0].innerHTML = msToTime(clock.w)
        document.getElementsByClassName('rclock-black')[0].getElementsByClassName('time')[0].innerHTML = msToTime(clock.b)
      } else {
        gamereplay(a1ti)
        document.getElementsByClassName('rclock-' + { b: 'white', w: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = msToTime(allmovetimes[a1ti - 1] || 1000 * 60 * tc.split('+')[0])
        document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = msToTime(allmovetimes[a1ti - 2] || 1000 * 60 * tc.split('+')[0])
      }
      if (a1ti > 0 && a1ti <= uci.length) {
        l4x.querySelector("[ply='" + a1ti + "']").classList.toggle('a1t');
        l4x.querySelector("[ply='" + a1ti + "']").scrollIntoView()
      }
    }

    if (event.target.getAttribute('ply') > 0) {
      if (l4x.getElementsByClassName('a1t').length > 0) l4x.getElementsByClassName('a1t')[0].classList.toggle('a1t')
      a1ti = 1 * event.target.getAttribute('ply')
      if (l4x.getElementsByClassName('a1t').length > 0) l4x.getElementsByClassName('a1t')[0].classList.toggle('a1t')
      gamereplay(a1ti)
      document.getElementsByClassName('rclock-' + { b: 'white', w: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = msToTime(allmovetimes[a1ti - 1] || 1000 * 60 * tc.split('+')[0])
      document.getElementsByClassName('rclock-' + { w: 'white', b: 'black' }[turn])[0].getElementsByClassName('time')[0].innerHTML = msToTime(allmovetimes[a1ti - 2] || 1000 * 60 * tc.split('+')[0])
      if (a1ti > 0 && a1ti <= uci.length) {
        l4x.querySelector("[ply='" + a1ti + "']").classList.toggle('a1t');
      }
    }
  }
  promoElement = document.getElementsByClassName('material-bottom')[0]
  promoElement.className = 'material material-bottom material-no'
  promoElementQ = document.getElementById('prq')
  promoElementQ.className = 'selected'
  promoElementQ.onclick = function () {
    promoElementQ.className = 'selected'
    promotionPiece = 'q'
  }
  promoElementQ.onclick = function () {
    promotionPiece = 'q';
    promoElementQ.className = 'selected'
    promoElementR.className = ''
    promoElementB.className = ''
    promoElementN.className = ''
  }
  promoElementR = document.getElementById('prr')
  promoElementR.onclick = function () {
    promotionPiece = 'r';
    promoElementQ.className = ''
    promoElementR.className = 'selected'
    promoElementB.className = ''
    promoElementN.className = ''
  }
  promoElementB = document.getElementById('prb')
  promoElementB.onclick = function () {
    promotionPiece = 'b';
    promoElementQ.className = ''
    promoElementR.className = ''
    promoElementB.className = 'selected'
    promoElementN.className = ''
  }
  promoElementN = document.getElementById('prn')
  promoElementN.onclick = function () {
    promotionPiece = 'n';
    promoElementQ.className = ''
    promoElementR.className = ''
    promoElementB.className = ''
    promoElementN.className = 'selected'
  }
  //movs= document.getElementsByTagName('moves')[0].innerHTML
  //mclk = document.getElementsByTagName('clock')[0].innerHTML
  //evts = document.getElementsByTagName('events')[0].innerHTML
  //eclk = document.getElementsByTagName('eventsclock')[0].innerHTML
  //rslt = document.getElementsByClassName('result')[0].innerHTML
  rt1 = document.getElementsByTagName('rating')[0].innerHTML
  rt2 = document.getElementsByTagName('rating')[1].innerHTML
  //rd1 = document.getElementsByTagName('diff')[0].innerHTML
  //rd2 = document.getElementsByTagName('diff')[1].innerHTML
  rtd = document.getElementsByClassName('setup')[0].innerHTML.split(' • ')[1]
  tc = document.getElementsByClassName('setup')[0].innerHTML.split(' • ')[0]
  drawbtn = document.getElementsByClassName('draw-yes')[0]
  resignbtn = document.getElementsByClassName('resign')[0]
  cgboard = document.getElementsByTagName('cg-board')[0]
  playerside = document.getElementsByClassName('setup')[0].innerHTML.split(' • ')[3]
  if (playerside === 's') {
    playerside = new URLSearchParams(window.location.search).get('s')
    if (playerside == null) playerside = 'w'
  }
  dragelement(document)
  wrap = document.getElementsByClassName('cg-wrap')[0].getBoundingClientRect()
  container = document.getElementsByTagName('cg-container')[0]
  pixelperfect = Math.floor(wrap.width * window.devicePixelRatio / 8) * 8 / window.devicePixelRatio
  container.style.width = pixelperfect + "px"
  container.style.height = pixelperfect + "px"
  dim = pixelperfect / 8
  halfdim = dim / 2
  dimensions = cgboard.getBoundingClientRect()
  htmldim = document.getElementsByTagName("html")[0].getBoundingClientRect()
  boardtop = dimensions["top"] - htmldim["top"]
  boardleft = dimensions["left"] - htmldim["left"]
  //dragelement(document.getElementsByClassName('round')[0])
  if (playerside === 'w') {
    document.getElementsByClassName('cg-wrap')[0].classList.add('orientation-white')
    document.getElementsByClassName('rclock-bottom')[0].classList.add('rclock-white')
    document.getElementsByClassName('rclock-top')[0].classList.add('rclock-black')
  }
  if (playerside === 'b') {
    document.getElementsByClassName('cg-wrap')[0].classList.add('orientation-black')
    document.getElementsByClassName('ranks')[0].classList.add('black')
    document.getElementsByClassName('files')[0].classList.add('black')
    var tempstr = document.getElementsByClassName('ruser-bottom')[0].innerHTML
    document.getElementsByClassName('ruser-bottom')[0].innerHTML = document.getElementsByClassName('ruser-top')[0].innerHTML
    document.getElementsByClassName('ruser-top')[0].innerHTML = tempstr
    document.getElementsByClassName('rclock-bottom')[0].classList.add('rclock-black')
    document.getElementsByClassName('rclock-top')[0].classList.add('rclock-white')
  }
  for (square in board) {
    const s = board[square]
    if (s.p !== ' ') {
      //populate board
      const newelement = document.createElement('piece')
      newelement.setAttribute('class', trside[s.c] + ' ' + trpiece[s.p])
      newelement.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
      pieceElements[square] = newelement
      cgboard.appendChild(newelement)
    }
  }
  window.onscroll = () => {
    dimensions = cgboard.getBoundingClientRect()
    htmldim = document.getElementsByTagName("html")[0].getBoundingClientRect()
    boardtop = dimensions["top"] - htmldim["top"]
    boardleft = dimensions["left"] - htmldim["left"]
  }
  window.onresize = () => {
    if (window.getComputedStyle(buttons).display === "none") {
      if (document.getElementsByClassName('col1-moves').length === 0) {
        const newelement = document.createElement('div')
        newelement.setAttribute('class', 'col1-moves')
        rm6.appendChild(newelement)
        newelement.appendChild(document.getElementsByClassName('fbt')[1].cloneNode(true))
        newelement.appendChild(l4x)
        newelement.appendChild(document.getElementsByClassName('fbt')[2].cloneNode(true))
      }
    } else {
      if (document.getElementsByClassName('col1-moves').length > 0) {
        rm6.appendChild(l4x)
        rm6.removeChild(document.getElementsByClassName('col1-moves')[0])
      }
    }
    if (a1ti === uci.length) {
      l4x.scrollTop = l4x.scrollHeight;
      l4x.scrollLeft = l4x.scrollWidth;
    }
    wrap = document.getElementsByClassName('cg-wrap')[0].getBoundingClientRect()
    container = document.getElementsByTagName('cg-container')[0]
    pixelperfect = Math.floor(wrap.width * window.devicePixelRatio / 8) * 8 / window.devicePixelRatio
    container.style.width = pixelperfect + "px"
    container.style.height = pixelperfect + "px"
    dim = pixelperfect / 8
    halfdim = dim / 2
    dimensions = cgboard.getBoundingClientRect()
    htmldim = document.getElementsByTagName("html")[0].getBoundingClientRect()
    boardtop = dimensions["top"] - htmldim["top"]
    boardleft = dimensions["left"] - htmldim["left"]
    for (square in pieceElements) {
      const s = pieceElements[square]
      //s.setAttribute('class',trside[board[square].c]+' '+trpiece[board[square].p])
      s.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
    }
    for (square in destinationElements) {
      const s = destinationElements[square]
      s.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
    }
    for (square in selectedElement) {
      const s = selectedElement[square]
      s.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
    }
    for (square in premovedElement) {
      const s = premovedElement[square]
      s.setAttribute('style', 'transform: translate(' + trcol[playerside][square[0]] * dim + 'px, ' + trrow[playerside][square[1]] * dim + 'px);')
    }
  }
  stat = document.getElementsByClassName('status')[0].innerHTML
  if (stat == 0) {
    l4x.innerHTML = ''
    wsgame();
  } else {
    if (stat == 9) {
      displayTermination(9)
    } else {
      dbgame();
    }
  }
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

function botNotationToCoords(move) {

  let col
  let rowA
  let rowB
  let colA
  let colB
  let promotion

  col.a = 0
  col.b = 1
  col.c = 2
  col.d = 3
  col.e = 4
  col.f = 5
  col.g = 6
  col.h = 7

  colA = col.move[0]
  rowA = move[1] - 1
  colB = col.move[2]
  rowB = move[3] - 1
  if (move.length = 5) promotion = move[4] //Promotion
  return coords
}

function piececount(str) {
  let pieces = 2;
  for (let i = str.length; i--;) {
    pieces = pieces + { P: 1, p: 1, N: 1, n: 1, B: 1, b: 1, R: 1, r: 1, Q: 1, q: 1 }[str.charAt(i)] || pieces
  }
  return pieces;
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
function incheck(fen) {
  const a = fen.split(' ')
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
  return ic(boardf, a[1])
}

function sanpiece(move, board) {
  return { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: '' }[board[move[0] + move[1]].p]
}

function sancapture(move, board, fen) {
  const fin = move.slice(2, 4)
  const ini = move.slice(0, 2)
  const pc = board[ini].p
  if (board[fin].p !== ' ') {
    if (pc === 'p') return move[0] + 'x';
    return 'x';
  }
  const epsq = fen.split(' ')[3]
  if (epsq !== '-' && fin === epsq && pc === 'p') return move[0] + 'x'
  return ''
}

function sandisambiguation(moves, move, board) {
  /*
  When two (or more) identical pieces can move to the same square, the moving piece is uniquely identified by specifying the piece's letter, followed by (in descending order of preference):
  the file of departure (if they differ)
  the rank of departure (if the files are the same but the ranks differ)
  If neither file nor rank alone is sufficient to identify the piece, then both are specified.
  */
  var noPromo = []
  var sameDest = []
  var samePiece = []
  var sameFile = []
  var sameRank = []
  const from = move.slice(0, 2)
  const to = move.slice(2, 4)
  const piece = board[from].p
  if (piece === 'p') return '' // Pawns never need disambiguation
  for (var i = moves.length; i--;) {
    const mm = moves[i]
    if (mm.length === 4) noPromo.push(mm)
    if (mm.length > 4 && mm[4] === 'q') noPromo.push(mm) // Promotion gives 4 moves, we filter out 3 of them
  }
  for (var i = noPromo.length; i--;) {
    const mm = noPromo[i]
    if (mm.slice(2, 4) === to) sameDest.push(mm)
  }
  if (sameDest.length === 1) return '' // No other pieces can move to the same square
  for (var i = sameDest.length; i--;) {
    const mm = sameDest[i]
    if (board[mm.slice(0, 2)].p === piece) samePiece.push(mm)
  }
  if (samePiece.length === 1) return '' // Only this kind of piece can move there
  for (var i = samePiece.length; i--;) {
    const mm = samePiece[i]
    if (mm[0] === from[0]) sameFile.push(mm)
    if (mm[1] === from[1]) sameRank.push(mm)
  }
  if (sameFile.length === 1) return sameFile[0][0] // Unambiguous file, uniquely identified by it
  if (sameRank.length === 1) return sameRank[0][1] // Unambiguous rank
  return from // Identify by coordinates, ambiguous otherwise
}

function gensancheck(moves, fen) {
  if (incheck(fen)) {
    if (moves.length === 0) return '#'
    return '+'
  }
  return ''
}
function gensanbase(move, board, fen, moves) {
  var san = ''
  san += sanpiece(move, board)// '' || R
  san += sandisambiguation(moves, move, board) // 4
  san += sancapture(move, board, fen) // dx || x
  san += move.slice(2, 4) // c5 || b3
  if (move.length === 5) san += { q: '=Q', r: '=R', b: '=B', n: '=N' }[move[4]]
  if (board[move.slice(0, 2)].p === 'k' && move[0] === 'e') {
    if (move[2] === 'g') san = 'O-O'
    if (move[2] === 'c') san = 'O-O-O'
  }
  return san
}
function pmg(fen, moves, uci) {
  var allpremoves = {}
  var re = []
  if (moves.length === 0) return re
  uci = uci.join(' ')
  if (uci.length !== 0) uci = uci + ' '
  for (var i = moves.length; i--;) {
    const movs = mg(ucifen(uci + moves[i]).f)
    for (var j = movs.length; j--;) {
      allpremoves[movs[j]] = 1
    }
  }
  for (m in allpremoves) {
    re.push(m)
  }
  return re
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
function ucifen(uci, ifen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', board = { "a8": { "p": "r", "c": "b" }, "b8": { "p": "n", "c": "b" }, "c8": { "p": "b", "c": "b" }, "d8": { "p": "q", "c": "b" }, "e8": { "p": "k", "c": "b" }, "f8": { "p": "b", "c": "b" }, "g8": { "p": "n", "c": "b" }, "h8": { "p": "r", "c": "b" }, "a7": { "p": "p", "c": "b" }, "b7": { "p": "p", "c": "b" }, "c7": { "p": "p", "c": "b" }, "d7": { "p": "p", "c": "b" }, "e7": { "p": "p", "c": "b" }, "f7": { "p": "p", "c": "b" }, "g7": { "p": "p", "c": "b" }, "h7": { "p": "p", "c": "b" }, "a6": { "p": " ", "c": " " }, "b6": { "p": " ", "c": " " }, "c6": { "p": " ", "c": " " }, "d6": { "p": " ", "c": " " }, "e6": { "p": " ", "c": " " }, "f6": { "p": " ", "c": " " }, "g6": { "p": " ", "c": " " }, "h6": { "p": " ", "c": " " }, "a5": { "p": " ", "c": " " }, "b5": { "p": " ", "c": " " }, "c5": { "p": " ", "c": " " }, "d5": { "p": " ", "c": " " }, "e5": { "p": " ", "c": " " }, "f5": { "p": " ", "c": " " }, "g5": { "p": " ", "c": " " }, "h5": { "p": " ", "c": " " }, "a4": { "p": " ", "c": " " }, "b4": { "p": " ", "c": " " }, "c4": { "p": " ", "c": " " }, "d4": { "p": " ", "c": " " }, "e4": { "p": " ", "c": " " }, "f4": { "p": " ", "c": " " }, "g4": { "p": " ", "c": " " }, "h4": { "p": " ", "c": " " }, "a3": { "p": " ", "c": " " }, "b3": { "p": " ", "c": " " }, "c3": { "p": " ", "c": " " }, "d3": { "p": " ", "c": " " }, "e3": { "p": " ", "c": " " }, "f3": { "p": " ", "c": " " }, "g3": { "p": " ", "c": " " }, "h3": { "p": " ", "c": " " }, "a2": { "p": "p", "c": "w" }, "b2": { "p": "p", "c": "w" }, "c2": { "p": "p", "c": "w" }, "d2": { "p": "p", "c": "w" }, "e2": { "p": "p", "c": "w" }, "f2": { "p": "p", "c": "w" }, "g2": { "p": "p", "c": "w" }, "h2": { "p": "p", "c": "w" }, "a1": { "p": "r", "c": "w" }, "b1": { "p": "n", "c": "w" }, "c1": { "p": "b", "c": "w" }, "d1": { "p": "q", "c": "w" }, "e1": { "p": "k", "c": "w" }, "f1": { "p": "b", "c": "w" }, "g1": { "p": "n", "c": "w" }, "h1": { "p": "r", "c": "w" } }, history = {}) {
  if (typeof uci === 'undefined' || uci.length === 0) return { h: history, f: ifen, b: board }
  var epsq, turn, castle, halfmove, fullmove, csf

  //startpos fen
  if (ifen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') {
    epsq = '-'; turn = 'w'; castle = 'KQkq'; halfmove = 0; fullmove = 1
    csf = { wk: 'K', wq: 'Q', bk: 'k', bq: 'q' }
  } else {
    const fensp = ifen.split(' ')
    if (board === 0) board = boardgen(fensp[0])
    epsq = fensp[3]
    turn = fensp[1]
    castle = fensp[2]
    halfmove = fensp[4]
    fullmove = fensp[5]
    csf = { wk: '', wq: '', bk: '', bq: '' }
    const mapc = { K: 'wk', Q: 'wq', k: 'bk', q: 'bq' }
    if (castle !== '-') {
      for (var t = castle.length; t--;) {
        csf[mapc[castle[t]]] = castle[t]
      }
    }
  }

  const moves = uci.split(' ')
  const len = moves.length
  const col = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const file = [1, 2, 3, 4, 5, 6, 7, 8]
  const epi = { 2: 4, 7: 5 }
  const epc = { 3: 4, 6: 5 }
  const epm = { 2: 3, 7: 6 }
  const csq = { 'e1g1': 'h1f1', 'e1c1': 'a1d1', 'e8g8': 'h8f8', 'e8c8': 'a8d8' }
  const casp = { 'k': 2, 'r': 1 }
  var capture = false
  const sfen = { wk: 'K', wq: 'Q', wr: 'R', wb: 'B', wn: 'N', wp: 'P', bk: 'k', bq: 'q', br: 'r', bb: 'b', bn: 'n', bp: 'p' }
  var fenarr = []
  const ud = 'undefined'

  for (var i = 0; i < len; ++i) {

    // Board movement
    const move = moves[i]
    const ini = move[0] + move[1]
    const fin = move[2] + move[3]
    const isq = board[ini]
    const pc = isq.p
    const nop = { "p": " ", "c": " " }

    if (board[fin].p !== ' ') capture = true
    board[fin] = isq
    board[ini] = nop
    // en passant capture
    if (epsq !== '-' && fin === epsq && pc === 'p') { board[move[2] + epc[move[3]]] = nop; capture = true }
    // castling,
    if (typeof csq[move] !== ud && pc === 'k') {
      const rmove = csq[move]
      const rini = rmove[0] + rmove[1]
      const rfin = rmove[2] + rmove[3]
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
    var emptysq = 0
    var filestr = ''
    var pieceplacement = []
    for (var h = 8; h--;) {
      for (var g = 0; g < 8; ++g) {
        const square = board[col[g] + file[h]]
        const pcsq = sfen[square.c + square.p]
        if (typeof pcsq === ud) { ++emptysq } else {
          if (emptysq > 0) { filestr += emptysq; emptysq = 0 }
          filestr += pcsq
        }
      }
      if (emptysq > 0) { filestr += emptysq; emptysq = 0 }
      pieceplacement.push(filestr)
      filestr = ''
    }
    const pos = [pieceplacement.join('/'), turn, castle, epsq].join(' ')
    if (typeof history[pos] === ud) {
      history[pos] = 1
    } else {
      history[pos] += 1
    }
  }

  return { h: history, f: [pieceplacement.join('/'), turn, castle, epsq, halfmove, fullmove].join(' '), b: board }
}
