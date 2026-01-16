#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
STOCKFISH_DIR="${SCRIPT_DIR}/Stockfish"
CONFIG_FILE="${SCRIPT_DIR}/engine-services.conf"

cd "$SCRIPT_DIR"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "Missing config: $CONFIG_FILE" >&2
  exit 1
fi

. "$CONFIG_FILE"
: "${ENGINE_WORKER_COUNT:?Missing ENGINE_WORKER_COUNT in $CONFIG_FILE}"

repo_changed=0
if [ ! -d "$STOCKFISH_DIR/.git" ]; then
  echo "Cloning official Stockfish repository..."
  git clone https://github.com/official-stockfish/Stockfish.git "$STOCKFISH_DIR"
  repo_changed=1
fi

cd "$STOCKFISH_DIR"

echo "Adding official Stockfish's public GitHub repository URL as a remote in my local git repository..."
git remote add official https://github.com/official-stockfish/Stockfish.git 2>/dev/null || true
git remote set-url official https://github.com/official-stockfish/Stockfish.git
echo "Downloading official Stockfish's branches and commits..."
git checkout master
echo "Updating my local master branch with the new commits from official Stockfish's master..."
git reset --hard
if [ "$repo_changed" -eq 0 ] && [ $(git pull|grep "up to date"|wc -l) -eq 1 ] 
then
echo "No need to do anything."
else
echo "Compiling new master..."
cd "${STOCKFISH_DIR}/src"
make clean
make build

# Remove old nn files
ls -t "${STOCKFISH_DIR}/src/nn-*.nnue" 2>/dev/null | tail -n +2 | xargs -r rm -f

# Move and overwrite stockfish
mv -f stockfish "$SCRIPT_DIR"
# Restart the workers to pick up the new binary
worker_units=()
for i in $(seq 1 "$ENGINE_WORKER_COUNT"); do
  worker_units+=("chessil-engine-worker@${i}")
done
sudo systemctl restart "${worker_units[@]}"
fi
echo "Done."
