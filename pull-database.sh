#!/usr/bin/env bash
set -euo pipefail

repo_dir="/home/ubuntu/chessil.com"
remote_name="main"
remote_url="https://github.com/FranciscoChen/chessil.com.git"

cd "$repo_dir"

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

./database/apply-updates.sh
echo "Database updates applied."
