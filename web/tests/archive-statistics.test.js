const test = require('node:test');
const assert = require('node:assert/strict');
const {pairedStatistics} = require('../archive-statistics');
const {serve} = require('../game-archive');

test('paired LLR matches the logistic Fishtest calculation on a sparse sample',()=>{
  const paired = pairedStatistics([0,6,21,1,1]);
  assert.equal(paired.pairs,29);
  assert.ok(Math.abs(paired.llr-(-0.2046951924906))<1e-9);
  assert.ok(Math.abs(paired.elo-(-17.9868582066093))<1e-9);
  assert.ok(paired.interval[0]<paired.elo && paired.interval[1]>paired.elo);
  assert.ok(paired.los<0.5);
  assert.ok(pairedStatistics([0,0,20,12,8]).llr>0);
  assert.ok(pairedStatistics([8,12,20,0,0]).llr<0);
  assert.equal(pairedStatistics([0,0,0,0,0]).llr,null);
});

test('STC game filtering maps wins and losses from the selected engine perspective',async()=>{
  const results = [true,null,false];
  for (const [perspective,outcome,expected] of [
    ['hybrid','wins',false],['stockfish','losses',false],['stockfish','wins',true],
    ['hybrid','losses',true],['stockfish','draws',null]
  ]) {
    const db = {async query(sql,params){
      assert.match(sql,/g.timecontrol1='10s\+0.1'/);
      const [,,filter,target]=params;
      const displayed=results.filter(result=>filter==='draws'?result===null:result!==null && (result===false)===target);
      assert.deepEqual(displayed,[expected]);
      return {rows:displayed.map(result=>({id:1,gameid:'verify001',white:'Stockfish-dev',black:'ChessiL-Hybrid',
        hybrid:'b',result,opening:'e2e4',date:'2026-11-26'}))};
    }};
    const res = {writeHead(status){assert.equal(status,200);},end(body){this.data=JSON.parse(body);}};
    await serve(db,{url:'/api/archive?'+new URLSearchParams({perspective,outcome})},res,{});
    assert.equal(res.data.games[0].outcome,outcome);
  }
});
