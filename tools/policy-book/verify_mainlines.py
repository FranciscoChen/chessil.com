#!/usr/bin/env python3
"""Require full legal move policies along the reserved main-line continuations."""
import argparse
import hashlib
import json
from pathlib import Path
import chess
import chess.polyglot

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--book',type=Path,default=Path('bt4_it332_policy.bin'))
parser.add_argument('--report',type=Path,default=Path('bt4_it332_policy.json'))
args=parser.parse_args()
report=json.loads(args.report.read_text())
if not report.get('complete') or hashlib.file_digest(args.book.open('rb'),'sha256').hexdigest()!=report['sha256']:
    raise ValueError('Book is incomplete or does not match its report')
expansion=report['policy_expansion']
reserved=expansion['reserved_opening_continuations']
for line in expansion['representative_mainlines']['lines']:
    if line['uci'] not in reserved:
        raise ValueError('Representative opening was not reserved: '+line['name'])
checked=set()
with chess.polyglot.open_reader(args.book) as reader:
    for seed,continuation in reserved.items():
        if not (continuation+' ').startswith(seed+' ') or len(continuation.split())!=16:
            raise ValueError('Reserved continuation does not reach source ply 16')
        board=chess.Board()
        for move in [None]+continuation.split():
            if move:board.push_uci(move)
            found={entry.move for entry in reader.find_all(board)}
            if found!=set(board.legal_moves):
                raise ValueError('Main line lacks its complete move policy at '+board.fen())
            checked.add(chess.polyglot.zobrist_hash(board))
report['mainline_verification']={'reserved_lines':len(reserved),'representative_opening_names':[line['name'] for line in expansion['representative_mainlines']['lines']],'unique_positions_verified':len(checked),'source_plies':'0 through 16 inclusive','full_legal_move_policy_at_every_position':True}
args.report.write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report['mainline_verification']),flush=True)
