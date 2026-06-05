# ⚡ Abhi Production Deploy — 3 Minute Guide

**Domain:** `paleturquoise-stork-447573.hostingersite.com`  
**GitHub:** https://github.com/sheriweb/inventory-urdu  
**Abhi site:** PHP default page (Node.js abhi enable nahi)

---

## Option A — GitHub (recommended, 3 min)

1. **hPanel** login: https://hpanel.hostinger.com  
2. **Websites** → `paleturquoise-stork-447573` → agar sirf PHP hai to:
   - Pehle website **remove** karein (backup le lein)
   - **+ Add website** → **Node.js Web App**
3. **Import Git Repository** → `sheriweb/inventory-urdu` → branch `main`
4. Build settings:

| Field | Value |
|-------|-------|
| Framework | **Other** (ya Next.js) |
| Node | **20** |
| Root | `.` |
| Install | `npm ci` |
| Build | `npm run hostinger:build` |
| Start | `npm run hostinger:start` |

5. **Environment variables** — `.env` file import:
   - Local file: `deploy/hostinger-production.env` (generate: `bash scripts/generate-hostinger-env.sh`)
6. **Deploy** click karein
7. Build complete hone ke baad database:
   - Hostinger terminal se: `npm run hostinger:db:push && npm run hostinger:db:seed`

---

## Option B — ZIP upload

1. ZIP ready: `deploy/inventory-urdu_*.zip` (banane ke liye: `bash scripts/create-deploy-zip.sh`)
2. hPanel → Node.js Web App → **Upload files** → ZIP upload
3. Same build/start commands as above
4. Env file import karein

---

## Option C — API auto deploy (Cursor ke liye)

hPanel → **Profile → API** → token banayein, phir `deploy/secrets.env` mein:

```
HOSTINGER_API_TOKEN=your_token_here
HOSTINGER_DOMAIN=paleturquoise-stork-447573.hostingersite.com
```

Phir Cursor ko likhein: **"hostinger api deploy karo"**

---

## Live test

- https://paleturquoise-stork-447573.hostingersite.com/login
- Admin: `admin@sheriweb.com` / (secrets file mein password)
