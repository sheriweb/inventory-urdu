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
| **Entry file** | `scripts/hostinger-production-start.sh` |
| Output directory | *(khali)* |

`server.js` bhi chalega (bash script ko call karta hai) lekin **direct `.sh` entry behtar hai** — ek hi process (`exec next start`).

---

## Environment variables

See `deploy/hostinger-production.env.example`

**Pehli stable deploy ke liye:**
```
START_API_ON_BOOT=0
```
Site pages khulengi; login API band rahega. Jab web stable ho, phir:
```
START_API_ON_BOOT=1
API_START_DELAY_MS=180000
```

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
[hostinger] exec next start on 0.0.0.0:3000 (pid=...)
✓ Ready in XXXms
```

Sirf **ek** `Ready in` line — agar do hon to duplicate boot ab bhi hai.

Duplicate worker: `duplicate worker exits` — yeh theek hai (foran exit).

---

## Domains

- https://qistpro.shop
- https://www.qistpro.shop
