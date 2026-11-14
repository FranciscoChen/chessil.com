#!/usr/bin/env python3
"""Build and publish our browser Stockfish. Emscripten 6.0.9 must be on PATH.
Use --source for an already-patched/custom source tree, --network to embed a
compatible replacement NNUE, and --package-only to package a previously completed build.
"""
import argparse, hashlib, json, pathlib, shutil, subprocess, tempfile, zipfile, re
ROOT=pathlib.Path(__file__).resolve().parents[1]
REV='0dc3d0ac03705353dad6659c0dad4597cdee4021'
p=argparse.ArgumentParser();p.add_argument('--source',type=pathlib.Path);p.add_argument('--network',type=pathlib.Path);p.add_argument('--package-only',action='store_true');p.add_argument('--full',action='store_true');p.add_argument('--threaded',action='store_true');p.add_argument('--scalar',action='store_true',help='Portable single-threaded build without WebAssembly SIMD');args=p.parse_args()
if args.scalar and args.threaded: p.error('--scalar is a single-threaded compatibility build')
source=args.source
if source is None:
 source=pathlib.Path(tempfile.mkdtemp(prefix='chessil-stockfish-'))
 subprocess.run(['git','clone','https://github.com/nmrugg/stockfish.js.git',str(source)],check=True)
 subprocess.run(['git','checkout',REV],cwd=source,check=True)
 subprocess.run(['git','apply',str(ROOT/'engine-build/browser.patch')],cwd=source,check=True)
source=source.resolve()
macro='EvalFileDefaultName' if args.full else 'EvalFileLiteName'
configured=re.search(macro+r'\s+"([^"]+)"',(source/'src/evaluate.h').read_text())
if not configured: raise ValueError('Missing bundled network declaration')
network=(args.network or source/'src'/configured[1]).resolve()
if args.package_only and args.network and network.read_bytes()!=(source/'src'/configured[1]).read_bytes(): raise ValueError('Rebuild to embed a different network; package-only cannot change weights')
if args.full and not args.network: raise ValueError('--full requires --network with a matching full network')
if args.network and not args.package_only:
 # A supplied network is embedded too, so the default never needs a duplicate download.
 checksum=hashlib.sha256(network.read_bytes()).hexdigest();embedded=source/'src'/('nn-'+checksum[:12]+'.nnue')
 if embedded!=network: shutil.copy2(network,embedded)
 header=source/'src/evaluate.h';macro='EvalFileDefaultName' if args.full else 'EvalFileLiteName'
 content,count=re.subn(r'('+macro+r'\s+")[^"]+(")',lambda match:match[1]+embedded.name+match[2],header.read_text())
 if count!=1: raise ValueError('Could not select the bundled network in evaluate.h')
 header.write_text(content);network=embedded
if not args.package_only:
 command=['node','build.js','--no-split','--basename=chessil-stockfish','--force']
 if not args.threaded: command.append('--single-threaded')
 if args.scalar: command.append('--no-simd')
 if not args.full: command.append('--lite')
 subprocess.run(command,cwd=source,check=True)
worker=source/'src/chessil-stockfish.js';wasm=source/'src/chessil-stockfish.wasm'
files=[worker,wasm,network];digest=hashlib.sha256(b''.join(file.read_bytes() for file in files)).hexdigest()[:16]
public=ROOT/'web/engine';release=public/digest;release.mkdir(parents=True,exist_ok=True)
for file in [worker,wasm]: shutil.copy2(file,release/file.name)
existing=next((file for file in sorted(public.glob('*/'+network.name)) if file.parent!=release and hashlib.sha256(file.read_bytes()).digest()==hashlib.sha256(network.read_bytes()).digest()),None)
network_asset=existing or release/network.name
if not existing: shutil.copy2(network,network_asset)
if existing and (release/network.name).exists(): (release/network.name).unlink()
shutil.copy2(source/'Copying.txt',release/'LICENSE.txt')
# Corresponding source includes actual modified files, network, scripts and patch.
tracked=subprocess.check_output(['git','ls-files','-z','--cached','--others','--exclude-standard'],cwd=source).decode().split('\0')
with zipfile.ZipFile(release/'source.zip','w',zipfile.ZIP_DEFLATED) as archive:
 for name in tracked:
  path=source/name
  if name and path.is_file() and path not in [worker,wasm]: archive.write(path,'stockfish/'+name)
 archive.write(network,'stockfish/src/'+network.name)
 archive.write(__file__,'chessil/build-browser-engine.py')
 archive.write(ROOT/'engine-build/browser.patch','chessil/browser.patch')
 archive.writestr('BUILD.txt','Source: nmrugg/stockfish.js '+REV+' plus included browser.patch.\nEmscripten 6.0.9; node build.js '+('--lite ' if not args.full else '')+('' if args.threaded else '--single-threaded ')+('--no-simd ' if args.scalar else '')+'--no-split --basename=chessil-stockfish --force\nThe stockfish directory already contains the patch. Network architecture must match the selected build.\n')
manifest={'name':'Stockfish 19 '+('Full' if args.full else 'Lite')+' · local analysis','revision':subprocess.check_output(['git','rev-parse','HEAD'],cwd=source).decode().strip(),'release':digest,'worker':'/engine/'+digest+'/'+worker.name,'source':'/engine/'+digest+'/source.zip','license':'/engine/'+digest+'/LICENSE.txt','networks':[{'option':'EvalFile','name':network.name,'url':'/engine/'+str(network_asset.relative_to(public)),'sha256':hashlib.sha256(network.read_bytes()).hexdigest()}]}
manifest['threaded']=args.threaded
manifest['simd']=not args.scalar
manifest['embeddedNetwork']=hashlib.sha256(network.read_bytes()).hexdigest()
(public/('manifest-scalar.json' if args.scalar else 'manifest-threaded.json' if args.threaded else 'manifest.json')).write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest,indent=2))
