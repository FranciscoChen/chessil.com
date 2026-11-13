/*!
 * Stockfish.js 19 (c) 2026, Chess.com, LLC
 * https://github.com/nmrugg/stockfish.js
 * License: GPLv3
 *
 * Based on Stockfish (c) T. Romstad, M. Costalba, J. Kiiski, G. Linscott and other contributors.
 * https://github.com/official-stockfish/Stockfish
 *
 * Nets by Chris Bao (sscg13)
 * https://tests.stockfishchess.org/nns?network_name=nn-61e7af4bb97d
 */

(function () {

var IS_ASYNCIFY = 0;
var enginePartsCount = 0;
var isASMEngine = 0;
var engineTotalBytes=1704416;

var Stockfish;
function INIT_ENGINE() {
"use strict";var Stockfish=(()=>{var _scriptName=globalThis.document?.currentScript?.src;return async function(moduleArg={}){var Module=moduleArg;var aa=!!globalThis.window,f=!!globalThis.WorkerGlobalScope,m=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer",p=f&&globalThis.name=="em-pthread";if(m){var worker_threads=require("node:worker_threads");globalThis.Worker=worker_threads.Worker;p=(f=!worker_threads.isMainThread)&&worker_threads.workerData=="em-pthread"}
typeof global!=="undefined"&&Object.prototype.toString.call(global.process)==="[object process]"&&typeof fetch!=="undefined"&&(typeof XMLHttpRequest==="undefined"&&(global.XMLHttpRequest=function(){var a,b={readyState:0,status:0,onerror:null,onreadystatechange:null,onload:null,open:function(c,d){a=d},send:function(){require("fs").readFile(a,function(c,d){b.readyState=4;c?(console.error(c),b.status=404,b.onerror(c)):(b.status=200,b.response=d,b.onreadystatechange(),b.onload())})}};return b}),fetch=
null);Module.print=function(a){Module.listener?Module.listener(a):console.log(a)};Module.printErr=function(a){Module.listener?Module.listener(a):console.error(a)};Module.terminate=function(){typeof ba!=="undefined"&&ca()};var da=[],ea="./this.program",fa=(a,b)=>{throw b;};typeof __filename!="undefined"?_scriptName=__filename:f&&(_scriptName=self.location.href);var ha="",ia,ja;
if(m){var fs=require("node:fs");ha=__dirname+"/";ja=a=>{a=ka(a)?new URL(a):a;return fs.readFileSync(a)};ia=async a=>{a=ka(a)?new URL(a):a;return fs.readFileSync(a,void 0)};process.argv.length>1&&(ea=process.argv[1].replace(/\\/g,"/"));da=process.argv.slice(2);fa=(a,b)=>{process.exitCode=a;throw b;}}else if(aa||f){try{ha=(new URL(".",_scriptName)).href}catch{}m||(f&&(ja=a=>{var b=new XMLHttpRequest;b.open("GET",a,!1);b.responseType="arraybuffer";b.send(null);return new Uint8Array(b.response)}),ia=
async a=>{a=await fetch(a,{credentials:"same-origin"});if(a.ok)return a.arrayBuffer();throw Error(a.status+" : "+a.url);})}var ma=console.log.bind(console),na=console.error.bind(console);if(m){var oa=require("node:util"),pa=a=>typeof a=="object"?oa.inspect(a):a;ma=(...a)=>fs.writeSync(1,a.map(pa).join(" ")+"\n");na=(...a)=>fs.writeSync(2,a.map(pa).join(" ")+"\n")}var qa=ma,t=na,ra,sa,ta=!1,ua,ka=a=>a.startsWith("file://");function u(){v.buffer!=w.buffer&&va()}
if(m&&p){globalThis.self=globalThis;var wa=worker_threads.parentPort;globalThis.postMessage||(wa.on("message",a=>globalThis.onmessage?.({data:a})),globalThis.postMessage=a=>wa.postMessage(a));process.on("uncaughtException",a=>{postMessage({ka:8,error:a});process.exit(1)})}var xa;
if(p){var ya=!1;self.onunhandledrejection=b=>{throw b.reason||b;};function a(b){try{var c=b.data,d=c.ka;if(d==1){let e=[];self.onmessage=g=>e.push(g);xa=()=>{postMessage({ka:3});for(let g of e)a(g);self.onmessage=a};for(let g of c.lb)if(!Module[g]||Module[g].proxy)Module[g]=(...h)=>{postMessage({ka:9,kb:g,args:h})},g=="print"&&(qa=Module[g]),g=="printErr"&&(t=Module[g]);v=c.Bb;va();sa=c.Cb;za();Aa();xa()}else if(d==2){Ba(c.ma);Ca(c.ma,0,0,1,0,0);Da();Ea(c.ma);ya||=!0;try{Fa(c.wb,c.Ca)}catch(e){if(e!=
"unwind")throw e;}}else d==4?ya&&Ga():d&&(t(`worker: received unknown command ${d}`),t(c))}catch(e){throw Ha&&Ia(),e;}}self.onmessage=a}var Ha=!1;function va(){if(!w?.buffer?.growable){var a=v.buffer;w=new Int8Array(a);Ja=new Int16Array(a);x=new Uint8Array(a);z=new Int32Array(a);A=new Uint32Array(a);Ka=new Float64Array(a);B=new BigInt64Array(a)}}function La(){Ha=!0;p||(Module.noFSInit||C.Ga||C.init(),E.F(),C.Va=!1)}
function G(a){a=`Aborted(${a})`;t(a);ta=!0;throw new WebAssembly.RuntimeError(a+". Build with -sASSERTIONS for more info.");}var Ma;async function Na(a){if(!ra)try{var b=await ia(a);return new Uint8Array(b)}catch{}if(a==Ma&&ra)a=new Uint8Array(ra);else if(ja)a=ja(a);else throw"both async and sync fetching of the wasm failed";return a}async function Oa(a,b){try{var c=await Na(a);return await WebAssembly.instantiate(c,b)}catch(d){t(`failed to asynchronously prepare wasm: ${d}`),G(d)}}
async function Pa(a){var b=Ma;if(!ra&&!m)try{var c=fetch(b,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(c,a)}catch(d){t(`wasm streaming compile failed: ${d}`),t("falling back to ArrayBuffer instantiation")}return Oa(b,a)}function Qa(){Ra={C:Sa,h:Ta,y:Ua,z:Va,n:Wa,l:Xa,B:Ya,d:Za,q:$a,i:ab,k:Ea,g:bb,r:cb,s:db,D:eb,E:fb,j:gb,m:hb,c:ib,e:jb,A:kb,o:lb,t:mb,u:nb,b:ob,f:pb,x:qb,v:rb,w:sb,a:v,p:tb};return{a:Ra}}
async function za(){function a(e,g){E=e.exports;ub.push(E.K);e=E;Module._main=e.G;Module._isReady=e.H;Module._isSearching=e.I;Module._uci=e.J;vb=e.L;wb=Module.__emscripten_proxy_main=e.M;Ca=e.O;Ia=e.Q;xb=e.R;yb=e.S;zb=e.T;Ab=e.U;Bb=e.V;Cb=e.W;Db=e.X;Eb=e.Y;Fb=e.Z;Gb=e._;Hb=e.N;sa=g;return E}var b=Qa(),c=Module.instantiateWasm;if(c)return new Promise(e=>{c(b,(g,h)=>e(a(g,h)))});if(p){var d=new WebAssembly.Instance(sa,Qa());return a(d,sa)}Ma??=Module.locateFile?Module.locateFile("stockfish.wasm",ha):
ha+"stockfish.wasm";return function(e){return a(e.instance,e.module)}(await Pa(b))}class Ib{name="ExitStatus";constructor(a){this.message=`Program terminated with exit(${a})`;this.status=a}}
var w,Jb=a=>{a.terminate();a.onmessage=()=>{}},Kb=[],Mb=a=>{if(I.length==0){var b=_scriptName;Module.mainScriptUrlOrBlob&&(b=Module.mainScriptUrlOrBlob,typeof b!="string"&&(b=URL.createObjectURL(b)));b=new Worker(b,{workerData:"em-pthread",name:"em-pthread"});I.push(b);Lb(b)}b=I.pop();if(!b)return 6;J[a.ma]=b;b.ma=a.ma;b.postMessage({ka:2,wb:a.ub,Ca:a.Ca,ma:a.ma},a.zb);return 0},K=0,lb=()=>K>0,Ka,B,L=(a,b,c,...d)=>{var e=8*d.length*2,g=Gb(),h=Fb(e),l=h>>3,n;for(n of d)typeof n=="bigint"?((u(),B)[l++]=
1n,(u(),B)[l++]=n):((u(),B)[l++]=0n,(u(),Ka)[l++]=n);a=yb(a,b,e,h,c);Eb(g);return a};function tb(a){if(p)return L(0,0,1,a);ua=a;K>0||(ca(),Module.onExit?.(a),ta=!0);fa(a,new Ib(a))}function Nb(a){if(p)return L(1,0,0,a);--K;ob(a)}
var ob=a=>{ua=a;if(p)throw Nb(a),"unwind";tb(a)},Ob=!Atomics.waitAsync||globalThis.navigator?.userAgent&&Number((navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)||[])[2])<91,z,I=[],ub=[],J={},ca=()=>{for(var a of Object.values(J))Jb(a);for(a of I)Jb(a);I=[];J={}},Pb=a=>{var b=a.ma;delete J[b];I.push(a);a.ma=0;m&&a.unref();Ob||Atomics.notify((u(),z),b>>2);zb(b)};function Da(){ub.forEach(a=>a())}
var Lb=a=>{new Promise(b=>{a.onmessage=g=>{var h=g.data;g=h.ka;if(h.Na&&h.Na!=vb())J[h.Na]?.postMessage(h);else if(h==="setimmediate"||h==="_si")a.postMessage(h);else switch(g){case 4:Ga();break;case 5:Mb(h);break;case 6:Qb(()=>{Pb(J[h.yb])});break;case 3:m&&!a.xb&&a.unref();b(a);break;case 8:a.onerror(h.error);break;case 9:Module[h.kb](...h.args);break;default:g&&t(`worker sent an unknown command ${g}`)}};a.onerror=g=>{t(`worker sent an error! ${g.filename}:${g.lineno}: ${g.message}`);throw g;};
m&&(a.on("message",g=>a.onmessage({data:g})),a.on("error",g=>a.onerror(g)));var c=[],d=["onExit","print","printErr"],e;for(e of d)Module.propertyIsEnumerable(e)&&c.push(e);a.postMessage({ka:1,lb:c,Bb:v,Cb:sa})})},ba={},A;function Ba(a){var b=(u(),A)[a+48>>2];a=(u(),A)[a+52>>2];Db(b,b-a);Eb(b)}var Rb=[],Fa=(a,b)=>{K=0;var c=Rb[a];c||(Rb[a]=c=Hb.get(a));a=c(b);K>0?ua=a:Ab(a)},v;function Sb(a,b,c,d){return p?L(2,0,1,a,b,c,d):Sa(a,b,c,d)}
var Sa=(a,b,c,d)=>{if(!globalThis.SharedArrayBuffer)return 6;var e=[];if(p&&!e.length)return Sb(a,b,c,d);a={ub:c,ma:a,Ca:d,zb:e};return p?(a.ka=5,postMessage(a,e),0):Mb(a)},M=()=>{var a=(u(),z)[+Tb>>2];Tb+=4;return a},Ub=(a,b)=>{for(var c=0,d=a.length-1;d>=0;d--){var e=a[d];e==="."?a.splice(d,1):e===".."?(a.splice(d,1),c++):c&&(a.splice(d,1),c--)}if(b)for(;c;c--)a.unshift("..");return a},N=a=>{var b=a.charAt(0)==="/",c=a.slice(-1)==="/";(a=Ub(a.split("/").filter(d=>!!d),!b).join("/"))||b||(a=".");
a&&c&&(a+="/");return(b?"/":"")+a},Vb=a=>{var b=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1);a=b[0];b=b[1];if(!a&&!b)return".";b&&=b.slice(0,-1);return a+b},O=a=>a&&a.match(/([^\/]+|\/)\/*$/)[1],Wb=(a,b)=>N(a+"/"+b),Xb=()=>{if(m){var a=require("node:crypto");return b=>(a.randomFillSync(b),0)}return b=>(b.set(crypto.getRandomValues(new Uint8Array(b.byteLength))),0)},Yb=a=>(Yb=Xb())(a),Zb=(...a)=>{for(var b="",c=!1,d=a.length-1;d>=-1&&!c;d--){c=d>=0?a[d]:C.cwd();
if(typeof c!="string")throw new TypeError("Arguments to path.resolve must be strings");if(!c)return"";b=c+"/"+b;c=c.charAt(0)==="/"}b=Ub(b.split("/").filter(e=>!!e),!c).join("/");return(c?"/":"")+b||"."},$b=(a,b)=>{function c(h){for(var l=0;l<h.length&&h[l]==="";l++);for(var n=h.length-1;n>=0&&h[n]==="";n--);return l>n?[]:h.slice(l,n-l+1)}a=Zb(a).slice(1);b=Zb(b).slice(1);a=c(a.split("/"));b=c(b.split("/"));for(var d=Math.min(a.length,b.length),e=d,g=0;g<d;g++)if(a[g]!==b[g]){e=g;break}d=[];for(g=
e;g<a.length;g++)d.push("..");d=d.concat(b.slice(e));return d.join("/")},ac=globalThis.TextDecoder&&new TextDecoder,P=(a,b=0)=>{var c=b;for(var d=c+NaN;a[c]&&!(c>=d);)++c;if(c-b>16&&a.buffer&&ac)return ac.decode(a.buffer instanceof ArrayBuffer?a.subarray(b,c):a.slice(b,c));for(d="";b<c;){var e=a[b++];if(e&128){var g=a[b++]&63;if((e&224)==192)d+=String.fromCharCode((e&31)<<6|g);else{var h=a[b++]&63;e=(e&240)==224?(e&15)<<12|g<<6|h:(e&7)<<18|g<<12|h<<6|a[b++]&63;e<65536?d+=String.fromCharCode(e):(e-=
65536,d+=String.fromCharCode(55296|e>>10,56320|e&1023))}}else d+=String.fromCharCode(e)}return d},bc=[],cc=a=>{for(var b=0,c=0;c<a.length;++c){var d=a.charCodeAt(c);d<=127?b++:d<=2047?b+=2:d>=55296&&d<=57343?(b+=4,++c):b+=3}return b},dc=(a,b,c,d)=>{if(!(d>0))return 0;var e=c;d=c+d-1;for(var g=0;g<a.length;++g){var h=a.codePointAt(g);if(h<=127){if(c>=d)break;b[c++]=h}else if(h<=2047){if(c+1>=d)break;b[c++]=192|h>>6;b[c++]=128|h&63}else if(h<=65535){if(c+2>=d)break;b[c++]=224|h>>12;b[c++]=128|h>>6&
63;b[c++]=128|h&63}else{if(c+3>=d)break;b[c++]=240|h>>18;b[c++]=128|h>>12&63;b[c++]=128|h>>6&63;b[c++]=128|h&63;g++}}b[c]=0;return c-e},ec=a=>{var b=Array(cc(a)+1);a=dc(a,b,0,b.length);b.length=a;return b},fc=[];function hc(a,b){fc[a]={input:[],output:[],qa:b};ic(a,jc)}
var jc={open(a){var b=fc[a.node.rdev];if(!b)throw new C.P(43);a.tty=b;a.seekable=!1},close(a){a.tty.qa.fsync(a.tty)},fsync(a){a.tty.qa.fsync(a.tty)},read(a,b,c,d){if(!a.tty||!a.tty.qa.Ua)throw new C.P(60);for(var e=0,g=0;g<d;g++){try{var h=a.tty.qa.Ua(a.tty)}catch(l){throw new C.P(29);}if(h===void 0&&!e)throw new C.P(6);if(h===null||h===void 0)break;e++;b[c+g]=h;if(h===10)break}e&&(a.node.atime=Date.now());return e},write(a,b,c,d){if(!a.tty||!a.tty.qa.La)throw new C.P(60);try{for(var e=0;e<d;e++)a.tty.qa.La(a.tty,
b[c+e])}catch(g){throw new C.P(29);}d&&(a.node.mtime=a.node.ctime=Date.now());return e}},kc={Ua(){a:{if(!bc.length){var a=null;if(m){var b=Buffer.alloc(256),c=0,d=process.stdin.fd;try{c=fs.readSync(d,b,0,256)}catch(e){if(e.toString().includes("EOF"))c=0;else throw e;}c>0&&(a=b.slice(0,c).toString("utf-8"))}else globalThis.window?.prompt&&(a=window.prompt("Input: "),a!==null&&(a+="\n"));if(!a){a=null;break a}bc=ec(a)}a=bc.shift()}return a},La(a,b){b===null||b===10?(qa(P(a.output)),a.output=[]):b!=
0&&a.output.push(b)},fsync(a){a.output?.length>0&&(qa(P(a.output)),a.output=[])},mb(){return{Jb:25856,Lb:5,Ib:191,Kb:35387,Hb:[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},nb(){return 0},ob(){return[24,80]}},lc={La(a,b){b===null||b===10?(t(P(a.output)),a.output=[]):b!=0&&a.output.push(b)},fsync(a){a.output?.length>0&&(t(P(a.output)),a.output=[])}},Q={la:null,da(){return Q.createNode(null,"/",16895,0)},createNode(a,b,c,d){if((c&61440)===24576||C.isFIFO(c))throw new C.P(63);
Q.la||(Q.la={dir:{node:{ia:Q.$.ia,na:Q.$.na,lookup:Q.$.lookup,oa:Q.$.oa,rename:Q.$.rename,unlink:Q.$.unlink,rmdir:Q.$.rmdir,readdir:Q.$.readdir,symlink:Q.$.symlink},stream:{ga:Q.aa.ga}},file:{node:{ia:Q.$.ia,na:Q.$.na},stream:{ga:Q.aa.ga,read:Q.aa.read,write:Q.aa.write,va:Q.aa.va,xa:Q.aa.xa}},link:{node:{ia:Q.$.ia,na:Q.$.na,readlink:Q.$.readlink},stream:{}},Pa:{node:{ia:Q.$.ia,na:Q.$.na},stream:C.cb}});c=C.createNode(a,b,c,d);R(c.mode)?(c.$=Q.la.dir.node,c.aa=Q.la.dir.stream,c.ba={}):C.isFile(c.mode)?
(c.$=Q.la.file.node,c.aa=Q.la.file.stream,c.ea=0,c.ba=Q.eb??(Q.eb=new Uint8Array(0))):(c.mode&61440)===40960?(c.$=Q.la.link.node,c.aa=Q.la.link.stream):(c.mode&61440)===8192&&(c.$=Q.la.Pa.node,c.aa=Q.la.Pa.stream);c.atime=c.mtime=c.ctime=Date.now();a&&(a.ba[b]=c,a.atime=a.mtime=a.ctime=c.atime);return c},$:{ia(a){var b={};b.dev=(a.mode&61440)===8192?a.id:1;b.ino=a.id;b.mode=a.mode;b.nlink=1;b.uid=0;b.gid=0;b.rdev=a.rdev;R(a.mode)?b.size=4096:C.isFile(a.mode)?b.size=a.ea:(a.mode&61440)===40960?b.size=
a.link.length:b.size=0;b.atime=new Date(a.atime);b.mtime=new Date(a.mtime);b.ctime=new Date(a.ctime);b.blksize=4096;b.blocks=Math.ceil(b.size/b.blksize);return b},na(a,b){for(var c of["mode","atime","mtime","ctime"])b[c]!=null&&(a[c]=b[c]);b.size!==void 0&&(b=b.size,a.ea!=b&&(c=a.ba,a.ba=new Uint8Array(b),a.ba.set(c.subarray(0,Math.min(b,a.ea))),a.ea=b))},lookup(){Q.Da||(Q.Da=new C.P(44),Q.Da.stack="<generic error, no stack>");throw Q.Da;},oa(a,b,c,d){return Q.createNode(a,b,c,d)},rename(a,b,c){try{var d=
S(b,c)}catch(g){}if(d){if(R(a.mode))for(var e in d.ba)throw new C.P(55);mc(d)}delete a.parent.ba[a.name];b.ba[c]=a;a.name=c;b.ctime=b.mtime=a.parent.ctime=a.parent.mtime=Date.now()},unlink(a,b){delete a.ba[b];a.ctime=a.mtime=Date.now()},rmdir(a,b){var c=S(a,b),d;for(d in c.ba)throw new C.P(55);delete a.ba[b];a.ctime=a.mtime=Date.now()},readdir(a){return[".","..",...Object.keys(a.ba)]},symlink(a,b,c){a=Q.createNode(a,b,41471,0);a.link=c;return a},readlink(a){if((a.mode&61440)!==40960)throw new C.P(28);
return a.link}},aa:{read(a,b,c,d,e){if(e>=a.node.ea)return 0;d=Math.min(a.node.ea-e,d);b.set(a.node.ba.subarray(e,e+d),c);return d},write(a,b,c,d,e,g){b.buffer===(u(),w).buffer&&(g=!1);if(!d)return 0;a=a.node;a.mtime=a.ctime=Date.now();if(g)a.ba=b.subarray(c,c+d),a.ea=d;else if(a.ea||e){g=e+d;var h=a.ba.length;h>=g||(g=Math.max(g,h*(h<1048576?2:1.125)>>>0),h&&(g=Math.max(g,256)),h=a.ba.subarray(0,a.ea),a.ba=new Uint8Array(g),a.ba.set(h));a.ba.set(b.subarray(c,c+d),e);a.ea=Math.max(a.ea,e+d)}else a.ba=
b.slice(c,c+d),a.ea=d;return d},ga(a,b,c){c===1?b+=a.position:c===2&&C.isFile(a.node.mode)&&(b+=a.node.ea);if(b<0)throw new C.P(28);return b},va(a,b,c,d,e){if(!C.isFile(a.node.mode))throw new C.P(43);a=a.node.ba;if(e&2||a.buffer!==(u(),w).buffer){d=!0;G();e=void 0;if(!e)throw new C.P(48);if(a){if(c>0||c+b<a.length)a.subarray?a=a.subarray(c,c+b):a=Array.prototype.slice.call(a,c,c+b);(u(),w).set(a,e)}}else d=!1,e=a.byteOffset;return{$b:e,Db:d}},xa(a,b,c,d){Q.aa.write(a,b,0,d,c,!1);return 0}}},nc=a=>
{typeof a=="string"&&(a=ec(a));a.subarray||(a=new Uint8Array(a));return a},oc=(a,b)=>{var c=0;a&&(c|=365);b&&(c|=146);return c},pc=async a=>{a=await ia(a);return new Uint8Array(a)},qc=null,rc=async()=>qc,sc=0,tc=null,uc=()=>{sc||(qc=new Promise(a=>tc=a));sc++},vc=[],wc=async(a,b)=>{typeof Browser!="undefined"&&Browser.init();for(var c of vc)if(c.canHandle(b))return c.handle(a,b);return a},xc=async(a,b,c,d,e,g,h,l)=>{var n=b?Zb(N(a+"/"+b)):a;uc();try{var k=c;typeof c=="string"&&(k=await pc(c));k=await wc(k,
n);l?.();if(!g){c=b;a&&(a=typeof a=="string"?a:T(a),c=b?N(a+"/"+b):a);var q=oc(d,e),r=C.create(c,q);if(k){k=nc(k);C.chmod(r,q|146);var H=C.open(r,577);C.write(H,k,0,k.length,0,h);C.close(H);C.chmod(r,q)}}}finally{sc--,sc||tc()}};function ic(a,b){C.Sa[a]={aa:b}}function R(a){return(a&61440)===16384}function S(a,b){var c=R(a.mode)?(c=U(a,"x"))?c:a.$.lookup?0:2:54;if(c)throw new C.P(c);for(c=C.pa[yc(a.id,b)];c;c=c.ua){var d=c.name;if(c.parent.id===a.id&&d===b)return c}return C.lookup(a,b)}
function mc(a){var b=yc(a.parent.id,a.name);if(C.pa[b]===a)C.pa[b]=a.ua;else for(b=C.pa[b];b;){if(b.ua===a){b.ua=a.ua;break}b=b.ua}}
function V(a,b={}){if(!a)throw new C.P(44);b.ya??(b.ya=!0);a.charAt(0)==="/"||(a=C.cwd()+"/"+a);var c=0;a:for(;c<40;c++){a=a.split("/").filter(l=>!!l);for(var d=C.root,e="/",g=0;g<a.length;g++){var h=g===a.length-1;if(h&&b.parent)break;if(a[g]!==".")if(a[g]==="..")if(e=Vb(e),C.Ia(d)){a=e+"/"+a.slice(g+1).join("/");c--;continue a}else d=d.parent;else{e=N(e+"/"+a[g]);try{d=S(d,a[g])}catch(l){if(l?.fa===44&&h&&b.rb)return{path:e};throw l;}!d.ja||h&&!b.ya||(d=d.ja.root);if((d.mode&61440)===40960&&(!h||
b.ha)){if(!d.$.readlink)throw new C.P(52);d=d.$.readlink(d);d.charAt(0)==="/"||(d=Vb(e)+"/"+d);a=d+"/"+a.slice(g+1).join("/");continue a}}}return{path:e,node:d}}throw new C.P(32);}function T(a){for(var b;;){if(C.Ia(a))return a=a.da.Wa,b?a[a.length-1]!=="/"?`${a}/${b}`:a+b:a;b=b?`${a.name}/${b}`:a.name;a=a.parent}}function yc(a,b){for(var c=0,d=0;d<b.length;d++)c=(c<<5)-c+b.charCodeAt(d)|0;return(a+c>>>0)%C.pa.length}function zc(a){var b=yc(a.parent.id,a.name);a.ua=C.pa[b];C.pa[b]=a}
function U(a,b){return C.Va?0:b.includes("r")&&!(a.mode&292)||b.includes("w")&&!(a.mode&146)||b.includes("x")&&!(a.mode&73)?2:0}function Ac(a,b){if(!R(a.mode))return 54;try{return S(a,b),20}catch(c){}return U(a,"wx")}function Bc(a,b,c){try{var d=S(a,b)}catch(e){return e.fa}if(a=U(a,"wx"))return a;if(c){if(!R(d.mode))return 54;if(C.Ia(d)||T(d)===C.cwd())return 10}else if(R(d.mode))return 31;return 0}function Cc(a,b){if(!a)throw new C.P(b);return a}
function W(a){a=C.jb(a);if(!a)throw new C.P(8);return a}function Dc(a,b=-1){a=Object.assign(new C.$a,a);if(b==-1)a:{for(b=0;b<=C.ab;b++)if(!C.streams[b])break a;throw new C.P(33);}a.fd=b;return C.streams[b]=a}function Ec(a,b=-1){a=Dc(a,b);a.aa?.Qb?.(a);return a}function Fc(a,b,c){var d=a?.aa.na;a=d?a:b;d??=b.$.na;Cc(d,63);try{d(a,c)}catch(e){if(e instanceof RangeError)throw new C.P(22);throw e;}}function Gc(a){var b=[];for(a=[a];a.length;){var c=a.pop();b.push(c);a.push(...c.wa)}return b}
function Hc(a){var b={Gb:4096,Tb:4096,blocks:1E6,Fb:5E5,Eb:5E5,files:C.Ka,Rb:C.Ka-1,Ub:42,flags:2,Yb:255};a.$.Xa&&Object.assign(b,a.$.Xa(a.da.tb.root));return b}function Ic(a,b,c){typeof c=="undefined"&&(c=b,b=438);return C.oa(a,b|8192,c)}function Jc(a,b,c,d){Fc(a,b,{mode:c&4095|b.mode&-4096,ctime:Date.now(),Ea:d})}function Kc(a,b,c){if(R(b.mode))throw new C.P(31);if(!C.isFile(b.mode))throw new C.P(28);var d=U(b,"w");if(d)throw new C.P(d);Fc(a,b,{size:c,timestamp:Date.now()})}
function Lc(a,b,c,d){a=typeof a=="string"?a:T(a);b=N(a+"/"+b);return C.create(b,oc(c,d))}function Mc(a){if(!(a.pb||a.qb||a.link||a.ba))if(globalThis.XMLHttpRequest)G("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");else try{a.ba=ja(a.url)}catch(b){throw new C.P(29);}}
var C={root:null,wa:[],Sa:{},streams:[],Ka:1,pa:null,Qa:"/",Ga:!1,Va:!0,hb:null,za:0,P:class{name="ErrnoError";constructor(a){this.fa=a}},$a:class{shared={};node=null;get object(){return this.node}set object(a){this.node=a}get flags(){return this.shared.flags}set flags(a){this.shared.flags=a}get position(){return this.shared.position}set position(a){this.shared.position=a}},Za:class{$={};aa={};ja=null;listeners=null;ra=0;constructor(a,b,c,d){a||=this;this.parent=a;this.da=a.da;this.id=C.Ka++;this.name=
b;this.mode=c;this.rdev=d;this.atime=this.mtime=this.ctime=Date.now()}get read(){return(this.mode&365)===365}set read(a){a?this.mode|=365:this.mode&=-366}get write(){return(this.mode&146)===146}set write(a){a?this.mode|=146:this.mode&=-147}get qb(){return R(this.mode)}get pb(){return(this.mode&61440)===8192}sb(){if(this.listeners){var a;for(b of this.listeners)b.exclusive?(a||=[]).push(b):b.bb(32);if(a){var b=(this.ra||0)%a.length;this.ra=b+1;a[b].bb(32)}}}},createNode(a,b,c,d){a=new C.Za(a,b,c,d);
zc(a);return a},Ia(a){return a===a.parent},isFile(a){return(a&61440)===32768},isFIFO(a){return(a&61440)===4096},isSocket(a){return(a&49152)===49152},ab:4096,jb:a=>C.streams[a],cb:{open(a){a.aa=C.ib(a.node.rdev).aa;a.aa.open?.(a)},ga(){throw new C.P(70);}},Ja:a=>a>>8,Wb:a=>a&255,ta:(a,b)=>a<<8|b,ib:a=>C.Sa[a],Ya(a,b){function c(l){C.za--;return b(l)}function d(l){if(l){if(!d.fb)return d.fb=!0,c(l)}else++g>=e.length&&c(null)}typeof a=="function"&&(b=a,a=!1);C.za++;C.za>1&&t(`warning: ${C.za} FS.syncfs operations in flight at once, probably just doing extra work`);
var e=Gc(C.root.da),g=0,h;for(h of e)h.type.Ya?h.type.Ya(h,a,d):d(null)},da(a,b,c){var d=c==="/";if(d&&C.root)throw new C.P(10);if(!d&&c){var e=V(c,{ya:!1});c=e.path;e=e.node;if(e.ja)throw new C.P(10);if(!R(e.mode))throw new C.P(54);}b={type:a,tb:b,Wa:c,wa:[]};a=a.da(b);a.da=b;b.root=a;d?C.root=a:e&&(e.ja=b,e.da&&e.da.wa.push(b));return a},dc(a){a=V(a,{ya:!1});if(!a.node.ja)throw new C.P(28);a=a.node;var b=a.ja,c=Gc(b);for([,e]of Object.entries(C.pa))for(;e;){var d=e.ua;c.includes(e.da)&&mc(e);var e=
d}a.ja=null;a.da.wa.splice(a.da.wa.indexOf(b),1)},lookup(a,b){return a.$.lookup(a,b)},oa(a,b,c){var d=V(a,{parent:!0}).node;a=O(a);if(!a)throw new C.P(28);if(a==="."||a==="..")throw new C.P(20);var e=Ac(d,a);if(e)throw new C.P(e);if(!d.$.oa)throw new C.P(63);return d.$.oa(d,a,b,c)},Xa(a){return Hc(V(a,{ha:!0}).node)},bc(a){return Hc(a.node)},create(a,b=438){return C.oa(a,b&4095|32768,0)},mkdir(a,b=511){return C.oa(a,b&1023|16384,0)},Xb(a,b){var c=a.split("/"),d="",e;for(e of c)if(e){if(d||a.charAt(0)===
"/")d+="/";d+=e;try{C.mkdir(d,b)}catch(g){if(g.fa!=20)throw g;}}},symlink(a,b){if(!Zb(a))throw new C.P(44);var c=V(b,{parent:!0}).node;if(!c)throw new C.P(44);b=O(b);var d=Ac(c,b);if(d)throw new C.P(d);if(!c.$.symlink)throw new C.P(63);return c.$.symlink(c,b,a)},link(a,b,c){var d=V(b,{parent:!0}).node;if(!d)throw new C.P(44);b=O(b);var e=Ac(d,b);if(e)throw new C.P(e);if(!d.$.link)throw new C.P(34);return d.$.link(d,b,a,c)},rename(a,b){var c=Vb(a),d=Vb(b),e=O(a),g=O(b);var h=V(a,{parent:!0});var l=
h.node;h=V(b,{parent:!0});h=h.node;if(!l||!h)throw new C.P(44);if(l.da!==h.da)throw new C.P(75);var n=S(l,e);a=$b(a,d);if(a.charAt(0)!==".")throw new C.P(28);a=$b(b,c);if(a.charAt(0)!==".")throw new C.P(55);try{var k=S(h,g)}catch(q){}if(n!==k){b=R(n.mode);if(e=Bc(l,e,b))throw new C.P(e);if(e=k?Bc(h,g,b):Ac(h,g))throw new C.P(e);if(!l.$.rename)throw new C.P(63);if(n.ja||k&&k.ja)throw new C.P(10);if(h!==l&&(e=U(l,"w")))throw new C.P(e);mc(n);try{l.$.rename(n,h,g),n.parent=h}catch(q){throw q;}finally{zc(n)}}},
rmdir(a){var b=V(a,{parent:!0}).node;a=O(a);var c=S(b,a),d=Bc(b,a,!0);if(d)throw new C.P(d);if(!b.$.rmdir)throw new C.P(63);if(c.ja)throw new C.P(10);b.$.rmdir(b,a);mc(c)},readdir(a){a=V(a,{ha:!0}).node;return Cc(a.$.readdir,54)(a)},unlink(a){var b=V(a,{parent:!0}).node;if(!b)throw new C.P(44);a=O(a);var c=S(b,a),d=Bc(b,a,!1);if(d)throw new C.P(d);if(!b.$.unlink)throw new C.P(63);if(c.ja)throw new C.P(10);b.$.unlink(b,a);mc(c)},readlink(a){a=V(a).node;if(!a)throw new C.P(44);if(!a.$.readlink)throw new C.P(28);
return a.$.readlink(a)},stat(a,b){a=V(a,{ha:!b}).node;return Cc(a.$.ia,63)(a)},fstat(a){var b=W(a);a=b.node;var c=b.aa.ia;b=c?b:a;c??=a.$.ia;Cc(c,63);return c(b)},lstat(a){return C.stat(a,!0)},chmod(a,b,c){a=typeof a=="string"?V(a,{ha:!c}).node:a;Jc(null,a,b,c)},lchmod(a,b){C.chmod(a,b,!0)},fchmod(a,b){a=W(a);Jc(a,a.node,b,!1)},chown(a,b,c,d){a=typeof a=="string"?V(a,{ha:!d}).node:a;Fc(null,a,{timestamp:Date.now(),Ea:d})},lchown(a,b,c){C.chown(a,b,c,!0)},fchown(a){a=W(a);Fc(a,a.node,{timestamp:Date.now(),
Ea:!1})},truncate(a,b){if(b<0)throw new C.P(28);a=typeof a=="string"?V(a,{ha:!0}).node:a;Kc(null,a,b)},Vb(a,b){a=W(a);if(b<0||(a.flags&2097155)===0)throw new C.P(28);Kc(a,a.node,b)},ec(a,b,c,d){a=V(a,{ha:!d});Fc(null,a.node,{atime:b,mtime:c,Ea:d})},open(a,b,c=438){if(a==="")throw new C.P(44);if(typeof b=="string"){var d={r:0,"r+":2,w:577,"w+":578,a:1089,"a+":1090}[b];if(typeof d=="undefined")throw Error(`Unknown file open mode: ${b}`);b=d}c=b&64?c&4095|32768:0;if(typeof a=="object")d=a;else{var e=
a.endsWith("/");var g=V(a,{ha:!(b&131072),rb:!0});d=g.node;a=g.path}g=!1;if(b&64)if(d){if(b&128)throw new C.P(20);}else{if(e)throw new C.P(31);d=C.oa(a,c|511,0);g=!0}if(!d)throw new C.P(44);(d.mode&61440)===8192&&(b&=-513);if(b&65536&&!R(d.mode))throw new C.P(54);if(!g&&(d?(d.mode&61440)===40960?e=32:(e=["r","w","rw"][b&3],b&512&&(e+="w"),e=R(d.mode)&&(e!=="r"||b&576)?31:U(d,e)):e=44,e))throw new C.P(e);b&512&&!g&&C.truncate(d,0);b&=-131713;b=Dc({node:d,path:T(d),flags:b,seekable:!0,position:0,aa:d.aa,
Ab:[],error:!1});b.aa.open&&b.aa.open(b);g&&C.chmod(d,c&511);return b},close(a){if(a.fd===null)throw new C.P(8);a.Fa&&(a.Fa=null);a.node?.sb();try{a.aa.close&&a.aa.close(a)}catch(b){throw b;}finally{C.streams[a.fd]=null}a.fd=null},ga(a,b,c){if(a.fd===null)throw new C.P(8);if(!a.seekable||!a.aa.ga)throw new C.P(70);if(c!=0&&c!=1&&c!=2)throw new C.P(28);a.position=a.aa.ga(a,b,c);a.Ab=[];return a.position},read(a,b,c,d,e){if(d<0||e<0)throw new C.P(28);if(a.fd===null)throw new C.P(8);if((a.flags&2097155)===
1)throw new C.P(8);if(R(a.node.mode))throw new C.P(31);if(!a.aa.read)throw new C.P(28);var g=typeof e!="undefined";if(!g)e=a.position;else if(!a.seekable)throw new C.P(70);b=a.aa.read(a,b,c,d,e);g||(a.position+=b);return b},write(a,b,c,d,e,g){if(d<0||e<0)throw new C.P(28);if(a.fd===null)throw new C.P(8);if((a.flags&2097155)===0)throw new C.P(8);if(R(a.node.mode))throw new C.P(31);if(!a.aa.write)throw new C.P(28);a.seekable&&a.flags&1024&&C.ga(a,0,2);var h=typeof e!="undefined";if(!h)e=a.position;
else if(!a.seekable)throw new C.P(70);b=a.aa.write(a,b,c,d,e,g);h||(a.position+=b);return b},va(a,b,c,d,e){if(d&2&&!(e&2)&&(a.flags&2097155)!==2)throw new C.P(2);if((a.flags&2097155)===1)throw new C.P(2);if(!a.aa.va)throw new C.P(43);if(!b)throw new C.P(28);return a.aa.va(a,b,c,d,e)},xa(a,b,c,d,e){return a.aa.xa?a.aa.xa(a,b,c,d,e):0},Ha(a,b,c){if(!a.aa.Ha)throw new C.P(59);return a.aa.Ha(a,b,c)},readFile(a,b={}){b.flags=b.flags??0;b.encoding=b.encoding??"binary";b.encoding!=="utf8"&&b.encoding!==
"binary"&&G(`Invalid encoding type "${b.encoding}"`);var c=C.open(a,b.flags);a=C.stat(a).size;var d=new Uint8Array(a);C.read(c,d,0,a,0);b.encoding==="utf8"&&(d=P(d));C.close(c);return d},writeFile(a,b,c={}){c.flags=c.flags??577;a=C.open(a,c.flags,c.mode);b=nc(b);C.write(a,b,0,b.byteLength,void 0,c.Mb);C.close(a)},cwd:()=>C.Qa,chdir(a){a=V(a,{ha:!0});if(a.node===null)throw new C.P(44);if(!R(a.node.mode))throw new C.P(54);var b=U(a.node,"x");if(b)throw new C.P(b);C.Qa=a.path},init(a,b,c){C.Ga=!0;a?
C.sa("/dev","stdin",a):C.symlink("/dev/tty","/dev/stdin");b?C.sa("/dev","stdout",null,b):C.symlink("/dev/tty","/dev/stdout");c?C.sa("/dev","stderr",null,c):C.symlink("/dev/tty1","/dev/stderr");C.open("/dev/stdin",0);C.open("/dev/stdout",1);C.open("/dev/stderr",1)},ac(){C.Ga=!1;for(var a of C.streams)a&&C.close(a)},Sb(a,b){try{var c=V(a,{ha:!b});a=c.path}catch(g){}var d=!1,e=null;try{c=V(a,{parent:!0}),O(a),c=V(a,{ha:!b}),d=!0,e=c.node}catch(g){}return d?e:null},Ob(a,b){a=typeof a=="string"?a:T(a);
for(b=b.split("/").reverse();b.length;){var c=b.pop();if(c){var d=N(a+"/"+c);try{C.mkdir(d)}catch(e){if(e.fa!=20)throw e;}a=d}}return d},sa(a,b,c,d){a=Wb(typeof a=="string"?a:T(a),b);b=oc(!!c,!!d);var e;(e=C.sa).Ja??(e.Ja=64);e=C.ta(C.sa.Ja++,0);ic(e,{open(g){g.seekable=!1},close(){d?.buffer?.length&&d(10)},read(g,h,l,n){for(var k=0,q=0;q<n;q++){try{var r=c()}catch(H){throw new C.P(29);}if(r===void 0&&!k)throw new C.P(6);if(r===null||r===void 0)break;k++;h[l+q]=r}k&&(g.node.atime=Date.now());return k},
write(g,h,l,n){for(var k=0;k<n;k++)try{d(h[l+k])}catch(q){throw new C.P(29);}n&&(g.node.mtime=g.node.ctime=Date.now());return k}});return Ic(a,b,e)},Nb(a,b,c,d,e){class g{Ba=!1;ra=[];Aa=void 0;Ra=0;Oa=0;get(k){if(!(k>this.length-1||k<0)){var q=k%this.chunkSize;return this.Aa(k/this.chunkSize|0)[q]}}gb(k){this.Aa=k}Ta(){var k=new XMLHttpRequest;k.open("HEAD",c,!1);k.send(null);k.status>=200&&k.status<300||k.status===304||G(`Couldn't load ${c}. Status: ${k.status}`);var q=Number(k.getResponseHeader("Content-length")),
r,H=(r=k.getResponseHeader("Accept-Ranges"))&&r==="bytes";k=(r=k.getResponseHeader("Content-Encoding"))&&r==="gzip";var F=1048576;H||(F=q);var y=this;y.gb(X=>{var la=X*F,Y=(X+1)*F-1;Y=Math.min(Y,q-1);if(typeof y.ra[X]=="undefined"){var Yc=y.ra;la>Y&&G(`invalid range (${la}, ${Y}) or no bytes requested!`);Y>q-1&&G(`only ${q} bytes available! programmer error!`);var D=new XMLHttpRequest;D.open("GET",c,!1);q!==F&&D.setRequestHeader("Range",`bytes=${la}-${Y}`);D.responseType="arraybuffer";D.overrideMimeType&&
D.overrideMimeType("text/plain; charset=x-user-defined");D.send(null);D.status>=200&&D.status<300||D.status===304||G(`Couldn't load ${c}. Status: ${D.status}`);la=D.response!==void 0?new Uint8Array(D.response||[]):ec(D.responseText??"");Yc[X]=la}typeof y.ra[X]=="undefined"&&G("doXHR failed!");return y.ra[X]});if(k||!q)F=q=1,F=q=this.Aa(0).length,qa("LazyFiles on gzip forces download of the whole file when length is accessed");this.Ra=q;this.Oa=F;this.Ba=!0}get length(){this.Ba||this.Ta();return this.Ra}get chunkSize(){this.Ba||
this.Ta();return this.Oa}}if(globalThis.XMLHttpRequest){f||G("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");var h=new g;var l=void 0}else l=c,h=void 0;var n=Lc(a,b,d,e);h?n.ba=h:l&&(n.ba=null,n.url=l);Object.defineProperties(n,{ea:{get:function(){return this.ba.length}}});a={};for(let [k,q]of Object.entries(n.aa))a[k]=(...r)=>{Mc(n);return q(...r)};a.read=(k,q,r,H,F)=>{Mc(n);k=k.node.ba;if(F>=k.length)q=0;else{H=Math.min(k.length-
F,H);if(k.slice)for(var y=0;y<H;y++)q[r+y]=k[F+y];else for(y=0;y<H;y++)q[r+y]=k.get(F+y);q=H}return q};a.va=()=>{Mc(n);G();throw new C.P(48);};n.aa=a;return n}},x,Nc=a=>a?P((u(),x),a):"",Oc=18,Tb=void 0,Ja;
function Ta(a,b,c){if(p)return L(3,0,1,a,b,c);Tb=c;try{var d=W(a);switch(b){case 0:var e=M();if(e<0)break;for(;C.streams[e];)e++;return Ec(d,e).fd;case 1:case 2:return 0;case 3:return d.flags;case 4:return e=M(),d.flags=d.flags&-289793|e&289792,0;case 12:return e=M(),(u(),Ja)[e+0>>1]=2,0;case 13:case 14:return 0}return-28}catch(g){if(typeof C=="undefined"||g.name!=="ErrnoError")throw g;return-g.fa}}
function Ua(a,b,c){if(p)return L(4,0,1,a,b,c);Tb=c;try{var d=W(a);switch(b){case 21509:return d.tty?0:-59;case 21505:if(!d.tty)return-59;if(d.tty.qa.mb){a=[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];var e=M();(u(),z)[e>>2]=25856;(u(),z)[e+4>>2]=5;(u(),z)[e+8>>2]=191;(u(),z)[e+12>>2]=35387;for(var g=0;g<32;g++)(u(),w)[e+g+17]=a[g]||0}return 0;case 21510:case 21511:case 21512:return d.tty?0:-59;case 21506:case 21507:case 21508:if(!d.tty)return-59;if(d.tty.qa.nb)for(e=
M(),u(),u(),u(),u(),a=[],g=0;g<32;g++)a.push((u(),w)[e+g+17]);return 0;case 21519:if(!d.tty)return-59;e=M();return(u(),z)[e>>2]=0;case 21520:return d.tty?-28:-59;case 21537:case 21531:return e=M(),C.Ha(d,b,e);case 21523:if(!d.tty)return-59;d.tty.qa.ob&&(g=[24,80],e=M(),(u(),Ja)[e>>1]=g[0],(u(),Ja)[e+2>>1]=g[1]);return 0;case 21524:return d.tty?0:-59;case 21515:return d.tty?0:-59;default:return-28}}catch(h){if(typeof C=="undefined"||h.name!=="ErrnoError")throw h;return-h.fa}}
function Va(a,b,c,d){if(p)return L(5,0,1,a,b,c,d);Tb=d;try{b=Nc(b);var e=b;if(e.charAt(0)==="/")b=e;else{var g=a===-100?C.cwd():W(a).path;if(e.length==0)throw new C.P(44);b=g+"/"+e}var h=d?M():0;c&64&&(h&=~Oc);return C.open(b,c,h).fd}catch(l){if(typeof C=="undefined"||l.name!=="ErrnoError")throw l;return-l.fa}}
var Wa=()=>G(""),Xa=a=>{var b=!aa;try{Atomics.wait((u(),z),0,0,0),b=!0}catch(c){}Ca(a,!f,1,b,65536,!1);Da()},Pc=a=>{a instanceof Ib||a=="unwind"||fa(1,a)},Qb=a=>{if(!ta)try{a()}catch(b){Pc(b)}finally{if(!(K>0))try{p?vb()&&Ab(ua):ob(ua)}catch(b){Pc(b)}}},Ea=a=>{Ob||(Atomics.waitAsync((u(),z),a>>2,a).value.then(Ga),a+=112,Atomics.store((u(),z),a>>2,1))},Ga=()=>{var a=vb();a&&Qb(()=>{Ea(a);Cb()})},Ya=(a,b)=>{a==b?setTimeout(Ga):p?postMessage({Na:a,ka:4}):(a=J[a])&&a.postMessage({ka:4})},Qc=[],Za=(a,
b,c,d,e,g,h)=>{Qc.length=0;c=e>>3;for(d=e+d>>3;c<d;){var l;(u(),B)[c++]?l=(u(),B)[c++]:l=(u(),Ka)[c++];Qc.push(l)}a=(b?Rc[b]:Sc[a])(...Qc);if(g)a.then(n=>xb(g,h,n));else return a},$a=()=>{K=0},ab=a=>{p?postMessage({ka:6,yb:a}):Pb(J[a])},bb=a=>{m&&(a=J[a],a.ref(),a.xb=1)},Tc={},ib=()=>performance.timeOrigin+performance.now();
function cb(a,b){if(p)return L(6,0,1,a,b);Tc[a]&&(clearTimeout(Tc[a].id),delete Tc[a]);if(!b)return 0;var c=setTimeout(()=>{delete Tc[a];Qb(()=>Bb(a,performance.timeOrigin+performance.now()))},b);Tc[a]={id:c,cc:b};return 0}
var Z=(a,b,c)=>dc(a,(u(),x),b,c),db=(a,b,c,d)=>{var e=(new Date).getFullYear(),g=(new Date(e,0,1)).getTimezoneOffset();e=(new Date(e,6,1)).getTimezoneOffset();var h=Math.max(g,e);(u(),A)[a>>2]=h*60;(u(),z)[b>>2]=Number(g!=e);b=l=>{var n=Math.abs(l);return`UTC${l>=0?"-":"+"}${String(Math.floor(n/60)).padStart(2,"0")}${String(n%60).padStart(2,"0")}`};a=b(g);b=b(e);e<g?(Z(a,c,17),Z(b,d,17)):(Z(a,d,17),Z(b,c,17))},Uc=1;
function eb(a,b,c){if(!(a>=0&&a<=3))return 28;if(a===0)a=Date.now();else if(Uc)a=performance.timeOrigin+performance.now();else return 52;a=Math.round(a*1E3*1E3);(u(),B)[c>>3]=BigInt(a);return 0}
var Vc=[],fb=(a,b,c)=>{Vc.length=0;for(var d;d=(u(),x)[b++];){var e=d!=105;e&=d!=112;c+=e&&c%8?4:0;Vc.push(d==112?(u(),A)[c>>2]:d==106?(u(),B)[c>>3]:d==105?(u(),z)[c>>2]:(u(),Ka)[c>>3]);c+=e?8:4}return p?L(0,a,0,...Vc):Rc[a](...Vc)},Wc=()=>{var a="Blocking on the main thread is very dangerous, see https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread";Wc.Ma||(Wc.Ma={});Wc.Ma[a]||(Wc.Ma[a]=1,m&&(a="warning: "+a),t(a))},gb=()=>{m||f||(Wc(),G("Blocking on the main thread is not allowed by default. See https://emscripten.org/docs/porting/pthreads.html#blocking-on-the-main-browser-thread"))},
hb=()=>{K+=1;throw"unwind";},jb=()=>m?require("node:os").cpus().length:navigator.hardwareConcurrency,kb=a=>{var b=(u(),x).length;a>>>=0;if(a<=b||a>2147483648)return!1;for(var c=1;c<=4;c*=2){var d=b*(1+.2/c);d=Math.min(d,a+100663296);a:{d=(Math.min(2147483648,Math.ceil(Math.max(a,d)/65536)*65536)-v.buffer.byteLength+65535)/65536|0;try{v.grow(d);va();var e=1;break a}catch(g){}e=void 0}if(e)return!0}return!1},Xc={},$c=()=>{if(!Zc){var a={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",
LANG:(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8",_:ea},b;for(b in Xc)Xc[b]===void 0?delete a[b]:a[b]=Xc[b];var c=[];for(b in a)c.push(`${b}=${a[b]}`);Zc=c}return Zc},Zc;function mb(a,b){if(p)return L(7,0,1,a,b);var c=0,d=0,e;for(e of $c()){var g=b+c;(u(),A)[a+d>>2]=g;c+=Z(e,g,Infinity)+1;d+=4}return 0}function nb(a,b){if(p)return L(8,0,1,a,b);var c=$c();(u(),A)[a>>2]=c.length;a=0;for(var d of c)a+=cc(d)+1;(u(),A)[b>>2]=a;return 0}
function pb(a){if(p)return L(9,0,1,a);try{var b=W(a);C.close(b);return 0}catch(c){if(typeof C=="undefined"||c.name!=="ErrnoError")throw c;return c.fa}}
function qb(a,b,c,d){if(p)return L(10,0,1,a,b,c,d);try{a:{var e=W(a);a=b;for(var g,h=b=0;h<c;h++){var l=(u(),A)[a>>2],n=(u(),A)[a+4>>2];a+=8;try{var k=C.read(e,(u(),w),l,n,g)}catch(r){if(b>0&&r instanceof C.P&&(r.fa==6||r.fa==6))break;throw r;}if(k<0){var q=-1;break a}b+=k;if(k<n)break;typeof g!="undefined"&&(g+=k)}q=b}(u(),A)[d>>2]=q;return 0}catch(r){if(typeof C=="undefined"||r.name!=="ErrnoError")throw r;return r.fa}}
function rb(a,b,c,d){if(p)return L(11,0,1,a,b,c,d);b=b<-9007199254740992||b>9007199254740992?NaN:Number(b);try{if(isNaN(b))return 22;var e=W(a);C.ga(e,b,c);(u(),B)[d>>3]=BigInt(e.position);e.Fa&&!b&&c===0&&(e.Fa=null);return 0}catch(g){if(typeof C=="undefined"||g.name!=="ErrnoError")throw g;return g.fa}}
function sb(a,b,c,d){if(p)return L(12,0,1,a,b,c,d);try{var e=W(a);a=b;if(c==1)var g=C.write(e,(u(),w),(u(),A)[a>>2],(u(),A)[a+4>>2],void 0);else{for(var h=b=0,l=a;h<c;h++,l+=8)b+=(u(),A)[l+4>>2];var n=new Uint8Array(b);for(h=l=0;h<c;h++,a+=8){var k=(u(),A)[a>>2],q=(u(),A)[a+4>>2];n.set((u(),x).subarray(k,k+q),l);l+=q}g=C.write(e,n,0,b,void 0)}(u(),A)[d>>2]=g;return 0}catch(r){if(typeof C=="undefined"||r.name!=="ErrnoError")throw r;return r.fa}}var ad=a=>{var b=cc(a)+1,c=Fb(b);Z(a,c,b);return c};
C.Pb=(a,b,c,d,e,g,h,l,n,k)=>{xc(a,b,c,d,e,l,n,k).then(g).catch(h)};C.Zb=xc;C.pa=Array(4096);C.da(Q,{},"/");C.mkdir("/tmp");C.mkdir("/home");C.mkdir("/home/web_user");
(function(){C.mkdir("/dev");ic(C.ta(1,3),{read:()=>0,write:(d,e,g,h)=>h,ga:()=>0});Ic("/dev/null",C.ta(1,3));hc(C.ta(5,0),kc);hc(C.ta(6,0),lc);Ic("/dev/tty",C.ta(5,0));Ic("/dev/tty1",C.ta(6,0));var a=new Uint8Array(1024),b=0,c=()=>{b||(Yb(a),b=a.byteLength);return a[--b]};C.sa("/dev","random",c);C.sa("/dev","urandom",c);C.mkdir("/dev/shm");C.mkdir("/dev/shm/tmp")})();
(function(){C.mkdir("/proc");var a=C.mkdir("/proc/self");C.mkdir("/proc/self/fd");C.da({da(){var b=C.createNode(a,"fd",16895,73);b.aa={ga:Q.aa.ga};b.$={lookup(c,d){c=+d;var e=W(c);c={parent:null,da:{Wa:"fake"},$:{readlink:()=>e.path},id:c+1};return c.parent=c},readdir(){return Array.from(C.streams.entries()).filter(([,c])=>c).map(([c])=>c.toString())}};return b}},{},"/proc/self/fd")})();C.hb={MEMFS:Q};
p||(Module.wasmMemory?v=Module.wasmMemory:v=new WebAssembly.Memory({initial:2048,maximum:32768,shared:!0}),va());Module.print&&(qa=Module.print);Module.printErr&&(t=Module.printErr);Module.wasmBinary&&(ra=Module.wasmBinary);
Module.ccall=(a,b,c,d)=>{var e={string:k=>{var q=0;k!==null&&k!==void 0&&k!==0&&(q=ad(k));return q},array:k=>{var q=Fb(k.length);(u(),w).set(k,q);return q}};a=Module["_"+a];var g=[],h=0;if(d)for(var l=0;l<d.length;l++){var n=e[c[l]];n?(h||=Gb(),g[l]=n(d[l])):g[l]=d[l]}c=a(...g);return c=function(k){h&&Eb(h);return b==="string"?Nc(k):b==="boolean"?!!k:k}(c)};Module.FS=C;
var Sc=[tb,Nb,Sb,Ta,Ua,Va,cb,mb,nb,pb,qb,rb,sb],Rc={1223088:()=>{try{Module.onDoneSearching()}catch(a){}}},vb,wb,Ca,Ia,xb,yb,zb,Ab,Bb,Cb,Db,Eb,Fb,Gb,Hb,Ra;function bd(a=[]){var b=wb;K+=1;a.unshift(ea);var c=a.length,d=Fb((c+1)*4),e=d,g;for(g of a)(u(),A)[e>>2]=ad(g),e+=4;(u(),A)[e>>2]=0;try{var h=b(c,d);ob(h,!0)}catch(l){Pc(l)}}async function Aa(){var a=da;if(p)La();else{for(var b=Kb;b.length>0;)b.shift()(Module);sc&&await rc();ta||(La(),bd(a))}}var E;p||(E=await (za()),await (Aa()));
;return Module}})();if(typeof exports==="object"&&typeof module==="object"){module.exports=Stockfish;module.exports.default=Stockfish}else if(typeof define==="function"&&define["amd"])define([],()=>Stockfish);var isPthread=globalThis.name=="em-pthread";var isNode=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";if(isNode)isPthread=require("node:worker_threads").workerData==="em-pthread";isPthread&&Stockfish();
return Stockfish;
}

///NOTE: Since emscripten 3.1.58, pthread workers no longer use a separate
///worker.js file. They load this very script, and are detected by the
///"em-pthread" worker name (web) or workerData (Node.js). Emscripten's
///built-in runtime bootstraps them: it receives the shared wasm module and
///memory via postMessage and runs the thread entry point itself.
///
///That bootstrap lives at the top level of the generated module
///(`isPthread && Stockfish()`), which we wrap inside INIT_ENGINE(). In a
///pthread worker nothing else calls INIT_ENGINE(), so we must call it here;
///doing so runs the module and registers the worker's onmessage handler,
///after which it idles until the main thread posts the load/run commands.
var isPthreadWorker = (typeof globalThis !== "undefined" && typeof globalThis.name === "string" && globalThis.name.indexOf("em-pthread") === 0) ||
    (typeof global !== "undefined" && Object.prototype.toString.call(global.process) === "[object process]" && require("node:worker_threads").workerData === "em-pthread");

if (isPthreadWorker) {
    /// Pthread worker: create the module to run the built-in bootstrap.
    INIT_ENGINE();
/// Is it a web worker?
} else if (typeof onmessage !== "undefined" && (typeof window === "undefined" || typeof window.document === "undefined") || typeof global !== "undefined" && Object.prototype.toString.call(global.process) === "[object process]") {
    (function ()
    {
        var isNode = typeof global !== "undefined" && Object.prototype.toString.call(global.process) === "[object process]";
        var engine = {};
        var startUpQueue = [];
        var queue = [];
        var wasmPath;
        var queueTimer;
        
        function completer(line)
        {
            var completions = [
                "compiler",
                "d",
                "eval",
                "flip",
                "go ",
                "isready",
                "ponderhit",
                "position fen ",
                "position startpos",
                "position startpos moves ",
                "quit",
                "setoption name Clear Hash value true",
                "setoption name Hash value ",
                "setoption name Minimum Thinking Time value ",
                "setoption name Move Overhead value ",
                "setoption name MultiPV value ",
                "setoption name Ponder value ",
                "setoption name Skill Level value ",
                "setoption name Slow Mover value ",
                "setoption name Threads value ",
                "setoption name UCI_Chess960 value false",
                "setoption name UCI_Chess960 value true",
                "setoption name UCI_LimitStrength value true",
                "setoption name UCI_LimitStrength value false",
                "setoption name UCI_Elo value ",
                "setoption name UCI_ShowWDL value true",
                "setoption name UCI_ShowWDL value false",
                "setoption name nodestime value ",
                "stop",
                "uci",
                "ucinewgame"
            ];
            var completionsMid = [
                "binc ",
                "btime ",
                "confidence ",
                "depth ",
                "infinite ",
                "mate ",
                "maxdepth ",
                "maxtime ",
                "mindepth ",
                "mintime ",
                "moves ", /// for position fen ... moves
                "movestogo ",
                "movetime ",
                "ponder ",
                "searchmoves ",
                "shallow ",
                "winc ",
                "wtime "
            ];
            
            function filter(c)
            {
                return c.toLowerCase().indexOf(line.toLowerCase()) === 0;
            }
            
            /// This looks for completions starting at the very beginning of the line.
            /// If the user has typed nothing, it will match everything.
            var hits = completions.filter(filter);
            
            if (!hits.length) {
                /// Just get the last word.
                line = line.replace(/^.*\s/, "");
                if (line) {
                    /// Find completion mid line too.
                    hits = completionsMid.filter(filter);
                } else {
                    /// If no word has been typed, show all options.
                    hits = completionsMid;
                }
            }
            
            return [hits, line];
        }
        
        function sendCommand(cmd)
        {
            ///NOTE: The single-threaded engine (IS_ASYNCIFY truthy) uses the
            ///on-demand command() ccall; ASYNCIFY suspends/resumes around any
            ///blocking work, and main() has already returned. The multithreaded
            ///engine pushes commands onto the glue queue (uci() in glue.cpp),
            ///which uciP->loop() on the (proxy) main thread consumes.
            var fn = IS_ASYNCIFY ? "command" : "uci";
            engine.ccall(fn, null, ["string"], [cmd], {async: IS_ASYNCIFY && /^go\b/.test(cmd)});
            ///NOTE: The engine must be fully initialized before we can close the Pthreads. so we have to check this here, not in onmessage.sendCommand
            if (cmd === "quit") {
                /// Close the Pthreads.
                try {
                    engine.terminate();
                } catch (e) {}
                try {
                    self.close();
                } catch (e) {}
                try {
                    process.exit();
                } catch (e) {}
            }
            return true;
        }
        
        function processQueue()
        {
            while (queue.length && (!engine._isSearching || !engine._isSearching())) {
                sendCommand(queue.shift());
            }
        }
        
        function processCommand(cmd)
        {
            cmd = cmd.trim();
            /// Certain commands need to be blocked.
            if (cmd.substring(0, 2) === "go" || cmd.substring(0, 9) === "setoption") {
                queue.push(cmd);
            } else {
                sendCommand(cmd);
            }
            processQueue();
        }
        
        function processStartUpQueue()
        {
            var i = 0;
            (function loop()
            {
                var cmd;
                while (i < startUpQueue.length) {
                    cmd = startUpQueue[i++];
                    if (cmd.startsWith("sleep ")) {
                        return setTimeout(loop, cmd.slice(6));
                    } else {
                        processCommand(cmd);
                    }
                }
            }());
        }
        
        function checkIfReady()
        {
            if (engine._isReady && !engine._isReady()) {
                return setTimeout(checkIfReady, 10);
            }
            
            if (!IS_ASYNCIFY) {
                engine.onDoneSearching = processQueue;
            } else {
                engine.onDoneSearching = function ()
                {
                    /// The delay is only necessary for the single-threaded engine.
                    setTimeout(processQueue, 1);
                };
            }
            engine.processCommand = processCommand;
            if (startUpQueue.length) {
                processStartUpQueue();
            }
        }
        
        if (isNode) {
            /// Was it called directly?
            ///NOTE: Node.js v14-19 needs --experimental-wasm-threads --experimental-wasm-simd
            
            (function ()
            {
                var p = require("path");
                
                wasmPath = p.join(__dirname, p.basename(__filename, p.extname(__filename)) + ".wasm");
                engine = {
                    locateFile: function (path)
                    {
                        if (path.indexOf(".wasm") > -1) {
                            if (path.indexOf(".wasm.map") > -1) {
                                /// Set the path to the wasm map.
                                return wasmPath + ".map"
                            }
                            /// Set the path to the wasm binary.
                            return wasmPath;
                        }
                        /// Set path to worker
                        
                        return __filename;
                    },
                    listener: function onMessage(line)
                    {
                        process.stdout.write(line + "\n");
                    },
                };
                
                if (enginePartsCount > 0) {
                    /// Prepare the wasm data because it is in parts.
                    engine.wasmBinary = (function assembleWASM()
                    {
                        var fs = require("fs");
                        var ext = p.extname(wasmPath);
                        var basename = wasmPath.slice(0, -ext.length);
                        var i;
                        var buffers = [];
                        
                        for (i = 0; i < enginePartsCount; ++i) {
                            buffers.push(fs.readFileSync(basename + "-part-" + i + ".wasm"));
                        }
                        
                        return Buffer.concat(buffers);
                    }());
                }
            }());
            
            startUpQueue = process.argv.slice(2);
            
            /// Was this executed directly?
            if (require.main === module) {
                INIT_ENGINE()(engine).then(checkIfReady);
                
                require("readline").createInterface({
                    input: process.stdin,
                    output: process.stdout,
                    completer: completer,
                    historySize: 100,
                }).on("line", function online(cmd)
                {
                    if (cmd) {
                        if (engine.processCommand) {
                            engine.processCommand(cmd);
                        } else {
                            startUpQueue.push(cmd);
                        }
                        if (cmd === "quit") {
                            process.exit();
                        }
                    }
                }).on("close", function onend()
                {
                    process.exit();
                }).setPrompt("");
            } else {
                module.exports = function initSF()
                {
                    INIT_ENGINE()(engine).then(checkIfReady);
                    engine.processCommand = function (cmd)
                    {
                        startUpQueue.push(cmd);
                    };
                    return engine;
                };
            }
        } else {
            (function ()
            {
                var progressPort;
                
                function formatSpeed(bytesPerSec)
                {
                    if (bytesPerSec < 1024) {
                        return Math.round(bytesPerSec) + " B/s";
                    }
                    if (bytesPerSec < 1048576) {
                        return (bytesPerSec / 1024).toFixed(1) + " KB/s";
                    }
                    return (bytesPerSec / 1048576).toFixed(1) + " MB/s";
                }
                
                function formatEta(s)
                {
                    if (!s || s < 0) {
                        return "";
                    }
                    if (s < 60) {
                        return Math.ceil(s) + " sec";
                    }
                    return Math.round(s / 60) + " min";
                }
                
                function calcProgressData(loaded, total, startTime)
                {
                    /// To avoid dividing by zero, we round up to 1 ms.
                    var elapsed = (Date.now() - startTime) || 1;
                    var speedBytesPerSec = loaded / (elapsed / 1000);
                    var eta = 0;
                    
                    if (speedBytesPerSec > 0 && loaded < total) {
                        eta = (total - loaded) / speedBytesPerSec;
                    }
                    
                    return {
                        percent: loaded / total,
                        loaded: loaded,
                        total: total,
                        speedBytesPerSec: speedBytesPerSec,
                        speedText: formatSpeed(speedBytesPerSec),
                        eta: eta,
                        etaText: formatEta(eta),
                    };
                }
                
                function loadSplitEngine(onLoaded)
                {
                    function fetchBinary(path, cb, onProg)
                    {
                        var req = new XMLHttpRequest();
                        
                        req.open("GET", path);
                        req.setRequestHeader("Content-Type", "application/octet-stream");
                        req.responseType = "blob";
                        
                        req.send();
                        
                        req.onload = function ()
                        {
                            if (req.status >= 400) {
                                throw new Error("ERROR " + req.status + ": Unable to download " + path);
                            } else {
                                cb(req.response);
                            }
                        };
                        req.onerror = function (err)
                        {
                            throw err;
                        };
                        
                        req.onprogress = onProg;
                    }
                    
                    function loadParts(totalParts)
                    {
                        var doneCount = 0;
                        var i;
                        var parts = [];
                        var ext = wasmPath.slice((wasmPath.lastIndexOf(".") - 1 >>> 0) + 1);
                        var basename = wasmPath.slice(0, -ext.length);
                        var progress = [];
                        var startTime = Date.now();
                        
                        function createOnDownload(num)
                        {
                            return function onDownload(data)
                            {
                                var wasmBlob;
                                ++doneCount;
                                parts[num] = data;
                                if (doneCount === totalParts) {
                                    wasmBlob = URL.createObjectURL(new Blob(parts, {type: "application/wasm"}));
                                    onLoaded(wasmBlob);
                                }
                            };
                        }
                        
                        function updateProgress()
                        {
                            var loaded = 0;
                            progress.forEach(function (el)
                            {
                                loaded += el.loaded;
                            });
                            var data = calcProgressData(loaded, engineTotalBytes, startTime);
                            progressPort.postMessage(data);
                            if (data.percent === 1) {
                                progressPort.close();
                                progressPort = null;
                            }
                        }
                        
                        function createOnProgress(num)
                        {
                            progress[num] = {
                                total: 0,
                                loaded: 0,
                            };
                            return function onProg(e)
                            {
                                progress[num].total = e.total;
                                progress[num].loaded = e.loaded;
                                if (progressPort) {
                                    updateProgress();
                                }
                            }
                        }
                        for (i = 0; i < totalParts; ++i) {
                            fetchBinary(basename + "-part-" + i + ext, createOnDownload(i), createOnProgress(i));
                        }
                    }
                    loadParts(enginePartsCount);
                }
                
                var args = self.location.hash.substr(1).split(",");
                wasmPath = decodeURIComponent(args[0] || location.origin + location.pathname.replace(/\.js$/i, ".wasm"));
                
                if (enginePartsCount > 0) {
                    loadSplitEngine(beginEngineInitialization);
                } else {
                    beginEngineInitialization();
                }
                
                function beginEngineInitialization(wasmBlob)
                {
                    engine = {
                        locateFile: function (path)
                        {
                            if (path.indexOf(".wasm") > -1) {
                                if (path.indexOf(".wasm.map") > -1) {
                                    /// Set the path to the wasm map.
                                    return wasmPath + ".map"
                                }
                                /// Set the path to the wasm binary.
                                return wasmBlob || wasmPath;
                            }
                            /// Pthread workers load this very script.
                            return self.location.href;
                        },
                        listener: function onMessage(line)
                        {
                            postMessage(line);
                        },
                    };
                    
                    /// If the WASM file is not split, we can process the bytecode while streaming it with WebAssembly.instantiateStreaming().
                    if (!enginePartsCount) {
                        var updateTimer;
                        var updateData;
                        
                        function updateDelayed(data)
                        {
                            updateData = data;
                            if (!updateTimer) {
                                updateTimer = setTimeout(function ()
                                {
                                    updateTimer = null;
                                    progressPort.postMessage(updateData);
                                    
                                    if (updateData.percent >= 1) {
                                        progressPort.close();
                                        progressPort = null;
                                    }
                                }, 4);
                            }
                        }
                        
                        function fetchWasmWithProgress(url, onProgress, onError)
                        {
                            return fetch(url).then(function onFetch(response)
                            {
                                var startTime = Date.now();
                                
                                if (!response.ok) {
                                    throw new Error("HTTP " + response.status + ": " + response.statusText);
                                }
                                
                                var totalBytes = engineTotalBytes;
                                
                                var loadedBytes = 0;
                                var reader = response.body.getReader();
                                
                                var progressStream = new ReadableStream({
                                    start: function (controller)
                                    {
                                        function push()
                                        {
                                            reader.read().then(function onRead(result)
                                            {
                                                var done = result.done;
                                                var value = result.value;
                                                
                                                if (done) {
                                                    onProgress(startTime, totalBytes, totalBytes);
                                                    controller.close();
                                                    return;
                                                }
                                                loadedBytes += value.byteLength;
                                                onProgress(startTime, loadedBytes, totalBytes);
                                                controller.enqueue(value);
                                                push();
                                            }).catch(function onReadError(err)
                                            {
                                                controller.error(err);
                                                if (typeof onError === "function") {
                                                    onError(err);
                                                }
                                            });
                                        }
                                        push();
                                    }
                                });
                                
                                /// Preserve original headers (Wasm compilation is strict about content-type)
                                var headers = new Headers(response.headers);
                                
                                return new Response(progressStream, {
                                    status: response.status,
                                    statusText: response.statusText,
                                    headers: headers
                                });
                            });
                        }
                        
                        function createProgressHandler()
                        {
                            return function onProgress(startTime, loaded, total)
                            {
                                if (progressPort) {
                                    updateDelayed(calcProgressData(loaded, total, startTime));
                                }
                            };
                        }
                        
                        if (!isASMEngine) {
                            engine.instantiateWasm = function (info, receiveInstance)
                            {
                                var onProgress = createProgressHandler();
                                
                                return fetchWasmWithProgress(wasmPath, onProgress).then(function onFetch(response)
                                {
                                    /// Stream directly to WebAssembly
                                    return WebAssembly.instantiateStreaming(response, info);
                                }).then(function onInstantiate(result)
                                {
                                    /// Hand off to Emscripten
                                    receiveInstance(result.instance, result.module);
                                    return result.instance.exports;
                                }).catch(function onError(e)
                                {
                                    console.error("WASM streaming failed:", e);
                                    throw e;
                                });
                            };
                        }
                    }
                    
                    INIT_ENGINE()(engine).then(checkIfReady).catch(function (e)
                    {
                        /// Web Workers will not trigger the error event when errors occur in promises, so we need to create a new context and throw an error there.
                        setTimeout(function throwError()
                        {
                            throw e;
                        }, 1);
                    });
                }
                
                /// Make sure that this is only added once.
                if (!onmessage) {
                    onmessage = function (event)
                    {
                        /// For backwards compatibility, the engine can inform the frontend of the ability to output download progress.
                        if (event.data && event.data.type === "loadNetwork") {
                            if (!engine.processCommand || engine._isSearching()) { postMessage("networkerror busy"); return; }
                            try {
                                var name = event.data.name;
                                if (!/^[a-zA-Z0-9_.-]+$/.test(name)) throw new Error("Invalid network filename");
                                engine.FS.writeFile("/" + name, new Uint8Array(event.data.data));
                                var option = event.data.option || "EvalFile";
                                if (!/^[A-Za-z][A-Za-z0-9 _-]{0,63}$/.test(option)) throw new Error("Invalid network option");
                                engine.processCommand("setoption name " + option + " value /" + name);
                                postMessage("networkready");
                            } catch (error) { postMessage("networkerror " + error.message); }
                        } else if (event.data === "setoption name CanOutputEngineDownloadProgress") {
                            postMessage("info WillOutputEngineDownloadProgress");
                        } else if (event.data.progressPort) {
                            progressPort = event.data.progressPort;
                        } else {
                            if (engine.processCommand) {
                                engine.processCommand(event.data);
                            } else {
                                startUpQueue.push(event.data);
                            }
                            ///NOTE: We check this here, not just in engine.processCommand, because the engine might never finish loading.
                            if (event.data === "quit") {
                                try {
                                    self.close();
                                } catch (e) {}
                            }
                        }
                    };
                }
            }());
        }
    }());
} else {
    ///NOTE: If it's a normal browser, the client can use the engine without polluting the global scope.
    if (typeof document === "object" && document.currentScript) {
        document.currentScript._exports = INIT_ENGINE();
    } else {
        Stockfish = INIT_ENGINE();
    }
}
}());
