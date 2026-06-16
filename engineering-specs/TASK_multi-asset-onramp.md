# Task: Multi-Asset Support for Coinbase Onramp

**Repo:** `schnelpay-dashboard` (deploys from `main` → production — every push is live)
**Status:** Not started. Follow-up to the config-driven ProviderPicker refactor (already shipped).
**Prereq met:** Coinbase Onramp live and verified end-to-end, currently ETH-only.

---

## Goal

Let users buy assets other than ETH through the existing Coinbase Onramp flow.
Same Coinbase integration — NOT a new dashboard or partner account. The ETH-only
limit is in OUR code, not Coinbase's. Coinbase Onramp already supports 100+ assets.

Target starter set: **ETH, USDC, USDT, BNB, BTC, SOL** (curated, not the full catalog).
Expand later on user request.

---

## Why this is one coordinated change (not a quick tweak)

The "ETH assumption" lives in THREE places that must move together:

1. **Backend default** — `CoinbaseController.getOnrampUrl` falls back to ETH when no
   `asset`/`network` is passed. It already accepts `asset` + `network` and has an
   `ASSET_NETWORK` map, so it's capable of more — it just needs to be told.

2. **Front-end never sends an asset** — `handleConvert` only passes `walletAddress`,
   so the backend always hits its ETH default. Needs an asset picker that sends
   `asset` + `network`.

3. **Address validation is ETH-only** — current gate is `/^0x[a-fA-F0-9]{40}$/`
   (Ethereum format). This is the real blocker and the highest-risk piece: a BTC or
   SOL address fails this regex, so the button would never enable. A too-loose check
   sends crypto to a malformed, non-recoverable address — the exact non-custodial
   risk the gate exists to prevent.

---

## STEP 0 (do first): Query Coinbase's Config/Options API

Before building anything, query Coinbase's Config/Options API to get the REAL list of
supported assets, networks, and payment methods for OUR integration. Do not assume
which networks each asset is available on. Expose a curated subset of what's actually
returned. (Coinbase docs: docs.cdp.coinbase.com — Onramp.)

---

## Phasing (sequenced by validation RISK, not just popularity)

### Phase 1 — EVM cluster (low risk, do first)
**Assets: ETH, USDC, USDT, BNB**
- All use the SAME `0x...` Ethereum-style address format already validated today.
- Adding these is mostly: asset picker UI + pass `asset`/`network` to backend.
- Reuses the existing address regex — minimal new validation surface.
- Highest coverage for least risk (most-demanded asset ETH + the two dominant
  stablecoins + BNB).
- NOTE: USDT/USDC exist on multiple chains. For Phase 1, offer each stablecoin on
  ONE network only (e.g. USDC on Ethereum, `0x...`). Don't try to support every
  chain a stablecoin lives on yet.

### Phase 2 — non-EVM (each its own careful task)
**Assets: BTC, SOL**
- BTC: multiple valid formats (legacy `1...`, P2SH `3...`, bech32 `bc1...`).
- SOL: base58 format, different again.
- Each needs its own CORRECT address validation. Use a vetted address-validation
  library — do NOT hand-roll BTC/SOL regexes. Cost of getting this wrong is
  irreversible loss of user funds.

---

## Product/UX decisions to confirm before building
- Asset picker: dropdown vs. a few buttons? Where does it sit relative to the
  address input?
- The selected asset must drive WHICH address format gets validated. The
  disabled-until-valid gate must work per-asset, not just for ETH.
- Each stablecoin starts on one network only (revisit multi-network later).

## Non-negotiable safety constraints (carry over from current build)
- Non-custodial: user enters their own wallet address; crypto goes there.
- Button stays DISABLED until a valid address for the SELECTED asset is entered.
- Backend independently rejects missing/invalid input (defense in depth) — keep
  the `requireFeatureEnabled` gate and the backend `walletAddress` check.
- Improve the backend error for a malformed address: return a clear 400
  ("invalid address for <asset>") instead of the current generic 500 from a
  downstream Coinbase rejection.

## Conventions (this repo)
- Inline styles only. Navy `#2C3340`, gold `#C9A84C`. Playfair Display / Jost.
- Run `./node_modules/.bin/tsc --noEmit` from inside the repo before commit
  (NOT `npx tsc`, do not grep/filter the output).
- `git add` specific files (not `-A`). Descriptive commit message.
- main = production. Test in sandbox (`COINBASE_ENVIRONMENT=sandbox`) before push:
  card renders, empty/invalid address keeps button disabled, valid address per
  asset enables it, click launches the correct Coinbase asset/network flow.
- Confirm on the LIVE page after Cloudflare build (~2 min).

## Definition of done (Phase 1)
- Asset picker offers ETH, USDC, USDT, BNB.
- Selecting an asset passes correct `asset`/`network` to the backend.
- Address gate validates the `0x...` format per selection; button disabled until valid.
- Verified in sandbox AND on the live page.
- Phase 2 (BTC, SOL) tracked separately, not folded into the Phase 1 commit.
