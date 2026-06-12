#!/usr/bin/env node
/** Backward-compatible entry — delegates to Passenger start script. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/hostinger-passenger-start.sh');
const result = spawnSync('bash', [script], { stdio: 'inherit', env: process.env, cwd: root });
process.exit(result.status ?? 1);
