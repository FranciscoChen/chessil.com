#!/usr/bin/env python3
"""History-aware, resumable Lc0 policy -> standard Polyglot. No search is used."""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import resource
import sqlite3
import struct
import time

import chess
import chess.polyglot

NETWORK_SHA = 'e6ada9d6c4a769bfab3aa0848d82caeb809aa45f83e6c605fc58a31d21bdd618'
RECORD = struct.Struct('>QHHI')


def board_for(path):
    board = chess.Board()
    for move in path.split():
        board.push_uci(move)
    return board


def raw_move(board, move):
    if board.is_castling(move):
        move = chess.Move(move.from_square, chess.square(7 if board.is_kingside_castling(move) else 0, chess.square_rank(move.from_square)))
    return move.to_square | move.from_square << 6 | (0 if not move.promotion else move.promotion - 1) << 12


def softmax(logits):
    maximum = max(logits)
    values = [math.exp(value - maximum) for value in logits]
    total = math.fsum(values)
    return [value / total for value in values]


class NativePolicy:
    def __init__(self, weights, backend, options):
        from lczero import backends
        self.api = backends
        self.binding_sha256 = hashlib.file_digest(Path(backends.__file__).open('rb'), 'sha256').hexdigest()
        self.network = backends.Backend(backends.Weights(str(weights)), backend, options)

    def __call__(self, path):
        # Native encoder preserves actual history, move orientation and policy mapping.
        state = self.api.GameState(moves=path.split())
        moves = state.moves()
        if not moves:
            return {}
        output = self.network.evaluate([state.as_input(self.network)])[0]
        logits = output.p_raw(state.policy_indices())
        if len(logits) != len(moves) or not all(math.isfinite(x) for x in logits):
            raise ValueError('Invalid network policy output')
        probabilities = softmax(logits)  # Legal moves only; temperature exactly 1.
        native = output.p_softmax(state.policy_indices())
        if max(abs(a - b) for a, b in zip(probabilities, native)) > 0.002:
            raise ValueError('Policy differs from native softmax beyond tolerance')
        result = dict(zip(moves, probabilities))
        legal = {move.uci() for move in board_for(path).legal_moves}
        if set(result) != legal:
            raise ValueError('Native move mapping differs from python-chess')
        return result


class Store:
    def __init__(self, filename, configuration):
        self.db = sqlite3.connect(filename)
        self.db.execute('PRAGMA journal_mode=WAL')
        self.db.executescript('''
            CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT);
            CREATE TABLE IF NOT EXISTS tasks(path TEXT PRIMARY KEY,ply INTEGER,mass REAL,done INTEGER DEFAULT 0);
            CREATE INDEX IF NOT EXISTS frontier ON tasks(done,ply,mass DESC);
            CREATE TABLE IF NOT EXISTS evaluations(path TEXT PRIMARY KEY,policy TEXT);
            CREATE TABLE IF NOT EXISTS positions(key TEXT PRIMARY KEY,fen TEXT,mass REAL,policy TEXT,ply INTEGER,histories INTEGER);
        ''')
        old = self.db.execute("SELECT value FROM metadata WHERE key='configuration'").fetchone()
        encoded = json.dumps(configuration, sort_keys=True)
        if old and old[0] != encoded:
            raise ValueError('Checkpoint configuration differs; use a separate work directory')
        self.db.execute('INSERT OR IGNORE INTO metadata VALUES (?,?)', ('configuration', encoded))
        self.db.execute('INSERT OR IGNORE INTO tasks(path,ply,mass) VALUES (?,?,?)', ('', 0, 1.0))
        self.db.commit()

    def evaluate(self, path, engine):
        row = self.db.execute('SELECT policy FROM evaluations WHERE path=?', (path,)).fetchone()
        if row:
            return json.loads(row[0])
        result = engine(path)
        self.db.execute('INSERT INTO evaluations VALUES (?,?)', (path, json.dumps(result)))
        self.db.commit()
        return result


def generate(store, engine, budget, max_ply=16, stop_after=None):
    db = store.db
    entries = sum(len(json.loads(row[0])) for row in db.execute('SELECT policy FROM positions'))
    count = 0
    started = time.monotonic()
    # Quotas by depth keep deeper popular lines reachable. Within each depth,
    # four selections use highest path mass; one gives rare first moves a turn.
    tick_row = db.execute("SELECT value FROM metadata WHERE key='tick'").fetchone()
    tick = int(tick_row[0]) if tick_row else 0
    while True:
        task = db.execute('SELECT path,ply,mass FROM tasks WHERE done=0 AND ply<=2 ORDER BY ply,mass DESC,path LIMIT 1').fetchone()
        if not task:
            for offset in range(14):
                depth = 3 + (tick + offset) % 14
                if tick % 5 == 4:
                    # Low frequency first moves receive bounded, explicit coverage.
                    group = chess.Board().legal_moves
                    first = sorted(m.uci() for m in group)[(tick // 5) % 20]
                    task = db.execute('SELECT path,ply,mass FROM tasks WHERE done=0 AND ply=? AND path LIKE ? ORDER BY mass DESC,path LIMIT 1', (depth, first + ' %')).fetchone()
                if not task:
                    task = db.execute('SELECT path,ply,mass FROM tasks WHERE done=0 AND ply=? ORDER BY mass DESC,path LIMIT 1', (depth,)).fetchone()
                if task:
                    tick += offset + 1
                    break
        if not task:
            break
        path, ply, mass = task
        board = board_for(path)
        key = f'{chess.polyglot.zobrist_hash(board):016x}'
        prior = db.execute('SELECT fen,mass,policy,ply,histories FROM positions WHERE key=?', (key,)).fetchone()
        fen = board.fen(en_passant='xfen').split()[:4]
        fen = ' '.join(fen)
        legal_count = board.legal_moves.count()
        if prior and prior[0] != fen:
            raise ValueError('Polyglot hash collision detected')
        if (prior and prior[4] >= 4) or (not prior and entries + legal_count > budget):
            db.execute('UPDATE tasks SET done=2 WHERE path=?', (path,))
            db.commit()
            continue
        policy = store.evaluate(path, engine)
        if prior:
            old_mass, old_policy = prior[1], json.loads(prior[2])
            combined = {move: (old_policy[move] * old_mass + p * mass) / (old_mass + mass) for move, p in policy.items()}
            db.execute('UPDATE positions SET mass=?,policy=?,ply=MIN(ply,?),histories=histories+1 WHERE key=?', (old_mass + mass, json.dumps(combined), ply, key))
        else:
            db.execute('INSERT INTO positions VALUES (?,?,?,?,?,?)', (key, fen, mass, json.dumps(policy), ply, 1))
            entries += len(policy)
        # Every legal move of every selected position is stored. No probability
        # threshold removes rare moves; the budget selects which children expand.
        if ply < max_ply:
            for move, probability in policy.items():
                if probability > 0:
                    db.execute('INSERT OR IGNORE INTO tasks(path,ply,mass) VALUES (?,?,?)', ((path + ' ' + move).strip(), ply + 1, mass * probability))
        db.execute('UPDATE tasks SET done=1 WHERE path=?', (path,))
        db.execute('INSERT OR REPLACE INTO metadata VALUES (?,?)', ('tick', str(tick)))
        db.commit()
        count += 1
        if count % 100 == 0:
            elapsed = time.monotonic() - started
            print(json.dumps({'histories_this_run': count, 'positions': db.execute('SELECT COUNT(*) FROM positions').fetchone()[0], 'entries': entries, 'bytes': entries * 16, 'positions_per_second': round(count / elapsed, 3)}), flush=True)
        if stop_after and count >= stop_after:
            return False
    return True


def export(store, output):
    records = []
    for key, fen, policy in store.db.execute('SELECT key,fen,policy FROM positions'):
        board = chess.Board(fen + ' 0 1')
        for uci, probability in json.loads(policy).items():
            move = chess.Move.from_uci(uci)
            if move not in board.legal_moves:
                raise ValueError('Illegal stored move')
            weight = max(1, min(65535, round(probability * 65535)))
            records.append((int(key, 16), raw_move(board, move), weight))
    records.sort(key=lambda row: (row[0], -row[2], row[1]))
    if len({(key, move) for key, move, _ in records}) != len(records):
        raise ValueError('Duplicate output entries')
    temporary = output.with_suffix('.tmp')
    with temporary.open('wb') as stream:
        for key, move, weight in records:
            stream.write(RECORD.pack(key, move, weight, 0))
    temporary.replace(output)
    # Validate every stored position, including castling conversion and all moves.
    with chess.polyglot.open_reader(output) as reader:
        for key, fen, policy in store.db.execute('SELECT key,fen,policy FROM positions'):
            board = chess.Board(fen + ' 0 1')
            actual = {entry.move.uci() for entry in reader.find_all(board)}
            if actual != set(json.loads(policy)):
                raise ValueError('Polyglot round trip failed')
    raw = output.read_bytes()
    report = {'bytes': len(raw), 'gzip_bytes': len(gzip.compress(raw, mtime=0)), 'entries': len(records), 'sha256': hashlib.sha256(raw).hexdigest(), 'positions_by_minimum_ply': dict(store.db.execute('SELECT ply,COUNT(*) FROM positions GROUP BY ply')), 'full_legal_policy_per_selected_position': True, 'history_policy': 'reach-weighted mixture over evaluated histories, not all possible histories', 'max_source_ply': 16, 'history_samples_per_position_max': 4, 'configuration': json.loads(store.db.execute("SELECT value FROM metadata WHERE key='configuration'").fetchone()[0])}
    report['binding_sha256'] = store.db.execute("SELECT value FROM metadata WHERE key='binding_sha256'").fetchone()
    report['binding_sha256'] = report['binding_sha256'][0] if report['binding_sha256'] else None
    report['samples'] = {}
    samples = {'startpos': '', 'e4': 'e2e4', 'd4': 'd2d4', 'c4': 'c2c4', 'Nf3': 'g1f3', 'Najdorf': 'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4 f3d4 g8f6 b1c3 a7a6', 'Ruy Lopez': 'e2e4 e7e5 g1f3 b8c6 f1b5'}
    with chess.polyglot.open_reader(output) as reader:
        for name, path in samples.items():
            board = board_for(path)
            moves = sorted(reader.find_all(board), key=lambda entry: -entry.weight)
            total = sum(entry.weight for entry in moves)
            report['samples'][name] = [(board.san(entry.move), round(entry.weight / total, 5)) for entry in moves]
    output.with_suffix('.json').write_text(json.dumps(report, indent=2) + '\n')
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--weights', type=Path, required=True)
    parser.add_argument('--work', type=Path, default=Path('bt4-book-work'))
    parser.add_argument('--output', type=Path, default=Path('bt4_it332_policy.bin'))
    parser.add_argument('--backend', default='blas')
    parser.add_argument('--backend-options', default='batch_size=1,threads=1,policy_head=vanilla')
    parser.add_argument('--lc0-revision', required=True)
    parser.add_argument('--max-bytes', type=int, default=599984)
    parser.add_argument('--benchmark', type=int, default=0)
    parser.add_argument('--stop-after', type=int)
    args = parser.parse_args()
    if not 9322 * 16 <= args.max_bytes < 600000:
        parser.error('--max-bytes must fit all 9,322 mandatory shallow entries and be below 600000')
    digest = hashlib.file_digest(args.weights.open('rb'), 'sha256').hexdigest()
    if digest != NETWORK_SHA:
        parser.error('Unexpected BT4-it332 SHA-256')
    args.work.mkdir(parents=True, exist_ok=True)
    configuration = {'network_sha256': digest, 'lc0_revision': args.lc0_revision, 'backend': args.backend, 'backend_options': args.backend_options, 'temperature': 1, 'max_source_ply': 16, 'full_coverage_through_source_ply': 2, 'max_bytes': args.max_bytes, 'max_histories_per_position': 4, 'algorithm': 'depth-balanced-all-legal-v1'}
    store = Store(args.work / 'checkpoint.sqlite3', configuration)
    started = time.monotonic()
    engine = NativePolicy(args.weights, args.backend, args.backend_options)
    store.db.execute('INSERT OR REPLACE INTO metadata VALUES (?,?)', ('binding_sha256', engine.binding_sha256))
    store.db.commit()
    if args.benchmark:
        frontier = ['']
        done = 0
        while frontier and done < args.benchmark:
            path = frontier.pop(0)
            policy = store.evaluate(path, engine)
            frontier.extend((path + ' ' + move).strip() for move in policy)
            done += 1
        elapsed = time.monotonic() - started
        report = {'positions': done, 'seconds_including_load': elapsed, 'positions_per_second': done / elapsed, 'peak_rss_kib': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}
        print(json.dumps(report), flush=True)
        (args.work / 'benchmark.json').write_text(json.dumps(report, indent=2) + '\n')
        return
    complete = generate(store, engine, args.max_bytes // RECORD.size, stop_after=args.stop_after)
    report = export(store, args.output)
    report['complete'] = complete
    print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
