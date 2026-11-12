#!/usr/bin/env python3
"""Compare cached full-precision priors to fresh single-node Lc0 UCI statistics."""
import argparse
import json
from pathlib import Path
import queue
import re
import sqlite3
import subprocess
import sys
import threading
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--engine', type=Path, required=True)
parser.add_argument('--weights', type=Path, required=True)
parser.add_argument('--work', type=Path, default=Path('bt4-book-work'))
parser.add_argument('--report', type=Path, default=Path('bt4_it332_policy.json'))
args = parser.parse_args()
subprocess.run([sys.executable, str(Path(__file__).with_name('verify_native.py')), '--weights', str(args.weights), '--work', str(args.work)], check=True)
native = json.loads((args.work / 'native-verification.json').read_text())
lines = queue.Queue()
log = (args.work / 'uci-verification.log').open('w')
process = subprocess.Popen([str(args.engine.resolve()), '--backend=blas', '--backend-opts=batch_size=1,threads=1,policy_head=vanilla', '--weights=' + str(args.weights.resolve())], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=log, text=True, bufsize=1)


def collect():
    for line in process.stdout:
        lines.put(line.rstrip())
    lines.put(None)


def send(command):
    process.stdin.write(command + '\n')
    process.stdin.flush()


def until(token, seconds=180):
    deadline = time.monotonic() + seconds
    result = []
    while True:
        line = lines.get(timeout=max(0.01, deadline - time.monotonic()))
        if line is None:
            raise RuntimeError('Lc0 exited before ' + token)
        log.write(line + '\n')
        result.append(line)
        if line.startswith(token):
            return result


threading.Thread(target=collect, daemon=True).start()
try:
    send('uci')
    until('uciok')
    for name, value in [('Threads', 1), ('MinibatchSize', 1), ('NNCacheSize', 0), ('PolicyTemperature', 1), ('VerboseMoveStats', 'true')]:
        send(f'setoption name {name} value {value}')
    send('isready')
    until('readyok')
    database = sqlite3.connect(args.work / 'checkpoint.sqlite3')
    result = {}
    for path in ['', 'e2e4', 'd2d4', 'c2c4', 'g1f3']:
        expected = native[path or 'startpos']['policy']
        send('ucinewgame')
        send('position startpos' + (' moves ' + path if path else ''))
        send('go nodes 1')
        output = until('bestmove')
        actual = {}
        for line in output:
            match = re.search(r'\b([a-h][1-8][a-h][1-8][qrbn]?)\s+\(.*?\(P:\s*([\d.]+)%', line)
            if match:
                actual[match[1]] = float(match[2]) / 100
        if set(actual) != set(expected):
            raise ValueError('UCI policy move coverage differs at ' + (path or 'startpos'))
        error = max(abs(actual[move] - expected[move]) for move in expected)
        if error > 0.00025:  # UCI P is rounded; edges use compressed priors.
            raise ValueError(f'Policy mismatch at {path}: {error}')
        result[path or 'startpos'] = {'moves': len(actual), 'max_absolute_error': error}
    report = json.loads(args.report.read_text())
    if not report.get('complete'):
        raise ValueError('Book generation is incomplete')
    report['uci_verification'] = result
    report['native_policy_verification'] = {path: {'ideal_softmax_max_error': row['ideal_softmax_max_error']} for path, row in native.items()}
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(result), flush=True)
finally:
    if process.poll() is None:
        send('quit')
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
    log.close()
