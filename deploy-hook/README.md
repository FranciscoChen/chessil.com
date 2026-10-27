# GitHub push deployment

The web host receives signed GitHub push webhooks and deploys the same `main` commit to the database, engine, game, and web hosts. Deployments run in order and serialize through a host-local lock. The service pull scripts still fetch the pushed branch; GitHub webhooks replace their cron polling triggers.

## Webhook setup

1. On the web host, generate and store a secret:
   ```bash
   sudo install -d -o root -g ubuntu -m 0750 /etc/chessil
   secret="$(openssl rand -hex 32)"
   printf 'GITHUB_WEBHOOK_SECRET=%s\n' "$secret" | sudo tee /etc/chessil/deploy-hook.env >/dev/null
   sudo chown root:ubuntu /etc/chessil/deploy-hook.env
   sudo chmod 0640 /etc/chessil/deploy-hook.env
   printf 'Use this as the GitHub webhook secret: %s\n' "$secret"
   unset secret
   ```
2. Run `./deploy-hook/install.sh` from `/home/ubuntu/chessil.com`.
3. In GitHub repository settings, add a webhook pointing to `https://chessil.com/api/github/push-webhook`, choose `application/json`, paste the same secret, and subscribe to **Push events**.
4. Confirm GitHub's ping delivery succeeds. Then run `./deploy-hook/switch-to-webhooks.sh` once on the web host. It backs up each crontab and removes only the four Chessil pull jobs.

The receiver accepts only signed pushes to `FranciscoChen/chessil.com` on `main`. It returns `202` after starting the deployment; progress and errors are written to `/home/ubuntu/.local/state/chessil-deploy/deploy.log`.

## Operations

- Health: `curl http://127.0.0.1:8091/health` and port `8092`.
- Logs: `tail -f /home/ubuntu/.local/state/chessil-deploy/deploy.log` and `journalctl -u 'chessil-deploy-hook@*'`.
- Restart the two receiver instances one at a time with `./deploy-hook/restart-deploy-hook.sh`.
- The Nginx upstream and exact webhook location are included in `web/nginx-web-upstream.conf`.
