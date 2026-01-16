#!/usr/bin/env bash
set -euo pipefail

service_src="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/systemd/chessil-game@.service"
service_dst="/etc/systemd/system/chessil-game@.service"

if [[ ! -f "$service_src" ]]; then
  echo "Missing service file: $service_src" >&2
  exit 1
fi

sudo cp "$service_src" "$service_dst"
sudo systemctl daemon-reload
sudo systemctl enable --now chessil-game@8081 chessil-game@8082

echo "Installed and started chessil-game@8081 and chessil-game@8082."
