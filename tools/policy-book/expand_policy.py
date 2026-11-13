#!/usr/bin/env python3
"""Add probability-ranked positions to an existing book, preserving its entries."""
import argparse
import json
from pathlib import Path
import sqlite3
import time

import chess
import chess.polyglot
from generate import NativePolicy, Store, board_for, export

WEIGHTS = {ply: 1 if ply < 8 else 2 if ply < 12 else 4 for ply in range(3, 17)}


def position_key(board):
    return f'{chess.polyglot.zobrist_hash(board):016x}'


def enqueue(db, path, board, mass, policy):
    if board.ply() >= 16:
        return
    for move, probability in policy.items():
        if probability <= 0:
            continue
        board.push(chess.Move.from_uci(move))
        key = position_key(board)
        if not db.execute('SELECT 1 FROM positions WHERE key=?', (key,)).fetchone():
            db.execute('INSERT OR IGNORE INTO policy_frontier VALUES (?,?,?,?,0)', ((path+' '+move).strip(), key, board.ply(), mass*probability))
        board.pop()


def prepare(store, max_bytes, prior_report, deep_weight=4):
    db = store.db
    db.executescript('''
        CREATE TABLE IF NOT EXISTS policy_frontier(path TEXT PRIMARY KEY,key TEXT,ply INTEGER,mass REAL,state INTEGER);
        CREATE INDEX IF NOT EXISTS policy_frontier_rank ON policy_frontier(state,ply,mass DESC,path);
        CREATE INDEX IF NOT EXISTS policy_frontier_key ON policy_frontier(key);
        CREATE TABLE IF NOT EXISTS policy_added(key TEXT PRIMARY KEY,ply INTEGER,entries INTEGER,mass REAL);
    ''')
    saved = db.execute("SELECT value FROM metadata WHERE key='policy_expansion'").fetchone()
    if saved:
        configuration = json.loads(saved[0])
        if configuration['max_bytes'] != max_bytes:
            raise ValueError('Expansion size differs from checkpoint')
    else:
        entries = sum(len(json.loads(row[0])) for row in db.execute('SELECT policy FROM positions'))
        if max_bytes // 16 <= entries:
            raise ValueError('Expansion must increase the existing byte budget')
        configuration = {'max_bytes': max_bytes, 'initial_entries': entries, 'initial_bytes': entries*16, 'initial_positions_by_ply': dict(db.execute('SELECT ply,COUNT(*) FROM positions GROUP BY ply')), 'depth_weights': {ply: deep_weight if ply >= 12 else weight for ply,weight in WEIGHTS.items()}, 'algorithm':'policy-depth-weighted-additions-v1', 'preserves_existing_entries': True, 'prior_report': prior_report}
        db.execute('INSERT INTO metadata VALUES (?,?)', ('policy_expansion', json.dumps(configuration)))
        db.commit()
    if not db.execute("SELECT 1 FROM metadata WHERE key='policy_frontier_ready'").fetchone():
        # Rebuild only from evaluated real histories whose positions are retained.
        # Every seed mass is the product of its actual ancestors' raw priors.
        histories = dict(db.execute('SELECT path,policy FROM evaluations'))
        masses = {'': 1.0}
        known = {row[0] for row in db.execute('SELECT key FROM positions')}
        for path in sorted(histories, key=lambda p: (len(p.split()), p)):
            if path:
                parent, _, move = path.rpartition(' ')
                if parent not in histories or parent not in masses:
                    raise ValueError('Cached history is missing an evaluated ancestor')
                masses[path] = masses[parent]*json.loads(histories[parent])[move]
            board = board_for(path)
            if position_key(board) in known:
                enqueue(db, path, board, masses[path], json.loads(histories[path]))
        db.execute('INSERT INTO metadata VALUES (?,?)', ('policy_frontier_ready','true'))
        db.commit()
    return configuration


def expand(store, engine, configuration, stop_after=None):
    db = store.db
    budget = configuration['max_bytes']//16
    base = configuration['initial_entries']
    extra = budget-base
    weights = {int(ply): weight for ply,weight in configuration['depth_weights'].items()}
    quotas = {ply: extra*weight//sum(weights.values()) for ply,weight in weights.items()}
    used = dict(db.execute('SELECT ply,SUM(entries) FROM policy_added GROUP BY ply'))
    entries = base+sum(used.values())
    schedule = [ply for repetition in range(max(weights.values())) for ply in range(16,2,-1) if weights[ply]>repetition]
    previous = db.execute("SELECT value FROM metadata WHERE key='policy_cursor'").fetchone()
    cursor = int(previous[0]) if previous else 0
    processed = 0
    started = time.monotonic()
    while budget-entries >= 64:
        task = None
        # Per-depth entry quotas direct more of the new bytes to plies 12–16.
        # Highest reach probability wins within each depth. Human counts are unused.
        for offset in range(len(schedule)):
            depth = schedule[(cursor+offset)%len(schedule)]
            if used.get(depth,0) >= quotas[depth]:
                continue
            task = db.execute('SELECT path,key,ply,mass FROM policy_frontier WHERE state=0 AND ply=? ORDER BY mass DESC,path LIMIT 1', (depth,)).fetchone()
            if task:
                cursor += offset+1
                break
        if not task:
            # Spend remaining space on the highest-probability eligible candidates.
            task = db.execute('SELECT path,key,ply,mass FROM policy_frontier WHERE state=0 ORDER BY mass DESC,path LIMIT 1').fetchone()
        if not task:
            break
        path,key,ply,mass = task
        if db.execute('SELECT 1 FROM positions WHERE key=?', (key,)).fetchone():
            db.execute('UPDATE policy_frontier SET state=2 WHERE key=?',(key,))
            db.commit()
            continue
        board = board_for(path)
        count = board.legal_moves.count()
        if entries+count > budget:
            db.execute('UPDATE policy_frontier SET state=3 WHERE path=?',(path,))
            db.commit()
            continue
        policy = store.evaluate(path,engine)
        fen = ' '.join(board.fen(en_passant='xfen').split()[:4])
        db.execute('INSERT INTO positions VALUES (?,?,?,?,?,?)',(key,fen,mass,json.dumps(policy),ply,1))
        db.execute('INSERT INTO policy_added VALUES (?,?,?,?)',(key,ply,len(policy),mass))
        enqueue(db,path,board,mass,policy)
        db.execute('UPDATE policy_frontier SET state=2 WHERE key=?',(key,))
        db.execute('UPDATE policy_frontier SET state=1 WHERE path=?',(path,))
        db.execute('INSERT OR REPLACE INTO metadata VALUES (?,?)',('policy_cursor',str(cursor)))
        db.commit()
        entries += len(policy)
        used[ply] = used.get(ply,0)+len(policy)
        processed += 1
        if processed%100==0:
            print(json.dumps({'policy_positions_added':db.execute('SELECT COUNT(*) FROM policy_added').fetchone()[0],'entries':entries,'bytes':entries*16,'added_by_ply':dict(db.execute('SELECT ply,COUNT(*) FROM policy_added GROUP BY ply')),'positions_per_second':round(processed/(time.monotonic()-started),3)}),flush=True)
        if stop_after and processed>=stop_after:
            return False
    return True


def new_round(store, report):
    db=store.db
    if not report.get('complete') or not report.get('policy_expansion',{}).get('preservation_verification'):
        raise ValueError('Verify the previous completed expansion before starting another round')
    saved=db.execute("SELECT value FROM metadata WHERE key='policy_expansion'").fetchone()
    if not saved:
        raise ValueError('No previous expansion to archive')
    with db:
        db.execute('INSERT INTO metadata VALUES (?,?)', ('policy_expansion_archive_'+str(time.time_ns()),saved[0]))
        db.execute("DELETE FROM metadata WHERE key IN ('policy_expansion','policy_frontier_ready','policy_cursor')")
        db.execute('DROP TABLE IF EXISTS policy_frontier')
        db.execute('DROP TABLE IF EXISTS policy_added')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--weights',type=Path,required=True)
    parser.add_argument('--work',type=Path,default=Path('bt4-book-work'))
    parser.add_argument('--output',type=Path,default=Path('bt4_it332_policy.bin'))
    parser.add_argument('--max-bytes',type=int,required=True)
    parser.add_argument('--stop-after',type=int)
    parser.add_argument('--new-round',action='store_true')
    parser.add_argument('--deep-weight',type=int,default=4)
    args=parser.parse_args()
    report_path=args.output.with_suffix('.json')
    prior=json.loads(report_path.read_text())
    if args.deep_weight<1:
        parser.error('--deep-weight must be positive')
    store=Store(args.work/'checkpoint.sqlite3',prior['configuration'])
    if args.new_round:
        if args.max_bytes<=prior['bytes']:
            parser.error('New round must have a larger budget')
        backup=sqlite3.connect(args.work/('before-policy-round-'+str(prior['bytes'])+'.sqlite3'))
        store.db.backup(backup)
        backup.close()
        new_round(store,prior)
    if not store.db.execute("SELECT 1 FROM metadata WHERE key='policy_expansion'").fetchone():
        # Keep a recoverable before-image of this standalone generator's database.
        backup=sqlite3.connect(args.work/'before-policy-expansion.sqlite3')
        store.db.backup(backup)
        backup.close()
    config=prepare(store,args.max_bytes,prior,args.deep_weight)
    policy=NativePolicy(args.weights,prior['configuration']['backend'],prior['configuration']['backend_options'])
    complete=expand(store,policy,config,args.stop_after)
    del policy
    report=export(store,args.output)
    for name in ('human_coverage','coverage_pass'):
        if name in config['prior_report']:
            report[name]=config['prior_report'][name]
    report['complete']=complete
    if 'policy_expansion' in config['prior_report']:
        report['previous_policy_expansions']=config['prior_report'].get('previous_policy_expansions',[])+[config['prior_report']['policy_expansion']]
    report['policy_expansion']={key:value for key,value in config.items() if key!='prior_report'}
    report['policy_expansion']['added_positions_by_ply']=dict(store.db.execute('SELECT ply,COUNT(*) FROM policy_added GROUP BY ply'))
    report_path.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'complete':complete,'bytes':report['bytes'],'entries':report['entries'],'depths':report['positions_by_minimum_ply']}),flush=True)


if __name__=='__main__':
    main()
