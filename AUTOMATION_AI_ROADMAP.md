# Automation & AI Roadmap — Inventory Urdu

**Product:** Multi-tenant Urdu قسط / کھاتہ management (گاہک، فروخت، IMEI، ریکوری، رسید، روزنامچہ)  
**Goal:** Free / low-cost automation + AI features jo product ko generic POS se alag karein  
**Last updated:** 2026-06-01

Related: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) · [PROGRESS.md](./PROGRESS.md)

---

## Design philosophy

1. **Core app bina AI ke chale** — AI optional, shop-level API keys
2. **Urdu shop workflow pehle** — voice, WhatsApp, qist logic, IMEI
3. **Confirm before save** — AI/voice se auto-save kabhi nahi
4. **Privacy** — CNIC/OCR data bhejne se pehle user consent

**Tagline idea:** *"قسط کی دکان کے لیے — بولیں، بھریں، وصول کریں"*

---

## Pehle se unique (existing)

| Feature | Location / notes | Kyun important |
|---------|------------------|----------------|
| Roman → Urdu | `apps/web/src/lib/roman-to-urdu.ts`, `UrduNameInput` | Mft, offline — doosre POS mein nahi |
| Urdu RTL + qist schedule | Lease new/edit, installment split view | Pakistan shop ke liye built-for-purpose |
| IMEI / bike identifiers | Items config, sale lines, print | Mobile/bike dukanein |
| Tab history (MDI-style) | `nav-history-context.tsx` | Desktop software jaisa flow |
| Enter → next field | `form-enter-navigation.ts` | Tez data entry |
| Customer presets (+ dropdown) | ذات، پیشہ، شہر — localStorage | Tez repeat entry |
| Sale draft → new lease | `sale-draft.ts` | نیا گاہک se نئی فروخت |
| Demo monitor | `demo-monitor`, client error log | Client feedback loop |

---

## Tier 1 — Bilkul mft (koi AI API nahi)

Browser + existing code se — **server cost zero**.

### 1.1 Voice input (sab se zyada impact)

**Tech:** [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — Chrome/Edge free.

```
Mic → speech → field value
```

| Field | Voice flow |
|-------|------------|
| موبائل، CNIC، IMEI، رقم، کھاتہ نمبر | Numbers direct ("ایک صفر ایک سات" → `1017`) |
| نام | Roman bolain → `romanToUrdu()` → Urdu |
| Advance / قسط رقم | Number only |

**UI:** Har field ke sath chota mic button — *"بول کر بھریں"*.

**Note:** Urdu voice recognition browser mein weak hai — **Roman/Urdu mix** best (e.g. "Muhammad mobile 03001234567").

**Implementation sketch:**

```
apps/web/src/
  hooks/use-speech-input.ts
  components/forms/voice-input-button.tsx
```

Wire on: نئی فروخت، نیا گاہک، ریکوری collect, IMEI fields.

---

### 1.2 Smart auto-fill (rules-based, AI nahi)

| Rule | Source |
|------|--------|
| ذات، شہر، علاقہ suggest | Pichle customers + `customer-field-presets.ts` |
| Advance % + قسط count default | Aakhri sale same customer / shop average |
| Same customer dubara | API se pichli lease fields pre-fill |
| Staff (sales/recovery) | Last used per shop — localStorage |

**Cost:** Mft, tez, offline-friendly.

---

### 1.3 Barcode / QR scan (IMEI)

**Tech:** `html5-qrcode` ya `@zxing/browser` — free, client-side.

- Camera → IMEI 1 / IMEI 2 scan
- Typing errors kam
- Mobile sale line par lagana

---

### 1.4 WhatsApp one-click (mft)

Extend `apps/web/src/lib/reminder-message.ts`:

| Action | Link |
|--------|------|
| قسط یاد دہانی | `wa.me/?text=...` |
| رسید share | Short Urdu + amount + date |
| Short balance alert | Recovery list se |

Koi WhatsApp Business API nahi — sirf deep link.

---

### 1.5 PWA + offline draft

- Service worker: نیا گاہک / نئی فروخت draft offline save
- Internet aaye → sync queue
- Weak internet wali dukanein ke liye strong differentiator

**Files to add:**

```
apps/web/public/manifest.json
apps/web/src/lib/offline-draft-queue.ts
```

---

### 1.6 Photo assist (OCR se pehle)

CNIC / cheque upload (pehle se hai) + **zoom, rotate, crop** — manual entry asan.  
Agla step: client-side OCR (Tier 2).

---

## Tier 2 — Free AI tools (limited quota)

| Tool | Free tier | Product use |
|------|-----------|-------------|
| **Groq** | Fast Llama/Mistral | Urdu messages, notes summarize |
| **Google Gemini** | Generous free quota | CNIC text, smart search |
| **Cloudflare Workers AI** | Free requests | Lightweight on Hostinger/CF |
| **Ollama (self-host)** | 100% free | VPS par local AI — data shop mein |

**Safe start:** AI sirf optional features — bina key ke app poora chale.

**Env (optional per deployment):**

```env
GROQ_API_KEY=
GEMINI_API_KEY=
AI_ENABLED=0
```

---

## Tier 3 — Unique AI features (competition nahi karta)

### 3.1 "بول کر فروخت" (Voice Sale Assistant)

Shop owner ek button → bolta hai:

> "گاہک احمد، موبائل سام سنگ، پچاس ہزار advance دس ہزار، دس قسطیں"

| Phase | Approach |
|-------|----------|
| Phase 1 (mft) | Fixed Urdu/Roman keyword parser — rules |
| Phase 2 (AI) | Groq/Gemini → structured JSON → form fill → **user confirm** |

**API:** `POST /ai/parse-voice-sale` (optional, rate-limited)

---

### 3.2 Recovery Copilot

Input: کھاتہ #, payment history  
Output:

- Late qist count
- Suggested WhatsApp message (Urdu)
- Risk label: سبز / پیلا / سرخ

**Phase 1:** Rule-based score (mft)  
**Phase 2:** Groq message polish

---

### 3.3 Urdu Smart Search

Natural language → filters:

> "وہ گاہک جس نے سام سنگ لیا اور قسط نہیں دی"

Gemini free → SQL-safe filter JSON → existing accounts/recovery APIs.

---

### 3.4 CNIC / Cheque OCR

Photo upload → Gemini Vision (free tier) → name, CNIC, bank → form fields.  
**Required:** Confirm screen; optional feature; shop consent.

**API:** `POST /ai/ocr-document` (image → fields, no auto-save)

---

### 3.5 Daily shop summary (AI)

Ek paragraph Urdu, rozana:

- Aaj kitni wasooli
- Kaun late hai
- Kl ka target

Groq — ~1 call/day/shop; cache same day.

---

## Architecture

```
Browser (Next.js)
  ├── Web Speech API        → numbers, roman names
  ├── roman-to-urdu         → ✓ already exists
  ├── html5-qrcode          → IMEI scan
  ├── PWA service worker    → offline draft
  └── WhatsApp deep links   → reminders

API (NestJS)
  ├── /ai/suggest-message     → Groq (optional)
  ├── /ai/parse-voice-sale    → structured form JSON
  ├── /ai/ocr-cnic            → Gemini vision
  └── /ai/daily-summary       → Groq + shop stats

Rules engine (no AI)
  ├── Late payment score
  ├── Auto installment suggest (deriveInstallmentPlan — ✓ partial)
  └── Customer field presets (✓ started)
```

**Module layout (planned):**

```
apps/api/src/modules/ai/
  ai.module.ts
  ai.controller.ts
  ai.service.ts
  providers/groq.provider.ts
  providers/gemini.provider.ts
```

---

## Implementation priority

| Order | Feature | Effort | Impact | Cost |
|-------|---------|--------|--------|------|
| 1 | Voice mic — موبائل، رقم، IMEI، کھاتہ | Medium | ⭐⭐⭐⭐⭐ | Mft |
| 2 | Roman voice → Urdu name | Low | ⭐⭐⭐⭐ | Mft |
| 3 | WhatsApp reminder + receipt share | Low | ⭐⭐⭐⭐ | Mft |
| 4 | IMEI barcode scan | Medium | ⭐⭐⭐⭐ | Mft |
| 5 | Smart auto-fill (rules) | Medium | ⭐⭐⭐ | Mft |
| 6 | PWA offline draft | High | ⭐⭐⭐⭐ | Mft |
| 7 | Groq recovery messages | Low | ⭐⭐⭐ | Free tier |
| 8 | Daily shop summary | Medium | ⭐⭐⭐ | Free tier |
| 9 | CNIC OCR (Gemini) | Medium | ⭐⭐⭐⭐ | Free tier |
| 10 | Voice Sale Assistant (full) | High | ⭐⭐⭐⭐⭐ | Mixed |

### Suggested sprints

**Sprint A (Week 1–2)** — Voice foundation  
- [x] `use-speech-input` hook  
- [x] `VoiceInputButton` + `InputWithVoice` components  
- [x] Wire: نئی فروخت (mobile, amounts, khata, CNIC), نیا گاہک, recovery collect, IMEI  
- [x] Roman speech → `romanToUrdu` for name fields (`UrduNameInput`)  

**Sprint B (Week 2–3)** — Communication  
- [x] WhatsApp قسط یاد دہانی on lease detail (`LeaseWhatsAppActions`)  
- [x] Message templates from shop settings (pehle se)  
- [x] Share receipt via WhatsApp (`رسید شیئر` — latest payment or account receipt)  
- [x] `api.whatsapp.com/send?phone=` — unsaved number opens chat (mobile + desktop)  

**Sprint D (partial)** — Smart auto-fill  
- [x] Last-used staff (sales/recovery/partner) — `last-used-staff.ts`  

**Sprint C (Week 3–4)** — Hardware assist  
- [x] IMEI QR/barcode scanner component (`barcode-scanner-modal.tsx`, `@zxing/browser`)  
- [x] Wire on `SaleItemDetailsEditor` via `IdentifierFieldInput` (scan + voice)  

**Sprint D (Week 4–5)** — Intelligence (rules)  
- [x] Late payment score on accounts list (`latePaymentScore` + badge)  
- [x] Last-sale auto-fill on new lease (`/customers/:id/sale-hints`)  
- [x] Shop-level "last used staff" memory (`last-used-staff.ts`)  

**Sprint E (Month 2)** — Optional AI  
- [ ] `ai` module + Groq provider  
- [ ] Recovery message suggest  
- [x] Daily shop summary (`GET /reports/daily-summary` + dashboard روزانہ خلاصہ)  
- [ ] Groq polish for daily summary paragraph (optional)  

**Sprint F (Month 2+)** — Advanced  
- [ ] CNIC OCR  
- [ ] Voice sale parser (rules → AI)  
- [x] PWA offline draft (localStorage autosave — نیا گاہک + نئی فروخت)  
- [x] `manifest.json` + minimal service worker  
- [x] PWA offline sync queue (`offline-sync-queue.ts` — submit when back online)  

---

## Marketing differentiation

| Generic POS | Inventory Urdu |
|-------------|----------------|
| English forms | **بول کر بھریں** |
| Manual reminders | **WhatsApp ایک کلک** |
| No qist logic | **دینا ایسا تھا / دیا ایسا ہے** |
| No IMEI | **موبائل/بائیک identifiers** |
| Cloud only | **Offline draft + Urdu** |
| Expensive AI add-on | **Free tier AI optional** |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Urdu voice weak | Roman fallback + number-only voice fields |
| AI wrong data | Always confirm screen; never auto-save |
| CNIC privacy | OCR optional; consent; prefer self-host Ollama for sensitive shops |
| Free tier limits | Cache responses; rate limit per shop; degrade gracefully |
| Browser speech unsupported | Hide mic; show keyboard hint |

---

## Success metrics

| Metric | Target |
|--------|--------|
| New sale form fill time | −40% with voice |
| IMEI entry errors | −60% with scan |
| Recovery WhatsApp sends | Track clicks from app |
| Shops using voice | % sessions with mic used |
| AI feature adoption | Optional key configured |

---

## Next action (pick one to build)

1. **Groq recovery message** with optional API key (Sprint E)  
2. **Groq daily summary polish** — optional AI paragraph (Sprint E)  
3. **CNIC OCR** with Gemini (Sprint F)  
4. **Voice sale parser** rules → AI (Sprint F)  

Jab team ready ho — PROGRESS.md mein Phase 11 ke tasks add karein aur yahan checkboxes update karein.
