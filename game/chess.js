// Pure chess helpers. Legal move generation lives in the persistent mg workers.
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const expandPlacement = placement => placement.replace(/[1-8]/g, n => ' '.repeat(Number(n))).replaceAll('/', '');

function mate(fenFields) {
  return ic(expandPlacement(fenFields[0]), fenFields[1]) ? 1 : 2;
}

function piececount(str) {
  var pieces = 2;

  for (var i = str.length; i--;) {
    pieces = pieces + { P: 1, p: 1, N: 1, n: 1, B: 1, b: 1, R: 1, r: 1, Q: 1, q: 1 }[str.charAt(i)] || pieces
  }

  return pieces;
}

// Replay UCI history into a FEN. This is linear in game length; board serialization
// happens only once. The empty history is also used by timeout handling.
function ucifen(uci) {
  var ifen = INITIAL_FEN,
    epsq = '-',
    turn = 'w',
    castle = 'KQkq',
    halfmove = 0,
    fullmove = 1,
    csf = { wk: 'K', wq: 'Q', bk: 'k', bq: 'q' },
    capture = false,
    board = {};
  const initial = expandPlacement(INITIAL_FEN.split(' ')[0]);
  for (let index = 0; index < 64; index++) {
    const piece = initial[index];
    const square = 'abcdefgh'[index % 8] + (8 - Math.floor(index / 8));
    board[square] = { p: piece.toLowerCase(),
      c: piece === ' ' ? ' ' : piece === piece.toUpperCase() ? 'w' : 'b' };
  }

  if (!uci) return ifen;
  const moves = uci.split(' '),
    len = moves.length,
    col = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
    file = [1, 2, 3, 4, 5, 6, 7, 8],
    epi = { 2: 4, 7: 5 },
    epc = { 3: 4, 6: 5 },
    epm = { 2: 3, 7: 6 },
    csq = { 'e1g1': 'h1f1', 'e1c1': 'a1d1', 'e8g8': 'h8f8', 'e8c8': 'a8d8' },
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

    // Castling rights are permanently lost after a king/rook moves or a rook is captured.
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

    // Fullmove number increases after Black moves.
    if (turn === 'w') { turn = 'b' } else { ++fullmove; turn = 'w' }

    // Record the EP target when an adjacent enemy pawn could capture.
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

    // Reset the fifty-move counter on captures and pawn moves.
    if (capture === true || pc === 'p') { halfmove = 0; capture = false } else { ++halfmove }

  }
  // Serialize once, after replaying the history.
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
  return [pieceplacement.join('/'), turn, castle, epsq, halfmove, fullmove].join(' ')
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


module.exports = { ucifen, mate, piececount, wpiececount, bpiececount };
