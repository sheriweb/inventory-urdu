# Deploy — Git push = Hostinger

## GitHub Actions deploy (recommended)

GitHub repo → **Settings → Secrets → Actions**:

| Secret | Value |
|--------|-------|
| `HOSTINGER_API_TOKEN` | hPanel → Profile → API |
| `HOSTINGER_DOMAIN` | `paleturquoise-stork-447573.hostingersite.com` |

`git push` → build + Hostinger Node.js par deploy.

### FTP — 3 tareeqe

| Tareeqa | Kaam karta hai? |
|---------|-----------------|
| `npm run deploy:ftp` (aap ke Mac se) | ✅ Haan |
| GitHub cloud runner + FTP | ❌ Timeout (Hostinger block) |
| Self-hosted runner + FTP | ✅ Haan — `deploy-self-hosted.yml` |
| `HOSTINGER_API_TOKEN` | ✅ Best — Node.js build + start |

Local FTP: `npm run deploy:ftp`  
Self-hosted runner: GitHub → Settings → Actions → Runners → New → macOS install → Actions tab se **Deploy to Hostinger (Self-Hosted FTP)** run karein.

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
