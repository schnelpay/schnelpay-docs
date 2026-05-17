# SchnelPay — Withdrawal Security Architecture
## Last Updated: May 16, 2026

---

## Overview

Four-layer security model for custodial withdrawals:
1. User login authentication
2. User withdrawal authorization code
3. Admin approval with PIN
4. Configurable withdrawal delay before broadcast

---

## Withdrawal Flow

### Step 1 — Review Screen
User submits:
- Amount + Asset
- Destination address
- Network

Display:
- Final amount
- Estimated fee
- Net received
- Shortened address preview
- Risk warning: "Blockchain withdrawals cannot be reversed."

Required checkbox: "I have verified this address is correct."

### Step 2 — User Authorization
Label: "Withdrawal Authorization Code" (not PIN, not password)
- 6-digit numeric minimum
- Separate hash from login password
- Rate limited: 3 attempts → 15 min lockout
- Stored as: `withdrawal_code_hash` (bcrypt, Argon2id when upgraded)

### Step 3 — Queue
After successful authorization:
- `status = pending_admin_approval`
- Log: IP, device fingerprint, timestamp, geo metadata
- Apply configurable delay (default 15 minutes)

### Step 4 — Admin Approval
Admin sees:
- User, amount, asset, destination
- Risk indicators, withdrawal history, AML flags

Admin enters their own authorization PIN.
`status = approved` → system broadcasts transaction.

---

## Database Structure

```sql
-- User table additions
withdrawal_code_hash    VARCHAR(255)   -- separate from password_hash
withdrawal_code_enabled BOOLEAN DEFAULT false

-- Withdrawal audit fields
ip_address             VARCHAR(45)
device_fingerprint     VARCHAR(255)
geo_country            VARCHAR(2)
risk_score             INTEGER
velocity_flag          BOOLEAN DEFAULT false
delay_until            TIMESTAMP      -- broadcast after this time
```

---

## Security Layers

### User Side
- Login password (bcrypt)
- Withdrawal Authorization Code (separate hash)
- Email confirmation (future)
- Device verification (future)
- MFA/TOTP (before Series A)

### Platform Side
- Admin approval required
- Admin authorization PIN
- Configurable withdrawal delay
- Audit logs (immutable — future)
- Rate limiting on all PIN attempts

---

## Deferred Upgrades

| Upgrade | Trigger |
|---------|---------|
| Argon2id → replace bcrypt | Hire security engineer |
| WebAuthn for admin | Before Series A |
| Multi-admin quorum | Second admin hired |
| HSM signing | >$1M/month volume |
| MPC wallets | Phase 3 |
| AI fraud detection | Phase 3 |
| Risk-based auto-approval | Volume justifies |

---

## Naming Conventions

| Context | Label |
|---------|-------|
| User withdrawal auth | "Withdrawal Authorization Code" |
| Admin feature flag auth | "Security Code" |
| Admin login | Password |
| Future MFA | "Authenticator Code" |

Never use "PIN" in user-facing UI — too easily confused with bank PIN or login password.

---
*SchnelPay LLC · Confidential · Internal use only*
