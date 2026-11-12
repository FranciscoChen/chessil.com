#!/usr/bin/env python3
"""Verify cached raw-softmax policies and expose Lc0's FastExp approximation."""
import argparse
import json
from pathlib import Path
import sqlite3
from generate import NativePolicy

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--weights', type=Path, required=True)
parser.add_argument('--work', type=Path, required=True)
args = parser.parse_args()
db = sqlite3.connect(args.work / 'checkpoint.sqlite3')
config = json.loads(db.execute("SELECT value FROM metadata WHERE key='configuration'").fetchone()[0])
engine = NativePolicy(args.weights, config['backend'], config['backend_options'])
result = {}
for path in ['', 'e2e4', 'd2d4', 'c2c4', 'g1f3']:
    expected = json.loads(db.execute('SELECT policy FROM evaluations WHERE path=?', (path,)).fetchone()[0])
    fresh = engine(path)
    if set(fresh) != set(expected) or max(abs(fresh[m] - expected[m]) for m in fresh) > 0.000001:
        raise ValueError('Cached raw policy changed at ' + path)
    result[path or 'startpos'] = {'policy': engine.last_native_policy, 'ideal_softmax_max_error': max(abs(fresh[m] - engine.last_native_policy[m]) for m in fresh)}
(args.work / 'native-verification.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({'cached_raw_policies_verified': len(result)}), flush=True)
