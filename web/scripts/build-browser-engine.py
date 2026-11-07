#!/usr/bin/env python3
"""Build and publish our browser Stockfish. Emscripten 6.0.9 must be on PATH.
Use --source for an already-patched/custom source tree, --network for compatible
external NNUE, and --package-only to package a previously completed build.
"""
import argparse, hashlib, json, pathlib, shutil, subprocess, tempfile, zipfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
REV='0dc3d0ac03705353dad6659c0dad4597cdee4021'
p=argparse.ArgumentParser();p.add_argument('--source',type=pathlib.Path);p.add_argument('--network',type=pathlib.Path);p.add_argument('--package-only',action='store_true');p.add_argument('--full',action='store_true');args=p.parse_args()
source=args.source
if source is None:
 source=pathlib.Path(tempfile.mkdtemp(prefix='chessil-stockfish-'))
 subprocess.run(['git','clone','https://github.com/nmrugg/stockfish.js.git',str(source)],check=True)
 subprocess.run(['git','checkout',REV],cwd=source,check=True)
 subprocess.run(['git','apply',str(ROOT/'engine-build/browser.patch')],cwd=source,check=True)
source=source.resolve()
if not args.package_only:
 command=['node','build.js','--single-threaded','--no-split','--basename=chessil-stockfish','--force']
 if not args.full: command.append('--lite')
 subprocess.run(command,cwd=source,check=True)
worker=source/'src/chessil-stockfish.js';wasm=source/'src/chessil-stockfish.wasm'
network=(args.network or source/'src/nn-61e7af4bb97d.nnue').resolve()
if args.full and not args.network: raise ValueError('--full requires --network with a matching full network')
files=[worker,wasm,network];digest=hashlib.sha256(b''.join(file.read_bytes() for file in files)).hexdigest()[:16]
public=ROOT/'web/engine';release=public/digest;release.mkdir(parents=True,exist_ok=True)
for file in files: shutil.copy2(file,release/file.name)
shutil.copy2(source/'Copying.txt',release/'LICENSE.txt')
# Corresponding source includes actual modified files, network, scripts and patch.
tracked=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=source).decode().split('\0')
with zipfile.ZipFile(release/'source.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for name in tracked:
  path=source/name
  if name and path.is_file(): archive.write(path,'stockfish/'+name)
 archive.write(network,'stockfish/src/'+network.name)
 archive.write(__file__,'chessil/build-browser-engine.py')
 archive.write(ROOT/'engine-build/browser.patch','chessil/browser.patch')
 archive.writestr('BUILD.txt','Source: nmrugg/stockfish.js '+REV+' plus included browser.patch.\nEmscripten 6.0.9; node build.js --lite --single-threaded --no-split --basename=chessil-stockfish --force\nThe stockfish directory already contains the patch. Network architecture must match the selected build.\n')
manifest={'name':'Stockfish 19 '+('Full' if args.full else 'Lite')+' · local analysis','revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=source).decode().strip(),'release':digest,'worker':'/engine/'+digest+'/'+worker.name,'source':'/engine/'+digest+'/source.zip','license':'/engine/'+digest+'/LICENSE.txt','networks':[{'option':'EvalFile','name':network.name,'url':'/engine/'+digest+'/'+network.name,'sha256':hashlib.sha256(network.read_bytes()).hexdigest()}]}
(public/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest,indent=2))
