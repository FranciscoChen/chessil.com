#!/usr/bin/env bash
set -euo pipefail

service_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/systemd"
config_file="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/engine-services.conf"

if [[ ! -d "$service_dir" ]]; then
  echo "Missing service dir: $service_dir" >&2
  exit 1
fi

if [[ ! -f "$config_file" ]]; then
  echo "Missing config: $config_file" >&2
  exit 1
fi

. "$config_file"
: "${ENGINE_WORKER_COUNT:?Missing ENGINE_WORKER_COUNT in $config_file}"
: "${ENGINE_API_PORTS:?Missing ENGINE_API_PORTS in $config_file}"

sudo cp "$service_dir/chessil-engine-api@.service" /etc/systemd/system/
sudo cp "$service_dir/chessil-engine-queue.service" /etc/systemd/system/
sudo cp "$service_dir/chessil-engine-worker@.service" /etc/systemd/system/

sudo systemctl daemon-reload
worker_units=()
for i in $(seq 1 "$ENGINE_WORKER_COUNT"); do
  worker_units+=("chessil-engine-worker@${i}")
done
api_units=()
read -r -a api_ports <<< "$ENGINE_API_PORTS"
for port in "${api_ports[@]}"; do
  api_units+=("chessil-engine-api@${port}")
done
sudo systemctl enable --now chessil-engine-queue "${worker_units[@]}" "${api_units[@]}"

echo "Installed and started engine services."
