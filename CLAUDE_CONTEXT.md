# SchnelPay — New Chat Context Document
## Paste this at the start of every new chat session

**Last Updated:** April 15, 2026 — End of Session
**Founder:** Randeep Singh — hello@schnelpay.com
**Company:** SchnelPay LLC (filed April 13, 2026 — awaiting CA SOS approval)

---

## 🚀 Project Overview

SchnelPay is a **live, quantum-safe cryptocurrency payment platform** built solo in 6 weeks with zero external capital. Currently in pre-seed fundraising targeting $500K on a SAFE.

**Four live products:**
- Marketing: schnelpay.com → schnelpay-marketing
- Dashboard: dashboard.schnelpay.com → schnelpay-dashboard
- Admin: admin.schnelpay.com → schnelpay-admin
- API: api.schnelpay.com → schnelpay-backend (Railway)

**GitHub org:** schnelpay | **Local:** ~/schnelpay/

---

## 📁 Full Repository Structure

```
~/schnelpay/
├── schnelpay-backend      # Node.js/TypeScript API → Railway
├── schnelpay-dashboard    # Next.js user dashboard → Cloudflare Pages
├── schnelpay-admin        # Next.js admin panel → Cloudflare Pages
├── schnelpay-marketing    # Next.js marketing site → Cloudflare Pages
├── schnelpay-assets       # Shared assets (logo SVG + PNG files)
├── schnelpay-mobile       # Phase 2 — not started
├── schnelpay-contracts    # Phase 2 — not started
├── schnelpay-docs         # Documentation
├── schnelpay-frontend     # Legacy — not in use
└── logo_SP.key            # Keynote source file for logo
```

---

## 🎨 Design System — NEVER CHANGE WITHOUT CHECKING HERE

### Fonts
- **Headings (h1-h6):** Playfair Display — `var(--font-playfair)`
- **Body / UI:** Jost — `var(--font-jost)` ← switched from DM Sans April 15
- **Code / addresses:** Courier New / monospace
- **RULE:** Never specify fontFamily inline — globals.css applies fonts globally

### Font Size Scale
- H1 hero: `clamp(32px, 5vw, 60px)`
- H2 sections: `clamp(28px, 4vw, 44px)`
- H3 cards: 18–20px fixed
- Body: 16px
- Small/meta: 13–14px

### Refined Color System (updated April 15)
```
BACKGROUNDS — layered depth:
#2C3340   Primary background (unchanged)
#343C4C   Elevated panels, cards (+6-8% lighter)
#252B36   Deep sections (slightly darker)

GOLD — premium, metallic:
#C2A03F   Refined default gold (PRIMARY — use this)
#E0C878   Highlight / hover states
#9A7D2A   Shadow tone
#C9A84C   Original gold — LOGO ONLY

TEXT — improved readability:
#F4F5F6   Primary text (unchanged)
#C7CBD1   Secondary text (softer)
#9AA3AF   Muted text (improved from #8B9AAD)
#6B7A8D   Subtle — captions, meta

BORDERS & UI POLISH:
rgba(255,255,255,0.08)    Hairline borders
rgba(255,255,255,0.12)    Card borders
rgba(194,160,63,0.5)      Gold divider (rare use)

SHADOWS:
0 4px 20px rgba(0,0,0,0.25)    Card shadow (use everywhere)
0 8px 32px rgba(0,0,0,0.35)    Card hover shadow

GOLD GRADIENT (key elements only):
linear-gradient(135deg, #E0C878, #C2A03F, #9A7D2A)

BUTTONS:
Primary bg: #C2A03F | Hover: #D4B35A | Text: #2C3340
```

### Shared Files
- `schnelpay-marketing/lib/theme.ts` — design tokens for marketing
- `app/globals.css` in each repo — CSS variables + global font rules

### Grid Rules — CRITICAL
- **6-item grids:** Always `repeat(3,1fr)` — NEVER `auto-fit`
- **3-item grids:** `repeat(3,1fr)` or `repeat(auto-fit,minmax(280px,1fr))`
- `auto-fit` with small item counts causes orphan cards — avoid

---

## 🔧 Tech Stack

**Backend:** Node.js + TypeScript, Express.js, PostgreSQL, Redis → Railway
**Auth:** ML-DSA-65 + ECDSA hybrid (NIST FIPS 204) — QuantumShield™
**Blockchains:** Infura (ETH), Blockchain.com (BTC), Solana public RPC
**Email:** Resend (noreply@schnelpay.com → admin alerts to hello@schnelpay.com)
**On-ramp:** MoonPay + Transak (server-side key generation — never in frontend)
**Frontend:** Next.js static export → Cloudflare Pages
**DB:** PostgreSQL + Redis on Railway (resourceful-rebirth project)

---

## 💻 Critical Code Rules

```bash
# File edits — ALWAYS use Python str.replace():
python3 << 'PYEOF'
path = '/Users/rsnanak/schnelpay/[repo]/[file]'
with open(path, 'r') as f: content = f.read()
content = content.replace(OLD, NEW)
with open(path, 'w') as f: f.write(content)
print("✓ Done")
PYEOF

# Deploy — same command every time:
git add -A && git commit -m "message" && git push origin main

# TypeScript check — use local binary only:
./node_modules/.bin/tsc --noEmit
# NEVER run: npx tsc (prompts to install wrong version)

# Keep-alive cron (already set on local machine):
*/20 * * * * curl -s https://api.schnelpay.com/health > /dev/null
```

---

## 🏗️ Infrastructure

**Railway:** Hobby plan — keep-alive cron set up. Upgrade to Pro ($20/mo) before first real users or investor demo.
**Cloudflare Pages:** Auto-deploys on git push to main. Takes 2-3 minutes.
**Build config:** `npm run build` → output directory `out` → `next.config.ts` must have `output: 'export'`

---

## 📱 Logo Status

- **Current:** CSS text "SP" in gold square — fixed to be side-by-side (not stacked) April 15
- **Assets available:** `~/schnelpay/schnelpay-assets/` — SVG and PNG exist
- **Source file:** `~/schnelpay/logo_SP.key` (Keynote)
- **When ready:** Drop `logo.svg` into `public/` of all 3 frontend repos — no code changes needed
- **Logo filenames to use:** `logo.svg`, `logo.png`, `logo-icon.svg`, `favicon.ico`

---

## 🔐 Security Features

- QuantumShield™ — ML-DSA-65 + ECDSA hybrid (NIST FIPS 204)
- Rate limiting by IP + endpoint
- Email 2FA via Resend
- JWT tokens (7-day expiry)
- `government_id_number` excluded from API responses
- Admin panel guards with `is_admin` check
- Admin email alerts on new user signup

---

## 🌐 Third-Party Integrations

| Service | Status | Notes |
|---------|--------|-------|
| MoonPay | Sandbox tested ✓ | KYB saved as draft — update with LLC + EIN |
| Transak | KYB submitted | Awaiting production approval |
| Resend | Live ✓ | Email verify + admin alerts |
| Infura | Live ✓ | Ethereum RPC |
| Blockchain.com | Live ✓ | Bitcoin (public) |
| Solana RPC | Live ✓ | Solana (public) |
| CoinGecko | Live ✓ | Prices (public) |
| Cloudflare | Live ✓ | Frontend hosting + DNS |
| Railway | Live ✓ | Backend + PostgreSQL + Redis |

---

## 🏢 Legal & Business

- **SchnelPay LLC** filed California SOS — April 13, 2026
- **Expected approval:** April 16–18, 2026
- **PENDING:** EIN from IRS (irs.gov — after LLC approved, takes 5 min online)
- **PENDING:** Mercury business bank account (mercury.com — after EIN)
- **PENDING:** MoonPay KYB — update with LLC name + EIN
- **PENDING:** Statement of Information — $20, within 90 days (bizfile.sos.ca.gov)
- **PENDING:** Change hello@schnelpay.com password from SchnelPay2026x
- **Future:** Convert to Delaware C-Corp when raising Seed round from VCs

---

## 💰 Investor Materials (all created — in outputs folder)

- `SchnelPay_Pitch_Deck_2026.pptx` — 12 slides, dark navy + gold
- `SchnelPay_Talking_Notes_Funding_Guide.docx` — slide notes + funding explained
- `SchnelPay_Executive_Summary.docx` — 2-page investor summary
- `SchnelPay_Platform_Structure.docx` — full tech/design reference
- `SchnelPay_Context_NewChat.md` — this file

**Ask:** $500K pre-seed on SAFE, 18-month runway
**Elevator pitches:** One-liner, 30-second, 60-second — all drafted

---

## 📝 YC Application

**Status:** All answers drafted — not yet submitted
**URL:** apply.ycombinator.com
**Key differentiators in application:**
- Only quantum-safe crypto payment platform (NIST FIPS 204)
- Live product built solo in 6 weeks
- MoonPay sandbox tested end-to-end
- LLC filed
- "Hacking a non-computer system" story: got MoonPay/Transak access before LLC

**Also applying to:**
- Alliance DAO (alliance.xyz) — rolling admissions
- Solana Foundation grants
- Ethereum Foundation grants

---

## 📣 Marketing & Content

- **X:** @SchnelPay | **LinkedIn:** SchnelPay | **Facebook:** SchnelPay
- **Blog posts live:** Zero chargebacks, custodial vs non-custodial, multi-chain, crypto tax
- **API waitlist page:** schnelpay.com/api
- **Reusable components created:**
  - `schnelpay-marketing/components/AssetCard.tsx` — crypto asset cards
  - `schnelpay-marketing/lib/theme.ts` — design tokens

---

## ✅ Completed — April 13–15, 2026

- SchnelPay LLC filed ✓
- EIN process understood (wait for LLC first) ✓
- Railway keep-alive cron set up ✓
- API root description updated to quantum-safe positioning ✓
- All 6 marketing pages font/typography standardized ✓
- DM Sans → Jost across ALL 3 frontend repos ✓
- SP logo mark standardized (side-by-side) across all products ✓
- About page stats grid fixed (2×3) ✓
- Features page assets grid fixed (2×3) ✓
- AssetCard reusable component created ✓
- Shared design tokens theme file (lib/theme.ts) ✓
- Premium color system refined and deployed to all 3 repos ✓
- CSS variables added to globals.css in all 3 repos ✓
- Shadows added to cards ✓
- Platform structure document created ✓
- Pitch deck (12 slides) created ✓
- Talking notes + funding guide created ✓
- Executive summary created ✓
- Three elevator pitches created ✓
- YC application answers drafted ✓

---

## 🔴 Immediate Action Items (do these first)

1. Watch for LLC approval email — expected April 16–18
2. Get EIN at irs.gov once LLC approved (5 min, free, instant)
3. Open Mercury bank account (mercury.com) after EIN
4. Return to MoonPay KYB with LLC name + EIN
5. Submit YC application at apply.ycombinator.com
6. Record 60-second founder video for YC
7. Apply to Alliance DAO at alliance.xyz
8. Book patent attorney consultation
9. File Statement of Information within 90 days ($20)
10. Change hello@schnelpay.com password

---

## 🟡 In Progress / Next Session

- Review all marketing pages after color refinement deploy
- Check dashboard and admin with refined colors
- Add Project Knowledge to Claude Project (upload this file)
- Add Custom Instructions to Claude Project (paste design rules)
- New logo — export from logo_SP.key when ready, drop into public/

---

## 📌 How to Start New Chat

1. Start new chat inside **SchnelPay Development** Claude Project
2. Upload this file OR paste the content
3. Say:

> "I'm continuing SchnelPay development. I'm Randeep Singh, solo founder.
> SchnelPay is live at schnelpay.com — quantum-safe crypto payment platform.
> Local code at ~/schnelpay/. GitHub org: schnelpay.
> Please read the context document. Today I want to work on: [task]"

---

*SchnelPay LLC · Confidential · April 2026 · rsnanak@gmail.com*
