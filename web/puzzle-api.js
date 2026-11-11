'use strict';
const { randomInt } = require('node:crypto');
const fail = message => Object.assign(new Error(message), { status: 400 });
// Indexed key seek avoids sorting millions of rows by random(). Wrap once at
// the end of the keyspace; retain recent IDs to avoid repeats in the buffer.
async function puzzleBatch(db, params) {
  const theme = params.get('theme') || 'mixed';
  if (theme !== 'mixed' && !/^[a-zA-Z][a-zA-Z0-9]{0,47}$/.test(theme)) throw fail('Invalid puzzle type');
  const exclude = params.get('exclude') ? params.get('exclude').split(',') : [];
  if (exclude.length > 128 || exclude.some(id => !/^[a-zA-Z0-9]{5,8}$/.test(id))) throw fail('Invalid puzzle IDs');
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const pivot = Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join('');
  const values = [pivot, exclude];
  const filter = theme === 'mixed' ? '' : " AND string_to_array(themes, ' ') @> ARRAY[$3]::text[]";
  if (theme !== 'mixed') values.push(theme);
  const columns = 'puzzle_id AS id, fen, moves, rating, themes, game_url AS "gameUrl"';
  const query = operator => `SELECT ${columns} FROM lichess_puzzles WHERE puzzle_id ${operator} $1 AND NOT (puzzle_id = ANY($2::text[]))${filter} ORDER BY puzzle_id LIMIT 16`;
  let { rows } = await db.query(query('>='), values);
  if (rows.length < 16) {
    const wrapped = await db.query(query('<'), values);
    rows = rows.concat(wrapped.rows).slice(0, 16);
  }
  return { puzzles: rows.map(row => ({ ...row, moves: row.moves.split(' '), themes: row.themes.split(' ') })) };
}
module.exports = { puzzleBatch };
