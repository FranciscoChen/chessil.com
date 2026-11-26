const test = require('node:test');
const assert = require('node:assert/strict');
const { nextMatch } = require('../development-games');
const { pgn, notation } = require('../game-archive');
const { parseJob } = require('../../engine/sf');

test('a development opening is played with both colors under the same clock', () => {
  const first = nextMatch();
  assert.equal(first.seconds,10);
  assert.equal(first.increment,0.1);
  const second = nextMatch({...first,builds:['old']},'60+0.6');
  assert.equal(second.opening,first.opening);
  assert.equal(second.seconds,10);
  assert.equal(second.hybrid,'b');
  assert.equal(second.builds,undefined);
  const third = nextMatch(second,'60+0.6');
  assert.equal(third.hybrid,'w');
  assert.equal(third.seconds,60);
  assert.equal(third.increment,0.6);
  assert.notEqual(third.opening,first.opening);
  assert.ok(notation(first.opening.split(' ')).includes('4.'));
});

test('archive PGN includes the game result, actual executable IDs, and SAN checkmate', () => {
  const history = 'e2e4 e7e5 f1c4 b8c6 d1h5 g8f6 h5f7';
  const game = {gameid:'abcdef123',created:'2026-11-26',moves:history,state:1,result:true,
    development:{...nextMatch(),builds:['stockfish:test']},white:'A',black:'B'};
  const text = pgn(game);
  assert.match(text,/EngineBuilds "stockfish:test"/);
  assert.match(text,/TimeControl "10\+0.1"/);
  assert.match(text,/1\. e4 e5 2\. Bc4 Nc6 3\. Qh5 Nf6 4\. Qxf7# 1-0/);
  assert.equal(notation('e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 e1g1'.split(' ')).split(' ').at(-1),'O-O');
});

test('engine workers distinguish real game clocks from fixed-budget practice requests', () => {
  const limits = 'abcdef123-1-b 9900 10000 100 100 7500 0 7 ';
  const match = parseJob(limits+'clock e2e4');
  assert.equal(match.matchClock,true);
  assert.equal(match.elo,0);
  assert.equal(match.moves,'e2e4');
  assert.equal(parseJob(limits+'e2e4').matchClock,undefined);
});
