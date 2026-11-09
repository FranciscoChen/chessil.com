/* Small, lazy shards from the project's Leela book. Exact FEN positions,
 * legal moves and normalized book weights; never presented as win chances. */
window.ChessilOpeningBook=class {
 constructor(){this.shards=new Map();}
 async lookup(fen){
  const key=fen.split(' ').slice(0,4).join(' ');
  if(!this.manifest)this.manifest=fetch('/engine/book/manifest.json').then(r=>{if(!r.ok)throw Error('Opening book unavailable');return r.json();}).catch(error=>{this.manifest=null;throw error;});
  const manifest=await this.manifest;let hash=2166136261;for(const c of key)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;const id=(hash&255).toString(16).padStart(2,'0');
  if(!this.shards.has(id)){if(this.shards.size>=24)this.shards.delete(this.shards.keys().next().value);this.shards.set(id,fetch(manifest.base+id+'.json').then(r=>{if(!r.ok)throw Error('Opening book unavailable');return r.json();}).catch(error=>{this.shards.delete(id);throw error;}));}
  return {name:manifest.name,moves:(await this.shards.get(id))[key]||[]};
 }
};
