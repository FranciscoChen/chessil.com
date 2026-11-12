#!/usr/bin/env python3
"""Add named opening samples without removing existing coverage."""
import argparse
import json
from pathlib import Path
import chess.polyglot
from generate import NativePolicy, Store, board_for, export

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--weights', type=Path, required=True)
parser.add_argument('--work', type=Path, default=Path('bt4-book-work'))
parser.add_argument('--output', type=Path, default=Path('bt4_it332_policy.bin'))
args = parser.parse_args()
report = json.loads(args.output.with_suffix('.json').read_text())
if not report.get('complete'):
    raise ValueError('Generation must finish before the coverage pass')
store = Store(args.work / 'checkpoint.sqlite3', report['configuration'])
db = store.db
seeds = [
    'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6',
    'e2e4 e7e5 g1f3 b8c6 f1b5',
]
paths = set()
for seed in seeds:
    parts = seed.split()
    paths.update(' '.join(parts[:end]) for end in range(len(parts) + 1))
protected = {f'{chess.polyglot.zobrist_hash(board_for(path)):016x}' for path in paths}
missing = [path for path in sorted(paths, key=lambda p: (len(p.split()), p)) if not db.execute('SELECT 1 FROM positions WHERE key=?', (f'{chess.polyglot.zobrist_hash(board_for(path)):016x}',)).fetchone()]
added = []
if missing:
    config = report['configuration']
    engine = NativePolicy(args.weights, config['backend'], config['backend_options'])
    for path in missing:
        board = board_for(path)
        key = f'{chess.polyglot.zobrist_hash(board):016x}'
        if db.execute('SELECT 1 FROM positions WHERE key=?', (key,)).fetchone():
            continue
        policy = store.evaluate(path, engine)
        mass = 1.0
        parts = path.split()
        for i, move in enumerate(parts):
            parent = store.evaluate(' '.join(parts[:i]), engine)
            mass *= parent[move]
        fen = ' '.join(board.fen(en_passant='xfen').split()[:4])
        db.execute('INSERT INTO positions VALUES (?,?,?,?,?,?)', (key, fen, mass, json.dumps(policy), board.ply(), 1))
        added.append(path)
        db.commit()
    del engine
coverage = {'reserved_samples': seeds, 'added_paths': added, 'additional_entries': sum(len(json.loads(row[0])) for row in db.execute('SELECT policy FROM positions')) - report['entries'], 'preserves_existing_positions': True}
db.execute('INSERT OR REPLACE INTO metadata VALUES (?,?)', ('coverage_pass', json.dumps(coverage)))
db.commit()
result = export(store, args.output)
result['complete'] = True
result['coverage_pass'] = coverage
args.output.with_suffix('.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'coverage_added': len(added), 'bytes': result['bytes']}), flush=True)
