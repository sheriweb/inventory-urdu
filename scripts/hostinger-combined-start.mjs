/**
 * Hostinger single Node.js app: runs API internally + Next.js on $PORT.
 * Next.js rewrites proxy /api/v1/* to the internal API.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'apps/api');
const webDir = path.join(root, 'apps/web');
const prismaBin = path.join(root, 'node_modules/.bin/prisma');
const nextBin = path.join(root, 'node_modules/.bin/next');
const apiPort = process.env.API_INTERNAL_PORT || '4001';
const webPort = process.env.PORT || '3001';

const apiEnv = {
  ...process.env,
  PORT: apiPort,
  API_PORT: apiPort,
  NODE_ENV: process.env.NODE_ENV || 'production',
};

const webEnv = {
  ...process.env,
  PORT: webPort,
  HOSTINGER_COMBINED: '1',
  INTERNAL_API_URL: `http://127.0.0.1:${apiPort}`,
  NODE_ENV: process.env.NODE_ENV || 'production',
};

function runOnce(cmd, args, cwd, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, env, stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

function run(cmd, args, cwd, env, label) {
  const child = spawn(cmd, args, { cwd, env, stdio: 'inherit', shell: true });
  child.on('error', (err) => {
    console.error(`[${label}] failed to start:`, err);
    process.exit(1);
  });
  child.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code}`);
      process.exit(code ?? 1);
    }
    if (signal) {
      console.error(`[${label}] killed by ${signal}`);
      process.exit(1);
    }
  });
  return child;
}

if (process.env.RUN_DB_SETUP === '1') {
  console.log('[hostinger] RUN_DB_SETUP=1 — pushing schema + seed…');
  await runOnce(prismaBin, ['db', 'push', '--skip-generate'], apiDir, apiEnv);
  await runOnce(prismaBin, ['db', 'seed'], apiDir, apiEnv);
  console.log('[hostinger] DB setup complete.');
}

console.log(`[hostinger] Starting API on 127.0.0.1:${apiPort}…`);
const api = run(process.execPath, ['dist/main.js'], apiDir, apiEnv, 'api');

setTimeout(() => {
  console.log(`[hostinger] Starting Next.js on port ${webPort}…`);
  run(nextBin, ['start', '-p', String(webPort)], webDir, webEnv, 'web');
}, 4000);

process.on('SIGTERM', () => {
  api.kill('SIGTERM');
  process.exit(0);
});
