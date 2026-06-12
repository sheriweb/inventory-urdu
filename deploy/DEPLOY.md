# Deploy — qistpro.shop (Hostinger)

## IMPORTANT — process limit

**Bar bar redeploy mat karein.** Har deploy server par heavy build + boot chalati hai → 120/120 processes → 503.

1. Local verify pehle: `npm run verify:hostinger`
2. Hostinger limit clear hone ka wait (~30–60 min)
3. **Sirf ek** manual Save and Redeploy

---

## hPanel Git settings

| Setting | Value |
|---------|-------|
| Build command | `npm run hostinger:build` |
| **Entry file** | `server.js` |
| Output directory | *(khali)* |

`server.js` is the hPanel entry (`.js` required). `scripts/hostinger-production-start.sh` is kept for manual SSH use only.

---

## Environment variables

See `deploy/hostinger-production.env.example`

**Pehli stable deploy ke liye (optional — API ab default ON hai):**
```
START_API_ON_BOOT=0
```
Sirf web test ke liye. Normal production mein variable mat rakhein ya:
```
START_API_ON_BOOT=1
API_START_DELAY_MS=20000
```
Web `Ready` ke ~20–40 sec baad API port `4001` par start honi chahiye. Logs:
```
Web listening on 3000 — API will start in 20000ms
Starting API on 127.0.0.1:4001…
API ready on 127.0.0.1:4001
```
Agar `START_API_ON_BOOT=0` ho to login par `ECONNREFUSED 127.0.0.1:4001` aayega.

---

## Local verify (deploy se pehle)

```bash
npm run hostinger:build   # agar build artifacts nahi
npm run verify:hostinger
```

Pass hone ke baad hi redeploy karein.

---

## Healthy runtime logs

```
[hostinger] Next.js ready on 0.0.0.0:3000 pid=...
Web listening on 3000 — API will start in 20000ms
API ready on 127.0.0.1:4001
```

Sirf **ek** `Next.js ready` / boot sequence — duplicate worker: `duplicate worker exits` (theek hai).

---

## Domains

- https://qistpro.shop
- https://www.qistpro.shop
