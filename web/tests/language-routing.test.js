const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('engine assets reach static serving while exact language prefixes still redirect',()=>{
 const source=fs.readFileSync(require.resolve('../server'),'utf8');
 const routing=source.slice(source.indexOf('function route('),source.indexOf('function userpage('));
 let destination;
 const context={languages:{en:true,es:true,zh:true},serve:()=>destination='static',routelanguage:()=>destination='language'};
 vm.createContext(context);vm.runInContext(routing,context);
 for(const url of ['/engine/manifest.json','/engine/release/chessil-stockfish.wasm','/engine/openings.json','/enough','/estimate']){destination=null;context.route('',null,null,{}, {url,method:'GET'}, {}, []);assert.equal(destination,'static',url);}
 for(const url of ['/en','/en/','/es/training','/zh/login']){destination=null;context.route('',null,null,{}, {url,method:'GET'}, {}, []);assert.equal(destination,'language',url);}
});
