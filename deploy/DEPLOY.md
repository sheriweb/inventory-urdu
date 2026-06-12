# Deploy — qistpro.shop (Hostinger)

## Primary: hPanel Git auto-deploy

**Pehle auto-deploy OFF karein** jab tak site stable na ho — har push server par heavy build chalati hai.

**hPanel → Websites → qistpro.shop → Node.js → Git settings:**

| Setting | Value |
|---------|-------|
| Repository | `sheriweb/inventory-urdu` |
| Branch | `main` |
| Node.js | `20` |
| Build command | `npm run hostinger:build` |
| **Entry file** | `server.js` |
| Output directory | *(khali — mat bharein)* |

**Entry file mein `node server.js` mat likhein** — sirf `server.js`.

Environment variables: `deploy/hostinger-production.env.example` (hPanel env vars mein set karein)

Pehli deploy par `RUN_DB_SETUP=1`, phir `RUN_DB_SETUP=0`.

### Healthy runtime logs

```
[hostinger] Boot pid=... PORT=3000 cwd=.../nodejs
[hostinger] Preparing Next.js from .../apps/web on port 3000…
[hostinger] Listening on http://0.0.0.0:3000
[hostinger] Starting API on 127.0.0.1:4001…
```

Agar crash loop ho (har 1–3 sec naya `Boot pid`) to `tmp/hostinger.log` check karein.

---

## GitHub Actions pipeline (disabled on push)

`.github/workflows/hostinger.yml` — sirf **manual** run (Actions tab → Run workflow).

Local backup deploy: `bash scripts/deploy-hostinger-ssh.sh` (needs `deploy/secrets.env`)

---

## Domains

- https://qistpro.shop
- https://www.qistpro.shop
