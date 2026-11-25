#!/usr/bin/env python3
"""Stage the compiled hybrid engine and their corresponding source."""
import argparse
import base64
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import zipfile

HERE = Path(__file__).resolve().parent
PUBLIC = HERE.parents[1] / 'web' / 'engine'
POLICY_SHA = '7a702165ba92072006f99708a16aeb60508130d9044412a17a29ad526b04008e'


def sha(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def json_file(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def package(args):
    value_name = 'nn-c9e480e92425.nnue'
    policy_name = 'v5-' + POLICY_SHA[:12] + '.policy'
    if sha(args.policy) != POLICY_SHA:
        raise ValueError('Expected the frozen V5 network from the November 24 match')
    with gzip.open(args.value, 'rb') as stream:
        raw_digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        raw_size = stream.tell()
    if not raw_digest.startswith('c9e480e92425'):
        raise ValueError('Expected the full value NNUE matching the snapshot')

    wasm = [args.compiled / f'hybrid-simd.{ext}' for ext in ('js', 'wasm')]
    build_files = [HERE / name for name in ['browser.cpp', 'browser.patch', 'build.sh', 'worker.js', 'package.py', 'BUILD.txt']]
    sources = list(sorted(path for path in (args.source / 'src').rglob('*') if path.is_file()))
    release_files = wasm + build_files + sources + [args.value, args.policy]
    release_id = hashlib.sha256(''.join(map(sha, release_files)).encode()).hexdigest()[:16]
    release = PUBLIC / release_id
    release.mkdir(parents=True, exist_ok=True)
    root = '/engine/' + release_id + '/'
    for file in wasm + [HERE / 'worker.js']:
        shutil.copyfile(file, release / file.name)
    shutil.copyfile(args.license, release / 'LICENSE.txt')
    shutil.copyfile(args.value, release / (value_name + '.gz'))
    shutil.copyfile(args.policy, release / policy_name)
    weights = {}
    for key, name, asset, size, digest in (
        ('value', value_name, value_name + '.gz', raw_size, raw_digest),
        ('policy', policy_name, policy_name, args.policy.stat().st_size, POLICY_SHA),
    ):
        integrity = 'sha256-' + base64.b64encode(bytes.fromhex(sha(release / asset))).decode()
        weights[key] = dict(name=name, url=root + asset, integrity=integrity, size=size, sha256=digest)
    json_file(release / 'weights.json', weights)
    with zipfile.ZipFile(release / 'engine.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in wasm + [release / 'worker.js', release / 'weights.json', release / 'LICENSE.txt', HERE / 'BUILD.txt']:
            archive.write(file, file.name)
    with zipfile.ZipFile(release / 'source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sources:
            archive.write(file, 'stockfish/' + str(file.relative_to(args.source)))
        for file in build_files:
            archive.write(file, 'browser/' + file.name)
        for file in (args.license, args.license.with_name('AUTHORS')):
            archive.write(file, 'stockfish/' + file.name)
        archive.write(release / 'weights.json', 'weights.json')

    manifest = {
        'name': 'Stockfish Hybrid V5',
        'release': release_id,
        'revision': args.revision,
        'worker': root + 'worker.js',
        'wasm': root + 'hybrid-simd.wasm',
        'binary': root + 'engine.zip',
        'source': root + 'source.zip',
        'license': root + 'LICENSE.txt',
        'weights': weights,
        'simd': True,
        'threaded': False,
        'startupTimeout': 90000,
    }
    json_file(PUBLIC / 'manifest-hybrid.json', manifest)
    print(release_id)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('source', 'compiled', 'value', 'policy', 'license'):
        parser.add_argument(name, type=Path)
    parser.add_argument('--revision', required=True)
    package(parser.parse_args())
