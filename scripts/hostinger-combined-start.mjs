/**
 * Hostinger single Node.js app: runs API internally + Next.js on $PORT.
 * Next.js rewrites proxy /api/v1/* to the internal API.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

function run(cmd, args, cwd, env, label) {
  const child = spawn(cmd, args, { cwd, env, stdio: 'inherit' });
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
  const setup = spawn('npm', ['run', 'hostinger:db:push'], { cwd: root, env: apiEnv, stdio: 'inherit' });
  await new Promise((resolve, reject) => {
    setup.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`db:push exit ${code}`))));
  });
  const seed = spawn('npm', ['run', 'hostinger:db:seed'], { cwd: root, env: apiEnv, stdio: 'inherit' });
  await new Promise((resolve, reject) => {
    seed.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`db:seed exit ${code}`))));
  });
}

console.log(`[hostinger] Starting API on 127.0.0.1:${apiPort}…`);
const api = run('node', ['dist/main'], path.join(root, 'apps/api'), apiEnv, 'api');

setTimeout(() => {
  console.log(`[hostinger] Starting Next.js on port ${webPort}…`);
  run('npx', ['next', 'start', '-p', webPort], path.join(root, 'apps/web'), webEnv, 'web');
}, 4000);

process.on('SIGTERM', () => {
  api.kill('SIGTERM');
  process.exit(0);
});
