/**
 * Mac client demo — ek process mein sab kuch (API + Web + Tunnel).
 * Is terminal ko BAND mat karo — tab tak URL same rahega.
 *
 * Stable fixed URL ke liye Hostinger use karo:
 *   https://hotpink-tarsier-652805.hostingersite.com
 */
import { spawn, execSync } from 'node:child_process';
import { appendFileSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demoDir = path.join(root, '.demo');
const logPath = path.join(demoDir, 'keepalive.log');
const urlFile = path.join(demoDir, 'tunnel.url');
const webPort = process.env.DEMO_WEB_PORT || '3001';
const apiPort = process.env.API_INTERNAL_PORT || '4001';

mkdirSync(demoDir, { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  appendFileSync(logPath, `${line}\n`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp(port, path = '/login', attempts = 90) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status < 500) return true;
    } catch {
      /* retry */
    }
    await sleep(2000);
  }
  return false;
}

function killPort(port) {
  try {
    execSync(`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`, { shell: true });
  } catch {
    /* ignore */
  }
}

// Pehle se URL hai aur app chal rahi ho — wahi use karo
if (existsSync(urlFile)) {
  const existing = readFileSync(urlFile, 'utf8').trim();
  if (existing && (await waitForHttp(webPort, '/login', 3))) {
    try {
      const ok = await fetch(`${existing}/login`, { signal: AbortSignal.timeout(8000) });
      if (ok.ok) {
        log(`Demo pehle se chal rahi hai: ${existing}`);
        console.log(`\n✅ URL (same): ${existing}\n`);
        process.exit(0);
      }
    } catch {
      /* restart below */
    }
  }
}

killPort(webPort);
killPort(apiPort);
try {
  execSync('pkill -f "cloudflared tunnel --url" 2>/dev/null || true', { shell: true });
} catch {
  /* ignore */
}

log('Starting demo (API + Web + Tunnel)…');

const devEnv = {
  ...process.env,
  HOSTINGER_COMBINED: '1',
  INTERNAL_API_URL: `http://127.0.0.1:${apiPort}`,
  API_INTERNAL_PORT: apiPort,
  NEXT_PUBLIC_CLIENT_MONITORING: '1',
  CLIENT_MONITOR_KEY: process.env.CLIENT_MONITOR_KEY || 'demo-monitor',
  CLIENT_ERROR_LOG: path.join(demoDir, 'client-errors.jsonl'),
};

// Mac sleep rokna
spawn('caffeinate', ['-dims'], { detached: true, stdio: 'ignore' }).unref();

const dev = spawn('npm', ['run', 'dev'], {
  cwd: root,
  env: devEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
});

dev.stdout.on('data', (d) => appendFileSync(path.join(demoDir, 'demo.log'), d));
dev.stderr.on('data', (d) => appendFileSync(path.join(demoDir, 'demo.log'), d));

log('Waiting for app…');
if (!(await waitForHttp(webPort))) {
  log('FATAL: App start nahi hui');
  dev.kill('SIGTERM');
  process.exit(1);
}

log('App ready — starting Cloudflare tunnel…');

let tunnelUrl = '';
let tunnelProc = null;

function startTunnel() {
  return new Promise((resolve) => {
    const cloudflared = spawn(
      '/usr/local/bin/cloudflared',
      ['tunnel', '--url', `http://127.0.0.1:${webPort}`],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    tunnelProc = cloudflared;

    const onData = (chunk) => {
      const text = chunk.toString();
      appendFileSync(path.join(demoDir, 'tunnel.log'), text);
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
      if (match && !tunnelUrl) {
        tunnelUrl = match[0];
        writeFileSync(urlFile, `${tunnelUrl}\n`);
        log(`Tunnel URL: ${tunnelUrl}`);
        console.log(`
════════════════════════════════════════════════════════
  ✅ CLIENT DEMO LIVE — is terminal ko band mat karo
════════════════════════════════════════════════════════

  URL: ${tunnelUrl}

  Login:
  shop1@inventory.local / Shop1Demo!
  shop2@inventory.local / Shop2Demo!

  Errors: npm run demo:errors
  Monitor: http://127.0.0.1:${webPort}/demo-monitor

  FIXED URL (Mac band ho to): 
  https://hotpink-tarsier-652805.hostingersite.com
════════════════════════════════════════════════════════
`);
        resolve(true);
      }
    };

    cloudflared.stdout.on('data', onData);
    cloudflared.stderr.on('data', onData);

    cloudflared.on('exit', (code) => {
      log(`Tunnel exited (${code}) — 5s baad restart (naya URL ban sakta hai)`);
      tunnelUrl = '';
      setTimeout(() => startTunnel(), 5000);
    });
  });
}

await startTunnel();

process.on('SIGINT', () => {
  log('Shutting down…');
  tunnelProc?.kill('SIGTERM');
  dev.kill('SIGTERM');
  process.exit(0);
});

// Parent zinda rakho
await new Promise(() => {});
