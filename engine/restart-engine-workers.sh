#!/usr/bin/env bash
set -euo pipefail

workers=(
  chessil-engine-worker@1
  chessil-engine-worker@2
)

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
