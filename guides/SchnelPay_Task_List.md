# SchnelPay — Living Task List
## Last Updated: May 16, 2026

---

## 🔴 Immediate — Build Next Session

| # | Task | Area | Notes |
|---|------|------|-------|
| 1 | Fix Change PIN — show current PIN field correctly | Admin | State exists, UI not rendering |
| 2 | Rename "Security Code" → "Withdrawal Authorization Code" | Dashboard + Admin | Per security architecture review |
| 3 | Add address verification checkbox to custodial withdrawal | Dashboard | "I verified this address. Withdrawals cannot be reversed." |
| 4 | Add PIN rate limiting — 3 attempts → 15 min lockout | Backend | Prevents brute force on 6-digit PIN |
| 5 | Add audit fields to withdrawal logging | Backend | IP address, timestamp, device info |
| 6 | Add withdrawal delay — configurable WITHDRAWAL_DELAY_MINUTES | Backend + Admin | Default 15 min, add as feature flag |
| 7 | Upgrade ethers v5 → v6 | Backend | Fixes elliptic vulnerability — breaking change, needs token service rewrite |

---

## 🤝 Partner Applications — In Progress

| # | Partner | Region | Status | Notes |
|---|---------|--------|--------|-------|
| P1 | Transak | Global | ✅ KYB Approved | Webhook whitelist pending |
| P2 | Ramp Network | EU/UK/Canada | 📤 Email drafted | Apply at ramp.network/partners |
| P3 | Coinbase Pay SDK | US/Canada | 📤 Email drafted | Apply at coinbase.com/cloud/products/pay-sdk |
| P4 | Kraken Ramp | Global | 🔜 Next week | 400+ tokens, 30+ markets |
| P5 | Onramper | Global aggregator | 🔜 After Transak stable | Single API covers 30+ ramps |
| P6 | Kado | Stablecoin/off-ramp | 🔜 Phase 2 | 1.5% flat fee, best for off-ramp |
| P7 | MoonPay | Global | 🔜 After traction/MSB | Previously rejected — reapply later |
| P8 | Ripio | Latin America | 🔜 Phase 2 | Mercado Pago, Argentina focus |
| P9 | Banxa | Canada/Australia | 🔜 Phase 2 | FINTRAC registered |
| P10 | Alchemy Pay | Asia | 🔜 Phase 2 | Regional wallets, Asia-Pacific |

---

## 🟡 This Week — Content & Business

| # | Task | Date | Notes |
|---|------|------|-------|
| 8 | Blog Post 4 — What We Don't Know About Quantum | Tue May 19 | Uncomment in blog/page.tsx |
| 9 | Follow up Transak webhook whitelist | Tue May 19 | Email if no confirmation |
| 10 | CLARITY Act post goes live | Thu May 21 | Uncomment + social posts |
| 11 | Blog Post 5 — QuantumShield Roadmap 2027 | Fri May 22 | Uncomment in blog/page.tsx |
| 12 | Blog Post 6 — Why Small Fintech Moved First | Tue May 26 | Uncomment in blog/page.tsx |

---

## 🟢 Near Term — Platform Features

| # | Task | Area | Notes |
|---|------|------|-------|
| 13 | Custodial user withdrawal flow — full UI | Dashboard | Review → Auth Code → Success |
| 14 | Custodial deposit detection | Backend | Monitor blockchain for deposits |
| 15 | Transak production go-live | Backend | After webhook whitelist confirmed |
| 16 | MoonPay reapplication | Business | After first revenue or MSB license |
| 17 | Style guide v3 — save to project docs | All | Copy HTML to style-guide/ folder |

---

## 📋 Deferred — Add When Ready

### Security (before Series A)
| # | Task | Trigger | Notes |
|---|------|---------|-------|
| 18 | Switch bcrypt → Argon2id for PIN hashing | Hire security engineer | More GPU resistant |
| 19 | WebAuthn / TOTP for admin login | Before Series A | Hardware key or authenticator |
| 20 | Role separation — read-only vs write admin | Second admin hired | Prevent over-privileged access |
| 21 | Immutable audit log — append-only table | Before MSB review | SOC2 and SAR documentation |
| 22 | Global rate limiting per user per endpoint | When traffic justifies | Currently none |

### Custodial (before MSB license)
| # | Task | Trigger | Notes |
|---|------|---------|-------|
| 23 | MSB license filing | Before enabling custodial | Required by law |
| 24 | Multi-admin quorum approval | Second admin exists | No single approval point |
| 25 | Risk-based auto-approval thresholds | Volume justifies | Small = auto, large = manual |
| 26 | Velocity heuristics | Phase 2 | Flag unusual withdrawal patterns |
| 27 | Geo-blocking and OFAC compliance | Phase 2 | High-risk country flags |

### Infrastructure (>$1M/month volume)
| # | Task | Trigger | Notes |
|---|------|---------|-------|
| 28 | Hardware Security Module (HSM) | >$1M/month | Private key never leaves hardware |
| 29 | MPC wallet signing | Phase 3 | Eliminate single-key risk |
| 30 | AI fraud detection | Phase 3 | Velocity, geo, device anomaly |

### Platform (when scaling)
| # | Task | Trigger | Notes |
|---|------|---------|-------|
| 31 | Delaware C-Corp conversion | Before institutional Seed | VCs require Delaware C-Corp |
| 32 | SOC2 Type I audit | Before enterprise sales | Required by enterprise customers |
| 33 | Mobile app iOS/Android | Phase 2 | Previously prototyped as PoCWallet |
| 34 | Smart contract development | Phase 2 | HTLC for cross-chain routing |
| 35 | Additional blockchains — Polygon, Avalanche | Phase 2 | After core chains stable |
| 36 | Public developer API docs — Swagger/OpenAPI | Phase 2 | Developer onboarding |
| 37 | Webhook system for merchants | Phase 2 | Payment status notifications |
| 38 | Recurring payments | Phase 3 | Subscription billing on-chain |

### Business (when applicable)
| # | Task | Trigger | Notes |
|---|------|---------|-------|
| 39 | Patent attorney — QuantumShield™ | When ready | Technical brief prepared |
| 40 | Coinbase Pay integration | After Transak established | Alternative on-ramp |
| 41 | Ramp Network integration | After Transak established | European on-ramp |
| 42 | Enterprise SDK / white-label | Phase 3 | B2B revenue stream |

---

## 🔁 Recurring

| Task | Next Due | Notes |
|------|----------|-------|
| Regenerate GitHub PAT "SchnelPay Development" | June 14, 2026 | Set 90 days on next renewal |

---

## ✅ Completed

| # | Task | Completed | Notes |
|---|------|-----------|-------|
| ✓ | SchnelPay LLC — California SOS | April 2026 | Approved |
| ✓ | EIN from IRS | May 2026 | |
| ✓ | Mercury business bank account | May 2026 | |
| ✓ | Statement of Information filed | May 2026 | |
| ✓ | Transak KYB approved | May 2026 | Production keys active |
| ✓ | Transak webhook form submitted | May 2026 | Awaiting whitelist |
| ✓ | a16z Speedrun application | May 15, 2026 | Awaiting review |
| ✓ | YC application | May 2026 | Awaiting review |
| ✓ | LinkedIn Company Page | May 2026 | Live |
| ✓ | Dashboard responsive sidebar | May 2026 | |
| ✓ | Admin responsive sidebar | May 2026 | |
| ✓ | globals.css v2 tokens | May 2026 | Dashboard + Admin unified |
| ✓ | Admin KYC review page | May 2026 | |
| ✓ | Admin custodial oversight page | May 2026 | |
| ✓ | Admin feature flags + PIN | May 2026 | 6-digit PIN protection |
| ✓ | Dashboard login dark theme | May 2026 | |
| ✓ | Blog posts 1-3 published | May 2026 | |
| ✓ | CLARITY Act blog post written | May 2026 | Scheduled May 21 |
| ✓ | Style guide v3 Final | May 2026 | HTML + PDF |
| ✓ | Transak production environment | May 2026 | |
| ✓ | Railway staging environment | May 2026 | Separate Dilithium keys |
| ✓ | Transak webhook handler | May 2026 | JWT verification |
| ✓ | transak_orders table | May 2026 | Production DB migration |

---

## 📌 How to Use

- **Add:** New requirement → add to appropriate section
- **Complete:** Move to ✅ Completed with date
- **Defer:** Move to 📋 Deferred with trigger condition
- **Commit after every update:**
```bash
cd ~/schnelpay/project-docs
git add -A && git commit -m "docs: update task list" && git push origin main
```

---
*SchnelPay LLC · Confidential · Internal use only*
