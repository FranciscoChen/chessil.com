#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="/home/ubuntu/chessil.com/config.json"
OUTPUT_PATH="/home/ubuntu/chessil.com/database/schema.sql"

if [ -f "${1:-}" ]; then
  CONFIG_PATH="$1"
elif [ -n "${1:-}" ]; then
  OUTPUT_PATH="$1"
fi

if [ ! -f "$CONFIG_PATH" ]; then
  echo "Config not found: $CONFIG_PATH" >&2
  exit 1
fi

POSTGRES_URL="$(node -e "const fs=require('fs');const p=process.argv[1];const c=JSON.parse(fs.readFileSync(p,'utf8'));console.log(c.shared.postgresUrl);" "$CONFIG_PATH")"

if [ -z "$POSTGRES_URL" ]; then
  echo "postgresUrl not found in $CONFIG_PATH" >&2
  exit 1
fi

pg_dump -s -f "$OUTPUT_PATH" "$POSTGRES_URL"

echo "Schema dump saved to $OUTPUT_PATH"
