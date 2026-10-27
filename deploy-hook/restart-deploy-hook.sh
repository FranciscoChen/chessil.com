#!/usr/bin/env bash
set -euo pipefail

units=(chessil-deploy-hook@8093 chessil-deploy-hook@8094)
for unit in "${units[@]}"; do
  sudo systemctl restart "$unit"
  port="${unit##*@}"
  ready=0
  for _ in $(seq 1 30); do
    if curl --fail --silent "http://127.0.0.1:${port}/health" >/dev/null; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "$ready" -ne 1 ]]; then
    echo "Deploy hook did not become healthy on port $port" >&2
    exit 1
  fi
done
echo 'Deploy hook instances restarted.'
