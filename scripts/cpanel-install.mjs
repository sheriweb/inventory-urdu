/**
 * cPanel → Setup Node.js App → Run JS script → scripts/cpanel-install.mjs
 * Installs all workspace dependencies (CloudLinux "Run NPM Install" often skips workspaces).
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      NPM_CONFIG_PRODUCTION: 'false',
      NODE_ENV: 'development',
    },
  });
}

console.log('=== cPanel full dependency install ===');

const prodEnv = path.join(root, 'leasing-store-production.env');
const apiEnv = path.join(root, 'apps/api/.env');
if (existsSync(prodEnv)) {
  copyFileSync(prodEnv, apiEnv);
  console.log('✅ Env synced: leasing-store-production.env → apps/api/.env');
}

run('npm install --include=dev');
run('npm run db:generate -w @inventory-urdu/api');

const checks = [
  'node_modules/next/dist/bin/next',
  'node_modules/@prisma/client',
  'node_modules/prisma/build/index.js',
];

for (const rel of checks) {
  const ok = existsSync(path.join(root, rel));
  console.log(`${ok ? '✅' : '❌'} ${rel}`);
}

console.log('\n✅ Done. Now click RESTART in cPanel Node.js app.');
