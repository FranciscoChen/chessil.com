/* Bounded variation model. Ordering owns the main line; selection never changes it. */
window.ChessilVariationTree=class {
 constructor(fen,{nodes=2048,siblings=12,nesting=8,plies=1024}={}){this.limits={nodes,siblings,nesting,plies};this.nodes=new Map();this.serial=0;this.revision=0;this.root=this.node({fen,ply:0,children:[]});}
 node(data){const node={id:this.serial++,...data};this.nodes.set(node.id,node);this.revision++;return node;}
 branchDepth(node){let depth=0;for(;node.parent;node=node.parent)if(node.parent.children[0]!==node)depth++;return depth;}
 add(parent,move){const existing=parent.children.find(child=>child.move===move);if(existing)return existing;
  if(this.nodes.size>=this.limits.nodes)throw Error('Variation limit reached. Delete a branch to add another.');
  if(parent.children.length>=this.limits.siblings)throw Error('Too many alternatives at this position.');
  if(parent.ply>=this.limits.plies)throw Error('Move limit reached.');
  if(this.branchDepth(parent)+(parent.children.length?1:0)>this.limits.nesting)throw Error('Variation nesting limit reached.');
  const pieces=boardgen(parent.fen),legal=mg(parent.fen);if(!legal.includes(move))throw Error('Invalid move');
  const base=gensanbase(move,pieces,parent.fen,legal),fen=ucifen(move,parent.fen,pieces,{}).f,san=base+gensancheck(mg(fen),fen);
  const child=this.node({fen,move,san,ply:parent.ply+1,parent,children:[]});parent.children.push(child);return child;
 }
 path(node){const path=[];for(;node;node=node.parent)path.unshift(node);return path;}
 continuation(node){const line=this.path(node);while(node.children[0]){node=node.children[0];line.push(node);}return line;}
 reorder(node,index){const siblings=node.parent?.children;if(!siblings)return;const old=siblings.indexOf(node),target=Math.max(0,Math.min(index,siblings.length-1));if(old===target)return;
  siblings.splice(old,1);siblings.splice(target,0,node);
  if([...this.nodes.values()].some(item=>this.branchDepth(item)>this.limits.nesting)){siblings.splice(target,1);siblings.splice(old,0,node);throw Error('Reordering would exceed the nesting limit.');}this.revision++;
 }
 remove(node){if(!node.parent)return;const list=node.parent.children,index=list.indexOf(node);if(index<0)return;const drop=child=>{child.children.forEach(drop);this.nodes.delete(child.id);};list.splice(index,1);drop(node);this.revision++;}
};
