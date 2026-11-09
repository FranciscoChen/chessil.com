const test=require('node:test'),assert=require('node:assert/strict'),puppeteer=require('puppeteer'),start=require('./helpers/board-server');
test('global menu: invitation acceptance, active-game links, global settings and opaque mobile menus',async()=>{
 const f=await start(),browser=await puppeteer.launch({headless:'new',args:['--no-sandbox']});
 try{f.game.menu={games:[{gameid:'verify001',opponent:'Opponent',yourTurn:true,time:'5+0'}],invitations:[{gameid:'invite001',from:'Inviter',time:'5+0'}],challenges:[]};const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setViewport({width:390,height:844});await p.goto(f.url+'/en/settings',{waitUntil:'networkidle0'});await p.click('#challenge-toggle');await p.waitForFunction(()=>document.querySelector('#challenge-toggle [data-count]').dataset.count==='2');
 assert.ok(await p.$('a.game-menu-game[href="/game/verify001"]'));
 await p.screenshot({path:'/tmp/game-menu-mobile.png'});await Promise.all([p.waitForNavigation({waitUntil:'networkidle0'}),p.click('#challenge-app .game-menu-game button')]);assert.equal(f.game.inviteActions[0].action,'accept');assert.equal(new URL(p.url()).pathname,'/game/verify001');
 await p.click('.dasher > button');await p.click('#open-board-settings');assert.equal(await p.$$eval('#board-settings-dialog',els=>els.length),1);await p.keyboard.press('Escape');
 await p.goto(f.url+'/en/ongoing',{waitUntil:'networkidle0'});await p.waitForSelector('[data-my-games-list] a[href="/game/verify001"]');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 }finally{await browser.close();await f.close();}
});
