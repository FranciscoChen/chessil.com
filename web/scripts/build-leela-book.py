#!/usr/bin/env python3
"""Export the project's reachable Leela Polyglot book as small, lazy FEN shards.
No training files/cursors are modified. python-chess is only a build dependency.
"""
import argparse,hashlib,json,pathlib
import chess,chess.polyglot
root=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--source',type=pathlib.Path,default=root.parent/'Stockfish-policy-search/policy/data/mixed/book/depth_12_BT4-1740.bin');args=p.parse_args()
def shard(key):
 h=2166136261
 for c in key:h=((h^ord(c))*16777619)&0xffffffff
 return f'{h&255:02x}'
buckets=[{} for _ in range(256)];seen=set();stack=[chess.Board()]
with chess.polyglot.open_reader(args.source) as reader:
 while stack:
  board=stack.pop();key=' '.join(board.fen(en_passant='legal').split()[:4])
  if key in seen or board.ply()>=12:continue
  seen.add(key);entries=[e for e in reader.find_all(board) if e.weight>0 and e.move in board.legal_moves]
  if not entries:continue
  total=sum(e.weight for e in entries)
  buckets[int(shard(key),16)][key]=[[e.move.uci(),board.san(e.move),e.weight,total] for e in sorted(entries,key=lambda e:-e.weight)]
  for e in entries:
   child=board.copy();child.push(e.move);stack.append(child)
digest=hashlib.sha256(args.source.read_bytes()).hexdigest();out=root/'web/engine/book'/digest[:16];out.mkdir(parents=True,exist_ok=True)
for i,bucket in enumerate(buckets):(out/f'{i:02x}.json').write_text(json.dumps(bucket,separators=(',',':'))+'\n')
manifest={'name':'Leela BT4-1740','sha256':digest,'positions':sum(map(len,buckets)),'base':'/engine/book/'+digest[:16]+'/','probability':'Normalized weights from the pruned Polyglot book; not win probabilities.'}
(root/'web/engine/book/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(manifest)
