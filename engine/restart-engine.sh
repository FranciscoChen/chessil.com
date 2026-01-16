#!/usr/bin/env bash
set -euo pipefail

api_units=(
  chessil-engine-api@8081
  chessil-engine-api@8082
)

service_units=(
  chessil-engine-queue
  chessil-engine-worker@1
  chessil-engine-worker@2
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
