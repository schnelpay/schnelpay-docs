# SchnelPay — Phase 3.2: Withdrawal Delay + Broadcast Path (Design Doc V2.1)

**Status:** FINAL DESIGN — incorporates THREE independent external security reviews.
"Ready for implementation review" per the reviewers. No code written yet.
**Context:** Custodial withdrawals are DISABLED/inactive. PRE-CUSTODIAL gate — build +
test before custodial goes live; zero live risk building now.
**Custody model:** licensed BaaS/CaaS partner, NOT DIY key custody. Broadcast = partner
API call, not raw signing. Delay / state machine / idempotency / snapshot / cancellation
are partner-agnostic and buildable now; the broadcast call itself is a **stub** until the
partner is chosen.

> **Important framing (read before treating this as "done"):** "Ready for implementation
> review" means the BLUEPRINT is sound — NOT that the system is built or safe. The
> security of a money-moving path lives in the eventual CODE (race conditions, exact SQL,
> restart behavior), which no reviewer has seen yet. This design being strong is necessary
> but not sufficient. A separate review of the actual implementation is still required
> before custodial launch.

---

## 0. What changed in V2.1 (third-review synthesis)

The third reviewer upgraded the design to "ready for implementation review" and added
**five concrete requirements**. All five are adopted — they answer open questions V2
itself had flagged (§9 of V2).

| # | V2.1 change | Source | Why |
|---|---|---|---|
| 1 | **Separate `withdrawal_approval_snapshots` table** (NOT JSONB on the row) | R3 | An attacker editing `custodial_transactions` shouldn't edit the snapshot in the same write. Isolation of duties + forensic preservation. (Resolves V2 open-Q 9.1.) |
| 2 | **Dedicated `security_hold` state** for tamper detection | R3 | Tamper events must NOT route to generic `failed` — they need a visibly distinct, manual-review-only state. (Resolves V2 open-Q 9.3.) |
| 3 | **Max approval age** (`WITHDRAWAL_MAX_DELAY_AGE_HOURS`, e.g. 24) | R3 (NEW) | A stale approval sitting for hours/days is a window where sanctions/KYC status changes underneath it. Expired approvals -> manual review, never auto-broadcast. |
| 4 | **DB-level triggers** enforcing append-only event ledger | R3 | Convention isn't enough; `BEFORE UPDATE/DELETE RAISE EXCEPTION` makes immutability programmatic. (Resolves V2 open-Q 9.6.) |
| 5 | **Partner status lookup by client reference ID** (not just tx_hash) | R3 | On an unknown outcome there may be NO tx_hash yet — reconciliation must key off our deterministic client reference ID. |

**Plus a secret-handling roadmap (R3):** `APPROVAL_SECRET` in a plain env var is a known
weakness (Phase A); evolve to Cloud KMS (AWS/GCP KMS) before/at custodial launch (Phase B);
partner-side approval controls as the deepest backstop at partner integration (Phase C).
This directly addresses the HMAC-secret-isolation caveat Claude raised in V2 §0a — see §3.8.

---

## 0a. Cumulative review history (so we don't over-trust any single voice)
- **R1, R2 (V1->V2):** fail-STOPPED config; approval snapshot + HMAC; `reconciling` state;
  immutable event ledger; user self-cancel; insider/malicious-admin threat; partner
  idempotency as a selection requirement; Option A worker for launch.
- **R3 (V2->V2.1):** the five items above + KMS roadmap.
- **Convergence caveat (Claude):** all three reviewers reasoned from THIS DESIGN DOC, not
  the code. Shared blind spots can propagate. The decisive review is still the code review.
  Treat the strong scores as "good blueprint," not "safe system."

---

## 1. Current state — what EXISTS today (verified from source)

### 1.1 Withdrawal lifecycle today [EXISTS]
```
User requests -> CustodialService.requestWithdrawal() -> INSERT status='pending'
Admin approves -> approveWithdrawal() -> 'pending' -> 'processing'   [PIN-gated, Phase 2.1 done]
Admin rejects  -> rejectWithdrawal()  -> 'pending' -> 'cancelled'    [PIN-gated, Phase 2.1 done]
   ... then NOTHING. Never broadcasts. <-- THE GAP
```

### 1.2 State machine the schema anticipates [EXISTS — schema]
`custodial_transactions.status` CHECK currently allows:
```
pending -> detected -> confirming -> processing -> broadcasting -> completed
                                                 -> failed  -> cancelled
```
Supporting columns present: `tx_hash`, `block_number`, `confirmations`/
`required_confirmations` (default 6), `withdrawal_address`, `withdrawal_approved_at`,
`withdrawal_approved_by`, `screening_status`, `completed_at`, `metadata` JSONB.

### 1.3 Confirmed MISSING [EXISTS — verified absent]
- No broadcast execution (nothing past 'processing').
- No `WITHDRAWAL_DELAY` (code/env/schema). No delay/schedule column.
- No background-worker infra (only an in-process `setTimeout` in `payment.service.ts`).
- Payment "broadcast" is MOCKED (`generateMockTxHash()`, `setTimeout(5000)` "confirm").
- Custodial addresses demo-generated (`generateDemoAddress()`, "replace with real KMS").

### 1.4 Stack facts (for lock syntax mapping) [EXISTS]
- **PostgreSQL** (Railway), `pg` Pool. Prod runs autocommit-style across separate `-c`
  calls — real transactions need a single psql/client session.
- **Express + TypeScript**, single Railway instance. Redis available (rate-limit + PIN
  lockout) — usable for cancel rate-limiting + worker coordination.

---

## 2. Phase 3.2 goals (V2.1 — final)

1. Configurable delay (`WITHDRAWAL_DELAY_MINUTES`) between approval and broadcast.
2. **Fail-STOPPED** on missing/invalid config (halt the WORKER + alert; never auto-broadcast).
3. **Max approval age** (`WITHDRAWAL_MAX_DELAY_AGE_HOURS`): approvals older than this go to
   `security_hold` / manual review, never auto-broadcast.
4. **Immutable approval snapshot in a SEPARATE table** + HMAC signature, verified
   immediately before broadcast (TOCTOU defense).
5. Cancellation window: admin (PIN-gated) AND user self-cancel (rate-limited).
6. Idempotent broadcast worker: at-most-once broadcast across crash/restart/concurrency.
7. **`reconciling` + `security_hold` states** added to the machine.
8. **Immutable `withdrawal_events` ledger** — INSERT-only in app + DB-level triggers.
9. Safe, guarded state transitions throughout.

Layers above Phase 2.1 (PIN approval done) and below Phase 3.1 (TOTP, later).

---

## 3. Proposed design (V2.1)

### 3.1 Schema additions [PLANNED]
```sql
-- Delay + tamper-evidence columns on the master ledger
ALTER TABLE custodial_transactions
  ADD COLUMN broadcast_after        TIMESTAMP,        -- broadcast-eligible time (frozen at approval)
  ADD COLUMN approval_expires_at     TIMESTAMP;        -- approval_time + WITHDRAWAL_MAX_DELAY_AGE_HOURS

-- Expand status CHECK: add 'reconciling' and 'security_hold'
-- pending, detected, confirming, processing, broadcasting, reconciling,
--   completed, failed, cancelled, security_hold

CREATE INDEX idx_withdrawals_broadcast_after
  ON custodial_transactions(status, broadcast_after);

-- (1) SEPARATE immutable snapshot table (R3) — NOT a JSONB column on the row
CREATE TABLE withdrawal_approval_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custodial_transaction_id UUID NOT NULL UNIQUE REFERENCES custodial_transactions(id),
  amount            NUMERIC(30,10) NOT NULL,
  asset             VARCHAR(50)    NOT NULL,
  destination_address VARCHAR(255) NOT NULL,
  approved_by       VARCHAR(200)   NOT NULL,
  approved_at       TIMESTAMP      NOT NULL,
  approval_signature VARCHAR(128)  NOT NULL,   -- HMAC_SHA256(tx_id+amount+address, APPROVAL_SECRET)
  client_reference_id VARCHAR(128) NOT NULL,   -- deterministic; used for partner lookup (R3 #5)
  created_at        TIMESTAMP      NOT NULL DEFAULT NOW()
);

-- (4) Immutable append-only event ledger
CREATE TABLE withdrawal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custodial_transaction_id UUID NOT NULL REFERENCES custodial_transactions(id),
  event_type VARCHAR(40) NOT NULL,  -- created|approved|delay_started|claimed|broadcast_started|
                                    -- broadcast_completed|reconciling|completed|failed|cancelled|security_hold
  actor VARCHAR(200),               -- admin id / 'user' / 'worker' / 'system'
  detail JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- (4) DB-level immutability triggers (R3) — programmatic, not just convention
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Append-only table: % operations are forbidden', TG_OP;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_events BEFORE UPDATE ON withdrawal_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER no_delete_events BEFORE DELETE ON withdrawal_events
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
-- Same triggers on withdrawal_approval_snapshots (snapshots are write-once).
CREATE TRIGGER no_update_snap BEFORE UPDATE ON withdrawal_approval_snapshots
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER no_delete_snap BEFORE DELETE ON withdrawal_approval_snapshots
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
```
**Note:** triggers block the app's own DB role from UPDATE/DELETE. A superuser/migration
role can still drop triggers — acceptable for tamper-*evidence* at this stage; the KMS +
partner-side controls are the deeper backstop. [REVIEW at code stage]

### 3.2 Fail-STOPPED delay resolution [PLANNED]
```ts
function resolveDelayMinutes(): number {
  const raw = process.env.WITHDRAWAL_DELAY_MINUTES; // or feature flag
  if (!raw || isNaN(Number(raw))) {
    logger.emergency("CRITICAL: withdrawal delay config missing/corrupt. Halting worker.");
    throw new ConfigurationError("System unsafe for processing withdrawals.");
  }
  return Math.max(10, Math.min(1440, Number(raw))); // 10m..24h invariants
}
```
**Blast radius (R3 #2):** the WORKER loop catches `ConfigurationError` and STOPS claiming
rows + alerts — it does NOT crash the Express web process. Users keep access to support,
logging, and cancellation; only automated broadcasting halts.

### 3.3 Approval: snapshot + sign + set delay + expiry [PLANNED]
Modify the Phase 2.1 `approveWithdrawal` (inside the same PIN-gated handler), in ONE
transaction:
```
client_reference_id = deterministic id for this withdrawal (stable across retries)
signature = HMAC_SHA256(tx_id + amount + destination_address, APPROVAL_SECRET)
INSERT withdrawal_approval_snapshots(... amount, asset, address, approved_by,
        approved_at, signature, client_reference_id)
UPDATE custodial_transactions
   SET status='processing',
       broadcast_after   = NOW() + resolveDelayMinutes(),
       approval_expires_at = NOW() + (WITHDRAWAL_MAX_DELAY_AGE_HOURS || 24) hours
 WHERE id=$1 AND status='pending'
INSERT withdrawal_events('approved'), withdrawal_events('delay_started')
```

### 3.4 Pre-broadcast verification [PLANNED — TOCTOU defense]
When the worker claims a row, BEFORE any partner call:
```
load the snapshot row for this tx
recompute signature from CURRENT custodial_transactions fields
if signature != snapshot.approval_signature      -> status='security_hold' + alert + event
if current amount/address != snapshot values      -> status='security_hold' + alert + event
if NOW() > approval_expires_at                     -> status='security_hold' (stale) + event   (R3 #3)
```
Tamper / stale -> **`security_hold`** (R3 #2), NOT `failed`. `security_hold` is
manual-review-only; no automated path resolves it.

### 3.5 Idempotent broadcast worker [PLANNED — Option A]
In-process interval in the Express backend, `await` + hard per-call timeout (no
worker_threads yet; revisit at volume). Claim (optimistic lock):
```sql
UPDATE custodial_transactions
   SET status='broadcasting', updated_at=NOW()
 WHERE id=$1 AND status='processing'
   AND broadcast_after <= NOW()
   AND approval_expires_at > NOW();          -- don't claim stale (defense-in-depth w/ 3.4)
-- rowCount=1 -> we own it; rowCount=0 -> taken/ineligible/stale
```
Batch claim via `SELECT ... FOR UPDATE SKIP LOCKED`. Deterministic
`client_reference_id` (e.g. `SHA256(tx_id + address + amount)`) is the partner
idempotency key AND the reconciliation lookup key (R3 #5). Broadcast itself = **stub**
now. Full outbox + poll-before-rebroadcast loop = built at partner integration.

### 3.6 `reconciling` state [PLANNED]
Future real partner call times out / ambiguous -> `reconciling` (NOT `failed`).
Reconciliation polls the partner by `client_reference_id` (R3 #5 — works even with no
tx_hash) to learn the true outcome before any retry. Stub never produces this now, but the
state + transitions exist and are tested.

### 3.7 Cancellation [PLANNED]
- **Admin:** PIN-gated (reuse `checkAdminPin`), `WHERE status='processing'`.
- **User self-cancel:** while `status='processing' AND broadcast_after > NOW()`,
  rate-limited by user ID (Redis). Distributed fraud sensors.
- Race vs. worker: atomic conditional UPDATE -> single winner; loser rowCount=0.
  Emit `cancelled` / `claimed` events either way.

### 3.8 Secret handling roadmap [PLANNED — R3]
- **Phase A (now):** `APPROVAL_SECRET` in env var. Honest limitation: defends DB-only
  compromise, not full-host (if attacker reads the env, they can re-sign). Acceptable for
  building/testing while custodial is inactive.
- **Phase B (before custodial launch):** move `APPROVAL_SECRET` (and signing) to Cloud
  KMS (AWS KMS / GCP KMS) so the secret is never in app memory in plaintext. Gate: do this
  before real funds move. [Draft KMS spec separately.]
- **Phase C (with the custody partner):** partner-side approval controls as the deepest
  backstop — the broadcast partner independently validates/authorizes the withdrawal, so a
  full-host compromise of our app (which Phases A/B cannot fully defend) still can't move
  funds without the partner's own approval layer. Folds into the §5 partner-selection
  requirements; specify the exact partner control once a partner is chosen. (R3/c2 — the
  rung the secret roadmap previously implied via "deeper backstop" but didn't name.)

---

## 4. Threat model (V2.1 — final)

| Threat | Mitigation |
|---|---|
| Compromised admin session approves fraud | delay window + cancellation; PIN (2.1); TOTP (3.1) |
| Malicious administrator (legit PIN holder) | delay + TOTP + immutable event ledger + snapshot verify |
| Address-substitution during delay (TOCTOU) | separate-table snapshot + HMAC re-verify -> security_hold |
| Amount-modification during delay (TOCTOU) | separate-table snapshot + HMAC re-verify -> security_hold |
| Snapshot tampered alongside the row | snapshot in SEPARATE table + DB immutability triggers |
| Stale approval (sanctions/KYC changed) | max approval age -> security_hold (R3 #3) |
| Double-broadcast / user paid twice | optimistic-lock claim + deterministic key + partner idempotency |
| Partner replay | mandatory partner-side idempotency key (client_reference_id) |
| "Broadcast OK, DB write failed" | reconciling + poll-by-client-ref-id (at partner integration) |
| Misconfig silently disables protection | fail-STOPPED (halt worker + alert) |
| Worker crash mid-flight | idempotent claim + reconciling + reconciliation |
| Event-ledger tampering (cover-up) | DB-level BEFORE UPDATE/DELETE triggers |
| HMAC secret exposure | Phase B KMS migration before launch |
| Processed from wrong state | conditional-UPDATE state guards |
| Cancel-vs-broadcast race | atomic single-winner UPDATE |
| User self-cancel griefing | Redis rate-limit by user ID |

---

## 5. Custody-partner selection requirements (HARD — all reviewers)
- **Idempotent withdrawal API** (Idempotency-Key / client request ID on creation).
- **Withdrawal status-lookup API keyed by client reference ID** (not only tx_hash) — so
  reconciliation works even when no hash exists yet (R3 #5).
- Request correlation IDs; partner-side audit logs; webhook retry support.

---

## 6. Platform security/operational profile (state explicitly)
**Security controls:** withdrawal delay window; PIN-gated approval (done); TOTP approval
(future 3.1); separate-table immutable approval snapshot; pre-broadcast verification;
max-approval-age expiry; partner idempotency keys; reconciliation workflow; user
cancellation in delay window; immutable (DB-trigger-enforced) event ledger; fail-stopped
config; KMS-backed signing secret (Phase B).
**Operational controls:** broadcast worker; reconciliation worker (at scale); documented
recovery procedures; audit reporting (ties to admin audit-panel workstream).

---

## 7. Out of scope for 3.2
Phase 3.1 TOTP; custody-partner choice; real KMS *implementation* (Phase B, but roadmap
here); sanctions/address screening provider; post-broadcast confirmation tracking.

---

## 8. Build order (V2.1) — partner-agnostic parts buildable NOW
1. Migration: `broadcast_after`, `approval_expires_at`; expand status CHECK
   (`reconciling`, `security_hold`); `withdrawal_approval_snapshots` table;
   `withdrawal_events` table; immutability triggers; index.
2. `resolveDelayMinutes()` fail-stopped + `WITHDRAWAL_MAX_DELAY_AGE_HOURS` handling (+ tests).
3. Approval: write snapshot (separate table) + HMAC sign + set `broadcast_after` +
   `approval_expires_at` + emit events (modify Phase 2.1 `approveWithdrawal`, in one txn).
4. Pre-broadcast verification (HMAC + snapshot recheck + expiry check -> `security_hold`).
5. Broadcast worker (Option A, interval, hard timeouts) + conditional-claim idempotency +
   STUBBED partner broadcast keyed by `client_reference_id` + event emission.
6. Cancellation: PIN-gated admin + rate-limited user self-cancel.
7. Admin UI: surface `security_hold` items for manual review (reuse PIN-gated pattern).
8. Tests: delay enforced; fail-stopped; stale->hold; tamper->hold; no double-broadcast
   under concurrency; cancel-vs-broadcast race; restart safety; ledger UPDATE/DELETE blocked.
9. (At partner selection) real broadcast adapter + reconciliation poll-before-rebroadcast +
   outbox if warranted + Phase B KMS for `APPROVAL_SECRET`.

---

## 9. Pre-custodial-launch gate checklist (NONE of this ships until custodial is licensed)
- [ ] All §8 steps 1-8 built + tested (broadcast stubbed).
- [ ] Phase 3.1 TOTP wired to withdrawal approval.
- [ ] Custody partner chosen, meeting §5 requirements.
- [ ] Real broadcast adapter + reconciliation loop (replace stub).
- [ ] Phase B: `APPROVAL_SECRET` moved to KMS.
- [ ] **Independent review of the actual CODE** (not just this design).
- [ ] Lawyer sign-off on the custodial/money-transmitter posture.

---

*Design V2.1, post three reviews. "Ready for implementation review" = good blueprint, not
a safe system. Implementation review on the actual code still required. Nothing live;
custodial withdrawals remain disabled.*
