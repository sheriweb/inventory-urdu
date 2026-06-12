#!/usr/bin/env node
/**
 * Hostinger hPanel entry file: server.js  (.js required — do not use .sh here)
 */
const { spawn } = require('node:child_process');
const net = require('node:net');
const {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} = require('node:fs');
const path = require('node:path');

const root = __dirname;
const webDir = path.join(root, 'apps/web');
const apiDir = path.join(root, 'apps/api');
const tmpDir = path.join(root, 'tmp');
const logPath = path.join(tmpDir, 'hostinger.log');
const webBootDir = path.join(tmpDir, 'web-boot.dir');
const apiScheduleDir = path.join(tmpDir, 'api-schedule.dir');
const modulesDir = path.join(root, 'node_modules');
const API_START_DELAY_MS = Number(process.env.API_START_DELAY_MS || 180_000);

function logLine(message) {
  const line = `[${new Date().toISOString()}] [hostinger] ${message}`;
  try {
    mkdirSync(tmpDir, { recursive: true });
    appendFileSync(logPath, `${line}\n`);
  } catch {
    /* ignore */
  }
  console.log(line);
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

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function writeEnvFile(filePath, env) {
  const lines = Object.entries(env)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${shellQuote(value)}`);
  writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isPortOpen(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port: Number(port), host }, () => {
      socket.end();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.setTimeout(800, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function fixPrismaEnginePermissions(dir) {
  const enginesDir = path.join(dir, '@prisma/engines');
  if (!existsSync(enginesDir)) return;
  for (const name of readdirSync(enginesDir)) {
    if (!name.startsWith('schema-engine') && !name.startsWith('libquery_engine')) continue;
    try {
      chmodSync(path.join(enginesDir, name), 0o755);
    } catch {
      /* ignore */
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startApiDetached(apiEnv) {
  const apiNode =
    process.env.API_NODE_BIN ||
    (existsSync('/opt/alt/alt-nodejs20/root/bin/node')
      ? '/opt/alt/alt-nodejs20/root/bin/node'
      : process.execPath);
  apiEnv.HOSTINGER_COMBINED = '1';
  apiEnv.LAZY_DB_CONNECT = '1';
  apiEnv.UV_THREADPOOL_SIZE = '2';
  apiEnv.API_NODE_BIN = apiNode;
  apiEnv.SKIP_DB_PUSH_ON_START = '1';
  writeEnvFile(path.join(tmpDir, 'api.env'), apiEnv);
  const startScript = path.join(root, 'scripts/start-api-hostinger.sh');
  chmodSync(startScript, 0o755);
  spawn('/bin/bash', [startScript], {
    env: { ...apiEnv, PATH: process.env.PATH || '/usr/bin:/bin', HOME: process.env.HOME || root },
    detached: true,
    stdio: 'ignore',
  }).unref();
}

async function ensureSingleWebBoot(webPort) {
  if (await isPortOpen(webPort, '127.0.0.1')) {
    logLine(`PORT ${webPort} already listening — duplicate worker exits`);
    process.exit(0);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      mkdirSync(webBootDir);
      writeFileSync(path.join(webBootDir, 'pid'), String(process.pid));
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }

    for (let i = 0; i < 20; i += 1) {
      await sleep(500);
      if (await isPortOpen(webPort, '127.0.0.1')) {
        logLine(`PORT ${webPort} is up — duplicate worker exits`);
        process.exit(0);
      }
    }

    try {
      rmSync(webBootDir, { recursive: true, force: true });
    } catch {
      logLine('Boot lock busy — duplicate worker exits');
      process.exit(0);
    }
  }

  logLine('Could not acquire web boot lock — duplicate worker exits');
  process.exit(0);
}

process.on('uncaughtException', (err) => {
  logLine(`uncaughtException: ${err?.stack || err}`);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  logLine(`unhandledRejection: ${err?.stack || err}`);
  process.exit(1);
});

for (const file of [
  path.join(root, 'hostinger-production.env'),
  path.join(root, 'deploy/hostinger-production.env'),
  path.join(root, '.env'),
  path.join(apiDir, '.env'),
]) {
  loadDotEnv(file);
}

mkdirSync(tmpDir, { recursive: true });
process.chdir(root);
fixPrismaEnginePermissions(modulesDir);
fixPrismaEnginePermissions(path.join(apiDir, 'node_modules'));

const apiPort = process.env.API_INTERNAL_PORT || '4001';
const webPort = process.env.PORT || process.env.PASSENGER_PORT || '3000';

process.env.NODE_ENV = 'production';
process.env.HOSTINGER_COMBINED = '1';
process.env.INTERNAL_API_URL = process.env.INTERNAL_API_URL || `http://127.0.0.1:${apiPort}`;
process.env.HOSTNAME = process.env.HOSTNAME || '0.0.0.0';
process.env.PORT = String(webPort);
process.env.NODE_OPTIONS = process.env.WEB_NODE_OPTIONS || '--max-old-space-size=256';

logLine(`Boot pid=${process.pid} PORT=${webPort} cwd=${process.cwd()}`);

if (!existsSync(path.join(apiDir, 'dist/main.js'))) {
  logLine('FATAL: apps/api/dist/main.js missing — run npm run hostinger:build');
  process.exit(1);
}
if (!existsSync(path.join(webDir, '.next/BUILD_ID'))) {
  logLine('FATAL: apps/web/.next build missing — run npm run hostinger:build');
  process.exit(1);
}

(async () => {
  await ensureSingleWebBoot(webPort);

  const nodePath = [modulesDir, path.join(apiDir, 'node_modules'), path.join(webDir, 'node_modules')]
    .filter((p) => existsSync(p))
    .join(path.delimiter);
  process.env.NODE_PATH = nodePath;

  try {
    writeFileSync(path.join(tmpDir, 'restart.txt'), String(Date.now()));
  } catch {
    /* ignore */
  }

  if (process.env.START_API_ON_BOOT === '1') {
    try {
      mkdirSync(apiScheduleDir);
      const apiEnv = {
        PATH: process.env.PATH || '/usr/bin:/bin',
        HOME: process.env.HOME,
        LANG: process.env.LANG || 'en_US.UTF-8',
        DATABASE_URL: process.env.DATABASE_URL,
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        PORT: apiPort,
        API_PORT: apiPort,
        NODE_ENV: 'production',
        NODE_OPTIONS: process.env.API_NODE_OPTIONS || '--max-old-space-size=128',
        NODE_PATH: nodePath,
      };
      setTimeout(async () => {
        if (await isPortOpen(apiPort)) {
          logLine(`API already on 127.0.0.1:${apiPort}`);
          return;
        }
        logLine(`Starting API on 127.0.0.1:${apiPort} (delay ${API_START_DELAY_MS}ms)…`);
        startApiDetached(apiEnv);
      }, API_START_DELAY_MS);
    } catch {
      logLine('API start already scheduled');
    }
  }

  const nextBin = path.join(modulesDir, 'next/dist/bin/next');
  if (!existsSync(nextBin)) {
    logLine(`FATAL: next binary missing at ${nextBin}`);
    process.exit(1);
  }

  logLine(`Starting next start on 0.0.0.0:${webPort} from ${webDir}…`);
  process.chdir(webDir);
  process.argv = [process.argv[0], nextBin, 'start', '-p', String(webPort), '-H', '0.0.0.0'];
  require(nextBin);
})().catch((err) => {
  logLine(`FATAL boot error: ${err?.stack || err}`);
  process.exit(1);
});
