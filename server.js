#!/usr/bin/env node
/**
 * Hostinger hPanel entry file: server.js
 *
 * One Passenger process runs `next start` from apps/web/.next.
 * Bootstrap lock + delayed API avoid duplicate PORT binds and process-limit crashes.
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
  unlinkSync,
  writeFileSync,
} = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname);
const apiDir = path.join(root, 'apps/api');
const webDir = path.join(root, 'apps/web');
const tmpDir = path.join(root, 'tmp');
const logPath = path.join(tmpDir, 'hostinger.log');
const bootstrapLockPath = path.join(tmpDir, 'web-bootstrap.lock');
const maintenanceFlag = path.join(root, '.maintenance');
const node = process.execPath;
const apiNode =
  process.env.API_NODE_BIN ||
  (existsSync('/opt/alt/alt-nodejs20/root/bin/node')
    ? '/opt/alt/alt-nodejs20/root/bin/node'
    : node);
const modulesDir = path.join(root, 'node_modules');
const API_START_DELAY_MS = Number(process.env.API_START_DELAY_MS || 120_000);

function loadDotEnv(filePath) {
  try {
    const vars = {};
    for (const line of readFileSync(filePath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return vars;
  } catch {
    return {};
  }
}

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

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function normalizeEnvValue(key, value) {
  if (key === 'DATABASE_URL' && typeof value === 'string') {
    return value.replace(/\\%40/g, '%40');
  }
  return value;
}

function writeEnvFile(filePath, env) {
  const lines = Object.entries(env)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${shellQuote(normalizeEnvValue(key, value))}`);
  writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
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

function isPidAlive(pid) {
  if (!pid || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireBootstrapLock() {
  try {
    writeFileSync(bootstrapLockPath, `${process.pid}\n${Date.now()}`, { flag: 'wx' });
    return true;
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
    try {
      const [pidLine] = readFileSync(bootstrapLockPath, 'utf8').split('\n');
      if (isPidAlive(Number(pidLine))) return false;
    } catch {
      /* stale lock file */
    }
    try {
      unlinkSync(bootstrapLockPath);
    } catch {
      return false;
    }
    return acquireBootstrapLock();
  }
}

async function ensureSingleWebBoot(webPort) {
  if (await isPortOpen(webPort, '127.0.0.1')) {
    logLine(`PORT ${webPort} already listening — duplicate worker exits`);
    process.exit(0);
  }

  if (acquireBootstrapLock()) {
    return;
  }

  logLine('Another web boot in progress — waiting for PORT…');
  for (let attempt = 0; attempt < 45; attempt += 1) {
    await sleep(1000);
    if (await isPortOpen(webPort, '127.0.0.1')) {
      logLine(`PORT ${webPort} is up — duplicate worker exits`);
      process.exit(0);
    }
  }

  logLine('Bootstrap lock stale — taking over web boot');
  try {
    unlinkSync(bootstrapLockPath);
  } catch {
    logLine('Could not take bootstrap lock — exit');
    process.exit(1);
  }
  if (!acquireBootstrapLock()) {
    logLine('Failed to acquire bootstrap lock after stale takeover — exit');
    process.exit(1);
  }
}

function startApiDetached(apiEnv) {
  apiEnv.HOSTINGER_COMBINED = '1';
  apiEnv.LAZY_DB_CONNECT = '1';
  apiEnv.UV_THREADPOOL_SIZE = '2';
  apiEnv.API_NODE_BIN = apiNode;
  writeEnvFile(path.join(tmpDir, 'api.env'), apiEnv);
  const startScript = path.join(root, 'scripts/start-api-hostinger.sh');
  chmodSync(startScript, 0o755);
  spawn('/bin/bash', [startScript], {
    env: { PATH: process.env.PATH || '/usr/bin:/bin', HOME: process.env.HOME || root },
    detached: true,
    stdio: 'ignore',
  }).unref();
}

function loadProductionEnv() {
  const files = [
    path.join(root, 'hostinger-production.env'),
    path.join(root, 'deploy/hostinger-production.env'),
    path.join(root, '.env'),
    path.join(apiDir, '.env'),
  ];
  const merged = {};
  for (const file of files) {
    Object.assign(merged, loadDotEnv(file));
  }
  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = normalizeEnvValue(key, value);
    }
  }
  return merged;
}

process.on('uncaughtException', (err) => {
  logLine(`uncaughtException: ${err?.stack || err}`);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  logLine(`unhandledRejection: ${err?.stack || err}`);
  process.exit(1);
});
process.on('exit', () => {
  if (existsSync(bootstrapLockPath)) {
    try {
      const [pidLine] = readFileSync(bootstrapLockPath, 'utf8').split('\n');
      if (Number(pidLine) === process.pid) unlinkSync(bootstrapLockPath);
    } catch {
      /* ignore */
    }
  }
});

loadProductionEnv();
mkdirSync(tmpDir, { recursive: true });
process.chdir(root);
fixPrismaEnginePermissions(modulesDir);
fixPrismaEnginePermissions(path.join(apiDir, 'node_modules'));

const apiPort = process.env.API_INTERNAL_PORT || '4001';
const webPort = process.env.PORT || process.env.PASSENGER_PORT || '3000';

logLine(`Boot pid=${process.pid} PORT=${webPort} cwd=${process.cwd()}`);

if (existsSync(maintenanceFlag)) {
  logLine('MAINTENANCE MODE (.maintenance file) — app paused.');
  setInterval(() => {}, 60_000);
} else if (!existsSync(path.join(apiDir, 'dist/main.js'))) {
  logLine('FATAL: apps/api/dist/main.js missing — run npm run hostinger:build');
  process.exit(1);
} else if (!existsSync(path.join(webDir, '.next/BUILD_ID'))) {
  logLine('FATAL: apps/web/.next build missing — run npm run hostinger:build');
  process.exit(1);
} else {
  (async () => {
    await ensureSingleWebBoot(webPort);

    const fileEnv = loadProductionEnv();
    const nodePath = [modulesDir, path.join(apiDir, 'node_modules'), path.join(webDir, 'node_modules')]
      .filter((p) => existsSync(p))
      .join(path.delimiter);

    const apiEnv = {
      PATH: process.env.PATH || '/usr/bin:/bin',
      HOME: process.env.HOME,
      LANG: process.env.LANG || 'en_US.UTF-8',
      ...fileEnv,
      DATABASE_URL: normalizeEnvValue('DATABASE_URL', fileEnv.DATABASE_URL || process.env.DATABASE_URL),
      JWT_ACCESS_SECRET: fileEnv.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET,
      JWT_REFRESH_SECRET: fileEnv.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET,
      PORT: apiPort,
      API_PORT: apiPort,
      NODE_ENV: 'production',
      NODE_OPTIONS: process.env.API_NODE_OPTIONS || '--max-old-space-size=192',
      NODE_PATH: nodePath,
      SKIP_DB_PUSH_ON_START: '1',
    };

    const webEnv = {
      ...process.env,
      ...fileEnv,
      PORT: webPort,
      HOSTNAME: '0.0.0.0',
      HOSTINGER_COMBINED: '1',
      INTERNAL_API_URL: `http://127.0.0.1:${apiPort}`,
      NODE_ENV: 'production',
      NODE_OPTIONS: process.env.WEB_NODE_OPTIONS || '--max-old-space-size=256',
      NODE_PATH: nodePath,
    };

    Object.assign(process.env, webEnv);

    const nextBin = path.join(modulesDir, 'next/dist/bin/next');
    if (!existsSync(nextBin)) {
      logLine(`FATAL: next binary missing at ${nextBin}`);
      process.exit(1);
    }

    try {
      writeFileSync(path.join(tmpDir, 'restart.txt'), String(Date.now()));
    } catch {
      /* ignore */
    }

    if (process.env.START_API_ON_BOOT !== '0') {
      setTimeout(async () => {
        if (await isPortOpen(apiPort)) {
          logLine(`API already on 127.0.0.1:${apiPort}`);
          return;
        }
        logLine(`Starting API on 127.0.0.1:${apiPort} (delayed ${API_START_DELAY_MS}ms)…`);
        startApiDetached(apiEnv);
      }, API_START_DELAY_MS);
    }

    logLine(`Starting next start on 0.0.0.0:${webPort} from ${webDir}…`);
    process.chdir(webDir);
    process.argv = [process.argv[0], nextBin, 'start', '-p', String(webPort), '-H', '0.0.0.0'];
    require(nextBin);
  })().catch((err) => {
    logLine(`FATAL boot error: ${err?.stack || err}`);
    process.exit(1);
  });
}
