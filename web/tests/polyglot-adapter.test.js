const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('browser adapter loads one binary, labels legal moves, caches and stops at ply 17',async()=>{
 const bytes=Buffer.alloc(32),hash=0x463b96181691fc9cn;
 const move=(from,to)=>to|(from<<6);
 for(const [i,raw,weight] of [[0,move(11,27),33535],[1,move(12,28),32000]]){bytes.writeBigUInt64BE(hash,i*16);bytes.writeUInt16BE(raw,i*16+8);bytes.writeUInt16BE(weight,i*16+10);}
 const calls=[],context={fetch:async url=>{calls.push(url);return {ok:true,json:async()=>({name:'Leela BT4-it332',format:'polyglot',url:'/fixture.bin'}),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};}};context.window=context;vm.createContext(context);
 const root=path.resolve(__dirname,'../..');
 for(const file of ['web/src/chess-rules.js','tools/policy-book/polyglot-random.js','tools/policy-book/polyglot.js','web/src/opening-book.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
 const book=new context.ChessilOpeningBook(),fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
 const result=await book.lookup(fen,0);assert.deepEqual(JSON.parse(JSON.stringify(result.moves)),[['d2d4','d4',33535,65535],['e2e4','e4',32000,65535]]);
 assert.strictEqual(await book.lookup(fen,0),result);assert.equal((await book.lookup(fen,16)).moves.length,2);assert.equal((await book.lookup(fen,17)).moves.length,0);assert.equal(calls.filter(url=>url==='/fixture.bin').length,1);assert.equal(calls.filter(url=>url.includes('manifest')).length,1);
});
