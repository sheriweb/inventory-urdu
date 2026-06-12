/**
 * Hostinger / Passenger entry (CommonJS — no ESM issues).
 * Entry file in hPanel: node scripts/hostinger-entry.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const webDir = path.join(root, 'apps/web');
const apiDir = path.join(root, 'apps/api');
const tmpDir = path.join(root, 'tmp');
const logPath = path.join(tmpDir, 'hostinger.log');
const standaloneDir = path.join(webDir, '.next/standalone');
const standaloneServer = path.join(standaloneDir, 'apps/web/server.js');

function log(message) {
  const line = `[${new Date().toISOString()}] [entry] ${message}`;
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.appendFileSync(logPath, `${line}\n`);
  } catch {
    /* ignore */
  }
  console.log(line);
}

function loadEnvFile(filePath) {
  try {
    for (const raw of fs.readFileSync(filePath, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key === 'DATABASE_URL') value = value.replace(/\\%40/g, '%40');
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value;
      }
    }
  } catch {
    /* ignore */
  }
}

process.on('uncaughtException', (err) => {
  log(`uncaughtException: ${err?.stack || err}`);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  log(`unhandledRejection: ${err?.stack || err}`);
  process.exit(1);
});

for (const file of [
  path.join(root, 'hostinger-production.env'),
  path.join(root, 'deploy/hostinger-production.env'),
  path.join(root, '.env'),
  path.join(apiDir, '.env'),
]) {
  loadEnvFile(file);
}

process.env.NODE_ENV = 'production';
process.env.HOSTINGER_COMBINED = '1';
process.env.INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4001';
process.env.PORT = String(process.env.PORT || process.env.PASSENGER_PORT || '3000');
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
process.env.NODE_OPTIONS = process.env.WEB_NODE_OPTIONS || '--max-old-space-size=256';

log(`Boot pid=${process.pid} PORT=${process.env.PORT} cwd=${process.cwd()}`);

if (!fs.existsSync(path.join(apiDir, 'dist/main.js'))) {
  log('FATAL: apps/api/dist/main.js missing');
  process.exit(1);
}
if (!fs.existsSync(standaloneServer)) {
  log(`FATAL: standalone server missing: ${standaloneServer}`);
  process.exit(1);
}

const staticDir = path.join(standaloneDir, 'apps/web/.next/static');
if (!fs.existsSync(staticDir)) {
  log(`WARN: standalone static missing at ${staticDir} — run hostinger-standalone-assets.sh`);
}

const apiScript = path.join(root, 'scripts/start-api-hostinger.sh');
setTimeout(() => {
  if (!fs.existsSync(apiScript)) return;
  log('Starting API in background…');
  spawn('/bin/bash', [apiScript], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, SKIP_DB_PUSH_ON_START: '1' },
  }).unref();
}, 60_000);

log(`Loading standalone server: ${standaloneServer}`);
try {
  require(standaloneServer);
  log('Standalone server module loaded — waiting for Next.js Ready…');
} catch (err) {
  log(`FATAL load error: ${err?.stack || err}`);
  process.exit(1);
}
