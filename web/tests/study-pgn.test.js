const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context=vm.createContext({TextEncoder});
context.window=context;
for(const source of ['chess-rules','variations','study-pgn']){
 vm.runInContext(fs.readFileSync(require.resolve('../src/'+source),'utf8'),context);
}
const {parse,serialize}=context.ChessilStudyPgn;
const moves=tree=>Array.from(tree.continuation(tree.root).slice(1),node=>node.move);

test('PGN round trip preserves sibling and nested variations, comments, tags and NAGs',()=>{
 const pgn='[Event "Analysis \\"Example\\""]\n[Result "1/2-1/2"]\n\n1.e4! {center} e5 (1... c5 2.Nf3 (2.c3)) 2.Nf3 Nc6 (2... Nf6) 1/2-1/2';
 const imported=parse(pgn), exported=serialize(imported), roundTrip=parse(exported);
 assert.equal(roundTrip.pgnTags.get('Event'),'Analysis "Example"');
 assert.deepEqual(moves(roundTrip),['e2e4','e7e5','g1f3','b8c6']);
 assert.equal(roundTrip.nodes.size,imported.nodes.size);
 assert.match(exported,/e4 \$1 \{center\}/);
 assert.deepEqual(Array.from(roundTrip.root.children[0].children,node=>node.move),['e7e5','c7c5']);
 assert.match(exported,/\( 2\. c3 \)/);
});

test('PGN handles an arbitrary legal starting position and Black to move',()=>{
 const fen='4k3/8/8/8/8/8/P7/4K3 b - - 0 17';
 const imported=parse('[SetUp "1"]\n[FEN "'+fen+'"]\n\n17... Kf7 18. a4 *');
 const exported=serialize(imported);
 assert.match(exported,/17\.\.\. Kf7 18\. a4/);
 assert.equal(parse(exported).root.fen,fen);
 assert.deepEqual(moves(parse(exported)),['e8f7','a2a4']);
});

test('PGN rejects illegal moves, unfinished variations and multiple games',()=>{
 for(const pgn of ['1. Qh8 *','1. e4 (1. d4','1. e4 * 1. d4 *','[FEN "8/8/8/8/8/8/P7/4K3 b - - 0 1"]\n*']){
  assert.throws(()=>parse(pgn));
 }
});
