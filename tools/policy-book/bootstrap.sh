#!/usr/bin/env bash
# Standalone build workspace; never runs from a production application checkout.
set -euo pipefail
book_work=${1:?Usage: bootstrap.sh /absolute/book/workspace}
revision=d91bd1443ac1a4f367de96d3569dce7bbd35920a
mkdir -p "$book_work"
cd "$book_work"
python3 -m venv venv
venv/bin/pip install --upgrade pip patchelf meson-python pybind11 python-chess zstandard
if [[ ! -d lc0/.git ]]; then
 git init lc0
 git -C lc0 remote add origin https://github.com/LeelaChessZero/lc0.git
fi
git -C lc0 fetch --depth 1 origin "$revision"
git -C lc0 checkout --detach "$revision"
git -C lc0 submodule update --init --depth 1
# Pinned upstream revision omits this alias in the python-chess bridge.
python3 - <<'PYFIX'
from pathlib import Path
p = Path('lc0/src/python/python_chess.cc')
s = p.read_text()
if 'namespace py = pybind11;' not in s:
    p.write_text(s.replace('namespace lczero {', 'namespace py = pybind11;\n\nnamespace lczero {', 1))
PYFIX
(cd lc0; PATH="$book_work/venv/bin:$PATH" OPENBLAS_NUM_THREADS=1 ../venv/bin/pip install . --no-build-isolation -Cbuild-dir=build-cpu -Csetup-args=-Dplain_cuda=false -Csetup-args=-Dcutlass=false -Csetup-args=-Dispc=false -Csetup-args=-Dgtest=false -Ccompile-args=-j1)
if [[ ! -f BT4-it332.pb.gz ]]; then
 curl -fL --retry 3 -o BT4-it332.pb.gz.part https://storage.lczero.org/files/networks-contrib/BT4-1024x15x32h-swa-6147500-policytune-332.pb.gz
 printf '%s\n' 'e6ada9d6c4a769bfab3aa0848d82caeb809aa45f83e6c605fc58a31d21bdd618  BT4-it332.pb.gz.part' | sha256sum -c -
 gzip -t BT4-it332.pb.gz.part
 mv BT4-it332.pb.gz.part BT4-it332.pb.gz
fi
