#!/usr/bin/env node
/**
 * Hostinger hPanel entry file: server.js  (.js required — do not use .sh here)
 */
const http = require('node:http');
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
const apiLockDir = path.join(tmpDir, 'api-boot.dir');
const apiScheduleDir = path.join(tmpDir, 'api-schedule.dir');
const apiLogPath = path.join(tmpDir, 'api.log');
const modulesDir = path.join(root, 'node_modules');
const API_START_DELAY_MS = Number(process.env.API_START_DELAY_MS || 2_000);
const API_WATCHDOG_INTERVAL_MS = Number(process.env.API_WATCHDOG_INTERVAL_MS || 30_000);
const startApiOnBoot = process.env.START_API_ON_BOOT !== '0';

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

async function startNextServer(webPort) {
  const nextPkg = path.join(modulesDir, 'next');
  if (!existsSync(nextPkg)) {
    logLine(`FATAL: next package missing at ${nextPkg}`);
    process.exit(1);
  }

  logLine(`Starting Next.js in-process on 0.0.0.0:${webPort} from ${webDir}…`);
  process.chdir(webDir);

  const next = require(nextPkg);
  const app = next({
    dev: false,
    dir: webDir,
    hostname: '0.0.0.0',
    port: Number(webPort),
  });
  const handle = app.getRequestHandler();
  await app.prepare();

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      handle(req, res).catch((err) => {
        logLine(`Next request error: ${err?.stack || err}`);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      });
    });

    server.once('error', (err) => {
      logLine(`Next server error: ${err?.stack || err}`);
      reject(err);
    });

    server.listen(Number(webPort), '0.0.0.0', () => {
      logLine(`Next.js ready on 0.0.0.0:${webPort} pid=${process.pid}`);
      resolve(server);
    });
  });
}

async function ensureApiRunning(apiPort, apiEnv, label) {
  if (await isPortOpen(apiPort)) return true;

  // Lock is per-attempt: clear it so a previously crashed API can be relaunched.
  try {
    rmSync(apiLockDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  logLine(`${label}: starting API on 127.0.0.1:${apiPort}…`);
  startApiDetached(apiEnv);

  for (let i = 0; i < 15; i += 1) {
    await sleep(2000);
    if (await isPortOpen(apiPort)) {
      logLine(`API ready on 127.0.0.1:${apiPort}`);
      return true;
    }
  }

  logLine(`WARNING: API still not on 127.0.0.1:${apiPort} after 30s — check tmp/api.log`);
  return false;
}

async function scheduleApiStart(webPort, apiPort, apiEnv) {
  try {
    mkdirSync(apiScheduleDir);
  } catch {
    logLine('API supervisor already running in another worker');
    return;
  }

  await sleep(API_START_DELAY_MS);
  await ensureApiRunning(apiPort, apiEnv, 'boot');

  // Watchdog: web process is long-lived under Passenger; if the API dies
  // (memory kill, crash), bring it back without waiting for a redeploy.
  let checking = false;
  setInterval(() => {
    if (checking) return;
    checking = true;
    ensureApiRunning(apiPort, apiEnv, 'watchdog')
      .catch((err) => logLine(`watchdog error: ${err?.message || err}`))
      .finally(() => {
        checking = false;
      });
  }, API_WATCHDOG_INTERVAL_MS).unref();
}

function startApiDetached(apiEnv) {
  try {
    mkdirSync(apiLockDir);
  } catch (err) {
    if (err.code === 'EEXIST') {
      logLine('API boot lock held — skip duplicate start');
      return;
    }
    throw err;
  }

  const apiNode =
    process.env.API_NODE_BIN ||
    (existsSync('/opt/alt/alt-nodejs20/root/bin/node')
      ? '/opt/alt/alt-nodejs20/root/bin/node'
      : process.execPath);
  const apiPort = apiEnv.PORT || apiEnv.API_PORT || '4001';
  const mergedEnv = {
    ...process.env,
    ...apiEnv,
    HOSTINGER_COMBINED: '1',
    LAZY_DB_CONNECT: '1',
    UV_THREADPOOL_SIZE: '2',
    SKIP_DB_PUSH_ON_START: '1',
    NODE_ENV: 'production',
    PORT: String(apiPort),
    API_PORT: String(apiPort),
    NODE_OPTIONS: apiEnv.NODE_OPTIONS || process.env.API_NODE_OPTIONS || '--max-old-space-size=128',
  };
  writeEnvFile(path.join(tmpDir, 'api.env'), mergedEnv);

  try {
    appendFileSync(apiLogPath, `[${new Date().toISOString()}] API starting on 127.0.0.1:${apiPort} node=${apiNode}\n`);
  } catch {
    /* ignore */
  }

  const logFd = (() => {
    try {
      return require('node:fs').openSync(apiLogPath, 'a');
    } catch {
      return 'ignore';
    }
  })();

  const child = spawn(apiNode, [path.join(apiDir, 'dist/main.js')], {
    cwd: root,
    env: mergedEnv,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  child.unref();
  if (typeof logFd === 'number') {
    try {
      require('node:fs').closeSync(logFd);
    } catch {
      /* ignore */
    }
  }
  logLine(`API process spawned pid=${child.pid ?? 'unknown'} on 127.0.0.1:${apiPort}`);
}

function readLockPid(lockDir) {
  try {
    return Number(readFileSync(path.join(lockDir, 'pid'), 'utf8').trim());
  } catch {
    return 0;
  }
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

    // Lock exists — wait briefly for the owner to bring the port up.
    for (let i = 0; i < 6; i += 1) {
      await sleep(500);
      if (await isPortOpen(webPort, '127.0.0.1')) {
        logLine(`PORT ${webPort} is up — duplicate worker exits`);
        process.exit(0);
      }
    }

    // Port still closed: lock is stale if its owner pid is dead (app restart).
    const ownerPid = readLockPid(webBootDir);
    if (ownerPid && isPidAlive(ownerPid)) {
      logLine(`Boot lock held by live pid ${ownerPid} — duplicate worker exits`);
      process.exit(0);
    }

    logLine(`Stale web boot lock (pid ${ownerPid || 'unknown'} dead) — taking over`);
    try {
      rmSync(webBootDir, { recursive: true, force: true });
    } catch {
      /* next mkdir attempt decides */
    }
  }

  logLine('Could not acquire web boot lock — duplicate worker exits');
  process.exit(0);
}

function clearStaleApiState() {
  // We are the primary web worker of a fresh boot generation: previous
  // scheduler timers died with their process, so reset scheduling locks.
  for (const dir of [apiScheduleDir, apiLockDir]) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
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
  clearStaleApiState();

  const nodePath = [modulesDir, path.join(apiDir, 'node_modules'), path.join(webDir, 'node_modules')]
    .filter((p) => existsSync(p))
    .join(path.delimiter);
  process.env.NODE_PATH = nodePath;

  try {
    writeFileSync(path.join(tmpDir, 'restart.txt'), String(Date.now()));
  } catch {
    /* ignore */
  }

  if (startApiOnBoot) {
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
    scheduleApiStart(webPort, apiPort, apiEnv).catch((err) => {
      logLine(`API schedule error: ${err?.stack || err}`);
    });
  } else {
    logLine('START_API_ON_BOOT=0 — API disabled (login/API calls will fail until set to 1)');
  }

  const nextBin = path.join(modulesDir, 'next/dist/bin/next');
  if (!existsSync(nextBin)) {
    logLine(`FATAL: next binary missing at ${nextBin}`);
    process.exit(1);
  }

  await startNextServer(webPort);
})().catch((err) => {
  logLine(`FATAL boot error: ${err?.stack || err}`);
  process.exit(1);
});
