# SchnelPay — Withdrawal Security Hardening (Combined Pass)

**Date:** 2026-06-06
**Scope:** Roadmap items 2.1 (PIN-gate admin approvals) + 3.1 (TOTP on withdrawals) + 3.2 (withdrawal-delay enforcement), designed as one coherent withdrawal-authorization layer.
**Status of the flow being hardened:** custodial/withdrawal is currently DISABLED (not live). This is hardening AHEAD of risk — build right, no time pressure. All of this is a PRE-CUSTODIAL GATE: must be done before custodial is enabled.

> NOT a substitute for the eventual independent security/crypto audit. This hardens the application logic; HSM/KMS, MPC, and formal audit remain later gates.

---

## 0. Threat model — what each control defends against

Be explicit about *what we're defending against*, because "very secure" only means something against a defined adversary.

| Threat | Control that addresses it |
|---|---|
| **Compromised admin session/token** approves a fraudulent withdrawal | 2.1 — PIN required at the approve step (something the admin *knows*, not just the session) |
| **Admin credential phished/leaked** (password + session) | 3.1 — TOTP (something the admin *has*, time-based, not replayable) |
| **Brute-force of the PIN/TOTP** | Redis rate-limit + lockout (already proven on feature-flag PIN) |
| **Fraudulent withdrawal that passed all checks** (e.g. social-engineered approval, insider) | 3.2 — time delay creates a cancellation window before on-chain broadcast |
| **Replay of a captured approval request** | Per-request nonce + TOTP one-time-use binding (see 3.1 hardening) |
| **Withdrawal to attacker address** (user account takeover) | User-side Withdrawal Authorization Code + address-verification checkbox (already built) + delay window |

Key principle: **defense in depth.** No single control is trusted alone. Approve = admin login (have session) **AND** PIN (know secret) **AND** TOTP (have device), then the delay gives a catch window even if all three are defeated.

---

## 1. Item 2.1 — PIN-gate the dangerous admin approval actions

### What
Require the admin PIN (the SAME mechanism already protecting feature-flag toggles) on these state-changing endpoints, which today require only admin login:
- `PUT /admin/custodial/withdrawals/:id/approve`  ← authorizes money OUT (most critical)
- `PUT /admin/custodial/withdrawals/:id/reject`
- `PUT /admin/kyc/:id/approve`
- `PUT /admin/kyc/:id/reject`

### Why this is the top priority
Risk-inverted today: flipping a feature flag needs a PIN, but *approving a withdrawal* (moving real money) does not. An attacker with a live admin session could approve withdrawals without knowing the PIN. Close this before custodial goes live.

### How (reuse what's proven)
- Reuse the existing PIN verification used by `toggleFeatureFlag`: bcrypt-hashed PIN stored in `feature_flags` under `__ADMIN_PIN__`, Redis-backed lockout (3 attempts → 15-min lockout), already battle-tested.
- Each of the four endpoints verifies the PIN (passed in request body as e.g. `securityCode`) BEFORE performing the state change.
- On wrong PIN: return the SAME structured response the flag flow uses ("Invalid code. N attempts remaining." / "Locked out for 15 minutes.").

### CRITICAL gotcha (already bit us once — do NOT forget)
The admin app's API interceptor force-logs-out on ANY 401/403. A wrong-PIN response on these endpoints MUST be added to `NO_LOGOUT_PATHS` in `schnelpay-admin/lib/api.ts` (and the dashboard equivalent if applicable) — otherwise a wrong PIN logs the admin out instead of showing "wrong code." This already happened on the feature-flag PIN flow. The withdrawal/KYC approve+reject endpoints are the next candidates; add them to `NO_LOGOUT_PATHS` in the same commit.

Use a distinct error shape for "wrong PIN/TOTP" (e.g. HTTP 422 with `{ code: 'INVALID_SECURITY_CODE', attemptsRemaining }`) vs. "dead session" (401) so the interceptor can distinguish them cleanly rather than relying only on path-matching.

### Files
- `src/routes/admin.routes.ts` (the four routes)
- `src/controllers/admin.controller.ts` (the handlers — wrap each with PIN check)
- `schnelpay-admin/lib/api.ts` (`NO_LOGOUT_PATHS`)
- Reuse existing PIN-verify helper (don't reimplement).

---

## 2. Item 3.1 — Mandatory TOTP on withdrawal authorization

### What
Wire the already-BUILT-but-UNWIRED TOTP to the withdrawal approve/execute path. TOTP becomes a required second factor on withdrawal approval (stronger successor to 2.1's PIN; they stack — PIN now, TOTP at custodial launch, both can be required).

### Why TOTP (vs. just the PIN)
PIN is "something you know" — phishable/shoulder-surfable, and stored server-side (a DB leak of the bcrypt hash is offline-crackable for a weak PIN). TOTP is "something you have" — a time-based code from the admin's authenticator device, not replayable, not stored as a crackable secret in the same way. Together they're meaningfully stronger than either alone.

### Hardening requirements (this is where TOTP is often done insecurely)
1. **TOTP secret storage:** the per-admin TOTP seed must be stored ENCRYPTED at rest (not plaintext). Roadmap already flags "TOTP codes stored plaintext in Redis" as a gap — fix as part of this: encrypt the seed; if caching verified codes, hash them and keep TTL short.
2. **One-time use / replay protection:** reject a TOTP code that was already used within its validity window (store last-used counter/timestamp per admin in Redis). A 30-second TOTP window otherwise allows replay within those seconds.
3. **Clock skew:** allow ±1 time-step (RFC 6238) — no more, to limit the replay surface.
4. **Rate-limit TOTP attempts** the same way as the PIN (Redis lockout) — TOTP is 6 digits, brute-forceable without it.
5. **Bind the TOTP check to the specific withdrawal** (include withdrawal id + amount in what the approval authorizes), so a code captured for one approval can't authorize a different one.
6. **NO_LOGOUT_PATHS** applies here too — wrong TOTP must not log the admin out. (Roadmap explicitly names the withdrawal-TOTP endpoint as the next NO_LOGOUT_PATHS candidate.)

### Files
- TOTP service (already built — locate it; wire, don't rebuild)
- `src/controllers/admin.controller.ts` (withdrawal approve/execute)
- `src/routes/admin.routes.ts`
- `schnelpay-admin/lib/api.ts` (`NO_LOGOUT_PATHS`)
- Migration: encrypted TOTP-seed column + last-used tracking if not present.

---

## 3. Item 3.2 — WITHDRAWAL_DELAY_MINUTES enforcement

### What
Enforce a configurable time delay between withdrawal APPROVAL and on-chain BROADCAST. The config exists (`WITHDRAWAL_DELAY_MINUTES`, default 15) but is NOT enforced. Make it real.

### Why
A delay is the catch-all backstop: even if PIN + TOTP are all defeated (insider, full compromise, social engineering), the delay creates a window to detect and CANCEL a fraudulent withdrawal before the irreversible on-chain send. This is the single most valuable control against "everything else failed."

### How
- On approval: set `delay_until = now() + WITHDRAWAL_DELAY_MINUTES` on the withdrawal row (the `delay_until TIMESTAMP` field already designed in the schema).
- A broadcast worker only sends withdrawals where `now() >= delay_until` AND status still `approved` (not `cancelled`).
- During the window, the withdrawal is cancellable (admin action, and ideally a user-initiated "cancel my withdrawal" too — user-side cancel catches account-takeover withdrawals the user notices).
- Enforce server-side ONLY — never trust a client-supplied delay.
- `WITHDRAWAL_DELAY_MINUTES` must be added to the PRODUCTION database (roadmap notes it's not there yet) and changing it should itself be PIN-gated (it's a security-sensitive config — same class as a feature flag).

### Hardening notes
- **Fail-closed:** if the delay config is missing/unreadable, default to the SAFE (longer) delay, never to zero. A missing config must not mean "broadcast immediately."
- **The broadcast worker is now security-critical** — it's the thing that actually moves money. It must check status + delay_until atomically and be idempotent (never double-broadcast on retry). Single DB transaction for "claim + mark broadcasting."
- Log every state transition (approved → delayed → broadcast/cancelled) to the audit trail (ties to the append-only audit logging in 2.4).

### Files
- `src/controllers/admin.controller.ts` (set delay_until on approve)
- The broadcast worker/service (enforce the gate)
- Migration / production DB: add `WITHDRAWAL_DELAY_MINUTES`, ensure `delay_until` column exists
- Admin UI: surface delay status + cancel button

---

## 4. Build order (one coherent pass, safest sequence)

1. **2.1 first** — PIN-gate the four approval endpoints + NO_LOGOUT_PATHS. Lowest-risk, reuses proven code, closes the risk-inversion immediately.
2. **3.2 next** — withdrawal delay enforcement + the broadcast-worker gate + production config (fail-closed). This is the highest-value backstop and is independent of TOTP.
3. **3.1 last** — TOTP wiring + its hardening (encrypted seed, replay protection, rate-limit, withdrawal-binding). Most involved; do it deliberately.

Rationale: each step is independently shippable and independently valuable; if you stop after any step you're strictly more secure than before. TOTP last because it's the most intricate and benefits from 2.1's PIN plumbing already in place.

## 5. Pre-commit discipline (standing rules — apply to every step)
- `./node_modules/.bin/tsc --noEmit` from inside `schnelpay-backend` before every commit. NEVER `npx tsc`.
- One finding/feature per commit, descriptive message, independently revertable.
- File edits via Python `str.replace()` scripts, not sed/heredoc.
- Test each endpoint with `curl` directly (isolate backend from frontend) — esp. the wrong-PIN/wrong-TOTP paths, to confirm they return the right error shape and DON'T trigger logout.
- DB changes: single `psql` invocation or `psql -1` (the production proxy is autocommit-style; BEGIN/COMMIT across separate `-c` calls does NOT hold a transaction).
- Verify `delay_until` / broadcast logic against staging before production.

## 6. What this pass does NOT cover (later gates — don't scope-creep)
- HSM/KMS-backed signing keys (Phase 3, >$1M/mo).
- MPC wallet signing (Phase 3).
- Multi-admin quorum approval (when 2nd admin exists).
- Risk scoring / impossible-travel / velocity anomaly detection (Phase 3).
- Argon2id replacing bcrypt (when security engineer hired).
- Immutable/append-only audit trail (Phase 2/3 — but DO log transitions now in whatever form exists).
- Formal independent crypto audit (the licensing gate).

Don't pull these forward — they're gated on milestones that haven't happened. This pass is the right scope for "secure enough to enable custodial," not "audited for third-party licensing."

---

## TL;DR
Three controls, layered: **PIN** (know) + **TOTP** (have) on approval, then a **delay** (catch window) before the irreversible broadcast. Build 2.1 → 3.2 → 3.1, each independently shippable. Reuse the proven PIN/Redis-lockout plumbing; the new security-critical surface is the **broadcast worker** (must be fail-closed, idempotent, delay-gated). Everything is server-side, rate-limited, and wrong-secret responses must NOT log the admin out (NO_LOGOUT_PATHS). This is a pre-custodial gate, built ahead of risk with no live exposure — so build it right.
