#!/usr/bin/env bash
set -euo pipefail

repo_dir="/home/ubuntu/chessil.com"
env_file="/etc/chessil/deploy-hook.env"
unit_file="$repo_dir/deploy-hook/chessil-deploy-hook@.service"

if [[ ! -f "$env_file" ]] || ! sudo grep -Eq '^GITHUB_WEBHOOK_SECRET=.{32,}$' "$env_file"; then
  cat >&2 <<EOF
Create $env_file with a strong webhook secret first:
  sudo install -d -o root -g ubuntu -m 0750 /etc/chessil
  sudoedit $env_file
Add: GITHUB_WEBHOOK_SECRET=<same secret configured in GitHub>
Then run this installer again.
EOF
  exit 1
fi

sudo install -o root -g root -m 0644 "$unit_file" /etc/systemd/system/chessil-deploy-hook@.service
sudo systemctl daemon-reload
sudo systemctl enable --now chessil-deploy-hook@8093 chessil-deploy-hook@8094

for port in 8093 8094; do
  ready=0
  for _ in $(seq 1 30); do
    if curl --fail --silent "http://127.0.0.1:${port}/health" >/dev/null; then
      ready=1
      break
    fi
    sleep 1
  done
  if [[ "$ready" -ne 1 ]]; then
    echo "Deploy hook failed its health check on port $port" >&2
    exit 1
  fi
done

"$repo_dir/web/update-nginx-config.sh"
echo 'Deploy hook is installed. Add a GitHub push webhook before switching off the polling jobs.'
