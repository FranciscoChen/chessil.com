const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),curriculum=require('../training/curriculum');
const rules={};vm.createContext(rules);vm.runInContext(fs.readFileSync(require.resolve('../src/chess-rules.js'),'utf8'),rules);
test('curriculum is complete, uniquely identified and playable using shared chess rules',()=>{
 const ids=new Set();for(const [section,minimum] of Object.entries({tutorial:15,openings:25,endgames:5,tactics:8,strategy:12})){
  assert.ok(curriculum[section].length>=minimum,section+' needs a complete lesson set');
  for(const lesson of curriculum[section]){assert.ok(!ids.has(lesson.id),'duplicate '+lesson.id);ids.add(lesson.id);assert.ok(lesson.title&&lesson.summary&&lesson.concept);let fen=lesson.fen;assert.ok(fen,'FEN '+lesson.id);const other=fen.split(' ');other[1]=other[1]==='w'?'b':'w';assert.equal(rules.incheck(other.join(' ')),false,lesson.id+' has nonmoving king in check');assert.ok(lesson.moves.length>0);for(const move of lesson.moves){assert.ok(rules.mg(fen).includes(move),lesson.id+' illegal '+move+' in '+fen);fen=rules.ucifen(move,fen,rules.boardgen(fen),{}).f;}
   if(section==='openings'){assert.ok(['d4','e4','black'].includes(lesson.repertoire));assert.equal(lesson.moves.length,lesson.namesakePly+1,lesson.id+' should stop one ply after named formation');}
  }
 }
});
