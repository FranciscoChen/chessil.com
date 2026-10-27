#!/usr/bin/env bash
set -euo pipefail

units=(
  chessil-web@8081
  chessil-web@8082
)

for unit in "${units[@]}"; do
  if sudo systemctl is-active --quiet "$unit"; then
    sudo systemctl restart "$unit"
  else
    sudo systemctl start "$unit"
  fi
  port="${unit##*@}"
  ready=0
  for _ in $(seq 1 30); do
    if curl --fail --silent --max-time 2 "http://127.0.0.1:${port}/login" >/dev/null; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "$ready" -ne 1 ]]; then
    echo "Web instance $unit did not become healthy" >&2
    exit 1
  fi
done

echo "Web instances restarted."
