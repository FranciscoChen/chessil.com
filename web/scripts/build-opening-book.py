"""Build a position-indexed, local ECO repertoire. Requires chess==1.11.2."""
import csv, io, json, pathlib, chess, chess.pgn
root=pathlib.Path(__file__).resolve().parents[1]
positions={}
for file in sorted((root/'assets/openings').glob('*.tsv')):
 for row in csv.DictReader(file.open(),delimiter='\t'):
  game=chess.pgn.read_game(io.StringIO(row['pgn']))
  if game.errors: raise ValueError(game.errors)
  board=game.board()
  for move in game.mainline_moves():
   key=' '.join(board.fen(en_passant='legal').split()[:4]);node=positions.setdefault(key,{'moves':{},'names':[]})
   node['moves'][move.uci()]=board.san(move);board.push(move)
  key=' '.join(board.fen(en_passant='legal').split()[:4]);node=positions.setdefault(key,{'moves':{},'names':[]})
  node['names'].append([row['eco'],row['name']])
(root/'web/engine/openings.json').write_text(json.dumps(positions,separators=(',',':')))
print(len(positions),'book positions')
