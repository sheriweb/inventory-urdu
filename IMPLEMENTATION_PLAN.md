# Implementation Plan

Track progress in [PROGRESS.md](./PROGRESS.md).

## Design philosophy

**Screenshots = features only**, not visual design. UI is **modern professional** web admin.

### Navigation (updated Phase 4)

- **Top horizontal menu** with hover + click dropdown submenus (RTL Urdu)
- Groups: مرکزی | سیٹ اپ | اکاؤنٹس | قسطیں | رپورٹس
- No fixed sidebar — full-width content, dark top bar
- Admin app uses same top-nav pattern (English)

### Visual system

- Dark header (`slate-900`), emerald accents, dropdown panels with shadow + animation
- Cards, tables, badges, PageHeader components
- Lucide icons throughout

## Local database

MAMP MySQL via socket — see `.env.example`

## Phases

| Phase | Scope | Status |
|-------|--------|--------|
| 0–3 | Foundation → Lease account | Done |
| 4 | Edit schedule, short qist, top nav | Done |
| 5 | Recovery list, collect, advance, payment history | Done |
| 6 | Reports + print + account edit/discount | Done |
| 7 | Stock + inventory | Done |
| 8 | Loading/unloading + claims | Done |
| 9 | Roznamcha, cash book, trial balance + demo seed | Done |
| 10+ | Invoice edit, PDF, CNIC photos, polish | Planned |
| 11 | Automation & AI (voice, WhatsApp, scan, optional Groq/Gemini) | Planned — see [AUTOMATION_AI_ROADMAP.md](./AUTOMATION_AI_ROADMAP.md) |
