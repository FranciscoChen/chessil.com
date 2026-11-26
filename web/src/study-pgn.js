/* PGN file adapter for the local study tree. No network or DOM access. */
window.ChessilStudyPgn = (() => {
 const initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
 const maxBytes = 512*1024;
 const results = new Set(['1-0','0-1','1/2-1/2','*']);
 const glyphs = {'!':1,'?':2,'!!':3,'??':4,'!?':5,'?!':6};
 const tokenize = /\s+|^%[^\r\n]*|;[^\r\n]*|\{[^}]*\}|\(|\)|\d+\.{1,3}|\.{3}|\$\d+|[^\s{}();[\]$]+/gmy;

 function startingPosition(tags) {
  if (!tags.has('FEN')) {
   if (tags.get('SetUp') === '1') throw Error('Expected a starting FEN.');
   return initial;
  }
  const fen = tags.get('FEN').trim().replace(/\s+/g,' ');
  if (!/^[prnbqkPRNBQK1-8/]+ [wb] (?:-|(?=[KQkq])K?Q?k?q?) (?:-|[a-h][36]) \d{1,6} [1-9]\d{0,5}$/.test(fen)) throw Error('Invalid starting FEN.');
  const [placement,turn,castling,ep] = fen.split(' ');
  const ranks = placement.split('/');
  if (ranks.length !== 8 || ranks.some(rank=>rank.replace(/\d/g,n=>' '.repeat(Number(n))).length!==8) ||
      (placement.match(/K/g)||[]).length!==1 || (placement.match(/k/g)||[]).length!==1 ||
      /[pP]/.test(ranks[0]+ranks[7])) throw Error('Invalid starting FEN.');
  const pieces=boardgen(fen);
  const rights={K:['e1','h1','w'],Q:['e1','a1','w'],k:['e8','h8','b'],q:['e8','a8','b']};
  for (const [king,rook,side] of [...castling].map(right=>rights[right]).filter(Boolean)) {
   if (pieces[king].p!=='k'||pieces[king].c!==side||pieces[rook].p!=='r'||pieces[rook].c!==side) throw Error('Invalid castling rights in FEN.');
  }
  if (ep!=='-') {
   const pawn=pieces[ep[0]+(turn==='w'?'5':'4')];
   if(ep[1]!== (turn==='w'?'6':'3')||pieces[ep].p!==' '||pawn.p!=='p'||pawn.c===turn) throw Error('Invalid en passant square in FEN.');
  }
  return fen;
 }

 function parse(input) {
  if (typeof input!=='string' || new TextEncoder().encode(input).length>maxBytes) throw Error('PGN is larger than 512 KB.');
  let text=input.replace(/^\uFEFF/,'').trim();
  if (!text) throw Error('Empty PGN.');
  const tags=new Map();
  const tag=/^\[([A-Za-z][A-Za-z0-9_]*)\s+"((?:[^"\\\r\n]|\\["\\])*)"\s*\]\s*/;
  while (text.startsWith('[')) {
   const match=tag.exec(text);
   if(!match || tags.size>=128 || tags.has(match[1])) throw Error('Invalid PGN header.');
   tags.set(match[1],match[2].replace(/\\(["\\])/g,'$1'));
   text=text.slice(match[0].length);
  }
  const tree=new ChessilVariationTree(startingPosition(tags));
  tree.pgnTags=tags;
  const stack=[];
  let node=tree.root,finished=false;
  const lexer=new RegExp(tokenize);
  function append(key,value){(node[key]??=[]).push(value);}
  while(lexer.lastIndex<text.length) {
   const match=lexer.exec(text);
   if(!match)throw Error('Invalid PGN syntax or multiple games.');
   const token=match[0],first=token[0];
   if(/^\s|^%|^\d+\.|^\.{3}$/.test(token))continue;
   if(first==='{'||first===';'){append('pgnComments',first==='{'?token.slice(1,-1):token.slice(1));continue;}
   if(finished)throw Error('Import one game at a time.');
   if(results.has(token)){
    if(stack.length)throw Error('Unexpected result inside a variation.');
    if(tags.has('Result')&&tags.get('Result')!==token)throw Error('PGN results do not match.');
    tags.set('Result',token);finished=true;continue;
   }
   if(first==='('){
    if(!node.parent||stack.length>=tree.limits.nesting)throw Error('Invalid or too deeply nested variation.');
    stack.push(node);node=node.parent;continue;
   }
   if(first===')'){
    if(!stack.length || node===stack.at(-1).parent)throw Error('Invalid PGN variation.');
    node=stack.pop();continue;
   }
   if(first==='$'){if(!node.parent)throw Error('Annotation requires a move.');append('pgnNags',token.slice(1));continue;}
   if (/^e\.?p\.?$/i.test(token)) continue;
   const annotation=/[!?]{1,2}$/.exec(token)?.[0];
   const san=token.replace(/[!?]+$/,'').replace(/[+#]+$/,'').replace(/0/g,'O');
   const fen=node.fen,pieces=boardgen(fen),legal=mg(fen);
   const candidates=legal.filter(move=>gensanbase(move,pieces,fen,legal)===san || move===san);
   if(candidates.length!==1)throw Error('Illegal or ambiguous PGN move: '+token.slice(0,40));
   node=tree.add(node,candidates[0]);
   if(glyphs[annotation])append('pgnNags',String(glyphs[annotation]));
  }
  if(stack.length)throw Error('Unclosed PGN variation.');
  if(!tree.root.children.length&&!tags.has('FEN')&&!finished)throw Error('PGN has no moves.');
  if(tags.has('Result')&&!results.has(tags.get('Result')))throw Error('Invalid PGN result.');
  return tree;
 }

 function serialize(tree) {
  const tags=new Map(tree.pgnTags);
  if(tree.root.fen!==initial){tags.set('SetUp','1');tags.set('FEN',tree.root.fen);}
  const roster={Event:'ChessiL Analysis',Site:'?',Date:'????.??.??',Round:'?',White:'?',Black:'?',Result:'*'};
  const ordered=new Map(Object.entries(roster).map(([key,value])=>[key,tags.get(key) ?? value]));
  for (const [key,value] of tags) if(!ordered.has(key))ordered.set(key,value);
  const escape=value=>value.replace(/["\\]/g,'\\$&');
  const headers=[...ordered].map(([key,value])=>'['+key+' "'+escape(value)+'"]').join('\n');
  const tokens=[];
  function comments(node){for(const comment of node.pgnComments||[])tokens.push('{'+comment.replaceAll('}','')+'}');}
  function line(node,alternative=false) {
   let first=true;
   while(node) {
    const fen=node.parent.fen.split(' ');
    if(fen[1]==='w'||first)tokens.push(fen[5]+(fen[1]==='w'?'.':'...'));
    tokens.push(node.san);
    for(const nag of node.pgnNags||[])tokens.push('$'+nag);
    comments(node);
    if(!alternative||!first)for(const branch of node.parent.children.slice(1)){
     tokens.push('(');line(branch,true);tokens.push(')');
    }
    first=false;
    node=node.children[0];
   }
  }
  comments(tree.root);line(tree.root.children[0]);tokens.push(ordered.get('Result'));
  const rows=[];
  let row='';
  for(const token of tokens){
   if(row && (row.length+token.length)>79){rows.push(row);row='';}
   row+=(row?' ':'')+token;
  }
  rows.push(row);
  return headers+'\n\n'+rows.join('\n')+'\n';
 }
 return {parse,serialize,maxBytes};
})();
