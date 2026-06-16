# Commit 2 — PIN-Gate Admin Approval Endpoints (Build Plan)

**Status:** Planned, not built. Commit 1 (the `checkAdminPin` helper + `verifyFlagPin` refactor) is DONE and validated on production (422/200 behavior confirmed).
**Why this is planned-not-rushed:** these are money-moving endpoints AND production deploys from `main`, so a backend change here goes live immediately and must be coordinated with the frontend or the admin panel breaks.

---

## The core risk being fixed
Today the four most consequential admin actions require ONLY `requireAdmin` (a valid admin session) — LESS protection than flipping a feature flag (which needs the PIN). An attacker with a live admin session could approve withdrawals/ KYC with no PIN. This commit closes that risk-inversion by requiring the PIN (via the `checkAdminPin` helper from Commit 1) on:
- `PUT /admin/custodial/withdrawals/:id/approve`  ← authorizes money OUT (most critical)
- `PUT /admin/custodial/withdrawals/:id/reject`
- `PUT /admin/kyc/:id/approve`
- `PUT /admin/kyc/:id/reject`

---

## ⚠️ THE DEPLOYMENT COORDINATION PROBLEM (why we plan first)

`main` → production. The instant the backend starts requiring a PIN (`securityCode` in the body), the **current admin frontend — which does NOT send a PIN — will break** (all four buttons would 422). So we CANNOT deploy backend-first naively.

**Three safe rollout options (pick one at build time):**

**Option A — Frontend-first, backend-second (RECOMMENDED, safest):**
1. Ship the FRONTEND change first: add a PIN prompt to the approve/reject buttons; start SENDING `securityCode` in the request body. Backend still ignores it (no harm — extra field).
2. Verify the frontend deploys and the PIN prompt appears and sends.
3. THEN ship the backend change to require + verify the PIN. Now the frontend is already sending it, so nothing breaks.
- Net: at no point is there a backend requiring a PIN the frontend isn't sending.

**Option B — Backend tolerant-then-strict (two backend commits):**
1. Backend commit 2a: accept `securityCode` if present and verify it, but if ABSENT, still allow (log a warning). Frontend updated in parallel to send it.
2. Once frontend is confirmed sending in production, backend commit 2b: make the PIN MANDATORY (reject if absent).
- More commits, but zero-downtime and reversible.

**Option C — Coordinated single deploy (riskiest):**
- Deploy backend + frontend together, timed. Avoid — `main`-to-prod timing makes this fragile.

**Decision: Option A.** Frontend starts sending the PIN first (harmless extra field), then backend enforces. Cleanest for a `main`→prod setup.

---

## Backend changes (when building)

### 1. Gate the four handlers with `checkAdminPin`
In `src/controllers/admin.controller.ts`, at the START of each of `approveWithdrawal`, `rejectWithdrawal`, `approveKyc`, `rejectKyc`:
```
const adminId = (req as any).user?.id;
const { securityCode } = req.body;
const pinCheck = await AdminController.checkAdminPin(adminId, securityCode);
if (!pinCheck.ok) {
  return res.status(pinCheck.status || 422).json({ success: false, error: pinCheck.error, code: pinCheck.code });
}
// ... existing logic ...
```
Reuses the EXACT helper validated in Commit 1 (422 for wrong code, Redis lockout, attempt tracking). One PIN implementation everywhere.

### 2. Fix the rowCount false-success bug (do in same commit — we're already here)
Current handlers return `{success:true}` even when the UPDATE matched ZERO rows (already-approved / cancelled / wrong id) — a false success on a money action. Fix: check `result.rowCount` and return an error if nothing matched. Example for `approveWithdrawal`:
```
const result = await pool.query(`UPDATE custodial_transactions SET ... WHERE id=$1 AND tx_type='withdrawal' AND status='pending'`, [...]);
if (result.rowCount === 0) {
  return res.status(409).json({ success: false, error: 'Withdrawal not found or not in a pending state' });
}
return res.status(200).json({ success: true, data: { message: 'Withdrawal approved' } });
```
Apply the same `rowCount` guard to all four handlers.

### Files
- `src/controllers/admin.controller.ts` (the four handlers)
- (routes in `admin.routes.ts` stay the same — gating is in the handler, not the route)

---

## Frontend changes (`schnelpay-admin`)

### 1. PIN prompt on approve/reject
The admin UI's approve/reject buttons (withdrawals + KYC) must prompt for the PIN and send it as `securityCode` in the request body. Reuse the existing PIN-prompt UI pattern already used for feature-flag toggles (there's a working PIN modal there — mirror it).

### 2. NO_LOGOUT_PATHS — CRITICAL (this has bitten us before)
The admin app's API interceptor force-logs-out on ANY 401/403. The new endpoints return **422** for a wrong PIN (the Commit 1 design deliberately uses 422, NOT 401/403, to avoid this) — so 422 should NOT trigger logout. BUT verify the interceptor only logs out on 401/403 and treats 422 as a normal error the component handles. If the interceptor is broader, add these paths to `NO_LOGOUT_PATHS` in `schnelpay-admin/lib/api.ts`:
- `/admin/custodial/withdrawals/` (approve/reject)
- `/admin/kyc/` (approve/reject)
Confirm wrong-PIN shows "Invalid code. N attempts remaining." inline, NOT a logout.

### Files
- `schnelpay-admin` — the withdrawals + KYC approve/reject components
- `schnelpay-admin/lib/api.ts` — interceptor / NO_LOGOUT_PATHS

---

## Test plan (against staging ideally; production tests are non-destructive for PIN but DO touch real approval state — be careful)

**IMPORTANT staging caveat:** staging's `security@schnelpay.com` has a DIFFERENT password than production (staging login currently fails with prod password). To test on staging, either reset staging's admin password or email-verify the account there first. Otherwise test the PIN-gate behavior on production carefully.

1. **Wrong PIN on approve** → 422, `code:INVALID_SECURITY_CODE`, attempts decrement, withdrawal NOT approved.
2. **Correct PIN on approve** → 200, withdrawal approved (and rowCount guard: approving an already-approved one → 409, not false success).
3. **No PIN sent** (after enforcement) → 422 (rejected).
4. **Frontend:** wrong PIN shows inline error, does NOT log admin out.
5. **rowCount:** approve a non-pending/invalid id → 409 error, not `{success:true}`.

⚠️ Testing approve/reject on PRODUCTION changes real custodial_transactions rows. Since custodial is currently DISABLED and there are no real pending withdrawals, there's likely nothing to accidentally approve — but confirm before testing. Prefer staging once its admin login is fixed.

---

## Deployment sequence (Option A)
1. Build + deploy FRONTEND (sends `securityCode`, backend ignores it for now). Verify PIN prompt works.
2. Build + deploy BACKEND (require + verify PIN via `checkAdminPin` + rowCount fix). One commit, specific-file `git add` (NOT `-A` — avoids the recurring junk-file commits).
3. Verify end-to-end: approve with correct PIN works, wrong PIN blocked + no logout, already-approved → 409.

## Standing rules (apply)
- `git add <specific-file>` NOT `git add -A` (junk-file lesson).
- `./node_modules/.bin/tsc --noEmit` green before commit; `npm run build` for frontend.
- Python `str.replace()` for edits.
- Remember: `main` → production. Frontend-first ordering is the safety.

---

## After Commit 2 → then Phase 3 items (separate, later)
- 3.2 — WITHDRAWAL_DELAY_MINUTES enforcement + broadcast-worker gate (fail-closed, idempotent).
- 3.1 — TOTP wired to withdrawals (encrypted seed, replay protection, withdrawal-binding).
Per the main spec, build order is 2.1 (this) → 3.2 → 3.1.
