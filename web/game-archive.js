const {boardgen, mg, ucifen, gensanbase, gensancheck} = require('./src/chess-rules');
const initial = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
function result(row) {
  if (Number(row.state) === 9) return '*';
  return row.result === null ? '1/2-1/2' : row.result ? '1-0' : '0-1';
}
function notation(history) {
  let fen = initial, legal = mg(fen);
  const tokens = [];
  for (const [index, move] of history.entries()) {
    if (!legal.includes(move)) throw Error('Illegal archived move at ply '+(index+1));
    if (index % 2 === 0) tokens.push((index/2+1)+'.');
    const board = boardgen(fen);
    const san = gensanbase(move,board,fen,legal);
    fen = ucifen(move,fen,board,{}).f;
    legal = mg(fen);
    tokens.push(san+gensancheck(legal,fen));
  }
  return tokens.join(' ');
}
function pgn(row) {
  const match = row.development;
  const tags = {Event:'ChessiL development match', Site:'https://chessil.com/game/'+row.gameid,
    Date:new Date(row.created).toISOString().slice(0,10).replaceAll('-','.'), Round:match.pair+'.'+match.leg,
    White:row.white, Black:row.black, Result:result(row), TimeControl:match.seconds+'+'+match.increment,
    GameId:row.gameid, HybridColor:match.hybrid, OpeningUCI:match.opening, PolicySHA256:match.policy,
    EngineBuilds:(match.builds || []).join(' '), Termination:({6:'time forfeit',9:'abandoned'})[row.state] || 'normal'};
  const headers = Object.entries(tags).map(([k,v])=>'['+k+' "'+String(v).replace(/["\\]/g,'\\$&')+'"]').join('\n');
  return headers+'\n\n'+notation((row.moves || '').split(' ').filter(Boolean))+' '+tags.Result+'\n';
}
const from = ` FROM games g JOIN users w ON w.id=g.userid1 JOIN users b ON b.id=g.userid2
  WHERE g.development IS NOT NULL AND g.finished IS NOT NULL AND g.state<>9`;
async function serve(db,req,res,headers) {
  const url = new URL(req.url,'http://local');
  const download = /^\/api\/archive\/([A-Za-z0-9]{9})\.pgn$/.exec(url.pathname);
  try {
    if (download) {
      const {rows:[row]} = await db.query('SELECT g.*, w.username AS white,b.username AS black'+from+' AND g.gameid=$1',[download[1]]);
      if (!row) {res.writeHead(404,headers);return res.end();}
      const body = pgn(row);
      res.writeHead(200,{...headers,'Content-Type':'application/x-chess-pgn','Content-Disposition':'attachment; filename="'+row.gameid+'.pgn"'});
      return res.end(body);
    }
    if (url.pathname !== '/api/archive') {res.writeHead(404,headers);return res.end();}
    const cursor = url.searchParams.get('before') || null;
    if (cursor && !/^\d{1,18}$/.test(cursor)) {res.writeHead(400,headers);return res.end();}
    const q = (url.searchParams.get('q') || '').slice(0,64).trim();
    const {rows} = await db.query(`SELECT g.id,g.gameid,g.created,g.result,g.state,w.username AS white,b.username AS black,
      g.development->>'opening' AS opening`+from+` AND ($1::bigint IS NULL OR g.id<$1)
      AND ($2='' OR g.gameid=$2 OR w.username ILIKE '%'||$2||'%' OR b.username ILIKE '%'||$2||'%')
      ORDER BY g.id DESC LIMIT 21`,[cursor,q]);
    const games = rows.slice(0,20).map(r=>({id:r.gameid,white:r.white,black:r.black,date:r.created,
      opening:notation(r.opening.split(' ')),result:result(r)}));
    res.writeHead(200,{...headers,'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({games,next:rows.length>20?rows[19].id:null}));
  } catch(error) {
    console.error('Development archive:',error.message);
    res.writeHead(503,{...headers,'Cache-Control':'no-store'});res.end();
  }
}
module.exports = {serve,pgn,notation};
