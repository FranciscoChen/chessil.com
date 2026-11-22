const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const courses=require('../training/curriculum').courses,context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../src/chess-rules'),'utf8')+'\n'+fs.readFileSync(require.resolve('../src/chess-outcome'),'utf8'),context);
test('new course seeds are legal, nonterminal (except intentional bare kings), and scripted rules are executable',()=>{
 const ids=new Set();for(const [section,lessons] of Object.entries(courses))for(const lesson of lessons){assert.ok(!ids.has(lesson.id));ids.add(lesson.id);let fen=lesson.fen;const board=context.boardgen(fen);assert.equal(Object.values(board).filter(p=>p.p==='k').length,2,lesson.id);const opposite=fen.split(' ');opposite[1]=opposite[1]==='w'?'b':'w';assert.equal(context.incheck(opposite.join(' ')),false,lesson.id);assert.ok(context.mg(fen).length,lesson.id);
 if(lesson.mode!=='coordinates')assert.equal(context.window.ChessilPosition.outcome(fen),null,lesson.id);
 if(lesson.mode==='guided'){for(const move of lesson.moves){assert.ok(context.mg(fen).includes(move),lesson.id+': '+move);fen=context.ucifen(move,fen,context.boardgen(fen),{}).f;}}
 if(lesson.history){fen=lesson.history.reduce((f,m)=>{assert.ok(context.mg(f).includes(m));return context.ucifen(m,f,context.boardgen(f),{}).f;},'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');assert.equal(fen,lesson.fen);}
 }
});

test('Game Changer covers all fourteen points and each castled-king blueprint', () => {
 const strategy = courses.strategy.filter(lesson => lesson.chapter);
 assert.deepEqual(strategy.filter(lesson => lesson.chapter === 5).map(lesson => lesson.point),
  Array.from({ length: 14 }, (_, index) => index + 1));
 assert.deepEqual([...new Set(strategy.map(lesson => lesson.chapter))].sort((a, b) => a - b),
  [5, 7, 8, 9, 10, 11, 12, 13]);
 const blueprints = strategy.filter(lesson => lesson.chapter === 9);
 for (const id of ['pawn-h6', 'pawn-h6-g6', 'pawn-h6-capture', 'block-h5', 'block-h6', 'block-h3',
  'block-h6-rook', 'capture-on-g6', 'h-file-trap', 'rook-lift-a3']) {
  assert.ok(blueprints.some(lesson => lesson.id === 'strategy-az-' + id), id);
 }
 for (const lesson of strategy) {
  assert.equal(lesson.side, lesson.fen.split(' ')[1]);
  assert.equal(lesson.focus, lesson.moves[0].slice(0, 2));
  for (const cue of lesson.coaching.cues) {
   assert.deepEqual(cue.line, lesson.moves.slice(0, cue.line.length), lesson.id);
  }
  if (!lesson.setup) continue;
  const { fen, move } = lesson.setup;
  assert.ok(context.mg(fen).includes(move), lesson.id);
  assert.equal(context.ucifen(move, fen, context.boardgen(fen), {}).f, lesson.fen);
 }
});
test('outcome rules distinguish mate, stalemate, dead material, repetition and fifty moves',()=>{
 const rules=context.window.ChessilPosition;
 assert.equal(rules.outcome('k7/2Q5/4K3/8/8/8/8/8 b - - 1 1').reason,'Stalemate');
 assert.equal(rules.outcome('k7/1Q6/2K5/8/8/8/8/8 b - - 0 1').reason,'Checkmate');
 assert.equal(rules.outcome('7k/8/8/8/4K3/8/8/8 w - - 0 1').reason,'Insufficient material');
 assert.equal(rules.insufficient('7k/8/8/8/4K3/8/NN6/8 w - - 0 1'),false);
 assert.equal(rules.outcome('7k/8/8/8/4K3/8/R7/8 w - - 100 60').reason,'50-move rule');
 assert.equal(rules.outcome('7k/8/8/8/4K3/8/R7/8 w - - 10 6',3).reason,'Threefold repetition');
});

test('every course note has distinct English, Spanish and Chinese copy and fires after legal moves', () => {
 const seen = new Set();
 for (const lesson of Object.values(courses).flat()) {
  const { titles, intro, cues } = lesson.coaching;
  for (const strings of [titles, intro, ...cues.map(cue => cue.text)]) {
   assert.equal(new Set(strings).size, 3, lesson.id);
   assert.ok(strings.every(text => typeof text === 'string' && text.length > 2));
   assert.match(strings[2], /\p{Script=Han}/u);
  }
  for (const text of [...intro, ...cues.flatMap(cue => cue.text)]) {
   assert.ok(!seen.has(text), lesson.id);
   seen.add(text);
  }
  for (const cue of cues) {
   let position = lesson.fen;
   for (const move of cue.line) {
    assert.ok(context.mg(position).includes(move), lesson.id + ': ' + move);
    position = context.ucifen(move, position, context.boardgen(position), {}).f;
   }
   assert.notEqual(context.boardgen(position)[cue.square].p, ' ', lesson.id);
  }
 }
});

test('Lucena keeps the g-file, returns to the king posts, and checks down the file', () => {
 vm.runInContext(fs.readFileSync(require.resolve('../src/lucena-defense'),'utf8'),context);
 const defense = fen => Array.from(context.window.ChessilLucenaDefense(fen));
 const start = courses.endgames.find(lesson => lesson.id === 'endgame-lucena').fen;
 const after = move => context.ucifen(move,start,context.boardgen(start),{}).f;
 assert.deepEqual(defense(after('e1d1')).sort(), ['d7c7','d7c8']);
 const guards = defense(after('e1h1'));
 assert.ok(guards.includes('g2g3'));
 assert.ok(guards.every(move => move === 'd7d8' || /^g2g[3-6]$/.test(move)));
 assert.deepEqual(defense('5K2/2k2P2/8/8/8/6R1/7r/8 b - - 0 1').sort(), ['c7d7','c7d8']);
 assert.deepEqual(defense('8/2k1KP2/8/8/3R4/8/6r1/8 b - - 0 1'), ['g2e2']);
 assert.deepEqual(defense('5Q2/2k1K3/8/8/3R4/8/6r1/8 b - - 0 1'), []);
});
