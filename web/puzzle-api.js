'use strict';
const { randomInt } = require('node:crypto');
const fail = message => Object.assign(new Error(message), { status: 400 });
// Indexed key seek avoids sorting millions of rows by random(). Wrap once at
// the end of the keyspace; retain recent IDs to avoid repeats in the buffer.
async function puzzleBatch(db, params) {
  const theme = params.get('theme') || 'mixed';
  if (theme !== 'mixed' && !/^[a-zA-Z][a-zA-Z0-9]{0,47}$/.test(theme)) throw fail('Invalid puzzle type');
  const level=params.get('level');
  if(level&&!['beginner','intermediate','advanced'].includes(level))throw fail('Invalid puzzle level');
  const groups={beginner:['fork','skewer','discoveredAttack','pin'],intermediate:['overloading','xRayAttack','doubleCheck','capturingDefender']};
  const exclude = params.get('exclude') ? params.get('exclude').split(',') : [];
  if (exclude.length > 128 || exclude.some(id => !/^[a-zA-Z0-9]{5,8}$/.test(id))) throw fail('Invalid puzzle IDs');
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const pivot = Array.from({ length: 5 }, () => alphabet[randomInt(alphabet.length)]).join('');
  const values = [pivot, exclude];
  let filter = theme === 'mixed' ? '' : " AND string_to_array(themes, ' ') @> ARRAY[$3]::text[]";
  if (theme !== 'mixed') values.push(theme);
  if(level){
    const themes=groups[level];
    if(themes){values.push(themes);filter+=` AND string_to_array(themes, ' ') && $${values.length}::text[]`;}
    else {values.push([...groups.beginner,...groups.intermediate]);filter+=` AND NOT (string_to_array(themes, ' ') && $${values.length}::text[])`;}
    filter+=` AND popularity >= 85 AND nb_plays >= 100 AND rating <= ${level==='beginner'?1500:level==='intermediate'?1800:2100} AND array_length(string_to_array(moves, ' '),1) <= 7`;
  }
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
