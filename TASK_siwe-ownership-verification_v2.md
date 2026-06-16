# TASK: SIWE Ownership Verification for Coinbase Onramp — v2 (HARDENED)

**Repos:** `schnelpay-backend` (Node/TS/Express, Railway, `main`) + `schnelpay-dashboard` (Next.js, Cloudflare Pages, `main`).
**Status:** v2 written 2026-06-14, incorporating two independent security reviews (both converged; all changes are additive hardening, no structural redesign). NOT started. Next session.
**Prereq met:** Wallet-connect SHIPPED and live (Convert page sources destination from `useAccount()`; no text field). Backend already mints a proper Coinbase session token (secure-init).
**viem version (answer to both reviewers):** root dep is **viem 2.52.2** (from `npm ls`). See pre-build check #0.

### WHAT CHANGED FROM v1 (the 7 accepted hardening items + 2 from review G)
1. Explicit allowed-chain check before RPC selection.
2. RPC selection is server-controlled (fixed client map); message chainId only *selects*, never *supplies* a URL.
3. Strict `MAX_MESSAGE_AGE_MS` (10 min) + ~60s clock-skew tolerance (no more vague "implausibly old").
4. Validate `uri` in addition to `domain`.
5. Canonicalize recovered address with `getAddress()` before minting.
6. Pin/verify ERC-6492 support against the EXACT installed viem version before coding.
7. Add a never-deployed smart-wallet test (true ERC-6492 path).
8. Nonce keyed by `{nonce}` (multi-tab safe) — **but user-binding preserved** by storing+checking `userId` in the value (see the critical note).
9. New "Evidence to capture for Coinbase resubmission" section.
Deliberately SKIPPED: binding `sessionId` into the nonce (marginal once user-bound + single-use + domain + expiry are in place).

---

## WHY THIS EXISTS (unchanged)
Coinbase wants the destination address "pulled from the active cryptographic state of the connected wallet," and their Security Requirements doc calls for wallet signature verification. Today the backend trusts whatever address the frontend posts. SIWE makes the backend verify a signature and mint the token using the address **recovered from the signed message** — proving ownership server-side. Bulletproof path to avoid a second rejection.

---

## /!\ CRITICAL GOTCHA — SMART WALLETS (read before any verify code)
The live connect modal defaults to **Coinbase Smart Wallet / "Sign in with Base"** — a smart-contract (passkey) wallet, NOT an EOA. Plain `ecrecover` / utility `verifyMessage` FAILS for these. They verify via **ERC-1271** (deployed) or **ERC-6492** (counterfactual / not-yet-deployed — common for passkey wallets).

**Action vs. utility (review G's sharpest point):** the utility `verifyMessage`/`verifySiweMessage` imported from `viem/utils` or `viem/siwe` only does EOA ecrecover. You MUST use the **Public Client action** — `publicClient.verifySiweMessage(...)` — to get the 1271/6492 path (it does an `eth_call`). Keep this distinction sharp; getting it wrong silently breaks all smart-wallet users while passing your MetaMask test.

---

## PRE-BUILD CHECK #0 (do FIRST, before writing verify code)
Both reviewers independently flagged this as the single most likely silent failure:
- Confirm, in the docs for **viem 2.52.2 specifically**, that the public-client `verifySiweMessage` action covers ERC-1271 AND ERC-6492. ERC-6492 (deployless universal verifier) support has shifted across viem releases.
- If 2.52.2's support is uncertain/incomplete: prefer a deliberate, tested viem version over an assumption — but any bump must stay within the peer range wagmi/onchainkit expect (they're deduped on 2.52.2 today). Verify deduping holds after any change.
- Also confirm your Infura/RPC endpoints permit the `eth_call` (with state-override style payloads) that the ERC-6492 deployless verifier uses. A locked-down RPC that blocks these will fail 6492 verification.

---

## BACKEND CHANGES (`schnelpay-backend`)

### Deps / config
- `npm i viem`.
- **Fixed, server-controlled public-client map** (NEVER from the message):
  `CLIENTS = { 1: createPublicClient({ chain: mainnet, transport: http(RPC_URL_MAINNET) }), 8453: createPublicClient({ chain: base, transport: http(RPC_URL_BASE) }) }`.
  New env: `RPC_URL_MAINNET` (reuse Infura), `RPC_URL_BASE` (add a Base RPC). Set in Railway + local.
- `ALLOWED_CHAINS = [1, 8453]`.
- `MAX_MESSAGE_AGE_MS = 10 * 60 * 1000`; `CLOCK_SKEW_MS = 60 * 1000`.
- `config.siweDomain` + `config.siweUri`, **per environment** via env (prod `dashboard.schnelpay.com` / `https://dashboard.schnelpay.com`; local `localhost:3000` / `http://localhost:3000`). This resolves the reviewers' port/proxy question — never hardcode; compare against the env value for the running environment.

### Endpoint 1 — nonce (new): `GET /api/v1/convert/siwe-nonce` (auth)
- Generate nonce (`generateSiweNonce()` or crypto-random).
- **Key by nonce, store userId in value:** `SETEX siwe:nonce:{nonce} 600 JSON({ userId, createdAt })` (10-min TTL).
- Return `{ success: true, data: { nonce } }`.
- (Keying by nonce — not userId — lets multiple tabs each hold a valid nonce. Replay is still impossible because of single-use GETDEL below.)

### Endpoint 2 — verify + mint: change existing GET -> `POST /api/v1/convert/coinbase-url` (auth)
Body: `{ message, signature, asset?, network?, fiatCurrency?, fiatAmount? }`. **Fail closed at every gate** (no token on any failure), in this order (cheap checks before the expensive RPC verify):

1. `const { address, nonce, domain, uri, chainId, issuedAt, expirationTime } = parseSiweMessage(message)`.
2. **Allowed chain:** `if (!ALLOWED_CHAINS.includes(chainId)) reject`.
3. **Domain:** strict equality `domain === config.siweDomain` (sanitize trailing slash; the env value already carries the correct host:port per environment). NO `includes`/`endsWith`.
4. **URI:** strict equality `uri === config.siweUri`.
5. **Nonce (single-use + user binding):**
   ```
   const raw = await redis.getdel(`siwe:nonce:${nonce}`);   // atomic read+delete
   if (!raw) reject("invalid/expired nonce");
   const { userId: nonceUserId } = JSON.parse(raw);
   if (nonceUserId !== req.user.id) reject("nonce/user mismatch");  // <-- KEEP the user binding
   ```
   **CRITICAL:** moving the key to `{nonce}` removed the implicit user binding that `{userId}` gave us — so we re-enforce it explicitly here. Do NOT skip this check, or an attacker could mint with a nonce issued to a different account.
6. **Age/expiry:** reject if `expirationTime` (if present) has passed, OR `Date.now() - issuedAt > MAX_MESSAGE_AGE_MS`. Allow up to `CLOCK_SKEW_MS` future drift on `issuedAt` (don't reject a legit user whose clock runs slightly ahead).
7. **Signature:** `const client = CLIENTS[chainId];` (fixed map — chainId only selects) `const ok = await client.verifySiweMessage({ message, signature }); if (!ok) reject`.
8. **Canonicalize:** `const verifiedAddress = getAddress(address)` (checksum-normalize).
9. **Mint** via existing `createCoinbaseSessionToken({ address: verifiedAddress, network, asset, clientIp })`. `asset`/`network` from body (validated against `ASSET_NETWORK`); the **address comes only from the parsed message**.
10. Return `{ success: true, data: { url } }`.

### Routing / interceptor
- `convert.routes.ts`: `coinbase-url` GET -> POST; add `siwe-nonce` GET. Leave disabled `transak-url`/`moonpay-url` (note they'd need the same treatment if reactivated).
- Ensure a 401/403 from a failed/cancelled SIWE on the convert endpoints does NOT log the user out — add to the dashboard `lib/api` no-logout path list (mirror admin `NO_LOGOUT_PATHS`). Show an inline error instead.

### Reference structure (review G's sequence, corrected for user-binding)
```ts
const { address, nonce, domain, uri, chainId } = parseSiweMessage(message);
if (!ALLOWED_CHAINS.includes(chainId)) throw new Error("chain not allowed");
if (domain !== config.siweDomain) throw new Error("domain mismatch");
if (uri !== config.siweUri) throw new Error("uri mismatch");
const raw = await redis.getdel(`siwe:nonce:${nonce}`);
if (!raw) throw new Error("invalid/expired nonce");
if (JSON.parse(raw).userId !== req.user.id) throw new Error("nonce/user mismatch");
// age/expiry check here ...
const client = CLIENTS[chainId];                     // server-controlled map only
if (!(await client.verifySiweMessage({ message, signature }))) throw new Error("sig invalid");
const verifiedAddress = getAddress(address);         // mint with THIS, never the body
```

---

## FRONTEND CHANGES (`schnelpay-dashboard` — convert `handleConvert`)
- Imports: wagmi `useSignMessage` (`signMessageAsync`), `useChainId`; viem `createSiweMessage`.
- On buy (connected): GET `/convert/siwe-nonce` -> build message with `createSiweMessage({ address, chainId, domain: window.location.host, uri: window.location.origin, version: '1', nonce, statement: 'Confirm this is your receiving wallet for your SchnelPay purchase.', issuedAt: new Date() })` -> `signMessageAsync({ message })` -> POST `/convert/coinbase-url` with `{ message, signature, asset, network, fiatCurrency, fiatAmount }` -> open URL.
- **Popup (review G confirmed this is mandatory):** open the blank window **synchronously on click**, before any await, and set its location after the URL returns. Browsers only grant `window.open` inside the synchronous frame of the click; after the async nonce+sign it'd be blocked. On signature rejection, close the blank window and show a clean inline error.
- Multi-tab now works (nonce-keyed), so no special handling needed there.

---

## TEST PLAN (sandbox: `COINBASE_ENVIRONMENT=sandbox`)
1. **Deployed smart wallet** (Coinbase Base Account that's transacted) -> ERC-1271 path.
2. **Never-deployed smart wallet** (fresh Base Account, zero transactions) -> **true ERC-6492 path**. Without this you may only ever exercise 1271 and think you're covered.
3. **EOA** (MetaMask) -> ecrecover path.
4. **Failure cases — all reject, NO token:** unsupported chainId; tampered message; wrong domain; wrong uri; wrong nonce; **reused nonce (replay)**; expired/too-old message.
5. Rejected signature -> inline error, user stays logged in, no orphan popup.

---

## EVIDENCE TO CAPTURE FOR COINBASE RESUBMISSION (the part reviewers said reviewers care about)
Capture these during the sandbox test — this IS your resubmission evidence package, far stronger than asserting "we did wallet-connect":
1. **Address provenance:** log/screenshot showing the minted token's address comes from `parsed.address` after verification, NOT the request body.
2. **Smart-wallet verification success:** a successful ERC-1271 (and ideally ERC-6492) verification for a Coinbase Smart Wallet.
3. **Replay rejected:** a nonce used once, then a second request with the same nonce returning 401/403 with no token.

---

## BUILD ORDER (next session)
0. Pre-build check #0 (viem 2.52.2 ERC-1271/6492 + RPC eth_call capability). Don't write verify code until confirmed.
1. Backend: `npm i viem`; add `CLIENTS` map, `ALLOWED_CHAINS`, age constants, `siweDomain`/`siweUri`, RPC env (local + Railway).
2. Backend: `siwe-nonce` endpoint (key by nonce, value carries userId).
3. Backend: `coinbase-url` GET->POST + the 10-step verify-and-mint (with the explicit user-binding check); update `convert.routes.ts`; no-logout path.
4. Backend: `./node_modules/.bin/tsc --noEmit` (inside repo, no grep).
5. Frontend: rewrite `handleConvert` (nonce -> sign -> POST); keep sync-popup pattern.
6. Frontend: `./node_modules/.bin/tsc --noEmit` (`NEXT_PUBLIC_*` already set).
7. Sandbox: all 5 test groups; capture the 3 evidence artifacts.
8. Commit each repo separately (specific `git add`), push, verify live.
9. THEN resubmit Coinbase Case 01558488 with the evidence — and keep the integration + CDP keys STABLE through review (the Transak lesson).

---

## CONVENTIONS
- Python `str.replace()` for TSX/TS (never sed/heredoc/nano). `./node_modules/.bin/tsc --noEmit` inside each repo, no grep. `git add` specific files, separate commits. Secrets/keys/RPC URLs never in chat/commits — env (Railway/Cloudflare) + Bitwarden, set in BOTH local and platform. `main` = production both repos; sandbox-test before push; re-verify live after deploy. Inline styles, navy `#2C3340`/gold `#C9A84C`, Playfair/Jost.

## DEFINITION OF DONE
- Token minted ONLY after SIWE verification, using `getAddress(parsed.address)`.
- All chains validated against the allow-list; RPC chosen from the server map only.
- Deployed-smart-wallet, never-deployed-smart-wallet (ERC-6492), and EOA all pass; all failure cases reject with no token.
- 3 evidence artifacts captured.
- Shipped to production both repos, verified live.
- Case 01558488 resubmitted with the evidence.
