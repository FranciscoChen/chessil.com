#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8090}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
SERVICE_FILE="${ROOT_DIR}/notify/systemd/chessil-notify@.service"
NGINX_SNIPPET="${ROOT_DIR}/notify/nginx/notify-location.conf"

if [[ ! -f "${SERVICE_FILE}" ]]; then
  echo "Missing service file: ${SERVICE_FILE}" >&2
  exit 1
fi

if [[ ! -f "${NGINX_SNIPPET}" ]]; then
  echo "Missing nginx snippet: ${NGINX_SNIPPET}" >&2
  exit 1
fi

echo "Copying systemd unit..."
sudo cp "${SERVICE_FILE}" /etc/systemd/system/

sudo systemctl daemon-reload
sudo systemctl enable --now "chessil-notify@${PORT}"

echo "Installed systemd unit chessil-notify@${PORT}"
echo "Nginx snippet (include in your HTTPS server block):"
echo "  ${NGINX_SNIPPET}"
