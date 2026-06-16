# SchnelPay — Security Hardening Record & Forward Roadmap

**Date:** May 23, 2026
**Author:** Development session (Randeep + Claude), informed by independent external security review
**Status:** Phase 1 (critical hardening) complete and deployed. Phase 2/3 planned.
**Scope:** Backend auth/crypto layer (`schnelpay-backend`), plus forward plan for Rust migration and productization of QuantumShield.

---

## Part 1 — What Was Changed (Phase 1, completed May 23, 2026)

An independent security consultant reviewed the architecture brief and the
auth/crypto source. Their findings, combined with our own analysis, produced a
prioritized fix list. All Phase 1 items below are implemented, compiled clean
(`tsc --noEmit`), deployed to Railway, and login-verified against production.

### Commit trail (schnelpay-backend, main)

| Finding | Commit | Summary |
|---|---|---|
| #1 Critical | `0a7d347` | Hybrid verification requires BOTH signatures present and valid |
| #2 Critical | `ece200b` + `80f270b` | Financial routes → `requireQuantumSafe`; legacy fallback + dead classical auth removed |
| #7 High | `44824c3` | Internal `ecdsa` → `hmac` naming corrected |
| #8 Medium | `1ec6b84` | Full password-strength validation enforced on register + reset |
| #9 Medium | `27a55fb` | PII (phone, DOB, nationality) removed from admin user-list |
| #4 High | `1fa833f` | Refresh tokens hashed (SHA-256) before DB storage |
| #6 High | `21f8d63` | Tiered fail-closed revocation check (Redis-unavailable handling) |
| #3 High | `47b5062` | Explicit algorithm/version pinning + structural token validation |

### Detail per finding

**#1 — Hybrid verification (the core fix).**
Previously `verifyHybrid` returned valid if EITHER the HMAC or the Dilithium
signature verified (`||` logic). This collapsed security to the weaker primitive
and permitted downgrade and signature-stripping attacks. Now: both signatures
must be PRESENT and both must VERIFY; a single success path requires both. A
leaked HMAC secret alone can no longer forge a token — an attacker would also
have to break Dilithium. This restores the actual hybrid guarantee.

**#2 — Legacy/classical auth path eliminated.**
Two parts. (a) Financial routes (wallet, payment, transaction, portfolio,
accounting, trust) moved from `authenticateQuantumSafe` (which accepted legacy
tokens) to `requireQuantumSafe` (rejects non-quantum-safe with HTTP 426).
(b) The legacy fallback inside `verifyToken` was removed, along with the unused
`verifyLegacyToken` / `generateLegacyToken` helpers AND the entire dormant
classical-JWT controller (`auth.controller.ts` + `auth.service.ts`, ~195 lines)
that was wired to no route but presented a full plain-JWT login path.
Result, compiler-verified: there is no classical/legacy authentication path
anywhere in the backend, live or dormant.

**#3 — Algorithm pinning.**
Verification now hardcodes the expected version (`quantum-safe-v1`) and signature
suite (`hybrid-ecdsa-dilithium`) server-side and rejects anything that doesn't
match. Verification logic is never selected from token-declared fields,
preventing algorithm-substitution / `alg:none`-class attacks. Added structural
validation to reject malformed tokens before field access.

**#4 — Refresh token hashing.**
Refresh tokens were stored raw; a DB leak would have exposed all active
sessions. Now stores `SHA-256(token)` and hashes input before lookup/revoke;
raw token still returned to the caller as their credential. (Refresh-token flow
is not yet wired to any route, so no live sessions were affected — this hardens
it ahead of use.)

**#6 — Tiered fail-closed revocation.**
`isTokenRevoked` previously failed OPEN: if Redis was unavailable, a revoked
token read as not-revoked. Now returns three states (revoked / not-revoked /
check-failed). On check-failure, sensitive routes fail CLOSED (HTTP 503, retry);
an explicit read-only safe-list (`/prices`, `/portfolio`) fails open. Default is
fail-closed — any unlisted route is protected.

**#7 — HMAC naming.**
The classical signature is HMAC-SHA256, not ECDSA. Internal methods/variables
renamed (`signWithECDSA`→`signWithHMAC`, etc.) to prevent incorrect assumptions
about asymmetric/non-repudiable signatures. Wire-format field names and the
`algorithm` string value were deliberately left unchanged to avoid breaking
existing tokens — they will change once, in the Phase 2 token redesign.

**#8 — Password strength enforcement.**
`validatePasswordStrength` (length + upper/lower/number/special) existed but was
never called; only a 12-char length check ran. Now enforced at registration and
password-reset entry points.

**#9 — Admin PII minimization.**
The admin user-list returned phone, DOB, and nationality for all users in bulk.
Removed. Per-user detailed PII access, if ever needed, should be a separate,
audit-logged endpoint — not a bulk list dump.

### Deferred from Phase 1 (intentionally)

**#5 — Split secrets / env-var rename.**
Original finding: `JWT_SECRET` was used both for legacy JWT signing AND the HMAC.
The shared-secret blast-radius problem was **resolved as a side effect of #2** —
the legacy JWT path was deleted, so `JWT_SECRET` now has exactly one consumer
(the HMAC). What remains is purely cosmetic: the env var is still *named*
`JWT_SECRET` when it is really the HMAC key. Renaming it (code + Railway env var)
is deferred because (a) it carries zero security benefit now, (b) a botched
env-var rename breaks all auth, and (c) the real secret-management improvement
(separate keys, Ed25519, KMS) belongs to Phase 2. **To do on return, carefully,
Railway-var-first.**

---

## Part 2 — Current Security Posture (honest assessment)

**Strong now:**
- Hybrid verification requires both primitives (no downgrade).
- No legacy/classical auth path exists.
- Algorithm/version pinned server-side; malformed tokens rejected.
- Refresh tokens hashed at rest.
- Revocation fails closed on sensitive routes.
- Feature-flag kill-switches fail closed and require admin PIN (both directions).
- Parameterized SQL, timing-safe comparisons, account lockout, email
  verification before auth issuance, Redis-backed rate limiting.

**Known gaps (planned, not yet done):**
- Classical half is HMAC (symmetric), not an asymmetric signature → see Phase 2.
- JSON.stringify used for signed payloads (non-canonical) → see Phase 2.
- No key IDs / key rotation support → see Phase 2.
- Withdrawal path is single-factor; TOTP built but not wired → see Phase 3.
- No `WITHDRAWAL_DELAY` enforcement → see Phase 3.
- Single admin account (no backup admin / recovery path).
- TOTP codes stored plaintext in Redis (short-lived) → Phase 2 nice-to-have.
- The `algorithm` type union and email marketing copy still say "ECDSA" →
  cosmetic, clean up in Phase 2.

**Quantum-safe claim:** defensible *after* Phase 1 for the "both-signatures
required, no downgrade" property. NOT yet defensible as a fully audited,
licensable product — that requires Phase 2 (asymmetric hybrid, canonicalization)
plus a formal independent crypto audit before any third-party licensing.

---

## Part 3 — TypeScript → Rust Migration Assessment

### The central conclusion (agreed by Claude and the consultant)

**Rust does NOT fix the current security issues — those were logic flaws (fixed
in Phase 1) and exist identically in any language.** Rust's value is *preventing
future classes of mistakes* (memory safety, parser ambiguity, concurrency bugs,
unsafe states) and enabling a compile-once / bind-to-many-languages model that
makes QuantumShield licensable across ecosystems. It is a **productization and
hardening** move, not a security fix.

### Why Rust is strategically aligned for SchnelPay

- The system is cryptography-heavy, auth-centric, and will handle concurrent
  financial operations — exactly where Rust outperforms Node.
- A single Rust core can compile to WASM (browser/JS), N-API (Node), and a C ABI
  (Python/Go/Java/.NET) — so QuantumShield can be sold into any ecosystem,
  written once. A TypeScript implementation could only ever serve Node shops.

### What to migrate (and what NOT to)

**Migrate (in this order):** crypto core (sign/verify/keygen) → token service →
auth middleware → revocation/session → transaction/withdrawal engine.

**Do NOT migrate:** the Next.js frontends (marketing, dashboard, admin). Keep
them in TypeScript. Target architecture: Next.js frontend → Rust auth/security
core → Rust transaction engine → Postgres + Redis.

### Recommended target architecture (consultant + Claude aligned)

- **Classical half:** move HMAC → **Ed25519** (true asymmetric hybrid, no shared
  secret, externally verifiable, cleaner audit story).
- **PQ half:** keep **ML-DSA-65 (Dilithium)**.
- **Serialization:** canonical — RFC 8785 (JCS) or CBOR (`serde_cbor`) — so
  signatures are stable across languages. Critical for licensing.
- **Key management:** add **key IDs (`kid`)** for rotation; token binding
  metadata (`iss`, `aud`, `jti`).
- **Suggested crates:** `ed25519-dalek` (Ed25519), `pqcrypto` (Dilithium),
  `ring`/`sha2`/`hmac`, `serde` + canonical encoding, `axum` + `tokio` + `sqlx`
  + `redis-rs` if/when the web layer moves.

### Integration method (decision needed at Phase 2/3 start)

N-API native module vs. WASM, given a Node backend on Railway. Tradeoffs to
evaluate then: build-pipeline complexity on Railway, performance, and the
multi-language licensing goal (which favors a clean core with multiple binding
targets).

### Migration approach — ZERO downtime, regardless of timing

Never a big-bang cutover. Parallel-run / shadow-verify:
1. Stand up the Rust signer/verifier alongside the TS one.
2. Sign with the new path AND verify against the old in shadow mode; log every
   mismatch.
3. After thousands of operations with zero divergence, flip a feature flag to
   make Rust authoritative; keep TS as instant rollback for a few weeks.
This holds whether you have 3 users or 30,000 — the technique, not the timing,
is what avoids downtime.

### Honest reality check on timeline and ownership

- Consultant estimate: auth core 3–6 wks, crypto hardening 2–4 wks, transaction
  engine 1–2 months, full backend 4–8 months — for someone who already knows
  Rust. As a solo founder learning Rust while running the business, expect
  longer.
- **Strong recommendation:** the licensable Rust core should likely be built by
  someone with deep Rust + crypto experience (hire/contract — possibly this
  consultant), AFTER funding/revenue, AFTER the formal audit, with the
  TypeScript Phase 1 system as the reference implementation. What you license is
  the audited Rust product — not a prototype written while learning the language.
- **The architecture seam to build NOW (cheap):** extract the crypto into a
  single `SigningProvider` interface (`sign` / `verify` / `generateKeypair`) so
  the eventual Rust swap is a one-module implementation change, not surgery
  across the codebase. This makes you Rust-ready without taking on Rust risk.

---

## Part 4 — Phase Roadmap

### Phase 2 — Architecture Hardening / QuantumShield Productization
*(after Phase 1 ships to users; deliberate, not rushed; this is where the Rust
port lives)*

- HMAC → Ed25519 (asymmetric hybrid).
- Canonical serialization (RFC 8785 or CBOR) for signed payloads.
- Key IDs (`kid`) + key rotation support.
- Token binding metadata (`iss`, `aud`, `jti`).
- Finish the wire-format rename (`ecdsa` field, algorithm strings, type union,
  email copy) — one deliberate token-format change.
- Complete the `#5` env-var rename (`JWT_SECRET` → `HMAC_SECRET`), Railway-first.
- Extract `SigningProvider` interface (do this early — it's cheap and de-risks
  the Rust port).
- Begin Rust crypto-core extraction (parallel-run, shadow-verify).
- TOTP hashing in Redis.
- Structured audit logging (feeds the admin audit panel — see below).
- Session/device binding.

### Phase 3 — Fintech-Grade Hardening
*(before scaling / before custodial goes live)*

- Mandatory TOTP for withdrawals (wire the existing TOTP to the withdrawal path).
- `WITHDRAWAL_DELAY_MINUTES` enforcement.
- HSM/KMS-backed signing keys.
- Redis HA / cluster (removes the fail-closed availability tradeoff from #6).
- Immutable / append-only audit trails.
- Risk scoring; impossible-travel / anomaly detection.
- **Formal independent cryptographic audit of the Rust core** — the gate that
  makes QuantumShield sellable to third parties.

### Operational follow-ups (not phase-gated)
- **Rotate the admin password** (was exposed in a session; change it).
- **Add a backup admin / recovery path** — single admin is a single point of
  failure.
- Complete `#5` env rename on return.

---

## Part 5 — Admin Audit/Reporting Panel (planned feature, separate workstream)

Requested: a downloadable, auditable operational log in the admin panel —
periods (nightly / weekly / monthly / quarterly / annual) covering:
- **Accounting:** revenue, volume, transaction breakdown (completed / failed /
  total), fees collected.
- **User activity:** login/logout times, transactions, linked to accounting.
- **System events:** updates, issues — for troubleshooting and audit.

Design principles agreed:
- **Operational data, not bulk PII** (login times, activity, status — NOT DOB,
  phone, address). Aligns with finding #9.
- **Append-only / tamper-evident** for the audit trail to be trustworthy
  (ties to Phase 2 "structured audit logging" and Phase 3 "immutable trails").
- Field-minimized exports; aggressive pagination; no large unrestricted dumps.

Open scoping questions to resolve before building:
1. Primary consumer — operational (you) vs. external auditor/regulator?
2. Reporting on existing captured data vs. requiring new event instrumentation
   (esp. "system updates/issues")?
3. Specific standard (ISO 27001 / SOC 2 / payment-specific) vs.
   "professional and auditable-looking" for now?

To be built as its own workstream AFTER Phase 1 is in production. The
"structured audit logging" in Phase 2 is the data foundation it depends on.

---

## Part 6 — Process Notes (what worked, for future security work)

- **Compile-check (`tsc --noEmit`) before every commit.** Caught real errors
  (e.g. a missed call-site rename) before they reached a broken build.
- **Verify-before-acting on failures.** A parsed `login: False` twice turned out
  to be empty-password (zsh `read` quirk) and deploy-timing — NOT code bugs.
  Reverting on reflex once undid a working fix. Always get the raw error before
  reverting.
- **Diagnose at the right layer.** Testing endpoints directly with `curl`
  isolated frontend bugs from backend behavior repeatedly.
- **One finding per commit, with reasoning in the commit message.** Good audit
  history; each change independently revertable.
- **zsh note:** hidden password prompt is `echo -n "pw: "; read -rs PW; echo`
  (NOT bash's `read -s -p`). Never put a live password in a command literal.
