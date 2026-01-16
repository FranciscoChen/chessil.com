#!/usr/bin/env bash
set -euo pipefail

repo_dir="/home/ubuntu/chessil.com"
remote_name="main"
remote_url="https://github.com/FranciscoChen/chessil.com.git"
config_file="/home/ubuntu/chessil.com/restart-services.conf"

cd "$repo_dir"

RESTART_GAME=1
if [ -f "$config_file" ]; then
  . "$config_file"
fi

should_restart() {
  local repo_flag="$1"
  local script_path="$2"
  local var="RESTART_SCRIPT_${script_path//[^a-zA-Z0-9]/_}"
  local script_flag="${!var-}"
  if [ -n "${script_flag:-}" ]; then
    [ "$script_flag" = "1" ]
  else
    [ "$repo_flag" = "1" ]
  fi
}

if git remote | grep -qx "$remote_name"; then
  git remote set-url "$remote_name" "$remote_url"
else
  git remote add "$remote_name" "$remote_url"
fi

git checkout main
old_rev="$(git rev-parse HEAD)"
git fetch "$remote_name"
git reset --hard "$remote_name"/main
new_rev="$(git rev-parse HEAD)"

if [[ "$old_rev" == "$new_rev" ]]; then
  echo "No updates."
  exit 0
fi

if should_restart "$RESTART_GAME" "game/restart-game.sh"; then
  ./game/restart-game.sh
else
  echo "Restart disabled for game/restart-game.sh."
fi
echo "Game updated."
