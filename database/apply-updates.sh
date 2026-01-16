#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "$script_dir/.." && pwd)"
config_path="$root_dir/config.json"
updates_path="$script_dir/updates.sql"
executed_path="$script_dir/executed.sql"

if [[ ! -f "$config_path" ]]; then
  echo "Missing config.json at $config_path" >&2
  exit 1
fi

if [[ ! -f "$updates_path" ]]; then
  echo "Missing updates.sql at $updates_path" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is not installed or not in PATH" >&2
  exit 1
fi

postgres_url="$(python3 - "$config_path" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print(data["shared"]["postgresUrl"])
PY
)"

if [[ -z "$postgres_url" ]]; then
  echo "postgresUrl is empty in config.json" >&2
  exit 1
fi

if ! grep -q "[^[:space:]]" "$updates_path"; then
  echo "updates.sql is empty; nothing to apply."
  exit 0
fi

if [[ -f "$executed_path" ]] && cmp -s "$updates_path" "$executed_path"; then
  echo "updates.sql already executed; no changes detected."
  exit 0
fi

psql "$postgres_url" -v ON_ERROR_STOP=1 -f "$updates_path"

cp "$updates_path" "$executed_path"
echo "updates.sql executed and recorded."
