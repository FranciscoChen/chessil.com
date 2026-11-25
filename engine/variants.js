const stockfish = 'stockfish';
const hybrid = 'hybrid';

function parseEngine(value = stockfish) {
  if (value !== stockfish && value !== hybrid) {
    throw new Error('Invalid engine. Use stockfish or hybrid.');
  }
  return value;
}

module.exports = { stockfish, hybrid, parseEngine };
