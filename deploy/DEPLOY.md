# Deploy — Git push = Hostinger

## SSH auto-deploy (recommended — API token ki zaroorat nahi)

Har `git push` on `main` → GitHub Actions → build → SSH upload → `prisma db push` → app restart.

GitHub → **Settings → Secrets → Actions**:

| Secret | Value |
|--------|-------|
| `SSH_HOST` | `156.67.67.67` |
| `SSH_PORT` | `65002` |
| `SSH_USER` | `u938549775` |
| `SSH_PASSWORD` | SSH password |
| `DATABASE_URL` | `mysql://u938549775_testinven1:...@127.0.0.1:3306/u938549775_testinven1` |

Workflow: `.github/workflows/deploy-ssh.yml`  
Local same flow: `npm run deploy:ssh` (needs `deploy/secrets.env`)

### Database schema changes

`prisma/schema.prisma` change + push → deploy automatically runs `prisma db push` on server.  
**Seed data** auto nahi chalti — sirf schema sync. Naya seed: SSH se manually `prisma/seed.ts`.

### Other tareeqe

| Tareeqa | Kaam karta hai? |
|---------|-----------------|
| **SSH + GitHub Actions** | ✅ Best — no API, no Mac ON |
| `npm run deploy:ssh` (local) | ✅ Haan |
| `HOSTINGER_API_TOKEN` | ✅ Agar agency owner de |
| GitHub cloud + FTP | ❌ Timeout |
| Self-hosted Mac + FTP | ✅ `deploy-self-hosted.yml` (manual trigger) |

---

## ⚠️ Zaroori baat — Node.js vs PHP

Aap pehle shayad **PHP / WordPress / static** site FTP se deploy karte thay — woh theek kaam karta hai.

**Inventory-urdu** Node.js app hai (API + Next.js). Sirf FTP se files upload hone se app **automatic nahi chalti** — server ko Node.js enable chahiye.

### Node app chalane ke 2 tareeqe (ek choose karein):

**1. hPanel GitHub (sab se aasaan — FTP jaisa feel)**  
hPanel → Websites → **Node.js Web App** → **Import Git** → `sheriweb/inventory-urdu`  
→ har `git push` par Hostinger khud build + deploy karega. **FTP ki zaroorat nahi.**

**2. GitHub Secret `HOSTINGER_API_TOKEN`**  
hPanel → Profile → API → token → GitHub secret  
→ pipeline FTP ke sath Node.js build bhi trigger karegi.

---

## Database

| Chahiye | Detail |
|---------|--------|
| MySQL | `testinven` (Hostinger par ban chuka) |
| `DATABASE_URL` | Hostinger Node.js env vars mein |
| Tables | pehli deploy: `RUN_DB_SETUP=1` env, phir hata dein |

Poori list: `deploy/secrets.template.env`
