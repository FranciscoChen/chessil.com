/* Reproducible production assets. Sources remain readable under web/src/.
 * No source maps or compiler dependency are required on deployed servers. */
const fs=require('fs'),path=require('path'),{minify}=require('terser');
const root=path.resolve(__dirname,'..');
async function build(){
 for(const [output,inputs] of Object.entries({
  'game.min.js':['chess-rules.js','board.js','game.js'],
  'preferences.min.js':['sounds.js','preferences.js']
 })) {
  const files=Object.fromEntries(inputs.map(file=>[file,fs.readFileSync(path.join(root,'src',file),'utf8')]));
  if(output==='preferences.min.js')files['schema.js']='const normalizeBoardPreferences=(()=>{const module={exports:{}};'+fs.readFileSync(path.join(root,'../shared/ui-preferences.js'),'utf8')+';return module.exports.normalize;})();';
  const ordered=output==='preferences.min.js'?{'schema.js':files['schema.js'],...files}:files;
  const result=await minify(ordered,{compress:true,mangle:{toplevel:false},format:{comments:false},ecma:2020});
  fs.writeFileSync(path.join(root,'web/js',output),result.code+'\n');
 }
 // Safe CSS stripping: declarations and data URLs are retained byte-for-byte.
 const css=['board.css','classic-pieces.css','sculpted-pieces.css'].map(file=>fs.readFileSync(path.join(root,'src',file),'utf8')).join('\n');
 const preferences=fs.readFileSync(path.join(root,'src/preferences.css'),'utf8');
 fs.writeFileSync(path.join(root,'web/css/preferences.min.css'),preferences.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\n\s*/g,'').trim()+'\n');
 fs.writeFileSync(path.join(root,'web/css/board.min.css'),css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\n\s*/g,'').trim()+'\n');
}
build().catch(error=>{console.error(error);process.exitCode=1;});
