# Next session: apply migration 013 to STAGING (then prod separately)

## Status at end of 2026-06-07 session
- `013_withdrawal_delay_broadcast.sql` — written, idempotent, in LOCAL repo (79 lines). Committed nowhere yet.
- NOT applied to any database. Staging + prod DBs untouched by 013.
- Coinbase scaffold: committed + pushed to main, deployed dark (COINBASE_ONRAMP_ENABLED=false), /health green.
- Staging Postgres password: ROTATED this session (was exposed twice). New value live.

## The working path we found (this was the hard part tonight)
- `railway ssh` drops into the real staging container (prompt: root@<id>:/app#). This is where
  `postgres.railway.internal` resolves and migrate runs cleanly. Confirmed 001-012 ran here.
- DO NOT run `npm run migrate` from the Mac — it executes locally (prompt rsnanak@Mac...), can't
  reach the internal host, and earlier polluted DATABASE_URL caused mangled-string failures.
- The deployed container did NOT contain 013 (railway up earlier didn't carry it / older build).
  So step 2 below + the grep confirm in step 3 are essential.

## Clean 5-minute sequence (STAGING ONLY)
1. cd ~/schnelpay/schnelpay-backend
   railway status        # MUST show: Environment: staging, Service: schnelpay-backend
2. railway up            # deploys local code (incl. 013) to staging only (NOT via main, prod untouched)
   # wait for "Deploy complete"
3. railway ssh
   whoami; hostname      # MUST show root + container id, NOT rsnanak/Mac
   ls src/database/migrations/ | grep 013   # MUST show the file this time
4. npm run migrate       # watch for: ✓ Completed: 013_withdrawal_delay_broadcast.sql
5. Verify constraint (password-free, inside SSH session):
   node -e "const{pool}=require('./dist/database');pool.query(\"SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname='custodial_transactions_status_check'\").then(r=>{console.log(r.rows[0]?.def||'NOT FOUND');process.exit(0)}).catch(e=>{console.error(e.message);process.exit(1)})"
   # SUCCESS = printed CHECK includes 'reconciling' AND 'security_hold'
   # Also: \d custodial_transactions should show broadcast_after, approval_expires_at
   # and tables withdrawal_approval_snapshots, withdrawal_events should exist.

## After staging verifies clean
- Commit 013 to the repo (git add the specific file; main deploys to prod).
- PROD application is a SEPARATE deliberate step. Same railway ssh path but production env.
  Verify `railway status` shows Environment: production first. Do on a fresh head, not late.

## SECRETS HYGIENE (reinforced tonight)
- Never echo/print DATABASE_URL or any connection string. Migrate reads it internally.
- Use the password-free node check above for verification, never psql "$DATABASE_URL" that prints the string.

## PRIORITY REMINDER
- 013 is PRE-CUSTODIAL hardening on a DISABLED path. No deadline.
- Transak go-live is the REAL revenue path, waiting on Transak's API key update.
  When that lands it comes FIRST — ahead of finishing 013 and ahead of Coinbase.
