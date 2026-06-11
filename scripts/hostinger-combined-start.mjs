/**
 * Hostinger / LiteSpeed Passenger: Next HTTP server in THIS process + API as detached child.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import net from 'node:net';
import { parse } from 'node:url';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

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

function logLine(logPath, message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    appendFileSync(logPath, line);
  } catch {
    console.error(message);
  }
  console.log(message);
}

function resolveTool(...candidates) {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function fixPrismaEnginePermissions(modulesDir) {
  const enginesDir = path.join(modulesDir, '@prisma/engines');
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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'apps/api');
const webDir = path.join(root, 'apps/web');
const tmpDir = path.join(root, 'tmp');
const logPath = path.join(tmpDir, 'hostinger.log');
const maintenanceFlag = path.join(root, '.maintenance');
const node = process.execPath;
const modulesDir = path.join(root, 'node_modules');

function writeEnvFile(filePath, env) {
  const lines = Object.entries(env)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${shellQuote(value)}`);
  writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
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

function startApiDetached(apiEnv, apiLogPath) {
  const envFile = path.join(tmpDir, 'api.env');
  const engineLib = path.join(
    modulesDir,
    '@prisma/engines/libquery_engine-debian-openssl-1.1.x.so.node',
  );
  if (existsSync(engineLib)) {
    apiEnv.PRISMA_QUERY_ENGINE_LIBRARY = engineLib;
  }
  writeEnvFile(envFile, apiEnv);
  const cmd = [
    `set -a && . ${shellQuote(envFile)} && set +a`,
    `cd ${shellQuote(root)}`,
    `nohup ${shellQuote(node)} ${shellQuote(path.join('apps/api/dist/main.js'))} >> ${shellQuote(apiLogPath)} 2>&1 &`,
  ].join(' && ');
  spawn('/bin/sh', ['-c', cmd], {
    env: { PATH: process.env.PATH || '/usr/bin:/bin' },
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
      process.env[key] = value;
    }
  }
  return merged;
}

loadProductionEnv();
mkdirSync(tmpDir, { recursive: true });
process.chdir(root);
fixPrismaEnginePermissions(modulesDir);
fixPrismaEnginePermissions(path.join(apiDir, 'node_modules'));

const prismaCli = resolveTool(
  path.join(modulesDir, 'prisma/build/index.js'),
  path.join(apiDir, 'node_modules/prisma/build/index.js'),
);
const tsNodeCli = resolveTool(
  path.join(modulesDir, 'ts-node/dist/bin.js'),
  path.join(apiDir, 'node_modules/ts-node/dist/bin.js'),
);
const apiPort = process.env.API_INTERNAL_PORT || '4001';
const webPort = process.env.PORT || process.env.PASSENGER_PORT || '3000';

logLine(logPath, `[hostinger] Boot (pid ${process.pid}) cwd=${process.cwd()}`);

if (existsSync(maintenanceFlag)) {
  logLine(logPath, '[hostinger] MAINTENANCE MODE (.maintenance file) — app paused.');
  setInterval(() => {}, 60_000);
} else if (!existsSync(path.join(apiDir, 'dist/main.js'))) {
  logLine(logPath, '[hostinger] FATAL: apps/api/dist/main.js missing — run npm run hostinger:build');
  process.exit(1);
} else if (!existsSync(path.join(webDir, '.next/BUILD_ID'))) {
  logLine(logPath, '[hostinger] FATAL: apps/web/.next build missing — run npm run hostinger:build');
  process.exit(1);
} else {
  const fileEnv = loadProductionEnv();
  const nodePath = [modulesDir, path.join(apiDir, 'node_modules'), path.join(webDir, 'node_modules')]
    .filter((p) => existsSync(p))
    .join(path.delimiter);

  const apiEnv = {
    PATH: process.env.PATH || '/usr/bin:/bin',
    HOME: process.env.HOME,
    LANG: process.env.LANG || 'en_US.UTF-8',
    ...fileEnv,
    DATABASE_URL: fileEnv.DATABASE_URL || process.env.DATABASE_URL,
    JWT_ACCESS_SECRET: fileEnv.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: fileEnv.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET,
    PORT: apiPort,
    API_PORT: apiPort,
    NODE_ENV: 'production',
    NODE_OPTIONS: process.env.API_NODE_OPTIONS || '--max-old-space-size=256',
    NODE_PATH: nodePath,
  };

  const webEnv = {
    ...process.env,
    ...fileEnv,
    PORT: webPort,
    HOSTINGER_COMBINED: '1',
    INTERNAL_API_URL: `http://127.0.0.1:${apiPort}`,
    NODE_ENV: 'production',
    NODE_OPTIONS: process.env.WEB_NODE_OPTIONS || '--max-old-space-size=384',
    NODE_PATH: nodePath,
  };

  function runOnce(cmd, args, cwd, env) {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, args, { cwd, env, stdio: 'inherit', shell: false });
      child.on('error', reject);
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
    });
  }

  if (process.env.RUN_DB_SETUP === '1' && prismaCli) {
    try {
      logLine(logPath, '[hostinger] RUN_DB_SETUP=1 — pushing schema…');
      await runOnce(node, [prismaCli, 'db', 'push', '--skip-generate'], apiDir, apiEnv);
      if (process.env.FORCE_DB_SETUP === '1' && tsNodeCli) {
        await runOnce(
          node,
          [tsNodeCli, '-r', 'tsconfig-paths/register', 'prisma/seed.ts'],
          apiDir,
          apiEnv,
        );
      }
      logLine(logPath, '[hostinger] DB setup complete.');
    } catch (err) {
      logLine(logPath, `[hostinger] DB setup failed (app will still start): ${err}`);
    }
  }

  const apiLogPath = path.join(tmpDir, 'api.log');
  if (await isPortOpen(apiPort)) {
    logLine(logPath, `[hostinger] API already listening on 127.0.0.1:${apiPort}`);
  } else {
    logLine(
      logPath,
      `[hostinger] Starting API via nohup on 127.0.0.1:${apiPort} (DATABASE_URL=${apiEnv.DATABASE_URL ? 'set' : 'MISSING'})…`,
    );
    startApiDetached(apiEnv, apiLogPath);
  }

  Object.assign(process.env, webEnv);
  logLine(logPath, `[hostinger] Preparing Next.js (Passenger main process) on port ${webPort}…`);

  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const next = require('next');
  const nextApp = next({ dev: false, dir: webDir });
  await nextApp.prepare();
  const handle = nextApp.getRequestHandler();

  const server = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  server.listen(Number(webPort), '0.0.0.0', () => {
    logLine(logPath, `[hostinger] Listening on http://0.0.0.0:${webPort}`);
  });
}
