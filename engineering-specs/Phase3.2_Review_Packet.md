# Phase 3.2 — Independent Review Packet (Withdrawal Delay + Broadcast Path)

**Prepared for:** independent code reviewer
**Scope of this review:** the *implementation* of Phase 3.2 steps 1–4 (schema, delay
resolver, signed approval snapshot, pre-broadcast verification).
**Status of the feature:** custodial withdrawals are DISABLED (`CUSTODIAL_ENABLED=false`,
gated on MSB licensing). Nothing here is live; this is pre-launch hardening.

---

## What this review IS and ISN'T

- **IS:** an independent check of whether the *design is correct and complete*, and whether
  the *code faithfully and safely implements it*. Specifically: is the threat model right,
  is the signed field set complete, are there attack paths we didn't model, are there
  implementation flaws (races, injection, crypto misuse).
- **ISN'T:** the final pre-launch security audit. This is an early, cheaper independent pass.
  A rigorous audit (paid firm or equivalent) remains a HARD GATE before `CUSTODIAL_ENABLED`
  is ever turned on with real funds (design doc §9).
- **Important context:** all design + code here was authored by the same party (founder +
  Claude). Claude self-reviewed for internal correctness and wrote the test harness, but
  cannot be an independent reviewer of its own work — that's why your eyes matter.

---

## What Phase 3.2 does (one paragraph)

When an admin approves a custodial withdrawal, the system writes an immutable, HMAC-signed
*snapshot* of the approved facts and stamps a mandatory delay window before the withdrawal
may broadcast. Immediately before broadcast, the system re-verifies: (1) the snapshot's
signature is authentic, and (2) the live transaction row still matches the signed snapshot.
Any mismatch, or an expired approval, routes the transaction to `security_hold` (manual
review) and never broadcasts. This defends against time-of-check/time-of-use (TOCTOU)
tampering between approval and broadcast.

---

## Artifacts to review (in order)

1. **Design doc:** `project-docs/security/Phase3.2_Withdrawal_Delay_Design_v2.1.md`
   (already had 3 prior reviews; §9 lists the launch gates; §3 has the mechanism detail).
2. **Migrations** (`schnelpay-backend/src/database/migrations/`):
   - `013_withdrawal_delay_broadcast.sql` — delay/expiry columns, status CHECK rebuild
     (adds `reconciling`, `security_hold`), the two append-only tables
     (`withdrawal_approval_snapshots`, `withdrawal_events`), and DB-level immutability
     triggers (`forbid_mutation()` blocking UPDATE/DELETE).
   - `014_approval_signed_payload.sql` — adds `signed_payload TEXT` to the snapshot table.
3. **Code** (`schnelpay-backend/src/services/custodial.service.ts`):
   - `resolveDelayMinutes()` — delay window (config default 60 min / 24 hr max age;
     DB-override hook stubbed for a future `withdrawal_settings` table).
   - `approveWithdrawal()` — atomic: lock row, validate, sign canonical payload, write
     immutable snapshot, stamp `broadcast_after` / `approval_expires_at`, log event.
   - `verifyBeforeBroadcast()` — Stage 1 authenticity (constant-time HMAC over stored
     `signed_payload`), Stage 2 strict live-row consistency, stale-approval guard, fails
     closed to `security_hold`.
4. **Test harness:** `schnelpay-backend/scripts/phase32_test.js` — 11 checks, all passing
   on staging (see results below). You can run it yourself via the staging container.
5. **Commits:** `013`, `014`, "step 2", "step 3", "step 4", and the test harness commit.

---

## The signed payload (the security boundary)

Canonical, pipe-delimited, version-prefixed string, both HMAC-signed AND stored verbatim:
```
v1 | tx_id | user_id | wallet_id | amount | blockchain | destination | approved_by | approved_at(epoch ms) | client_reference_id
```
- Stored verbatim (`signed_payload`) so verification recomputes over the exact text — avoids
  NUMERIC formatting drift and TIMESTAMP-without-tz reinterpretation round-trip bugs.
- Epoch-ms (integer) for time; NUMERIC amount as Postgres returns it.

**Specific challenge requested:** is this field set complete? Any loss-relevant field whose
silent change between approve and broadcast would cause loss MUST be in here. We included
amount, destination, blockchain, user_id, wallet_id. Did we miss one (fees? memo? chain-id
vs blockchain-name ambiguity? address case-sensitivity per chain)?

---

## Known limitations (already identified — confirm or expand)

1. **APPROVAL_SECRET is Phase A** (env var). A full-host compromise can re-sign. Roadmap:
   Cloud KMS (Phase B), partner-side approval controls (Phase C). Acceptable while custodial
   is disabled. — Is the Phase A posture defensible for the build/test stage?
2. **Signed field set must be maintained by hand.** If a future field is added to withdrawals,
   someone must add it to both the payload AND the Stage-2 checks, or it's an unprotected gap.
   — Is there a way to make this less error-prone (schema-derived signing)?
3. **No worker yet (step 5).** `verifyBeforeBroadcast` is not yet *called* by anything; the
   broadcast worker is deferred until a custody partner / BaaS API is known (design R3:
   don't build the outbox before the partner API is defined). — Does deferring change any
   conclusion about steps 1–4?
4. **APPROVAL_SECRET operational constraint:** must be set once per environment and NEVER
   rotated after the first signed snapshot exists (rotation invalidates all prior signatures).
   Prod needs its own distinct secret. — Flag if this needs a documented runbook / safer design.
5. **Test is author-written** (Claude wrote both code and test). The 11 passing checks prove
   the code behaves as designed, not that the design is right. — Please challenge the test's
   own assumptions (e.g. scenario 4 inserts a snapshot directly to simulate a bad signature
   since the table is immutable — is that a fair test of the verify path?).

---

## Test results (staging, all passing)

```
1  happy path verifies ok / status processing
2  amount tamper (TOCTOU)      -> caught, security_hold
3  destination tamper (TOCTOU) -> caught, security_hold
4  signature mismatch          -> caught, security_hold
5  stale approval (expired)    -> caught
6  double approval             -> blocked (lock + UNIQUE)
7  snapshot UPDATE / events DELETE -> blocked by DB triggers
TOTAL: 11 passed, 0 failed
```

---

## Specific questions for the reviewer

1. **Threat model gaps** — what attack between approve and broadcast is NOT covered by the
   signed-snapshot + verify approach?
2. **Crypto** — HMAC-SHA256 + constant-time compare: correct construction? Any misuse?
3. **Concurrency** — `approveWithdrawal` uses `SELECT ... FOR UPDATE` + snapshot UNIQUE(tx_id).
   Can two approvals, or an approval racing a verify/cancel, produce a bad state?
4. **Fail-closed completeness** — are there code paths where verification could pass (or
   throw past the guard) when it shouldn't, allowing a broadcast that should be blocked?
5. **The `security_hold` dead-end** — failures go to `security_hold` with no auto-resolution
   (by design). Is anything missing for safe manual recovery from that state?
6. **DB immutability** — are the `forbid_mutation()` triggers sufficient, or is there a
   privileged path (superuser, migration runner) that could still mutate the ledger?

Thank you. Findings at any severity are welcome — the goal is to find problems now, cheaply,
before this is anywhere near real funds.
