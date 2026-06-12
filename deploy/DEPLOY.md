# Deploy — qistpro.shop (Hostinger)

## Primary: hPanel Git auto-deploy

Har `git push` on `main` → Hostinger khud pull, build, deploy karta hai.

**hPanel → Websites → qistpro.shop → Node.js → Git settings:**

| Setting | Value |
|---------|-------|
| Repository | `sheriweb/inventory-urdu` |
| Branch | `main` |
| Node.js | `20` |
| Build | `npm run hostinger:build` |
| Entry file | `server.js` |
| Start (npm) | `npm start` → `node server.js` |

Environment variables: `deploy/hostinger-production.env.example`

Pehli deploy par `RUN_DB_SETUP=1`, phir `RUN_DB_SETUP=0`.

---

## GitHub Actions pipeline (disabled on push)

`.github/workflows/hostinger.yml` — sirf **manual** run (Actions tab → Run workflow).

Push par automatic deploy **band** hai (shared hosting resource limits).

Local backup deploy: `bash scripts/deploy-hostinger-ssh.sh` (needs `deploy/secrets.env`)

---

## Domains

- https://qistpro.shop
- https://www.qistpro.shop
