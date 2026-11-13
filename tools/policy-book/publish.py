#!/usr/bin/env python3
"""Package a verified book into versioned web assets; deployment still uses GitHub."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import struct

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--book', type=Path, default=Path('bt4_it332_policy.bin'))
parser.add_argument('--report', type=Path, default=Path('bt4_it332_policy.json'))
parser.add_argument('--manifest-name', default='polyglot-manifest.json', help='Separate manifest filename to archive an edition without changing the default')
parser.add_argument('--target', type=Path, default=Path(__file__).resolve().parents[2] / 'web/web/engine/book')
args = parser.parse_args()
if Path(args.manifest_name).name != args.manifest_name or not args.manifest_name.endswith('.json'):
    parser.error('--manifest-name must be a JSON filename without a directory')
report = json.loads(args.report.read_text())
raw = args.book.read_bytes()
sha = hashlib.sha256(raw).hexdigest()
if not report.get('complete') or len(report.get('uci_verification', {})) != 5 or not report.get('human_coverage'):
    raise ValueError('Book must have completed generation, human coverage and UCI verification')
if sha != report['sha256'] or len(raw) != report['bytes'] or len(raw) != report['entries'] * 16:
    raise ValueError('Artifact differs from verified report')
if report.get('policy_expansion'):
    expansion=report['policy_expansion']
    preservation=expansion.get('preservation_verification',{})
    if not preservation.get('existing_positions_preserved') or preservation.get('new_bytes')!=len(raw) or len(raw)>expansion['max_bytes']:
        raise ValueError('Expanded book must pass preservation and size checks before publishing')
records = list(struct.iter_unpack('>QHHI', raw))
if len({(key, move) for key, move, _, _ in records}) != len(records) or any(weight < 1 or learn for _, _, weight, learn in records):
    raise ValueError('Invalid records')
if any(records[i][0] < records[i-1][0] for i in range(1, len(records))):
    raise ValueError('Unsorted records')
compressed = gzip.compress(raw, mtime=0)
name = 'bt4-it332-' + sha[:16]
report['positions'] = len({key for key, _, _, _ in records})
report['gzip_bytes'] = len(compressed)
args.report.write_text(json.dumps(report, indent=2) + '\n')
args.target.mkdir(parents=True, exist_ok=True)
for suffix, content in [('.bin', raw), ('.bin.gz', compressed), ('.json', (json.dumps(report, indent=2) + '\n').encode())]:
    target = args.target / (name + suffix)
    temporary = target.with_name(target.name + '.tmp')
    temporary.write_bytes(content)
    temporary.replace(target)
manifest = {'name':'Leela BT4-it332', 'format':'polyglot', 'sha256':sha, 'bytes':len(raw), 'gzip_bytes':len(compressed), 'entries':len(records), 'positions':report['positions'], 'url':'/engine/book/' + name + '.bin', 'gzip_url':'/engine/book/' + name + '.bin.gz', 'report':'/engine/book/' + name + '.json', 'maxSourcePly':16, 'emptyFromPly':17, 'probability':'BT4-it332 temperature-1 policy priors; coverage follows policy likelihood and sampled human openings.'}
# Publish the manifest last. Keep the previous manifest/shards for cached clients.
(args.target/args.manifest_name).write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps(manifest), flush=True)
