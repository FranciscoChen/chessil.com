#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
revision=d91bd1443ac1a4f367de96d3569dce7bbd35920a
venv/bin/python -u generate.py --weights BT4-it332.pb.gz --lc0-revision "$revision" --benchmark 100
venv/bin/python - <<'PY'
import json
from pathlib import Path
r=json.loads(Path('bt4-book-work/benchmark.json').read_text())
if r['positions_per_second'] < 1/30:
    raise SystemExit('Benchmark below 1 position / 30 seconds; full generation deferred.')
print('Benchmark passed; starting checkpointed generation.', flush=True)
PY
venv/bin/python -u generate.py --weights BT4-it332.pb.gz --lc0-revision "$revision"
venv/bin/python verify_uci.py --engine venv/bin/lc0 --weights BT4-it332.pb.gz
