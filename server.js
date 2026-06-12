#!/usr/bin/env node
/**
 * Hostinger hPanel entry file: server.js
 *
 * Proven bootstrap (pre-standalone): one Passenger process runs Next.js HTTP
 * server from apps/web/.next — NOT the standalone bundle (that caused crash loops).
 */
const { spawn } = require('node:child_process');
const { createReadStream, statSync } = require('node:fs');
const { createServer } = require('node:http');
const net = require('node:net');
const { parse } = require('node:url');
const {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const requireFromRoot = createRequire(__filename);

const root = path.resolve(__dirname);
const apiDir = path.join(root, 'apps/api');
const webDir = path.join(root, 'apps/web');
const tmpDir = path.join(root, 'tmp');
const logPath = path.join(tmpDir, 'hostinger.log');
const maintenanceFlag = path.join(root, '.maintenance');
const node = process.execPath;
const apiNode =
  process.env.API_NODE_BIN ||
  (existsSync('/opt/alt/alt-nodejs20/root/bin/node')
    ? '/opt/alt/alt-nodejs20/root/bin/node'
    : node);
const modulesDir = path.join(root, 'node_modules');

const MIME = {
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

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

function safeFileUnderRoot(rootDir, relPath) {
  const filePath = path.normalize(path.join(rootDir, relPath));
  if (!filePath.startsWith(path.normalize(`${rootDir}${path.sep}`))) return null;
  if (!existsSync(filePath)) return null;
  try {
    if (!statSync(filePath).isFile()) return null;
  } catch {
    return null;
  }
  return filePath;
}

function sendFile(res, filePath, cacheControl) {
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', cacheControl);
  createReadStream(filePath).pipe(res);
}

process.on('uncaughtException', (err) => {
  logLine(`uncaughtException: ${err?.stack || err}`);
  process.exit(1);
});
process.on('unhandledRejection', (err) => {
  logLine(`unhandledRejection: ${err?.stack || err}`);
  process.exit(1);
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
      NODE_OPTIONS: process.env.API_NODE_OPTIONS || '--max-old-space-size=256',
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
      NODE_OPTIONS: process.env.WEB_NODE_OPTIONS || '--max-old-space-size=384',
      NODE_PATH: nodePath,
    };

    Object.assign(process.env, webEnv);

    logLine(`Preparing Next.js from ${webDir} on port ${webPort}…`);

    const next = requireFromRoot('next');
    const nextApp = next({ dev: false, dir: webDir });
    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    const staticRoot = path.join(webDir, '.next/static');
    const publicRoot = path.join(webDir, 'public');

    const server = createServer((req, res) => {
      try {
        const parsed = parse(req.url, true);
        const pathname = parsed.pathname || '/';

        if (pathname.startsWith('/_next/static/')) {
          const rel = pathname.slice('/_next/static/'.length);
          const filePath = safeFileUnderRoot(staticRoot, rel);
          if (filePath) {
            sendFile(res, filePath, 'public, max-age=31536000, immutable');
            return;
          }
        }

        const publicFile = safeFileUnderRoot(publicRoot, pathname.replace(/^\//, ''));
        if (
          publicFile &&
          (pathname === '/manifest.json' ||
            pathname === '/icon.svg' ||
            pathname === '/favicon.ico' ||
            pathname.startsWith('/icons/'))
        ) {
          sendFile(res, publicFile, 'public, max-age=86400');
          return;
        }

        handle(req, res, parsed);
      } catch (err) {
        logLine(`Request error: ${err}`);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        }
      }
    });

    server.listen(Number(webPort), '0.0.0.0', () => {
      logLine(`Listening on http://0.0.0.0:${webPort}`);
    });

    if (process.env.START_API_ON_BOOT !== '0') {
      setTimeout(async () => {
        if (await isPortOpen(apiPort)) {
          logLine(`API already on 127.0.0.1:${apiPort}`);
          return;
        }
        logLine(`Starting API on 127.0.0.1:${apiPort}…`);
        startApiDetached(apiEnv);
      }, 500);
    }
  })().catch((err) => {
    logLine(`FATAL boot error: ${err?.stack || err}`);
    process.exit(1);
  });
}
