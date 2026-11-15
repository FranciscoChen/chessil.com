/* Terminal rules shared by local training and puzzles. Server games remain authoritative. */
window.ChessilPosition=(()=>{
 function key(fen){const f=fen.split(' ').slice(0,4);if(f[3]!=='-'&&!mg(fen).some(m=>m.slice(2,4)===f[3]&&boardgen(fen)[m.slice(0,2)].p==='p'&&m[0]!==m[2]))f[3]='-';return f.join(' ');}
 function insufficient(fen){const pieces=Object.entries(boardgen(fen)).filter(([,p])=>p.p!==' '&&p.p!=='k');if(pieces.some(([,p])=>'pqr'.includes(p.p)))return false;if(pieces.length<=1)return true;return pieces.every(([,p])=>p.p==='b')&&new Set(pieces.map(([s])=>(s.charCodeAt(0)+Number(s[1]))%2)).size===1;}
 function outcome(fen,repetitions=0){const moves=mg(fen);if(!moves.length)return incheck(fen)?{winner:fen.split(' ')[1]==='w'?'b':'w',reason:'Checkmate'}:{winner:null,reason:'Stalemate'};if(insufficient(fen))return{winner:null,reason:'Insufficient material'};if(Number(fen.split(' ')[4])>=100)return{winner:null,reason:'50-move rule'};if(repetitions>=3)return{winner:null,reason:'Threefold repetition'};return null;}
 return {key,insufficient,outcome};
})();
