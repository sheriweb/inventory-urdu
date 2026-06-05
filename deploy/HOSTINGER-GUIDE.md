# Inventory Urdu — Hostinger Live Guide

## آپ کو کیا کرنا ہے (Step by Step)

### Step 1: GitHub repo
1. GitHub پر **private** repo بنائیں: `inventory-urdu`
2. `deploy/secrets.template.env` کو copy کریں → `deploy/secrets.env`
3. `GITHUB_REPO_URL` اور `GITHUB_TOKEN` بھریں

### Step 2: Hostinger MySQL
1. hPanel → **Databases** → **MySQL Databases**
2. نیا database بنائیں (نام یاد رکھیں)
3. User + password بنائیں اور database سے link کریں
4. `deploy/secrets.env` میں `DB_*` اور `DATABASE_URL` بھریں

### Step 3: دو Node.js Web Apps بنائیں

Screenshot میں: **+ Add website** → **Node.js Web App**

#### App 1 — API (پہلے یہ deploy کریں)

| Setting | Value |
|---------|-------|
| Framework | NestJS |
| Node.js | 20 |
| Repository | آپ کا GitHub repo |
| Branch | main |
| Root directory | `.` (repo root) |
| Install command | `npm ci` |
| Build command | `npm run hostinger:build:api` |
| Start command | `npm run start:prod -w @inventory-urdu/api` |

**Environment variables** (Hostinger panel میں add کریں — `deploy/secrets.env` سے copy):

```
NODE_ENV=production
PORT=(Hostinger auto — نہ چھوڑیں)
DATABASE_URL=mysql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
API_PREFIX=api/v1
CORS_ORIGINS=https://YOUR-WEB-DOMAIN
SUPER_ADMIN_EMAIL=...
SUPER_ADMIN_PASSWORD=...
SUPER_ADMIN_NAME=Super Admin
```

Deploy کے بعد **temporary domain** copy کریں → `API_URL` اور `NEXT_PUBLIC_API_URL` میں لکھیں۔

#### App 2 — Web (API deploy کے بعد)

| Setting | Value |
|---------|-------|
| Framework | Next.js |
| Node.js | 20 |
| Repository | same repo |
| Branch | main |
| Root directory | `.` |
| Install command | `npm ci` |
| Build command | `npm run hostinger:build:web` |
| Start command | `npm run start:hostinger -w @inventory-urdu/web` |

**Environment variables:**

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://YOUR-API-DOMAIN/api/v1
```

`WEB_URL` temporary domain → `CORS_ORIGINS` میں API app پر update کریں، پھر API redeploy۔

### Step 4: Database tables
API پہلی بار deploy کے بعد (یا locally secrets.env load کر کے):

```bash
npm run hostinger:db:push
npm run hostinger:db:seed   # اگر SEED_DEMO_DATA=1
```

Hostinger panel میں **Run script** یا SSH (اگر available) سے، یا Cursor سے run کریں۔

### Step 5: Test
- Web: `https://your-web.hostingersite.com/login`
- Super admin: `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`

---

## Cursor کو کیا کہیں

جب `deploy/secrets.env` مکمل ہو:

> secrets file ready — push and deploy

Cursor git push کرے گا اور Hostinger settings verify کرے گا۔

---

## Troubleshooting

| مسئلہ | حل |
|-------|-----|
| 500 on login | `DATABASE_URL` اور `db push` check کریں |
| CORS error | API میں `CORS_ORIGINS` = exact web URL |
| API not found | `NEXT_PUBLIC_API_URL` = `https://api-domain/api/v1` |
| Build fail | Node 20, root directory `.`, `npm ci` not `npm install` |
