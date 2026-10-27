#!/usr/bin/env bash
set -euo pipefail

repo_dir="/home/ubuntu/chessil.com"
servers_file="$repo_dir/servers.txt"
state_dir="/home/ubuntu/.local/state/chessil-deploy"

mkdir -p "$state_dir"
exec >> "$state_dir/deploy.log" 2>&1
printf '\n[%s] GitHub push deployment queued.\n' "$(date -Is)"
exec 9>"$state_dir/deploy.lock"
flock 9

if [[ ! -f "$servers_file" ]]; then
  echo "Missing server list: $servers_file" >&2
  exit 1
fi

mapfile -t hosts < <(python3 - "$servers_file" <<'PY'
import ipaddress
import sys

labels = {}
section = ''
with open(sys.argv[1], encoding='utf-8') as servers_file:
    for line in servers_file:
        value = line.strip()
        if not value:
            continue
        try:
            address = ipaddress.ip_address(value)
        except ValueError:
            section = value.lower()
            continue
        if address.version != 4:
            continue
        if 'database server' in section:
            labels['database'] = str(address)
        elif 'websocket server' in section:
            labels['game'] = str(address)
        elif 'stockfish calculating server' in section:
            labels['engine'] = str(address)

for name in ('database', 'engine', 'game'):
    if name not in labels:
        raise SystemExit('Missing IPv4 address for ' + name + ' server in servers.txt')
    print(labels[name])
PY
)
if [[ "${#hosts[@]}" -ne 3 ]]; then
  echo 'Could not read database, engine, and game server addresses.' >&2
  exit 1
fi

deploy_remote() {
  local name="$1"
  local address="$2"
  local script="$3"
  echo "Deploying $name ($address)"
  ssh -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=yes \
    -o IdentitiesOnly=yes "ubuntu@$address" \
    "cd /home/ubuntu/chessil.com && ./$script"
}

cd "$repo_dir"
deploy_remote database "${hosts[0]}" pull-database.sh
deploy_remote engine "${hosts[1]}" pull-engine.sh
deploy_remote game "${hosts[2]}" pull-game.sh
./pull-web.sh
echo "[$(date -Is)] Deployment finished successfully."
