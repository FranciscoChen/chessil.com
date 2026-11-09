const test=require('node:test'),assert=require('node:assert/strict'),{judge}=require('../src/analysis-judgment');
const cp=value=>({kind:'cp',value}),wdl=(win,draw,loss)=>({...cp(0),wdl:[win,draw,loss]});
test('won games get advice; hopeless positions are omitted',()=>{
 assert.equal(judge(cp(700),cp(500),200).type,'suggestion');
 assert.equal(judge(cp(-500),cp(-700),200),null);
 assert.equal(judge(wdl(990,10,0),wdl(950,50,0),200).outcome,false);
});
test('clear changes in outcome are distinguished from ordinary improvements',()=>{
 assert.equal(judge(wdl(950,50,0),wdl(0,1000,0),200).type,'blunder');
 assert.equal(judge(wdl(0,1000,0),wdl(0,0,1000),400).type,'major');
 assert.equal(judge(cp(700),cp(-500),1200).symbol,'??');
 assert.equal(judge(cp(30),cp(20),10),null);
 assert.equal(judge({kind:'mate',value:3},{kind:'mate',value:9},600),null);
});

test('skip hopeless damage but preserve moves that recover practical chances',()=>{
 assert.equal(judge(cp(-700),cp(-1200),500),null);
 assert.equal(judge({kind:'mate',value:-14},{kind:'mate',value:-12},200),null);
 assert.equal(judge({kind:'mate',value:14},{kind:'mate',value:12},200),null);
 assert.ok(judge(cp(-180),cp(-600),420));
 assert.ok(judge({...cp(-180),wdl:[0,0,1000]},{...cp(-600),wdl:[0,0,1000]},420));
 assert.equal(judge({...cp(-700),wdl:[0,0,1000]},cp(-1200),500),null);
});
