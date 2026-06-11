/**
 * Hostinger Node.js app: API internally + Next.js on $PORT.
 * Next.js rewrites proxy /api/v1/* to the internal API.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveTool(...candidates) {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
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

async function waitForPort(port, host = '127.0.0.1', attempts = 30, delayMs = 1000) {
  for (let i = 0; i < attempts; i += 1) {
    const ok = await new Promise((resolve) => {
      const socket = net.createConnection({ port: Number(port), host }, () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
      socket.setTimeout(2000, () => {
        socket.destroy();
        resolve(false);
      });
    });
    if (ok) return true;
    await sleep(delayMs);
  }
  return false;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'apps/api');
const webDir = path.join(root, 'apps/web');
const tmpDir = path.join(root, 'tmp');
const logPath = path.join(tmpDir, 'hostinger.log');
const maintenanceFlag = path.join(root, '.maintenance');
const node = process.execPath;
const modulesDir = path.join(root, 'node_modules');

function loadProductionEnv() {
  const files = [
    path.join(root, 'hostinger-production.env'),
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
fixPrismaEnginePermissions(modulesDir);
fixPrismaEnginePermissions(path.join(apiDir, 'node_modules'));

const prismaCli = resolveTool(
  path.join(modulesDir, 'prisma/build/index.js'),
  path.join(apiDir, 'node_modules/prisma/build/index.js'),
);
const nextCli = resolveTool(
  path.join(modulesDir, 'next/dist/bin/next'),
  path.join(webDir, 'node_modules/next/dist/bin/next'),
);
const tsNodeCli = resolveTool(
  path.join(modulesDir, 'ts-node/dist/bin.js'),
  path.join(apiDir, 'node_modules/ts-node/dist/bin.js'),
);
const apiPort = process.env.API_INTERNAL_PORT || '4001';
const webPort = process.env.PORT || '3000';

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
    ...process.env,
    ...fileEnv,
    PORT: apiPort,
    API_PORT: apiPort,
    NODE_ENV: process.env.NODE_ENV || 'production',
    NODE_OPTIONS: process.env.API_NODE_OPTIONS || '--max-old-space-size=256',
    NODE_PATH: nodePath,
  };

  const webEnv = {
    ...process.env,
    ...fileEnv,
    PORT: webPort,
    HOSTINGER_COMBINED: '1',
    INTERNAL_API_URL: `http://127.0.0.1:${apiPort}`,
    NODE_ENV: process.env.NODE_ENV || 'production',
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

  if (process.env.RUN_DB_SETUP === '1') {
    if (!prismaCli) {
      logLine(logPath, '[hostinger] RUN_DB_SETUP skipped — prisma CLI not found.');
    } else {
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
  }

  if (!nextCli) {
    logLine(logPath, '[hostinger] FATAL: next CLI missing — run npm install on server.');
    process.exit(1);
  }

  const children = [];

  function spawnLogged(name, cmd, args, cwd, env) {
    logLine(logPath, `[hostinger] spawn ${name}: ${cmd} ${args.join(' ')}`);
    const child = spawn(cmd, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    child.stdout?.on('data', (chunk) => {
      for (const line of chunk.toString().split('\n').filter(Boolean)) {
        logLine(logPath, `[${name}] ${line}`);
      }
    });
    child.stderr?.on('data', (chunk) => {
      for (const line of chunk.toString().split('\n').filter(Boolean)) {
        logLine(logPath, `[${name}:err] ${line}`);
      }
    });
    child.on('exit', (code, signal) => {
      logLine(logPath, `[hostinger] ${name} exited code=${code} signal=${signal ?? ''}`);
      if (code && code !== 0) process.exit(code);
    });
    children.push(child);
    return child;
  }

  spawnLogged('api', node, ['dist/main.js'], apiDir, apiEnv);

  const apiReady = await waitForPort(apiPort, '127.0.0.1', 45, 1000);
  if (!apiReady) {
    logLine(logPath, '[hostinger] WARN: API port check timed out — starting Next anyway.');
  } else {
    logLine(logPath, '[hostinger] API ready.');
  }

  // Keep Hostinger's monitored process as Next.js (single extra child for API).
  logLine(logPath, `[hostinger] Starting Next.js in main process on port ${webPort}…`);
  process.chdir(webDir);
  Object.assign(process.env, webEnv);
  process.argv = [process.argv[0], nextCli, 'start', '-p', webPort, '-H', '127.0.0.1'];
  require(nextCli);
}
