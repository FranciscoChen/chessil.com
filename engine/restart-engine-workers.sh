#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/engine-services.conf"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Missing config: $CONFIG_FILE" >&2
  exit 1
fi

. "$CONFIG_FILE"
: "${ENGINE_WORKER_COUNT:?Missing ENGINE_WORKER_COUNT in $CONFIG_FILE}"

workers=()
for i in $(seq 1 "$ENGINE_WORKER_COUNT"); do
  workers+=("chessil-engine-worker@${i}")
done

for unit in "${workers[@]}"; do
  if sudo systemctl is-active --quiet "$unit"; then
    sudo systemctl restart "$unit"
  else
    sudo systemctl start "$unit"
  fi
done

for unit in "${workers[@]}"; do
  sudo systemctl is-active --quiet "$unit"
done

echo "Engine workers restarted."
