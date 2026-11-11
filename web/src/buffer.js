/* Persistent, bounded batch queue. Consumers own item validation and rendering. */
(function(global){
'use strict';
class ChessilBuffer {
 constructor({key,fetchBatch,validate=()=>true,onChange=()=>{},batchSize=16,refillBelow=12}) {
  Object.assign(this,{key,fetchBatch,validate,onChange,batchSize,refillBelow});
  this.items=[];this.recent=[];this.loading=false;this.error=false;this.closed=false;
  try { const saved=JSON.parse(localStorage.getItem(key));
   if(Array.isArray(saved?.items))this.items=saved.items.filter(validate).slice(0,batchSize*2);
   if(Array.isArray(saved?.recent))this.recent=saved.recent.filter(id=>typeof id==='string').slice(-96);
  } catch(_) {}
  this.online=()=>this.fill();global.addEventListener('online',this.online);
 }
 save(){try{localStorage.setItem(this.key,JSON.stringify({items:this.items,recent:this.recent}));}catch(_) {}}
 peek(){return this.items[0];}
 advance(){const item=this.items.shift();if(item)this.recent=[...this.recent,item.id].slice(-96);this.save();this.onChange();this.fill();}
 async fill(){
  if(this.closed||this.loading||this.items.length-1>=this.refillBelow)return;
  clearTimeout(this.retry);this.loading=true;this.error=false;this.onChange();
  this.controller=new AbortController();const timeout=setTimeout(()=>this.controller.abort(),10000);
  try {
   const exclude=[...new Set([...this.recent,...this.items.map(item=>item.id)])].slice(-128);
   const items=await this.fetchBatch(exclude,this.controller.signal);
   if(this.closed)return;
   if(!Array.isArray(items)||items.length>this.batchSize||!items.every(this.validate))throw Error('Invalid batch');
   const seen=new Set(exclude);
   for(const item of items)if(!seen.has(item.id)){this.items.push(item);seen.add(item.id);}
   this.save();
  } catch(_) {if(!this.closed){this.error=true;this.retry=setTimeout(()=>this.fill(),30000);}}
  finally {clearTimeout(timeout);this.loading=false;if(!this.closed)this.onChange();}
 }
 destroy(){this.closed=true;this.controller?.abort();clearTimeout(this.retry);global.removeEventListener('online',this.online);}
}
global.ChessilBuffer=ChessilBuffer;
})(window);
