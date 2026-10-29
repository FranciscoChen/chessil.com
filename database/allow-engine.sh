#!/usr/bin/env bash
# Run on the database host. Permit only this engine IP, database, role and SSL.
set -euo pipefail
engine_ip="${1:?Usage: allow-engine.sh IPv4 [database] [role]}"
database_name="${2:-chessil}"
database_role="${3:-postgres}"
if [[ ! "$database_name" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ || ! "$database_role" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo 'Invalid database/role name' >&2
  exit 1
fi
python3 - "$engine_ip" <<'PY'
import ipaddress, sys
if ipaddress.ip_address(sys.argv[1]).version != 4:
    raise SystemExit('Provide the engine IPv4 address')
PY
cd /tmp
hba_file="$(sudo -u postgres psql -Atqc 'SHOW hba_file')"
sudo python3 - "$hba_file" "$engine_ip" "$database_name" "$database_role" <<'PY'
from pathlib import Path
from datetime import datetime, timezone
import shutil, sys
path = Path(sys.argv[1])
rule = f'hostssl {sys.argv[3]} {sys.argv[4]} {sys.argv[2]}/32 scram-sha-256'
text = path.read_text()
if rule not in text.splitlines():
    backup = str(path) + '.before-fairplay-' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    shutil.copy2(path, backup)
    path.write_text(text.rstrip() + '\n# Engine fair-play public summary writer\n' + rule + '\n')
PY
errors="$(sudo -u postgres psql -Atqc 'SELECT count(*) FROM pg_hba_file_rules WHERE error IS NOT NULL')"
[ "$errors" = 0 ]
sudo -u postgres psql -v ON_ERROR_STOP=1 -Atqc 'SELECT pg_reload_conf()'
echo 'Engine SSL database rule installed.'
