# Deploy — Git push = Hostinger

## FTP + Git (jo aap pehle karte thay)

GitHub repo → **Settings → Secrets → Actions** — yeh 4 secrets add karein:

| Secret | Example |
|--------|---------|
| `FTP_SERVER` | `156.67.67.67` |
| `FTP_USERNAME` | `u938549775.paleturquoise-stork-447573.hostingersite.com` |
| `FTP_PASSWORD` | aap ka FTP password |
| `FTP_SERVER_DIR` | `./` (default — public_html) |

Phir `git push` → files Hostinger par upload ho jati hain.

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
