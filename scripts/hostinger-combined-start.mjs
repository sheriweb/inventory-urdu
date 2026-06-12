#!/usr/bin/env node
/**
 * Hostinger entry file — ONE Node process listens on PORT (Passenger requirement).
 * Do NOT spawn a child for the web server; Passenger proxies this process.
 */
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(root, 'apps/web');
const apiDir = path.join(root, 'apps/api');
const tmpDir = path.join(root, 'tmp');
const logPath = path.join(tmpDir, 'hostinger.log');
const standaloneDir = path.join(webDir, '.next/standalone');
const standaloneServer = path.join(standaloneDir, 'apps/web/server.js');

function log(message) {
  const line = `[${new Date().toISOString()}] [hostinger] ${message}\n`;
  try {
    appendFileSync(logPath, line);
  } catch {
    /* ignore */
  }
  console.log(message);
}

function loadDotEnv(filePath) {
  try {
    for (const raw of readFileSync(filePath, 'utf8').split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (key === 'DATABASE_URL') value = value.replace(/\\%40/g, '%40');
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value;
      }
    }
  } catch {
    /* ignore */
  }
}

mkdirSync(tmpDir, { recursive: true });
process.chdir(root);

for (const file of [
  path.join(root, 'hostinger-production.env'),
  path.join(root, 'deploy/hostinger-production.env'),
  path.join(root, '.env'),
  path.join(apiDir, '.env'),
]) {
  loadDotEnv(file);
}

process.env.NODE_ENV = 'production';
process.env.HOSTINGER_COMBINED = '1';
process.env.INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:4001';
process.env.PORT = process.env.PORT || process.env.PASSENGER_PORT || '3000';
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
process.env.NODE_OPTIONS = process.env.WEB_NODE_OPTIONS || '--max-old-space-size=256';

log(`Boot pid=${process.pid} PORT=${process.env.PORT}`);

if (!existsSync(path.join(apiDir, 'dist/main.js'))) {
  log('FATAL: apps/api/dist/main.js missing — run npm run hostinger:build');
  process.exit(1);
}
if (!existsSync(path.join(webDir, '.next/BUILD_ID'))) {
  log('FATAL: apps/web/.next build missing — run npm run hostinger:build');
  process.exit(1);
}

const apiStart = path.join(root, 'scripts/start-api-hostinger.sh');
if (existsSync(apiStart)) {
  chmodSync(apiStart, 0o755);
  setTimeout(() => {
    log('Starting API in background…');
    spawn('/bin/bash', [apiStart], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, SKIP_DB_PUSH_ON_START: '1' },
    }).unref();
  }, 45_000);
}

if (existsSync(standaloneServer)) {
  log(`Starting standalone server: ${standaloneServer}`);
  process.chdir(standaloneDir);
  const require = createRequire(import.meta.url);
  require('./apps/web/server.js');
} else {
  log('Standalone missing — falling back to next start');
  const nextBin = path.join(root, 'node_modules/next/dist/bin/next');
  if (!existsSync(nextBin)) {
    log(`FATAL: next binary missing at ${nextBin}`);
    process.exit(1);
  }
  spawn(process.execPath, [nextBin, 'start', '-p', process.env.PORT, '-H', '0.0.0.0'], {
    stdio: 'inherit',
    env: process.env,
    cwd: webDir,
  }).on('exit', (code) => process.exit(code ?? 1));
}
