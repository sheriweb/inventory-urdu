# Deploy — Hostinger (qistpro.shop)

## Primary: hPanel Git (recommended)

Har `git push` on `main` → Hostinger khud pull, build, deploy karta hai.

**hPanel → Websites → qistpro.shop → Node.js Web App → Git settings:**

| Setting | Value |
|---------|-------|
| Repository | `sheriweb/inventory-urdu` |
| Branch | `main` |
| Node.js | `20` |
| Install | `npm ci` |
| Build | `npm run hostinger:build` |
| Start | `npm start` |

**Environment variables** (hPanel → Node.js → Environment):

Copy from `deploy/hostinger-production.env.example` — values `deploy/hostinger-production.env` mein (gitignored).

Pehli deploy par `RUN_DB_SETUP=1` set karein (tables ban jayen), phir hata dein.

---

## GitHub Actions pipeline

Workflow: `.github/workflows/hostinger.yml`

| Trigger | Kya hota hai |
|---------|--------------|
| `push` → `main` | Build check (errors pehle pakad le) |
| Manual **Run workflow** | Build + SSH upload (backup) |

### GitHub Secrets (SSH backup ke liye)

Settings → Secrets → Actions:

| Secret | Example |
|--------|---------|
| `SSH_HOST` | `156.67.67.67` |
| `SSH_PORT` | `65002` |
| `SSH_USER` | `u938549775` |
| `SSH_PASSWORD` | SSH password |
| `DATABASE_URL` | MySQL connection string |
| `SSH_REMOTE_PATH` | `/home/u938549775/domains/qistpro.shop/nodejs` |

Local SSH deploy: `bash scripts/deploy-hostinger-ssh.sh` (needs `deploy/secrets.env`)

---

## Domains

- https://qistpro.shop
- https://www.qistpro.shop

`CORS_ORIGINS` aur `NEXT_PUBLIC_API_URL` dono domains ke sath match hon.
