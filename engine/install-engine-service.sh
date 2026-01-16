#!/usr/bin/env bash
set -euo pipefail

service_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/systemd"

if [[ ! -d "$service_dir" ]]; then
  echo "Missing service dir: $service_dir" >&2
  exit 1
fi

sudo cp "$service_dir/chessil-engine-api@.service" /etc/systemd/system/
sudo cp "$service_dir/chessil-engine-queue.service" /etc/systemd/system/
sudo cp "$service_dir/chessil-engine-worker@.service" /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now chessil-engine-queue chessil-engine-worker@1 chessil-engine-worker@2 chessil-engine-api@8081 chessil-engine-api@8082

echo "Installed and started engine services."
