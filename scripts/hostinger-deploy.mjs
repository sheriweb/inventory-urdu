/**
 * Deploy source ZIP to Hostinger Node.js via API.
 * Used by GitHub Actions on push to main.
 *
 * Required env:
 *   HOSTINGER_API_TOKEN
 *   HOSTINGER_DOMAIN  (e.g. paleturquoise-stork-447573.hostingersite.com)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import tus from 'tus-js-client';

const API_BASE = 'https://developers.hostinger.com';
const token = process.env.HOSTINGER_API_TOKEN;
const domain = process.env.HOSTINGER_DOMAIN;

if (!token || !domain) {
  console.error('Missing HOSTINGER_API_TOKEN or HOSTINGER_DOMAIN');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const zipPath = fs
  .readdirSync(path.join(root, 'deploy'))
  .filter((f) => f.startsWith('inventory-urdu_') && f.endsWith('.zip'))
  .map((f) => path.join(root, 'deploy', f))
  .sort()
  .pop();

if (!zipPath) {
  console.error('No deploy/inventory-urdu_*.zip found. Run create-deploy-zip.sh first.');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

async function api(method, urlPath, data) {
  const res = await axios({
    method,
    url: `${API_BASE}/${urlPath.replace(/^\//, '')}`,
    headers: { ...headers, ...(data ? { 'Content-Type': 'application/json' } : {}) },
    data,
    validateStatus: () => true,
  });
  if (res.status >= 400) {
    throw new Error(`${method} ${urlPath} → ${res.status}: ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

async function resolveUsername() {
  const res = await api('get', `api/hosting/v1/websites?domain=${encodeURIComponent(domain)}`);
  const row = res?.data?.[0];
  if (!row?.username) throw new Error(`Website not found for domain: ${domain}`);
  return row.username;
}

async function uploadArchive(username) {
  const creds = await api('post', 'api/hosting/v1/files/upload-urls', { username, domain });
  const { url: uploadUrl, auth_key: authToken, rest_auth_key: authRestToken } = creds;
  const basename = path.basename(zipPath);
  const stats = fs.statSync(zipPath);
  const uploadUrlWithFile = `${uploadUrl.replace(/\/$/, '')}/${basename}?override=true`;
  const reqHeaders = {
    'X-Auth': authToken,
    'X-Auth-Rest': authRestToken,
    'upload-length': String(stats.size),
    'upload-offset': '0',
  };

  await axios.post(uploadUrlWithFile, '', { headers: reqHeaders, validateStatus: (s) => s === 201 });

  await new Promise((resolve, reject) => {
    const upload = new tus.Upload(fs.createReadStream(zipPath), {
      uploadUrl: uploadUrlWithFile,
      headers: reqHeaders,
      uploadSize: stats.size,
      chunkSize: 10 * 1024 * 1024,
      onError: reject,
      onSuccess: resolve,
    });
    upload.start();
  });

  console.log(`✅ Uploaded ${basename}`);
  return basename;
}

async function triggerBuild(username, archiveBasename) {
  const settingsPath = `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds/settings/from-archive?archive_path=${encodeURIComponent(archiveBasename)}`;
  const raw = await api('get', settingsPath);
  let settings = raw?.data ?? raw;

  const envFile = path.join(root, 'deploy', 'hostinger-production.env');
  const envVars = loadEnvFile(envFile);

  settings = {
    ...settings,
    node_version: 20,
    install_command: 'npm ci',
    build_command: 'npm run hostinger:build',
    start_command: 'npm run hostinger:start',
    source_type: 'archive',
    source_options: { archive_path: archiveBasename },
    ...(Object.keys(envVars).length ? { environment_variables: envVars, env: envVars } : {}),
  };

  const buildPath = `api/hosting/v1/accounts/${username}/websites/${domain}/nodejs/builds`;
  const result = await api('post', buildPath, settings);
  console.log('✅ Build triggered:', JSON.stringify(result, null, 2));
}

const username = await resolveUsername();
console.log(`Deploying to ${domain} (user: ${username})…`);
const archive = await uploadArchive(username);
await triggerBuild(username, archive);
