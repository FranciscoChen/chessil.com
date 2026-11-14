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

var IS_ASYNCIFY = 1;
var enginePartsCount = 0;
var isASMEngine = 0;
var engineTotalBytes=1824905;

var Stockfish;
function INIT_ENGINE() {
var Stockfish=(()=>{var _scriptName=globalThis.document?.currentScript?.src;return async function(moduleArg={}){var Module=moduleArg;var ba=!!globalThis.window,ca=!!globalThis.WorkerGlobalScope,da=globalThis.process?.versions?.node&&globalThis.process?.type!="renderer";
typeof global!=="undefined"&&Object.prototype.toString.call(global.process)==="[object process]"&&typeof fetch!=="undefined"&&(typeof XMLHttpRequest==="undefined"&&(global.XMLHttpRequest=function(){var a,b={readyState:0,status:0,onerror:null,onreadystatechange:null,onload:null,open:function(c,d){a=d},send:function(){require("fs").readFile(a,function(c,d){b.readyState=4;c?(console.error(c),b.status=404,b.onerror(c)):(b.status=200,b.response=d,b.onreadystatechange(),b.onload())})}};return b}),fetch=
null);Module.print=function(a){Module.listener?Module.listener(a):console.log(a)};Module.printErr=function(a){Module.listener?Module.listener(a):console.error(a)};Module.terminate=function(){typeof PThread!=="undefined"&&PThread.Db()};var ea=[],fa="./this.program",e=(a,b)=>{throw b;};typeof __filename!="undefined"?_scriptName=__filename:ca&&(_scriptName=self.location.href);var ha="",ia,m;
if(da){var fs=require("node:fs");ha=__dirname+"/";m=a=>{a=ja(a)?new URL(a):a;return fs.readFileSync(a)};ia=async a=>{a=ja(a)?new URL(a):a;return fs.readFileSync(a,void 0)};process.argv.length>1&&(fa=process.argv[1].replace(/\\/g,"/"));ea=process.argv.slice(2);e=(a,b)=>{process.exitCode=a;throw b;}}else if(ba||ca){try{ha=(new URL(".",_scriptName)).href}catch{}ca&&(m=a=>{var b=new XMLHttpRequest;b.open("GET",a,!1);b.responseType="arraybuffer";b.send(null);return new Uint8Array(b.response)});ia=async a=>
{a=await fetch(a,{credentials:"same-origin"});if(a.ok)return a.arrayBuffer();throw Error(a.status+" : "+a.url);}}var ka=console.log.bind(console),r=console.error.bind(console),t,v=!1,ja=a=>a.startsWith("file://");function la(){if(!x?.buffer?.resizable){var a=ma.buffer;x=new Int8Array(a);na=new Int16Array(a);z=new Uint8Array(a);A=new Int32Array(a);C=new Uint32Array(a);oa=new Float64Array(a);pa=new BigInt64Array(a)}}
function D(a){a=`Aborted(${a})`;r(a);v=!0;throw new WebAssembly.RuntimeError(a+". Build with -sASSERTIONS for more info.");}var qa;async function ra(a){if(!t)try{var b=await ia(a);return new Uint8Array(b)}catch{}if(a==qa&&t)a=new Uint8Array(t);else if(m)a=m(a);else throw"both async and sync fetching of the wasm failed";return a}async function sa(a,b){try{var c=await ra(a);return await WebAssembly.instantiate(c,b)}catch(d){r(`failed to asynchronously prepare wasm: ${d}`),D(d)}}
async function ta(a){var b=qa;if(!t&&!da)try{var c=fetch(b,{credentials:"same-origin"});return await WebAssembly.instantiateStreaming(c,a)}catch(d){r(`wasm streaming compile failed: ${d}`),r("falling back to ArrayBuffer instantiation")}return sa(b,a)}class E{name="ExitStatus";constructor(a){this.message=`Program terminated with exit(${a})`;this.status=a}}
var x,A,G=()=>{var a=A[+F>>2];F+=4;return a},ua=(a,b)=>{for(var c=0,d=a.length-1;d>=0;d--){var f=a[d];f==="."?a.splice(d,1):f===".."?(a.splice(d,1),c++):c&&(a.splice(d,1),c--)}if(b)for(;c;c--)a.unshift("..");return a},H=a=>{var b=a.charAt(0)==="/",c=a.slice(-1)==="/";(a=ua(a.split("/").filter(d=>!!d),!b).join("/"))||b||(a=".");a&&c&&(a+="/");return(b?"/":"")+a},va=a=>{var b=/^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/.exec(a).slice(1);a=b[0];b=b[1];if(!a&&!b)return".";b&&=b.slice(0,
-1);return a+b},I=a=>a&&a.match(/([^\/]+|\/)\/*$/)[1],wa=(a,b)=>H(a+"/"+b),xa=()=>{if(da){var a=require("node:crypto");return b=>(a.randomFillSync(b),0)}return b=>(crypto.getRandomValues(b),0)},ya=a=>(ya=xa())(a),za=(...a)=>{for(var b="",c=!1,d=a.length-1;d>=-1&&!c;d--){c=d>=0?a[d]:J.cwd();if(typeof c!="string")throw new TypeError("Arguments to path.resolve must be strings");if(!c)return"";b=c+"/"+b;c=c.charAt(0)==="/"}b=ua(b.split("/").filter(f=>!!f),!c).join("/");return(c?"/":"")+b||"."},Aa=(a,
b)=>{function c(h){for(var l=0;l<h.length&&h[l]==="";l++);for(var p=h.length-1;p>=0&&h[p]==="";p--);return l>p?[]:h.slice(l,p-l+1)}a=za(a).slice(1);b=za(b).slice(1);a=c(a.split("/"));b=c(b.split("/"));for(var d=Math.min(a.length,b.length),f=d,g=0;g<d;g++)if(a[g]!==b[g]){f=g;break}d=[];for(g=f;g<a.length;g++)d.push("..");d=d.concat(b.slice(f));return d.join("/")},Ba=globalThis.TextDecoder&&new TextDecoder,K=(a,b=0)=>{var c=b;for(var d=c+NaN;a[c]&&!(c>=d);)++c;if(c-b>16&&a.buffer&&Ba)return Ba.decode(a.subarray(b,
c));for(d="";b<c;){var f=a[b++];if(f&128){var g=a[b++]&63;if((f&224)==192)d+=String.fromCharCode((f&31)<<6|g);else{var h=a[b++]&63;f=(f&240)==224?(f&15)<<12|g<<6|h:(f&7)<<18|g<<12|h<<6|a[b++]&63;f<65536?d+=String.fromCharCode(f):(f-=65536,d+=String.fromCharCode(55296|f>>10,56320|f&1023))}}else d+=String.fromCharCode(f)}return d},Ca=[],Da=a=>{for(var b=0,c=0;c<a.length;++c){var d=a.charCodeAt(c);d<=127?b++:d<=2047?b+=2:d>=55296&&d<=57343?(b+=4,++c):b+=3}return b},L=(a,b,c,d)=>{if(!(d>0))return 0;var f=
c;d=c+d-1;for(var g=0;g<a.length;++g){var h=a.codePointAt(g);if(h<=127){if(c>=d)break;b[c++]=h}else if(h<=2047){if(c+1>=d)break;b[c++]=192|h>>6;b[c++]=128|h&63}else if(h<=65535){if(c+2>=d)break;b[c++]=224|h>>12;b[c++]=128|h>>6&63;b[c++]=128|h&63}else{if(c+3>=d)break;b[c++]=240|h>>18;b[c++]=128|h>>12&63;b[c++]=128|h>>6&63;b[c++]=128|h&63;g++}}b[c]=0;return c-f},Ea=a=>{var b=Array(Da(a)+1);a=L(a,b,0,b.length);b.length=a;return b},Fa=[];function Ga(a,b){Fa[a]={input:[],output:[],Y:b};Ha(a,Ia)}
var Ia={open(a){var b=Fa[a.node.rdev];if(!b)throw new J.F(43);a.tty=b;a.seekable=!1},close(a){a.tty.Y.fsync(a.tty)},fsync(a){a.tty.Y.fsync(a.tty)},read(a,b,c,d){if(!a.tty||!a.tty.Y.Ca)throw new J.F(60);for(var f=0,g=0;g<d;g++){try{var h=a.tty.Y.Ca(a.tty)}catch(l){throw new J.F(29);}if(h===void 0&&!f)throw new J.F(6);if(h===null||h===void 0)break;f++;b[c+g]=h;if(h===10)break}f&&(a.node.atime=Date.now());return f},write(a,b,c,d){if(!a.tty||!a.tty.Y.va)throw new J.F(60);try{for(var f=0;f<d;f++)a.tty.Y.va(a.tty,
b[c+f])}catch(g){throw new J.F(29);}d&&(a.node.mtime=a.node.ctime=Date.now());return f}},Ja={Ca(){a:{if(!Ca.length){var a=null;if(da){var b=Buffer.alloc(256),c=0,d=process.stdin.fd;try{c=fs.readSync(d,b,0,256)}catch(f){if(f.toString().includes("EOF"))c=0;else throw f;}c>0&&(a=b.slice(0,c).toString("utf-8"))}else globalThis.window?.prompt&&(a=window.prompt("Input: "),a!==null&&(a+="\n"));if(!a){a=null;break a}Ca=Ea(a)}a=Ca.shift()}return a},va(a,b){b===null||b===10?(ka(K(a.output)),a.output=[]):b!=
0&&a.output.push(b)},fsync(a){a.output?.length>0&&(ka(K(a.output)),a.output=[])},Ta(){return{ib:25856,kb:5,hb:191,jb:35387,gb:[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}},Ua(){return 0},Va(){return[24,80]}},Ka={va(a,b){b===null||b===10?(r(K(a.output)),a.output=[]):b!=0&&a.output.push(b)},fsync(a){a.output?.length>0&&(r(K(a.output)),a.output=[])}},M={U:null,L(){return M.createNode(null,"/",16895,0)},createNode(a,b,c,d){if((c&61440)===24576||J.isFIFO(c))throw new J.F(63);
M.U||(M.U={dir:{node:{S:M.G.S,V:M.G.V,lookup:M.G.lookup,W:M.G.W,rename:M.G.rename,unlink:M.G.unlink,rmdir:M.G.rmdir,readdir:M.G.readdir,symlink:M.G.symlink},stream:{P:M.I.P}},file:{node:{S:M.G.S,V:M.G.V},stream:{P:M.I.P,read:M.I.read,write:M.I.write,ga:M.I.ga,ia:M.I.ia}},link:{node:{S:M.G.S,V:M.G.V,readlink:M.G.readlink},stream:{}},za:{node:{S:M.G.S,V:M.G.V},stream:J.Ma}});c=J.createNode(a,b,c,d);N(c.mode)?(c.G=M.U.dir.node,c.I=M.U.dir.stream,c.J={}):J.isFile(c.mode)?(c.G=M.U.file.node,c.I=M.U.file.stream,
c.M=0,c.J=M.Na??(M.Na=new Uint8Array(0))):(c.mode&61440)===40960?(c.G=M.U.link.node,c.I=M.U.link.stream):(c.mode&61440)===8192&&(c.G=M.U.za.node,c.I=M.U.za.stream);c.atime=c.mtime=c.ctime=Date.now();a&&(a.J[b]=c,a.atime=a.mtime=a.ctime=c.atime);return c},G:{S(a){var b={};b.dev=(a.mode&61440)===8192?a.id:1;b.ino=a.id;b.mode=a.mode;b.nlink=1;b.uid=0;b.gid=0;b.rdev=a.rdev;N(a.mode)?b.size=4096:J.isFile(a.mode)?b.size=a.M:(a.mode&61440)===40960?b.size=a.link.length:b.size=0;b.atime=new Date(a.atime);
b.mtime=new Date(a.mtime);b.ctime=new Date(a.ctime);b.blksize=4096;b.blocks=Math.ceil(b.size/b.blksize);return b},V(a,b){for(var c of["mode","atime","mtime","ctime"])b[c]!=null&&(a[c]=b[c]);b.size!==void 0&&(b=b.size,a.M!=b&&(c=a.J,a.J=new Uint8Array(b),a.J.set(c.subarray(0,Math.min(b,a.M))),a.M=b))},lookup(){M.na||(M.na=new J.F(44),M.na.stack="<generic error, no stack>");throw M.na;},W(a,b,c,d){return M.createNode(a,b,c,d)},rename(a,b,c){try{var d=O(b,c)}catch(g){}if(d){if(N(a.mode))for(var f in d.J)throw new J.F(55);
P(d)}delete a.parent.J[a.name];b.J[c]=a;a.name=c;b.ctime=b.mtime=a.parent.ctime=a.parent.mtime=Date.now()},unlink(a,b){delete a.J[b];a.ctime=a.mtime=Date.now()},rmdir(a,b){var c=O(a,b),d;for(d in c.J)throw new J.F(55);delete a.J[b];a.ctime=a.mtime=Date.now()},readdir(a){return[".","..",...Object.keys(a.J)]},symlink(a,b,c){a=M.createNode(a,b,41471,0);a.link=c;return a},readlink(a){if((a.mode&61440)!==40960)throw new J.F(28);return a.link}},I:{read(a,b,c,d,f){if(f>=a.node.M)return 0;d=Math.min(a.node.M-
f,d);b.set(a.node.J.subarray(f,f+d),c);return d},write(a,b,c,d,f,g){b.buffer===x.buffer&&(g=!1);if(!d)return 0;a=a.node;a.mtime=a.ctime=Date.now();if(g)a.J=b.subarray(c,c+d),a.M=d;else if(a.M||f){g=f+d;var h=a.J.length;h>=g||(g=Math.max(g,h*(h<1048576?2:1.125)>>>0),h&&(g=Math.max(g,256)),h=a.J.subarray(0,a.M),a.J=new Uint8Array(g),a.J.set(h));a.J.set(b.subarray(c,c+d),f);a.M=Math.max(a.M,f+d)}else a.J=b.slice(c,c+d),a.M=d;return d},P(a,b,c){c===1?b+=a.position:c===2&&J.isFile(a.node.mode)&&(b+=a.node.M);
if(b<0)throw new J.F(28);return b},ga(a,b,c,d,f){if(!J.isFile(a.node.mode))throw new J.F(43);a=a.node.J;if(f&2||a.buffer!==x.buffer){d=!0;D();f=void 0;if(!f)throw new J.F(48);if(a){if(c>0||c+b<a.length)a.subarray?a=a.subarray(c,c+b):a=Array.prototype.slice.call(a,c,c+b);x.set(a,f)}}else d=!1,f=a.byteOffset;return{Ab:f,bb:d}},ia(a,b,c,d){M.I.write(a,b,0,d,c,!1);return 0}}},La=a=>{typeof a=="string"&&(a=Ea(a));a.subarray||(a=new Uint8Array(a));return a},Ma=(a,b)=>{var c=0;a&&(c|=365);b&&(c|=146);return c},
Na=async a=>{a=await ia(a);return new Uint8Array(a)},Oa=null,Pa=async()=>Oa,Q=0,Qa=null,Ra=()=>{Q||(Oa=new Promise(a=>Qa=a));Q++},Sa=[],Ta=async(a,b)=>{typeof Browser!="undefined"&&Browser.init();for(var c of Sa)if(c.canHandle(b))return c.handle(a,b);return a},Ua=async(a,b,c,d,f,g,h,l)=>{var p=b?za(H(a+"/"+b)):a;Ra();try{var k=c;typeof c=="string"&&(k=await Na(c));k=await Ta(k,p);l?.();if(!g){c=b;a&&(a=typeof a=="string"?a:T(a),c=b?H(a+"/"+b):a);var q=Ma(d,f),n=J.create(c,q);if(k){k=La(k);J.chmod(n,
q|146);var u=J.open(n,577);J.write(u,k,0,k.length,0,h);J.close(u);J.chmod(n,q)}}}finally{Q--,Q||Qa()}};function Ha(a,b){J.Ba[a]={I:b}}function N(a){return(a&61440)===16384}function O(a,b){var c=N(a.mode)?(c=U(a,"x"))?c:a.G.lookup?0:2:54;if(c)throw new J.F(c);for(c=J.X[Va(a.id,b)];c;c=c.fa){var d=c.name;if(c.parent.id===a.id&&d===b)return c}return J.lookup(a,b)}function P(a){var b=Va(a.parent.id,a.name);if(J.X[b]===a)J.X[b]=a.fa;else for(b=J.X[b];b;){if(b.fa===a){b.fa=a.fa;break}b=b.fa}}
function V(a,b={}){if(!a)throw new J.F(44);b.ja??(b.ja=!0);a.charAt(0)==="/"||(a=J.cwd()+"/"+a);var c=0;a:for(;c<40;c++){a=a.split("/").filter(l=>!!l);for(var d=J.root,f="/",g=0;g<a.length;g++){var h=g===a.length-1;if(h&&b.parent)break;if(a[g]!==".")if(a[g]==="..")if(f=va(f),J.sa(d)){a=f+"/"+a.slice(g+1).join("/");c--;continue a}else d=d.parent;else{f=H(f+"/"+a[g]);try{d=O(d,a[g])}catch(l){if(l?.N===44&&h&&b.Ya)return{path:f};throw l;}!d.T||h&&!b.ja||(d=d.T.root);if((d.mode&61440)===40960&&(!h||b.R)){if(!d.G.readlink)throw new J.F(52);
d=d.G.readlink(d);d.charAt(0)==="/"||(d=va(f)+"/"+d);a=d+"/"+a.slice(g+1).join("/");continue a}}}return{path:f,node:d}}throw new J.F(32);}function T(a){for(var b;;){if(J.sa(a))return a=a.L.Ea,b?a[a.length-1]!=="/"?`${a}/${b}`:a+b:a;b=b?`${a.name}/${b}`:a.name;a=a.parent}}function Va(a,b){for(var c=0,d=0;d<b.length;d++)c=(c<<5)-c+b.charCodeAt(d)|0;return(a+c>>>0)%J.X.length}function Wa(a){var b=Va(a.parent.id,a.name);a.fa=J.X[b];J.X[b]=a}
function U(a,b){return J.Da?0:b.includes("r")&&!(a.mode&292)||b.includes("w")&&!(a.mode&146)||b.includes("x")&&!(a.mode&73)?2:0}function Xa(a,b){if(!N(a.mode))return 54;try{return O(a,b),20}catch(c){}return U(a,"wx")}function Ya(a,b,c){try{var d=O(a,b)}catch(f){return f.N}if(a=U(a,"wx"))return a;if(c){if(!N(d.mode))return 54;if(J.sa(d)||T(d)===J.cwd())return 10}else if(N(d.mode))return 31;return 0}function Za(a,b){if(!a)throw new J.F(b);return a}
function W(a){a=J.Sa(a);if(!a)throw new J.F(8);return a}function $a(a,b=-1){a=Object.assign(new J.Ia,a);if(b==-1)a:{for(b=0;b<=J.Ja;b++)if(!J.streams[b])break a;throw new J.F(33);}a.fd=b;return J.streams[b]=a}function ab(a,b=-1){a=$a(a,b);a.I?.pb?.(a);return a}function X(a,b,c){var d=a?.I.V;a=d?a:b;d??=b.G.V;Za(d,63);try{d(a,c)}catch(f){if(f instanceof RangeError)throw new J.F(22);throw f;}}function bb(a){var b=[];for(a=[a];a.length;){var c=a.pop();b.push(c);a.push(...c.ha)}return b}
function cb(a){var b={fb:4096,sb:4096,blocks:1E6,eb:5E5,cb:5E5,files:J.ua,qb:J.ua-1,tb:42,flags:2,yb:255};a.G.Fa&&Object.assign(b,a.G.Fa(a.L.$a.root));return b}function db(a,b,c){typeof c=="undefined"&&(c=b,b=438);return J.W(a,b|8192,c)}function eb(a,b,c,d){X(a,b,{mode:c&4095|b.mode&-4096,ctime:Date.now(),oa:d})}function fb(a,b,c){if(N(b.mode))throw new J.F(31);if(!J.isFile(b.mode))throw new J.F(28);var d=U(b,"w");if(d)throw new J.F(d);X(a,b,{size:c,timestamp:Date.now()})}
function gb(a,b,c,d){a=typeof a=="string"?a:T(a);b=H(a+"/"+b);return J.create(b,Ma(c,d))}function hb(a){if(!(a.Wa||a.Xa||a.link||a.J))if(globalThis.XMLHttpRequest)D("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");else try{a.J=m(a.url)}catch(b){throw new J.F(29);}}
var J={root:null,ha:[],Ba:{},streams:[],ua:1,X:null,Aa:"/",qa:!1,Da:!0,Pa:null,ka:0,F:class{name="ErrnoError";constructor(a){this.N=a}},Ia:class{shared={};node=null;get object(){return this.node}set object(a){this.node=a}get flags(){return this.shared.flags}set flags(a){this.shared.flags=a}get position(){return this.shared.position}set position(a){this.shared.position=a}},Ha:class{G={};I={};T=null;listeners=null;Z=0;constructor(a,b,c,d){a||=this;this.parent=a;this.L=a.L;this.id=J.ua++;this.name=b;
this.mode=c;this.rdev=d;this.atime=this.mtime=this.ctime=Date.now()}get read(){return(this.mode&365)===365}set read(a){a?this.mode|=365:this.mode&=-366}get write(){return(this.mode&146)===146}set write(a){a?this.mode|=146:this.mode&=-147}get Xa(){return N(this.mode)}get Wa(){return(this.mode&61440)===8192}Za(){if(this.listeners){var a;for(b of this.listeners)b.exclusive?(a||=[]).push(b):b.La(32);if(a){var b=(this.Z||0)%a.length;this.Z=b+1;a[b].La(32)}}}},createNode(a,b,c,d){a=new J.Ha(a,b,c,d);Wa(a);
return a},sa(a){return a===a.parent},isFile(a){return(a&61440)===32768},isFIFO(a){return(a&61440)===4096},isSocket(a){return(a&49152)===49152},Ja:4096,Sa:a=>J.streams[a],Ma:{open(a){a.I=J.Ra(a.node.rdev).I;a.I.open?.(a)},P(){throw new J.F(70);}},ta:a=>a>>8,wb:a=>a&255,ea:(a,b)=>a<<8|b,Ra:a=>J.Ba[a],Ga(a,b){function c(l){J.ka--;return b(l)}function d(l){if(l){if(!d.Oa)return d.Oa=!0,c(l)}else++g>=f.length&&c(null)}typeof a=="function"&&(b=a,a=!1);J.ka++;J.ka>1&&r(`warning: ${J.ka} FS.syncfs operations in flight at once, probably just doing extra work`);
var f=bb(J.root.L),g=0,h;for(h of f)h.type.Ga?h.type.Ga(h,a,d):d(null)},L(a,b,c){var d=c==="/";if(d&&J.root)throw new J.F(10);if(!d&&c){var f=V(c,{ja:!1});c=f.path;f=f.node;if(f.T)throw new J.F(10);if(!N(f.mode))throw new J.F(54);}b={type:a,$a:b,Ea:c,ha:[]};a=a.L(b);a.L=b;b.root=a;d?J.root=a:f&&(f.T=b,f.L&&f.L.ha.push(b));return a},Gb(a){a=V(a,{ja:!1});if(!a.node.T)throw new J.F(28);a=a.node;var b=a.T,c=bb(b);for([,f]of Object.entries(J.X))for(;f;){var d=f.fa;c.includes(f.L)&&P(f);var f=d}a.T=null;
a.L.ha.splice(a.L.ha.indexOf(b),1)},lookup(a,b){return a.G.lookup(a,b)},W(a,b,c){var d=V(a,{parent:!0}).node;a=I(a);if(!a)throw new J.F(28);if(a==="."||a==="..")throw new J.F(20);var f=Xa(d,a);if(f)throw new J.F(f);if(!d.G.W)throw new J.F(63);return d.G.W(d,a,b,c)},Fa(a){return cb(V(a,{R:!0}).node)},Cb(a){return cb(a.node)},create(a,b=438){return J.W(a,b&4095|32768,0)},mkdir(a,b=511){return J.W(a,b&1023|16384,0)},xb(a,b){var c=a.split("/"),d="",f;for(f of c)if(f){if(d||a.charAt(0)==="/")d+="/";d+=
f;try{J.mkdir(d,b)}catch(g){if(g.N!=20)throw g;}}},symlink(a,b){if(!za(a))throw new J.F(44);var c=V(b,{parent:!0}).node;if(!c)throw new J.F(44);b=I(b);var d=Xa(c,b);if(d)throw new J.F(d);if(!c.G.symlink)throw new J.F(63);return c.G.symlink(c,b,a)},link(a,b,c){var d=V(b,{parent:!0}).node;if(!d)throw new J.F(44);b=I(b);var f=Xa(d,b);if(f)throw new J.F(f);if(!d.G.link)throw new J.F(34);return d.G.link(d,b,a,c)},rename(a,b){var c=va(a),d=va(b),f=I(a),g=I(b);var h=V(a,{parent:!0});var l=h.node;h=V(b,{parent:!0});
h=h.node;if(!l||!h)throw new J.F(44);if(l.L!==h.L)throw new J.F(75);var p=O(l,f);a=Aa(a,d);if(a.charAt(0)!==".")throw new J.F(28);a=Aa(b,c);if(a.charAt(0)!==".")throw new J.F(55);try{var k=O(h,g)}catch(q){}if(p!==k){b=N(p.mode);if(f=Ya(l,f,b))throw new J.F(f);if(f=k?Ya(h,g,b):Xa(h,g))throw new J.F(f);if(!l.G.rename)throw new J.F(63);if(p.T||k&&k.T)throw new J.F(10);if(h!==l&&(f=U(l,"w")))throw new J.F(f);P(p);try{l.G.rename(p,h,g),p.parent=h}catch(q){throw q;}finally{Wa(p)}}},rmdir(a){var b=V(a,{parent:!0}).node;
a=I(a);var c=O(b,a),d=Ya(b,a,!0);if(d)throw new J.F(d);if(!b.G.rmdir)throw new J.F(63);if(c.T)throw new J.F(10);b.G.rmdir(b,a);P(c)},readdir(a){a=V(a,{R:!0}).node;return Za(a.G.readdir,54)(a)},unlink(a){var b=V(a,{parent:!0}).node;if(!b)throw new J.F(44);a=I(a);var c=O(b,a),d=Ya(b,a,!1);if(d)throw new J.F(d);if(!b.G.unlink)throw new J.F(63);if(c.T)throw new J.F(10);b.G.unlink(b,a);P(c)},readlink(a){a=V(a).node;if(!a)throw new J.F(44);if(!a.G.readlink)throw new J.F(28);return a.G.readlink(a)},stat(a,
b){a=V(a,{R:!b}).node;return Za(a.G.S,63)(a)},fstat(a){var b=W(a);a=b.node;var c=b.I.S;b=c?b:a;c??=a.G.S;Za(c,63);return c(b)},lstat(a){return J.stat(a,!0)},chmod(a,b,c){a=typeof a=="string"?V(a,{R:!c}).node:a;eb(null,a,b,c)},lchmod(a,b){J.chmod(a,b,!0)},fchmod(a,b){a=W(a);eb(a,a.node,b,!1)},chown(a,b,c,d){a=typeof a=="string"?V(a,{R:!d}).node:a;X(null,a,{timestamp:Date.now(),oa:d})},lchown(a,b,c){J.chown(a,b,c,!0)},fchown(a){a=W(a);X(a,a.node,{timestamp:Date.now(),oa:!1})},truncate(a,b){if(b<0)throw new J.F(28);
a=typeof a=="string"?V(a,{R:!0}).node:a;fb(null,a,b)},ub(a,b){a=W(a);if(b<0||(a.flags&2097155)===0)throw new J.F(28);fb(a,a.node,b)},Hb(a,b,c,d){a=V(a,{R:!d});X(null,a.node,{atime:b,mtime:c,oa:d})},open(a,b,c=438){if(a==="")throw new J.F(44);if(typeof b=="string"){var d={r:0,"r+":2,w:577,"w+":578,a:1089,"a+":1090}[b];if(typeof d=="undefined")throw Error(`Unknown file open mode: ${b}`);b=d}c=b&64?c&4095|32768:0;if(typeof a=="object")d=a;else{var f=a.endsWith("/");var g=V(a,{R:!(b&131072),Ya:!0});d=
g.node;a=g.path}g=!1;if(b&64)if(d){if(b&128)throw new J.F(20);}else{if(f)throw new J.F(31);d=J.W(a,c|511,0);g=!0}if(!d)throw new J.F(44);(d.mode&61440)===8192&&(b&=-513);if(b&65536&&!N(d.mode))throw new J.F(54);if(!g&&(d?(d.mode&61440)===40960?f=32:(f=["r","w","rw"][b&3],b&512&&(f+="w"),f=N(d.mode)&&(f!=="r"||b&576)?31:U(d,f)):f=44,f))throw new J.F(f);b&512&&!g&&J.truncate(d,0);b&=-131713;b=$a({node:d,path:T(d),flags:b,seekable:!0,position:0,I:d.I,ab:[],error:!1});b.I.open&&b.I.open(b);g&&J.chmod(d,
c&511);return b},close(a){if(a.fd===null)throw new J.F(8);a.pa&&(a.pa=null);a.node?.Za();try{a.I.close&&a.I.close(a)}catch(b){throw b;}finally{J.streams[a.fd]=null}a.fd=null},P(a,b,c){if(a.fd===null)throw new J.F(8);if(!a.seekable||!a.I.P)throw new J.F(70);if(c!=0&&c!=1&&c!=2)throw new J.F(28);a.position=a.I.P(a,b,c);a.ab=[];return a.position},read(a,b,c,d,f){if(d<0||f<0)throw new J.F(28);if(a.fd===null)throw new J.F(8);if((a.flags&2097155)===1)throw new J.F(8);if(N(a.node.mode))throw new J.F(31);
if(!a.I.read)throw new J.F(28);var g=typeof f!="undefined";if(!g)f=a.position;else if(!a.seekable)throw new J.F(70);b=a.I.read(a,b,c,d,f);g||(a.position+=b);return b},write(a,b,c,d,f,g){if(d<0||f<0)throw new J.F(28);if(a.fd===null)throw new J.F(8);if((a.flags&2097155)===0)throw new J.F(8);if(N(a.node.mode))throw new J.F(31);if(!a.I.write)throw new J.F(28);a.seekable&&a.flags&1024&&J.P(a,0,2);var h=typeof f!="undefined";if(!h)f=a.position;else if(!a.seekable)throw new J.F(70);b=a.I.write(a,b,c,d,f,
g);h||(a.position+=b);return b},ga(a,b,c,d,f){if(d&2&&!(f&2)&&(a.flags&2097155)!==2)throw new J.F(2);if((a.flags&2097155)===1)throw new J.F(2);if(!a.I.ga)throw new J.F(43);if(!b)throw new J.F(28);return a.I.ga(a,b,c,d,f)},ia(a,b,c,d,f){return a.I.ia?a.I.ia(a,b,c,d,f):0},ra(a,b,c){if(!a.I.ra)throw new J.F(59);return a.I.ra(a,b,c)},readFile(a,b={}){b.flags=b.flags??0;b.encoding=b.encoding??"binary";b.encoding!=="utf8"&&b.encoding!=="binary"&&D(`Invalid encoding type "${b.encoding}"`);var c=J.open(a,
b.flags);a=J.stat(a).size;var d=new Uint8Array(a);J.read(c,d,0,a,0);b.encoding==="utf8"&&(d=K(d));J.close(c);return d},writeFile(a,b,c={}){c.flags=c.flags??577;a=J.open(a,c.flags,c.mode);b=La(b);J.write(a,b,0,b.byteLength,void 0,c.lb);J.close(a)},cwd:()=>J.Aa,chdir(a){a=V(a,{R:!0});if(a.node===null)throw new J.F(44);if(!N(a.node.mode))throw new J.F(54);var b=U(a.node,"x");if(b)throw new J.F(b);J.Aa=a.path},init(a,b,c){J.qa=!0;a?J.da("/dev","stdin",a):J.symlink("/dev/tty","/dev/stdin");b?J.da("/dev",
"stdout",null,b):J.symlink("/dev/tty","/dev/stdout");c?J.da("/dev","stderr",null,c):J.symlink("/dev/tty1","/dev/stderr");J.open("/dev/stdin",0);J.open("/dev/stdout",1);J.open("/dev/stderr",1)},Bb(){J.qa=!1;for(var a of J.streams)a&&J.close(a)},rb(a,b){try{var c=V(a,{R:!b});a=c.path}catch(g){}var d=!1,f=null;try{c=V(a,{parent:!0}),I(a),c=V(a,{R:!b}),d=!0,f=c.node}catch(g){}return d?f:null},nb(a,b){a=typeof a=="string"?a:T(a);for(b=b.split("/").reverse();b.length;){var c=b.pop();if(c){var d=H(a+"/"+
c);try{J.mkdir(d)}catch(f){if(f.N!=20)throw f;}a=d}}return d},da(a,b,c,d){a=wa(typeof a=="string"?a:T(a),b);b=Ma(!!c,!!d);var f;(f=J.da).ta??(f.ta=64);f=J.ea(J.da.ta++,0);Ha(f,{open(g){g.seekable=!1},close(){d?.buffer?.length&&d(10)},read(g,h,l,p){for(var k=0,q=0;q<p;q++){try{var n=c()}catch(u){throw new J.F(29);}if(n===void 0&&!k)throw new J.F(6);if(n===null||n===void 0)break;k++;h[l+q]=n}k&&(g.node.atime=Date.now());return k},write(g,h,l,p){for(var k=0;k<p;k++)try{d(h[l+k])}catch(q){throw new J.F(29);
}p&&(g.node.mtime=g.node.ctime=Date.now());return k}});return db(a,b,f)},mb(a,b,c,d,f){class g{ma=!1;Z=[];la=void 0;xa=0;wa=0;get(k){if(!(k>this.length-1||k<0)){var q=k%this.chunkSize;return this.la(k/this.chunkSize|0)[q]}}Ka(k){this.la=k}ya(){var k=new XMLHttpRequest;k.open("HEAD",c,!1);k.send(null);k.status>=200&&k.status<300||k.status===304||D(`Couldn't load ${c}. Status: ${k.status}`);var q=Number(k.getResponseHeader("Content-length")),n,u=(n=k.getResponseHeader("Accept-Ranges"))&&n==="bytes";
k=(n=k.getResponseHeader("Content-Encoding"))&&n==="gzip";var B=1048576;u||(B=q);var w=this;w.Ka(R=>{var aa=R*B,S=(R+1)*B-1;S=Math.min(S,q-1);if(typeof w.Z[R]=="undefined"){var Ib=w.Z;aa>S&&D(`invalid range (${aa}, ${S}) or no bytes requested!`);S>q-1&&D(`only ${q} bytes available! programmer error!`);var y=new XMLHttpRequest;y.open("GET",c,!1);q!==B&&y.setRequestHeader("Range",`bytes=${aa}-${S}`);y.responseType="arraybuffer";y.overrideMimeType&&y.overrideMimeType("text/plain; charset=x-user-defined");
y.send(null);y.status>=200&&y.status<300||y.status===304||D(`Couldn't load ${c}. Status: ${y.status}`);aa=y.response!==void 0?new Uint8Array(y.response||[]):Ea(y.responseText??"");Ib[R]=aa}typeof w.Z[R]=="undefined"&&D("doXHR failed!");return w.Z[R]});if(k||!q)B=q=1,B=q=this.la(0).length,ka("LazyFiles on gzip forces download of the whole file when length is accessed");this.xa=q;this.wa=B;this.ma=!0}get length(){this.ma||this.ya();return this.xa}get chunkSize(){this.ma||this.ya();return this.wa}}if(globalThis.XMLHttpRequest){ca||
D("Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc");var h=new g;var l=void 0}else l=c,h=void 0;var p=gb(a,b,d,f);h?p.J=h:l&&(p.J=null,p.url=l);Object.defineProperties(p,{M:{get:function(){return this.J.length}}});a={};for(let [k,q]of Object.entries(p.I))a[k]=(...n)=>{hb(p);return q(...n)};a.read=(k,q,n,u,B)=>{hb(p);k=k.node.J;if(B>=k.length)q=0;else{u=Math.min(k.length-B,u);if(k.slice)for(var w=0;w<u;w++)q[n+w]=k[B+w];else for(w=
0;w<u;w++)q[n+w]=k.get(B+w);q=u}return q};a.ga=()=>{hb(p);D();throw new J.F(48);};p.I=a;return p}},z,C,pa,F=void 0,na,ib={},jb=a=>{if(!v)try{return a()}catch(b){b instanceof E||b=="unwind"||e(1,b)}finally{}},kb=[],oa,lb={},nb=()=>{if(!mb){var a={USER:"web_user",LOGNAME:"web_user",PATH:"/",PWD:"/",HOME:"/home/web_user",LANG:(globalThis.navigator?.language??"C").replace("-","_")+".UTF-8",_:fa},b;for(b in lb)lb[b]===void 0?delete a[b]:a[b]=lb[b];var c=[];for(b in a)c.push(`${b}=${a[b]}`);mb=c}return mb},
mb,pb=a=>{var b=Da(a)+1,c=ob(b);L(a,z,c,b);return c},qb=a=>{try{a()}catch(b){D(b)}};function rb(a){var b=(...c)=>{sb.push(a);try{return a(...c)}finally{v||(sb.pop(),Y&&Z===1&&!sb.length&&(Z=0,qb(tb),typeof Fibers!="undefined"&&Fibers.Fb()))}};ub.set(a,b);return b}var Z=0,Y=null,vb=0,sb=[],wb=new Map,xb=new Map,ub=new Map,yb=0,zb=null,Ab=[];function Bb(){return new Promise((a,b)=>{zb={resolve:a,reject:b}})}
function Cb(){var a=Db(10485772),b=a+12;C[a>>2]=b;C[a+4>>2]=b+10485760;b=sb[0];if(!wb.has(b)){var c=yb++;wb.set(b,c);xb.set(c,b)}b=wb.get(b);A[a+8>>2]=b;return a}function Eb(){var a=xb.get(A[Y+8>>2]);a=ub.get(a);return jb(a)}
function Fb(a){if(!v){if(Z===0){var b=!1,c=!1;a((d=0)=>{if(!v&&(vb=d,b=!0,c)){Z=2;qb(()=>Gb(Y));typeof MainLoop!="undefined"&&MainLoop.Qa&&MainLoop.resume();d=!1;try{var f=Eb()}catch(l){f=l,d=!0}var g=!1;if(!Y){var h=zb;h&&(zb=null,(d?h.reject:h.resolve)(f),g=!0)}if(d&&!g)throw f;}});c=!0;b||(Z=1,Y=Cb(),typeof MainLoop!="undefined"&&MainLoop.Qa&&MainLoop.pause(),qb(()=>Hb(Y)))}else Z===2?(Z=0,qb(Jb),Kb(Y),Y=null,Ab.forEach(jb)):D(`invalid state: ${Z}`);return vb}}var Lb=a=>Fb(async b=>{b(await a())});
J.ob=(a,b,c,d,f,g,h,l,p,k)=>{Ua(a,b,c,d,f,l,p,k).then(g).catch(h)};J.zb=Ua;J.X=Array(4096);J.L(M,{},"/");J.mkdir("/tmp");J.mkdir("/home");J.mkdir("/home/web_user");
(function(){J.mkdir("/dev");Ha(J.ea(1,3),{read:()=>0,write:(d,f,g,h)=>h,P:()=>0});db("/dev/null",J.ea(1,3));Ga(J.ea(5,0),Ja);Ga(J.ea(6,0),Ka);db("/dev/tty",J.ea(5,0));db("/dev/tty1",J.ea(6,0));var a=new Uint8Array(1024),b=0,c=()=>{b||(ya(a),b=a.byteLength);return a[--b]};J.da("/dev","random",c);J.da("/dev","urandom",c);J.mkdir("/dev/shm");J.mkdir("/dev/shm/tmp")})();
(function(){J.mkdir("/proc");var a=J.mkdir("/proc/self");J.mkdir("/proc/self/fd");J.L({L(){var b=J.createNode(a,"fd",16895,73);b.I={P:M.I.P};b.G={lookup(c,d){c=+d;var f=W(c);c={parent:null,L:{Ea:"fake"},G:{readlink:()=>f.path},id:c+1};return c.parent=c},readdir(){return Array.from(J.streams.entries()).filter(([,c])=>c).map(([c])=>c.toString())}};return b}},{},"/proc/self/fd")})();J.Pa={MEMFS:M};Module.print&&(ka=Module.print);Module.printErr&&(r=Module.printErr);Module.wasmBinary&&(t=Module.wasmBinary);
Module.ccall=(a,b,c,d,f)=>{function g(n){p&&Mb(p);return b==="string"?n?K(z,n):"":b==="boolean"?!!n:n}var h={string:n=>{var u=0;n!==null&&n!==void 0&&n!==0&&(u=pb(n));return u},array:n=>{var u=ob(n.length);x.set(n,u);return u}};a=Module["_"+a];var l=[],p=0;if(d)for(var k=0;k<d.length;k++){var q=h[c[k]];q?(p||=Nb(),l[k]=q(d[k])):l[k]=d[k]}c=Y;d=a(...l);f=f?.async;if(Y!=c)return Bb().then(g);d=g(d);return f?Promise.resolve(d):d};Module.FS=J;
var Ob={1222952:()=>{try{Module.onDoneSearching()}catch(a){}}},Pb,Kb,Qb,Db,Mb,ob,Nb,dynCall_vi,dynCall_vii,dynCall_iii,dynCall_v,Hb,tb,Gb,Jb,ma,Rb={b:function(a,b,c){F=c;try{var d=W(a);switch(b){case 0:var f=G();if(f<0)break;for(;J.streams[f];)f++;return ab(d,f).fd;case 1:case 2:return 0;case 3:return d.flags;case 4:return f=G(),d.flags=d.flags&-289793|f&289792,0;case 12:return f=G(),na[f+0>>1]=2,0;case 13:case 14:return 0}return-28}catch(g){if(typeof J=="undefined"||g.name!=="ErrnoError")throw g;
return-g.N}},r:function(a,b,c){F=c;try{var d=W(a);switch(b){case 21509:return d.tty?0:-59;case 21505:if(!d.tty)return-59;if(d.tty.Y.Ta){a=[3,28,127,21,4,0,1,0,17,19,26,0,18,15,23,22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];var f=G();A[f>>2]=25856;A[f+4>>2]=5;A[f+8>>2]=191;A[f+12>>2]=35387;for(var g=0;g<32;g++)x[f+g+17]=a[g]||0}return 0;case 21510:case 21511:case 21512:return d.tty?0:-59;case 21506:case 21507:case 21508:if(!d.tty)return-59;if(d.tty.Y.Ua)for(f=G(),a=[],g=0;g<32;g++)a.push(x[f+g+17]);return 0;
case 21519:if(!d.tty)return-59;f=G();return A[f>>2]=0;case 21520:return d.tty?-28:-59;case 21537:case 21531:return f=G(),J.ra(d,b,f);case 21523:if(!d.tty)return-59;d.tty.Y.Va&&(g=[24,80],f=G(),na[f>>1]=g[0],na[f+2>>1]=g[1]);return 0;case 21524:return d.tty?0:-59;case 21515:return d.tty?0:-59;default:return-28}}catch(h){if(typeof J=="undefined"||h.name!=="ErrnoError")throw h;return-h.N}},d:function(a,b,c,d){F=d;try{b=b?K(z,b):"";var f=b;if(f.charAt(0)==="/")b=f;else{var g=a===-100?J.cwd():W(a).path;
if(f.length==0)throw new J.F(44);b=g+"/"+f}var h=d?G():0;c&64&&(h&=-19);return J.open(b,c,h).fd}catch(l){if(typeof J=="undefined"||l.name!=="ErrnoError")throw l;return-l.N}},i:()=>D(""),h:()=>{},k:(a,b)=>{ib[a]&&(clearTimeout(ib[a].id),delete ib[a]);if(!b)return 0;var c=setTimeout(()=>{delete ib[a];jb(()=>Qb(a,performance.now()))},b);ib[a]={id:c,Eb:b};return 0},l:(a,b,c,d)=>{var f=(new Date).getFullYear(),g=(new Date(f,0,1)).getTimezoneOffset();f=(new Date(f,6,1)).getTimezoneOffset();C[a>>2]=Math.max(g,
f)*60;A[b>>2]=Number(g!=f);b=h=>{var l=Math.abs(h);return`UTC${h>=0?"-":"+"}${String(Math.floor(l/60)).padStart(2,"0")}${String(l%60).padStart(2,"0")}`};a=b(g);b=b(f);f<g?(L(a,z,c,17),L(b,z,d,17)):(L(a,z,d,17),L(b,z,c,17))},e:function(a,b,c){if(!(a>=0&&a<=3))return 28;pa[c>>3]=BigInt(Math.round((a===0?Date.now():performance.now())*1E3*1E3));return 0},j:(a,b,c)=>{kb.length=0;for(var d;d=z[b++];){var f=d!=105;f&=d!=112;c+=f&&c%8?4:0;kb.push(d==112?C[c>>2]:d==106?pa[c>>3]:d==105?A[c>>2]:oa[c>>3]);c+=
f?8:4}return Ob[a](...kb)},f:a=>{var b=z.length;a>>>=0;if(a>2147483648)return!1;for(var c=1;c<=4;c*=2){var d=b*(1+.2/c);d=Math.min(d,a+100663296);a:{d=(Math.min(2147483648,Math.ceil(Math.max(a,d)/65536)*65536)-ma.buffer.byteLength+65535)/65536|0;try{ma.grow(d);la();var f=1;break a}catch(g){}f=void 0}if(f)return!0}return!1},s:function(a){return Lb(()=>new Promise(b=>setTimeout(b,a)))},m:(a,b)=>{var c=0,d=0,f;for(f of nb()){var g=b+c;C[a+d>>2]=g;c+=L(f,z,g,Infinity)+1;d+=4}return 0},n:(a,b)=>{var c=
nb();C[a>>2]=c.length;a=0;for(var d of c)a+=Da(d)+1;C[b>>2]=a;return 0},a:a=>{e(a,new E(a))},c:function(a){try{var b=W(a);J.close(b);return 0}catch(c){if(typeof J=="undefined"||c.name!=="ErrnoError")throw c;return c.N}},q:function(a,b,c,d){try{a:{var f=W(a);a=b;for(var g,h=b=0;h<c;h++){var l=C[a>>2],p=C[a+4>>2];a+=8;try{var k=J.read(f,x,l,p,g)}catch(n){if(b>0&&n instanceof J.F&&(n.N==6||n.N==6))break;throw n;}if(k<0){var q=-1;break a}b+=k;if(k<p)break;typeof g!="undefined"&&(g+=k)}q=b}C[d>>2]=q;return 0}catch(n){if(typeof J==
"undefined"||n.name!=="ErrnoError")throw n;return n.N}},o:function(a,b,c,d){b=b<-9007199254740992||b>9007199254740992?NaN:Number(b);try{if(isNaN(b))return 22;var f=W(a);J.P(f,b,c);pa[d>>3]=BigInt(f.position);f.pa&&!b&&c===0&&(f.pa=null);return 0}catch(g){if(typeof J=="undefined"||g.name!=="ErrnoError")throw g;return g.N}},p:function(a,b,c,d){try{var f=W(a);a=b;if(c==1)var g=J.write(f,x,C[a>>2],C[a+4>>2],void 0);else{for(var h=b=0,l=a;h<c;h++,l+=8)b+=C[l+4>>2];var p=new Uint8Array(b);for(h=l=0;h<c;h++,
a+=8){var k=C[a>>2],q=C[a+4>>2];p.set(z.subarray(k,k+q),l);l+=q}g=J.write(f,p,0,b,void 0)}C[d>>2]=g;return 0}catch(n){if(typeof J=="undefined"||n.name!=="ErrnoError")throw n;return n.N}},g:a=>{e(a,new E(a))}};function Sb(a=[]){var b=Pb;a.unshift(fa);var c=a.length,d=ob((c+1)*4),f=d,g;for(g of a)C[f>>2]=pb(g),f+=4;C[f>>2]=0;try{var h=b(c,d);e(h,new E(h))}catch(l){l instanceof E||l=="unwind"||e(1,l)}}var Tb;
Tb=await (async function(){function a(d){var f=Tb=d.exports;d={};for(let [g,h]of Object.entries(f))typeof h=="function"?(f=rb(h),d[g]=f):d[g]=h;d=Tb=d;Pb=Module._main=d.v;Module._command=d.w;Module._isSearching=d.x;Kb=d.y;Qb=d.z;Db=d.A;Mb=d.B;ob=d.C;Nb=d.D;dynCall_vi=d.E;dynCall_vii=d.H;dynCall_iii=d.K;dynCall_v=d.O;Hb=d._;tb=d.$;Gb=d.aa;Jb=d.ba;ma=d.t;la();return Tb}var b={a:Rb},c=Module.instantiateWasm;if(c)return new Promise(d=>{c(b,f=>d(a(f)))});qa??=Module.locateFile?Module.locateFile("stockfish.wasm",
ha):ha+"stockfish.wasm";return function(d){return a(d.instance)}(await ta(b))}());await (async function(a=ea){Q&&await Pa();v||(Module.noFSInit||J.qa||J.init(),Tb.u(),J.Da=!1,Sb(a))}());
;return Module}})();if(typeof exports==="object"&&typeof module==="object"){module.exports=Stockfish;module.exports.default=Stockfish}else if(typeof define==="function"&&define["amd"])define([],()=>Stockfish);
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
