'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

const port = Number(process.env.PORT);
const secret = process.env.GITHUB_WEBHOOK_SECRET || '';
const repository = process.env.GITHUB_REPOSITORY || 'FranciscoChen/chessil.com';
const ref = process.env.GITHUB_REF || 'refs/heads/main';
const deployScript = process.env.DEPLOY_SCRIPT || '/home/ubuntu/chessil.com/deploy-hook/deploy-all.sh';
const logFile = process.env.DEPLOY_LOG || '/home/ubuntu/.local/state/chessil-deploy/deploy.log';
const maxBodyBytes = 1024 * 1024;
const webhookPath = '/api/github/push-webhook';

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
if (secret.length < 32) throw new Error('GITHUB_WEBHOOK_SECRET must be at least 32 characters');

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function signatureMatches(rawBody, signature) {
  if (typeof signature !== 'string' || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
  const supplied = Buffer.from(signature);
  return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

function readBody(req, res, callback) {
  const chunks = [];
  let size = 0;
  let finished = false;
  req.on('data', chunk => {
    size += chunk.length;
    if (size > maxBodyBytes) {
      finished = true;
      json(res, 413, { error: 'Payload too large' });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('error', err => {
    if (finished) return;
    finished = true;
    console.error('webhook body read failed:', err.message);
    if (!res.headersSent) json(res, 400, { error: 'Invalid request body' });
  });
  req.on('end', () => {
    if (finished) return;
    finished = true;
    callback(Buffer.concat(chunks));
  });
}

function startDeployment(delivery, res) {
  let logFd;
  let child;
  let logClosed = false;
  function closeLog() {
    if (logClosed || logFd === undefined) return;
    logClosed = true;
    fs.closeSync(logFd);
  }
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true, mode: 0o700 });
    logFd = fs.openSync(logFile, 'a', 0o600);
    child = spawn(deployScript, [], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: process.env
    });
  } catch (err) {
    closeLog();
    console.error('could not start deploy script:', err.message);
    json(res, 500, { error: 'Could not start deployment' });
    return;
  }
  child.once('error', err => {
    closeLog();
    console.error('deploy process failed to start:', err.message);
    if (!res.headersSent) json(res, 500, { error: 'Could not start deployment' });
  });
  child.once('spawn', () => {
    closeLog();
    child.unref();
    console.log('deployment accepted:', delivery);
    json(res, 202, { accepted: true });
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, { ok: true });
  if (req.url !== webhookPath) return json(res, 404, { error: 'Not found' });
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  readBody(req, res, rawBody => {
    if (!signatureMatches(rawBody, req.headers['x-hub-signature-256'])) {
      return json(res, 401, { error: 'Invalid signature' });
    }

    const event = req.headers['x-github-event'];
    if (event === 'ping') return json(res, 200, { ok: true });
    if (event !== 'push') return json(res, 202, { accepted: false, reason: 'Ignored event' });

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (_) {
      return json(res, 400, { error: 'Invalid JSON' });
    }
    if (!payload || !payload.repository || payload.repository.full_name !== repository || payload.ref !== ref) {
      return json(res, 202, { accepted: false, reason: 'Ignored repository or branch' });
    }

    const delivery = String(req.headers['x-github-delivery'] || 'unknown').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 80);
    startDeployment(delivery, res);
  });
});

server.headersTimeout = 10000;
server.requestTimeout = 15000;
server.keepAliveTimeout = 5000;
server.listen(port, '127.0.0.1', () => console.log('deploy webhook listening:', port));

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
