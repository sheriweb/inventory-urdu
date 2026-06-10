# Inventory Urdu — Progress

Last updated: 2026-06-01

## Overall: Phase 10 — 🔄 In Progress

| Phase | Name | Status |
|-------|------|--------|
| 0–9 | Foundation → Roznamcha | ✅ Done |
| 10 | Polish (payments, PDF, CNIC, perf) | 🔄 In Progress |
| 11 | Automation & AI (voice, WhatsApp, scan) | 🔄 Tier 1 started — [AUTOMATION_AI_ROADMAP.md](./AUTOMATION_AI_ROADMAP.md) |

---

## Phase 10 — Polish (started)

| # | Task | Status |
|---|------|--------|
| 10.1 | Top nav menu fix (portal dropdown) | ✅ Done |
| 10.2 | App spinners + route loading | ✅ Done |
| 10.3 | Performance: auth cache, accounts search fix | ✅ Done |
| 10.4 | Payment delete + receipt print/PDF | ✅ Done |
| 10.5 | Customer CNIC photo URL field | ✅ Done |
| 10.6 | Shareholder view | ⬜ Planned |
| 10.7 | Full file upload for CNIC | ⬜ Planned |

---

## Troubleshooting — 500 / dashboard not loading

```bash
# Sab purane next servers band karein, phir:
cd inventory-urdu/apps/web
npm run dev:clean
```

**Cause:** corrupt `.next` cache (`Cannot find module './383.js'`) — `npm run build` + `npm run dev` ek saath mat chalayein.

Console warnings from **1Password / MetaMask extensions** — ignore (app issue nahi).

لوڈنگ menu URLs: `/dashboard/load-mgmt/assign|unload|inventory`

---

- **Auth cached** — `/auth/me` called once per session
- **Accounts page** — API only on "تلاش" click, not every keystroke
- **Route loading** — `dashboard/loading.tsx` spinner on navigation
- **DataTable** — client-side search + spinner while loading

---

## Test

```bash
cd inventory-urdu/apps/api && npm run start:prod
cd inventory-urdu/apps/web && npm run dev:clean
```

Login: `shop@inventory.local` / `Shop123!`

1. Top menu hover/click → dropdown opens (portal)
2. **وصولی → ادائیگیوں کی تاریخ** → search → print receipt / delete installment payment
3. **گاہک** → CNIC تصویر URL field
