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
: "${ENGINE_API_PORTS:?Missing ENGINE_API_PORTS in $CONFIG_FILE}"

read -r -a api_ports <<< "$ENGINE_API_PORTS"
api_units=()
for port in "${api_ports[@]}"; do
  api_units+=("chessil-engine-api@${port}")
done

worker_units=()
for i in $(seq 1 "$ENGINE_WORKER_COUNT"); do
  worker_units+=("chessil-engine-worker@${i}")
done

service_units=(
  chessil-engine-queue
  "${worker_units[@]}"
)

for unit in "${api_units[@]}"; do
  if sudo systemctl is-active --quiet "$unit"; then
    sudo systemctl restart "$unit"
  else
    sudo systemctl start "$unit"
  fi
done

for unit in "${service_units[@]}"; do
  if sudo systemctl is-active --quiet "$unit"; then
    sudo systemctl restart "$unit"
  else
    sudo systemctl start "$unit"
  fi
done

for unit in "${api_units[@]}" "${service_units[@]}"; do
  sudo systemctl is-active --quiet "$unit"
done

echo "Engine services restarted."
