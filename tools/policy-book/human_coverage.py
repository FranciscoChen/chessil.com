#!/usr/bin/env python3
"""Expand a policy book using observed human opening frequency from public PGNs."""
import argparse
from collections import Counter
import io
import json
from pathlib import Path
import sqlite3
import time
import urllib.request

import chess
import chess.pgn
import chess.polyglot
import zstandard
from generate import NativePolicy, Store, board_for, export


class Opening(chess.pgn.BaseVisitor):
    def begin_game(self):
        self.headers = {}
        self.moves = []

    def visit_header(self, name, value):
        self.headers[name] = value

    def begin_variation(self):
        return chess.pgn.SKIP

    def begin_parse_san(self, board, san):
        if len(self.moves) >= 17:
            return chess.pgn.SKIP

    def visit_move(self, board, move):
        self.moves.append(move.uci())

    def handle_error(self, error):
        self.headers['invalid'] = True

    def result(self):
        return self.headers, self.moves


def cohort(headers):
    try:
        if headers.get('invalid') or 'BOT' in (headers.get('WhiteTitle'), headers.get('BlackTitle')):
            return None
        elo = (int(headers['WhiteElo']) + int(headers['BlackElo'])) / 2
        return 'below1600' if elo < 1600 else '1600to2199' if elo < 2200 else '2200plus'
    except (KeyError, ValueError):
        return None


def collect(database, months, games_per_month):
    database.executescript('''CREATE TABLE IF NOT EXISTS months(month TEXT PRIMARY KEY,games INTEGER,accepted INTEGER,complete INTEGER,first_utc TEXT,last_utc TEXT);
        CREATE TABLE IF NOT EXISTS frequency(cohort TEXT,path TEXT,n INTEGER,PRIMARY KEY(cohort,path));''')
    for month in months:
        previous = database.execute('SELECT games FROM months WHERE month=?', (month,)).fetchone()
        # Each month commits atomically; interrupted streams restart this month.
        if previous:
            continue
        url = f'https://database.lichess.org/standard/lichess_db_standard_rated_{month}.pgn.zst'
        request = urllib.request.Request(url, headers={'User-Agent': 'ChessiL opening coverage generator'})
        pending = Counter()
        games = accepted = 0
        first_utc = last_utc = ''
        started = time.monotonic()
        with urllib.request.urlopen(request, timeout=120) as response:
            with zstandard.ZstdDecompressor().stream_reader(response) as decompressed:
                with io.TextIOWrapper(decompressed, encoding='utf-8') as text:
                    while not games_per_month or games < games_per_month:
                        item = chess.pgn.read_game(text, Visitor=Opening)
                        if item is None:
                            break
                        games += 1
                        headers, moves = item
                        utc = headers.get('UTCDate', '') + ' ' + headers.get('UTCTime', '')
                        first_utc = first_utc or utc
                        last_utc = utc
                        group = cohort(headers)
                        if group:
                            accepted += 1
                            for end in range(min(16, len(moves)) + 1):
                                pending[group, ' '.join(moves[:end])] += 1
                        if games % 5000 == 0:
                            print(json.dumps({'month': month, 'games': games, 'accepted': accepted, 'seconds': round(time.monotonic() - started)}), flush=True)
        with database:
            database.executemany('INSERT INTO frequency VALUES (?,?,?) ON CONFLICT(cohort,path) DO UPDATE SET n=n+excluded.n', ((group, path, count) for (group, path), count in pending.items()))
            database.execute('INSERT INTO months VALUES (?,?,?,?,?,?)', (month, games, accepted, int(not games_per_month or games < games_per_month), first_utc, last_utc))
        print(json.dumps({'sample_saved': month, 'games': games, 'opening_paths': len(pending)}), flush=True)


def augment(args, frequencies):
    report_path = args.output.with_suffix('.json')
    report = json.loads(report_path.read_text())
    if not report.get('complete'):
        raise ValueError('Finish base generation before adding human coverage')
    store = Store(args.work / 'checkpoint.sqlite3', report['configuration'])
    db = store.db
    paths = frequencies.execute('SELECT path,MAX(n) FROM frequency WHERE path!=? GROUP BY path HAVING MAX(n)>=? ORDER BY length(path),MAX(n) DESC,path', ('', args.min_games)).fetchall()
    engine = None
    added = 0
    for path, count in paths:
        board = board_for(path)
        key = f'{chess.polyglot.zobrist_hash(board):016x}'
        if db.execute('SELECT 1 FROM positions WHERE key=?', (key,)).fetchone():
            continue
        if engine is None:
            config = report['configuration']
            engine = NativePolicy(args.weights, config['backend'], config['backend_options'])
        policy = store.evaluate(path, engine)
        fen = ' '.join(board.fen(en_passant='xfen').split()[:4])
        # Human counts select positions only. A newly selected position uses this
        # actual history's raw Leela policy; human popularity is never its weight.
        mass = 1.0
        parts = path.split()
        for i, move in enumerate(parts):
            mass *= store.evaluate(' '.join(parts[:i]), engine)[move]
        db.execute('INSERT INTO positions VALUES (?,?,?,?,?,?)', (key, fen, mass, json.dumps(policy), board.ply(), 1))
        db.commit()
        added += 1
        if added % 100 == 0:
            print(json.dumps({'human_positions_added': added, 'sample_path_games': count}), flush=True)
    coverage = {'source': 'https://database.lichess.org/', 'type': 'prefix samples of public monthly rated standard PGN streams', 'sample_windows': [dict(zip(['month','games','accepted','complete_month','first_utc','last_utc'], row)) for row in frequencies.execute('SELECT * FROM months ORDER BY month')], 'cohorts': dict(frequencies.execute("SELECT cohort,n FROM frequency WHERE path=''")), 'minimum_occurrences_in_any_cohort': args.min_games, 'qualified_history_paths': len(paths), 'new_positions_this_run': added, 'max_source_ply': 16, 'preserves_existing_positions': True, 'weights': 'Lc0 policy only; human counts select coverage'}
    db.execute('INSERT OR REPLACE INTO metadata VALUES (?,?)', ('human_coverage', json.dumps(coverage)))
    db.commit()
    result = export(store, args.output)
    result['complete'] = True
    result['human_coverage'] = coverage
    if 'coverage_pass' in report:
        result['coverage_pass'] = report['coverage_pass']
    report_path.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'human_coverage_complete': True, 'positions_added': added, 'bytes': result['bytes']}), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--months', nargs='+', default=['2026-08','2026-09','2026-10'])
    parser.add_argument('--games-per-month', type=int, default=30000)
    parser.add_argument('--min-games', type=int, default=10)
    parser.add_argument('--work', type=Path, default=Path('bt4-book-work'))
    parser.add_argument('--output', type=Path, default=Path('bt4_it332_policy.bin'))
    parser.add_argument('--weights', type=Path, required=True)
    parser.add_argument('--collect-only', action='store_true')
    args = parser.parse_args()
    if args.games_per_month < 0 or args.min_games < 1:
        parser.error('Invalid sample size or frequency threshold')
    args.work.mkdir(exist_ok=True, parents=True)
    database = sqlite3.connect(args.work / 'human-frequency.sqlite3')
    collect(database, args.months, args.games_per_month)
    if not args.collect_only:
        augment(args, database)


if __name__ == '__main__':
    main()
