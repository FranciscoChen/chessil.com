const test=require('node:test'),assert=require('node:assert/strict'),{judge}=require('../src/analysis-judgment');
const cp=value=>({kind:'cp',value}),wdl=(win,draw,loss)=>({...cp(0),wdl:[win,draw,loss]});
test('large losses within won or lost games are suggestions, not blunders',()=>{
 assert.equal(judge(cp(700),cp(500),200).type,'suggestion');
 assert.equal(judge(cp(-500),cp(-700),200).type,'suggestion');
 assert.equal(judge(wdl(990,10,0),wdl(950,50,0),200).outcome,false);
});
test('clear changes in outcome are distinguished from ordinary improvements',()=>{
 assert.equal(judge(wdl(950,50,0),wdl(0,1000,0),200).type,'blunder');
 assert.equal(judge(wdl(0,1000,0),wdl(0,0,1000),400).type,'major');
 assert.equal(judge(cp(700),cp(-500),1200).symbol,'??');
 assert.equal(judge(cp(30),cp(20),10),null);
 assert.equal(judge({kind:'mate',value:3},{kind:'mate',value:9},600).type,'suggestion');
});
