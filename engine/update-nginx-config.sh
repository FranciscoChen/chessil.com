#!/usr/bin/env bash
set -euo pipefail

SRC="/home/ubuntu/chessil.com/engine/nginx-engine-upstream.conf"
DEST="/etc/nginx/sites-enabled/default"
BACKUP_DIR="/etc/nginx/backups"
BACKUP="${BACKUP_DIR}/default.$(date +%Y%m%d-%H%M%S).bak"

if [ ! -f "$SRC" ]; then
  echo "Source config not found: $SRC" >&2
  exit 1
fi

if [ -f "$DEST" ]; then
  sudo mkdir -p "$BACKUP_DIR"
  sudo cp -a "$DEST" "$BACKUP"
  echo "Backup saved to $BACKUP"
fi

sudo install -m 0644 "$SRC" "$DEST"

sudo nginx -t
sudo systemctl reload nginx

echo "Nginx config updated."
