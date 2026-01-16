#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/engine-services.conf"
STOCKFISH_DIR="${SCRIPT_DIR}/Stockfish"
STOCKFISH_BIN="${SCRIPT_DIR}/stockfish"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Missing config: $CONFIG_FILE" >&2
  exit 1
fi

. "$CONFIG_FILE"
: "${ENGINE_WORKER_COUNT:?Missing ENGINE_WORKER_COUNT in $CONFIG_FILE}"

if [ ! -x "${STOCKFISH_DIR}/src/stockfish" ]; then
  echo "Missing compiled binary: ${STOCKFISH_DIR}/src/stockfish" >&2
  exit 1
fi

cd "${STOCKFISH_DIR}/src"

# Move and overwrite stockfish
if install -m 0755 stockfish "$STOCKFISH_BIN"; then
  :
elif [ "$(id -u)" -ne 0 ]; then
  sudo install -m 0755 stockfish "$STOCKFISH_BIN"
else
  echo "Failed to install stockfish to $STOCKFISH_BIN" >&2
  exit 1
fi

# Restart the workers to pick up the new binary
worker_units=()
for i in $(seq 1 "$ENGINE_WORKER_COUNT"); do
  worker_units+=("chessil-engine-worker@${i}")
done
sudo systemctl restart "${worker_units[@]}"

echo "Stockfish binary installed and workers restarted."
