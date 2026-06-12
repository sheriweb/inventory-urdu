#!/usr/bin/env node
/**
 * Hostinger hPanel entry file: server.js
 * Delegates to scripts/hostinger-production-start.sh (flock + exec next start).
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

execFileSync('/bin/bash', [path.join(__dirname, 'scripts/hostinger-production-start.sh')], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname,
});
