#!/usr/bin/env bash
set -euo pipefail

current="$(crontab -l 2>/dev/null || true)"
updated="$(printf '%s\n' "$current" | awk '!/\/home\/ubuntu\/chessil\.com\/pull-(web|game|engine|database)\.sh/')"
if [[ "$current" == "$updated" ]]; then
  echo 'No Chessil polling cron job found.'
  exit 0
fi

backup="/home/ubuntu/crontab.before-push-deploy.$(date +%Y%m%d%H%M%S)"
printf '%s\n' "$current" > "$backup"
printf '%s\n' "$updated" | crontab -
if crontab -l 2>/dev/null | grep -Eq '/home/ubuntu/chessil\.com/pull-(web|game|engine|database)\.sh'; then
  echo 'Failed to remove all Chessil polling jobs.' >&2
  exit 1
fi
echo "Removed Chessil polling jobs. Previous crontab saved to $backup"
