# Deploy — qistpro.shop (Hostinger)

## Resource limit error kyun aata hai?

Hostinger shared hosting par **CPU / RAM / processes ki limit** hoti hai. Ye error tab aata hai jab:

- hPanel **Git redeploy** server par `npm install` + **full build** chalata hai (bahut bhari)
- Saath mein **manual redeploy** ya doosri deploy bhi chal jaye (double load)
- Zyada **Node processes** chal rahe hon (API + Passenger + purani crashed processes)

**Fix:** Server par build band karein — sirf **GitHub Actions pipeline** use karein (build GitHub par, upload ready files).

---

## Recommended: GitHub Actions auto-deploy

Har `git push` on `main` → automatically:

1. GitHub par build (`npm run hostinger:build`)
2. `rsync --delete` se server par upload (extra purani files hata di jati hain)
3. Server par sirf `npm ci --omit=dev` + API start + Passenger restart

Workflow: `.github/workflows/hostinger.yml`

### GitHub Secrets (ek dafa set karein)

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|-------|
| `SSH_HOST` | `46.202.186.9` |
| `SSH_PORT` | `65002` |
| `SSH_USER` | `u972626041` |
| `SSH_PASSWORD` | SSH password |
| `SSH_REMOTE_PATH` | `/home/u972626041/domains/qistpro.shop/nodejs` |
| `DATABASE_URL` | `mysql://u972626041_inventory:...@127.0.0.1:3306/u972626041_inventory` |

Template: `deploy/secrets.env.example`

### hPanel Git deploy — BAND karein (important)

**Websites → qistpro.shop → Node.js → Git** — auto-deploy **disable** karein ya repo disconnect karein.

Warna har push par **do deploy** chalengi (hPanel + GitHub) aur resource limit phir hit hogi.

hPanel mein sirf ye rakhein:

| Setting | Value |
|---------|-------|
| Start file | `scripts/hostinger-combined-start.mjs` |
| Node.js | `20` |

Environment variables hPanel se (see `deploy/hostinger-production.env.example`).

---

## Local manual deploy (optional)

```bash
cp deploy/secrets.env.example deploy/secrets.env   # fill values
bash scripts/deploy-hostinger-ssh.sh
```

---

## Domains

- https://qistpro.shop
- https://www.qistpro.shop
