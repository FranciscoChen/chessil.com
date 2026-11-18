/* Lesson-specific Black defense. Return the highest-priority legal moves for
 * Stockfish to compare, or an empty list when the teaching defense is over. */
window.ChessilLucenaDefense = function defensiveMoves(fen) {
 if (fen.split(' ')[1] !== 'b') return [];
 const board = boardgen(fen);
 const find = (color, piece) => Object.keys(board).find(square =>
  board[square].c === color && board[square].p === piece
 );
 const whiteKing = find('w', 'k');
 const whiteRook = find('w', 'r');
 const blackKing = find('b', 'k');
 const blackRook = find('b', 'r');
 if (!blackRook || !whiteRook || board.f7?.p !== 'p' || board.f7.c !== 'w') return [];

 const kingDistance = (from, to) => Math.max(
  Math.abs(from.charCodeAt(0) - to.charCodeAt(0)),
  Math.abs(Number(from[1]) - Number(to[1]))
 );
 const keySquares = ['d7', 'd8'];
 const kingReach = square => keySquares.filter(target => kingDistance(square, target) <= 1).length;
 const whiteKingBlocksPawn = whiteKing === 'f8';
 const whiteRookOnGFile = whiteRook[0] === 'g';
 const ranked = [];

 for (const move of mg(fen)) {
  const from = move.slice(0, 2);
  const to = move.slice(2, 4);
  const rookSquare = from === blackRook ? to : blackRook;
  const kingSquare = from === blackKing ? to : blackKing;
  const after = ucifen(move, fen, boardgen(fen), {}).f;
  const whiteMoves = mg(after);
  // A check that allows promotion or gives away the rook defeats the exercise.
  if (whiteMoves.some(reply => reply.length === 5 || reply.slice(2, 4) === rookSquare)) continue;

  let priority = 0;
  if (from === blackRook && rookSquare[0] === whiteKing[0] && incheck(after)) {
   priority = 30;
  } else if (whiteKingBlocksPawn) {
   const onKeySquare = keySquares.includes(kingSquare);
   const reach = kingReach(kingSquare);
   if (whiteRookOnGFile && from === blackKing && onKeySquare) {
    priority = 25;
   } else if (!whiteRookOnGFile && rookSquare[0] === 'g') {
    // Keep the rook on the g-file and preserve access to the king's two posts.
    priority = 15 + (onKeySquare ? 3 : reach);
   } else if (from === blackKing && reach) {
    // If a direct return is impossible, keep both posts within a king's step.
    priority = onKeySquare ? 12 : 8 + reach;
   }
  }
  if (priority) ranked.push({move, priority});
 }

 const highest = Math.max(0, ...ranked.map(candidate => candidate.priority));
 return ranked.filter(candidate => candidate.priority === highest).map(candidate => candidate.move);
};
