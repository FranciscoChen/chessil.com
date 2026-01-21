#!/usr/bin/env bash
set -euo pipefail

# Fill these in before running.
SRC="/path/to/chessil.com/bot-client/"
DEST="/path/to/copied/bot-client/"

rsync -az --delete \
  --exclude "node_modules/" \
  --exclude "state/" \
  --exclude "config.json" \
  "$SRC" "$DEST"
