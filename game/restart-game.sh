#!/usr/bin/env bash
set -euo pipefail

units=(
  chessil-game@8081
  chessil-game@8082
)

for unit in "${units[@]}"; do
  if sudo systemctl is-active --quiet "$unit"; then
    sudo systemctl restart "$unit"
  else
    sudo systemctl start "$unit"
  fi
done

for unit in "${units[@]}"; do
  sudo systemctl is-active --quiet "$unit"
done

echo "Game instances restarted."
