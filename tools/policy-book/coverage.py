#!/usr/bin/env python3
"""Report conditional parent-move coverage separately from traversal priority."""
import argparse
import json
from pathlib import Path
import sqlite3
import chess
import chess.polyglot


def measure(database):
    positions={key:(fen,json.loads(policy),ply) for key,fen,policy,ply in database.execute('SELECT key,fen,policy,ply FROM positions')}
    result={ply:{'parent_ply':ply,'covered_parents':0,'moves':0,'missing_resulting_positions':0,'highest_missing_parent_probability':None,'example':None} for ply in range(16)}
    for key,(fen,policy,ply) in positions.items():
        if ply>=16:
            continue  # Positions after a move out of ply 16 are intentionally empty.
        row=result[ply]
        row['covered_parents']+=1
        board=chess.Board(fen+' 0 1')
        for move,probability in policy.items():
            row['moves']+=1
            parsed=chess.Move.from_uci(move)
            board.push(parsed)
            child=f'{chess.polyglot.zobrist_hash(board):016x}'
            board.pop()
            if child in positions:
                continue
            row['missing_resulting_positions']+=1
            if row['highest_missing_parent_probability'] is None or probability>row['highest_missing_parent_probability']:
                row['highest_missing_parent_probability']=probability
                row['example']={'parent_fen':fen,'move':move,'san':board.san(parsed),'resulting_ply':ply+1}
    return {'probability_definition':'Conditional probability of the move in its stored parent policy; never multiplied along the path. Reporting only; traversal still uses path probability.', 'scope':'Moves from retained parent positions at their recorded minimum ply; all possible unvisited chess positions are not enumerated.', 'depths':list(result.values())}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--checkpoint',type=Path,required=True)
    parser.add_argument('--report',type=Path)
    args=parser.parse_args()
    connection=sqlite3.connect(args.checkpoint.resolve().as_uri()+'?mode=ro',uri=True)
    connection.execute('BEGIN')
    result=measure(connection)
    connection.close()
    if args.report:
        report=json.loads(args.report.read_text())
        report['conditional_move_coverage']=result
        args.report.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(result,indent=2),flush=True)


if __name__=='__main__':main()
