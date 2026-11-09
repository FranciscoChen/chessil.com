const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
test('Leela shards retain normalized integer weights and legal first moves',()=>{
 const root=path.join(__dirname,'../web'),manifest=JSON.parse(fs.readFileSync(path.join(root,'engine/book/manifest.json'))),dir=path.join(root,manifest.base);let count=0;
 for(const file of fs.readdirSync(dir)){const data=JSON.parse(fs.readFileSync(path.join(dir,file)));count+=Object.keys(data).length;
  for(const rows of Object.values(data)){const total=rows.reduce((sum,row)=>sum+row[2],0);assert.ok(total>0);assert.ok(rows.every(row=>row[3]===total));assert.ok(rows.every((row,i)=>!i||row[2]<=rows[i-1][2]));}
 }
 assert.equal(count,97155);assert.equal(count,manifest.positions);
 const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/chess-rules.js'),'utf8'),context);const fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';let hash=2166136261;for(const c of fen)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;const rows=JSON.parse(fs.readFileSync(path.join(dir,(hash&255).toString(16).padStart(2,'0')+'.json')))[fen];assert.ok(rows.length>1);assert.ok(rows.every(row=>context.mg(fen+' 0 1').includes(row[0])));
});
