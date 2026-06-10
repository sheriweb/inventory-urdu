/**
 * Hostinger single Node.js app: runs API internally + Next.js on $PORT.
 * Next.js rewrites proxy /api/v1/* to the internal API.
 */
import { spawn, execSync } from 'node:child_process';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);

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
}

function killStaleProcesses(_apiDir, logPath) {
  // cPanel shared hosting: pkill/spawn limits cause EAGAIN — skip on production.
  logLine(logPath, '[hostinger] Skipping stale process cleanup (cPanel safe mode)');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'apps/api');
const webDir = path.join(root, 'apps/web');
const tmpDir = path.join(root, 'tmp');
const logPath = path.join(tmpDir, 'hostinger.log');
const maintenanceFlag = path.join(root, '.maintenance');
const node = process.execPath;

/** Auto-load env — cPanel mein manually env vars add karne ki zaroorat nahi. */
function loadProductionEnv() {
  const files = [
    path.join(root, 'leasing-store-production.env'),
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

/**
 * Shared hosting FTP can't upload 10k+ small files reliably, so deploy ships a single
 * node_modules.tar.gz. Extract it on first boot (or when deps change) using the system tar.
 */
function ensureRuntimeModules() {
  const tarball = path.join(root, 'node_modules.tar.gz');
  if (!existsSync(tarball)) return;
  const nmPath = path.join(root, 'node_modules');
  const localNext = path.join(nmPath, 'next/dist/bin/next');
  const stamp = path.join(nmPath, '.tarball-stamp');

  let needExtract = !existsSync(localNext);
  try {
    const tarMtime = statSync(tarball).mtimeMs;
    const stampMtime = existsSync(stamp) ? statSync(stamp).mtimeMs : 0;
    if (tarMtime > stampMtime) needExtract = true;
  } catch {
    /* ignore */
  }
  if (!needExtract) return;

  try {
    mkdirSync(tmpDir, { recursive: true });
    logLine(logPath, '[hostinger] Extracting node_modules.tar.gz (first boot / deps changed)…');
    rmSync(nmPath, { recursive: true, force: true });
    mkdirSync(nmPath, { recursive: true });
    execSync(`tar -xzf ${JSON.stringify(tarball)} -C ${JSON.stringify(nmPath)}`, {
      cwd: root,
      stdio: 'inherit',
    });
    writeFileSync(stamp, new Date().toISOString());
    logLine(logPath, '[hostinger] node_modules ready.');
  } catch (err) {
    logLine(logPath, `[hostinger] node_modules extract failed: ${err}`);
  }
}

mkdirSync(path.join(root, 'tmp'), { recursive: true });
ensureRuntimeModules();

function resolveTool(...candidates) {
  for (const candidate of candidates) {
    if (candidate && existsSync(candidate)) return candidate;
  }
  return null;
}

const nodevenvModules = '/home/leasings/nodevenv/inventory-urdu/20/lib/node_modules';
const prismaCli = resolveTool(
  path.join(nodevenvModules, 'prisma/build/index.js'),
  path.join(root, 'node_modules/prisma/build/index.js'),
  path.join(apiDir, 'node_modules/prisma/build/index.js'),
);
const nextCli = resolveTool(
  path.join(nodevenvModules, 'next/dist/bin/next'),
  path.join(root, 'node_modules/next/dist/bin/next'),
  path.join(webDir, 'node_modules/next/dist/bin/next'),
);
const tsNodeCli = resolveTool(
  path.join(nodevenvModules, 'ts-node/dist/bin.js'),
  path.join(root, 'node_modules/ts-node/dist/bin.js'),
  path.join(apiDir, 'node_modules/ts-node/dist/bin.js'),
);
const apiPort = process.env.API_INTERNAL_PORT || '4001';
const webPort = process.env.PORT || '3001';

mkdirSync(tmpDir, { recursive: true });
logLine(logPath, `[hostinger] Boot (pid ${process.pid})`);

if (existsSync(maintenanceFlag)) {
  logLine(logPath, '[hostinger] MAINTENANCE MODE (.maintenance file) — app paused for npm install.');
  console.log('Maintenance mode: delete .maintenance on server then RESTART app.');
  setInterval(() => {}, 60_000);
  // Keep process alive so Passenger stops crash-loop / lock errors.
} else if (!existsSync(path.join(apiDir, 'dist/main.js'))) {
  logLine(logPath, '[hostinger] FATAL: apps/api/dist/main.js missing — run npm run hostinger:build');
  process.exit(1);
} else if (!existsSync(path.join(webDir, '.next/BUILD_ID'))) {
  logLine(logPath, '[hostinger] FATAL: apps/web/.next build missing — run npm run hostinger:build');
  process.exit(1);
} else {
  killStaleProcesses(apiDir, logPath);

const fileEnv = loadProductionEnv();
const nodePath = [nodevenvModules, path.join(root, 'node_modules')].filter((p) => existsSync(p)).join(path.delimiter);
const apiEnv = {
  ...process.env,
  ...fileEnv,
  PORT: apiPort,
  API_PORT: apiPort,
  NODE_ENV: process.env.NODE_ENV || 'production',
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=384',
  NODE_PATH: nodePath,
};

const webEnv = {
  ...process.env,
  PORT: webPort,
  HOSTINGER_COMBINED: '1',
  INTERNAL_API_URL: `http://127.0.0.1:${apiPort}`,
  NODE_ENV: process.env.NODE_ENV || 'production',
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=512',
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
      logLine(logPath, '[hostinger] RUN_DB_SETUP skipped — prisma CLI not found (run npm install).');
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
        } else if (process.env.FORCE_DB_SETUP === '1') {
          logLine(logPath, '[hostinger] Seed skipped — ts-node not found.');
        }
        logLine(logPath, '[hostinger] DB setup complete.');
      } catch (err) {
        logLine(logPath, `[hostinger] DB setup failed (app will still start): ${err}`);
      }
    }
  }

  if (!nextCli) {
    logLine(logPath, '[hostinger] FATAL: next CLI missing — run npm install in cPanel.');
    process.exit(1);
  }

  // Single Node process (cPanel process limits) — no child spawn.
  logLine(logPath, `[hostinger] Starting API in-process on 127.0.0.1:${apiPort}…`);
  Object.assign(process.env, apiEnv);
  process.chdir(apiDir);
  require(path.join(apiDir, 'dist/main.js'));
  await sleep(5000);

  logLine(logPath, `[hostinger] Starting Next.js on port ${webPort}…`);
  process.chdir(webDir);
  Object.assign(process.env, webEnv);
  process.argv = [process.argv[0], nextCli, 'start'];
  require(nextCli);
}
