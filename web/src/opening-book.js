/* One cached Polyglot buffer; shared legal-move/SAN rules. Legacy shard
 * manifests remain readable while cached clients/assets finish deployment. */
window.ChessilOpeningBook=class {
 constructor(){this.shards=new Map();this.positions=new Map();}
 async lookup(fen,ply=0){
  const fields=fen.split(' ').slice(0,4);if(fields[3]!=='-'&&!mg(fen).some(move=>move.slice(2,4)===fields[3]&&boardgen(fen)[move.slice(0,2)].p==='p'&&move[0]!==move[2]))fields[3]='-';const key=fields.join(' ');
  if(!this.manifest)this.manifest=fetch('/engine/book/polyglot-manifest.json').then(r=>{if(!r.ok)throw Error('Opening book unavailable');return r.json();}).catch(error=>{this.manifest=null;throw error;});
  const manifest=await this.manifest;
  if(ply>=17)return {name:manifest.name,moves:[]};
  if(manifest.format==='polyglot'){
   const cacheKey=fen+'@'+ply;if(this.positions.has(cacheKey))return this.positions.get(cacheKey);
   const compressed=manifest.gzip_url&&typeof DecompressionStream==='function';
   if(!this.binary)this.binary=fetch(compressed?manifest.gzip_url:manifest.url).then(r=>{if(!r.ok)throw Error('Opening book unavailable');return compressed?new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():r.arrayBuffer();}).then(buffer=>new ChessilPolyglotBook(buffer)).catch(error=>{this.binary=null;throw error;});
   const entries=(await this.binary).lookup(fen,ply),legal=mg(fen),pieces=boardgen(fen);
   const result={name:manifest.name,moves:entries.filter(e=>legal.includes(e.uci)).map(e=>{const label=gensanbase(e.uci,pieces,fen,legal),next=ucifen(e.uci,fen,boardgen(fen),{}).f;return [e.uci,label+(incheck(next)?gensancheck(mg(next),next):''),e.weight,65535];})};
   if(this.positions.size>=128)this.positions.delete(this.positions.keys().next().value);this.positions.set(cacheKey,result);return result;
  }
  let hash=2166136261;for(const c of key)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;const id=(hash&255).toString(16).padStart(2,'0');
  if(!this.shards.has(id)){if(this.shards.size>=24)this.shards.delete(this.shards.keys().next().value);this.shards.set(id,fetch(manifest.base+id+'.json').then(r=>{if(!r.ok)throw Error('Opening book unavailable');return r.json();}).catch(error=>{this.shards.delete(id);throw error;}));}
  return {name:manifest.name,moves:(await this.shards.get(id))[key]||[]};
 }
};
