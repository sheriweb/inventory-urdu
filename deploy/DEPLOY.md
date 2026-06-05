# Deploy — Git push = Hostinger live

## ⚠️ FTP vs Node.js

**FTP sirf PHP/static sites ke liye hai.**  
Inventory-urdu **Node.js app** hai (NestJS + Next.js) — is liye **FTP pipeline kaam nahi karegi**.

Is project ke liye **2 tareeqe** hain:

| Tareeqa | Kaise |
|--------|--------|
| **A — GitHub Actions** (yeh repo) | `main` push → auto deploy via Hostinger API |
| **B — hPanel Git** (sab se aasaan) | hPanel میں repo connect → har push auto deploy |

---

## Pipeline A — GitHub Secrets (ek dafa set karein)

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|-------|
| `HOSTINGER_API_TOKEN` | hPanel → **Profile → API** → Create token |
| `HOSTINGER_DOMAIN` | `paleturquoise-stork-447573.hostingersite.com` |

Phir `git push origin main` — workflow `.github/workflows/deploy.yml` khud deploy karega.

**Pehli dafa:** hPanel میں is domain par **Node.js Web App** enable hona chahiye (PHP default page se replace).

---

## Database — kya chahiye?

### 1. Hostinger MySQL (aap ke paas hai)

| Item | Value |
|------|-------|
| Database | `testinven` |
| User | `testinven` |
| Password | (jo aap ne set kiya) |
| Host | `localhost` (server par) |

### 2. Hostinger Node.js → Environment Variables (ek dafa)

hPanel → website → Node.js → **Environment variables** میں یہ add کریں:

```
DATABASE_URL=mysql://testinven:YOUR_PASSWORD@localhost:3306/testinven
```
(Password میں `@` ho to `%40` use کریں)

Plus JWT secrets, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL` — details `deploy/secrets.template.env` میں ہیں.

### 3. Tables banana (pehli dafa sirf)

Deploy ke baad Hostinger terminal / SSH (agar ho):

```bash
npm run hostinger:db:push
npm run hostinger:db:seed
```

Ya env میں `RUN_DB_SETUP=1` set کریں (pehli deploy کے بعد ہٹا دیں).

---

## Local secrets (optional)

```bash
cp deploy/secrets.template.env deploy/secrets.env
```

`deploy/secrets.env` git میں نہیں جاتی.

---

## Build commands (reference)

| | Command |
|--|---------|
| Install | `npm ci` |
| Build | `npm run hostinger:build` |
| Start | `npm run hostinger:start` |
