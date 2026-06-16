// providers.config.ts
// ---------------------------------------------------------------------------
// Single source of truth for which on-ramp providers SchnelPay offers and how
// they appear. Everything that wants to show, hide, order, or describe a
// provider reads from here — the hero, the Buy Crypto picker, and (via the
// `legalDisclosure` field) the privacy policy. Add, remove, or deprecate a
// provider by editing ONE entry, not by hunting through JSX.
//
// Discipline (mirrors TRANSAK_ENABLED / MOONPAY_ENABLED on the backend):
//   - To take a provider OFF the site, set status: 'disabled'. DO NOT delete
//     the entry — keeping it preserves the content for easy re-enable later,
//     exactly like MoonPay is preserved behind a flag rather than removed.
//   - Only providers with status 'live' render as usable options.
//   - 'coming_soon' renders (optionally) as a non-clickable "coming soon"
//     marker; use it for providers in review you want to tease, or omit them.
//
// IMPORTANT: This file is shipped to the browser (static export). It contains
// ONLY display + routing metadata. No API keys, secrets, or partner tokens —
// those stay in server/env config and are never imported here.
// ---------------------------------------------------------------------------

export type ProviderStatus = 'live' | 'coming_soon' | 'disabled';

// 'revenue'  = SchnelPay earns a partner/affiliate/margin fee on this provider.
//              These are the ones we surface prominently.
// 'fallback' = a trusted, low-friction option that earns us nothing per
//              transaction (e.g. a merchant-of-record provider). Offered as a
//              convenience/alternative, never as the hero.
export type ProviderTier = 'revenue' | 'fallback';

export interface OnrampProvider {
  /** Stable internal key. Never change once shipped (used in analytics/routing). */
  id: string;
  /** User-facing name. */
  name: string;
  status: ProviderStatus;
  tier: ProviderTier;
  /** One short, plain line shown under the name in the picker. */
  tagline: string;
  /** Optional eyebrow shown on the card, e.g. "Instant" or "Lowest fees". */
  badge?: string;
  /**
   * How the Buy Crypto flow initiates this provider. An internal route or a
   * handler key your page already understands — NOT a URL with secrets in it.
   */
  route: string;
  /** Path under /public to the provider's mark. */
  logo: string;
  /** Shown instead of a button when status === 'coming_soon'. */
  comingSoonNote?: string;
  /**
   * One sentence describing the data-sharing relationship, for the privacy
   * policy. The legal page renders a clause per LIVE provider from these,
   * so disabling a provider also drops its disclosure automatically.
   */
  legalDisclosure?: string;
}

// ---------------------------------------------------------------------------
// The registry. Order within a tier is the display order (first = most
// prominent). Today only Coinbase is live; the rest flip on as approvals land.
// ---------------------------------------------------------------------------
export const PROVIDERS: OnrampProvider[] = [
  {
    id: 'coinbase',
    name: 'Coinbase',
    status: 'live', // sandbox-proven end-to-end
    tier: 'revenue',
    tagline: 'Buy crypto to your own wallet. Free ACH for Coinbase users.',
    badge: 'Recommended',
    route: 'coinbase-onramp',
    logo: '/providers/coinbase.png',
    legalDisclosure:
      'When you choose Coinbase to complete a purchase, your transaction and ' +
      'identity-verification details are processed by Coinbase under its own ' +
      'privacy policy. SchnelPay does not take custody of funds.',
  },
  {
    id: 'ramp',
    name: 'Ramp',
    status: 'coming_soon', // application submitted
    tier: 'revenue',
    tagline: 'Low fees with bank-transfer payments.',
    route: 'ramp-network',
    logo: '/providers/ramp.png',
    comingSoonNote: 'Available soon',
    legalDisclosure:
      'When you choose Ramp to complete a purchase, your transaction and ' +
      'identity-verification details are processed by Ramp Network under its ' +
      'own privacy policy. SchnelPay does not take custody of funds.',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    status: 'coming_soon', // application under review
    tier: 'fallback', // merchant-of-record: trusted, but zero margin to us
    tagline: 'Pay with card, Apple Pay, or Google Pay. Trusted checkout.',
    route: 'stripe-onramp',
    logo: '/providers/stripe.png',
    comingSoonNote: 'Available soon',
    legalDisclosure:
      'When you choose Stripe to complete a purchase, Stripe acts as the ' +
      'merchant of record and processes your payment, identity verification, ' +
      'and the crypto purchase under its own privacy policy. SchnelPay does ' +
      'not take custody of funds.',
  },
  {
    id: 'onramper',
    name: 'Onramper',
    status: 'coming_soon', // application submitted (aggregator)
    tier: 'revenue',
    tagline: 'Compares providers to find you the best price.',
    route: 'onramper',
    logo: '/providers/onramper.png',
    comingSoonNote: 'Available soon',
    legalDisclosure:
      'When you choose Onramper to complete a purchase, your details are ' +
      'routed to the underlying provider Onramper selects, each under its own ' +
      'privacy policy. SchnelPay does not take custody of funds.',
  },
  {
    id: 'transak',
    name: 'Transak',
    status: 'disabled', // parked — re-apply from strength later. Preserved, not deleted.
    tier: 'revenue',
    tagline: 'Buy crypto with card or bank transfer.',
    route: 'transak',
    logo: '/providers/transak.png',
    legalDisclosure:
      'When you choose Transak to complete a purchase, your transaction and ' +
      'identity-verification details are processed by Transak under its own ' +
      'privacy policy. SchnelPay does not take custody of funds.',
  },
];

// ---------------------------------------------------------------------------
// Selectors — use these in components instead of touching PROVIDERS directly.
// ---------------------------------------------------------------------------

/** Providers a user can actually use right now, in display order. */
export const liveProviders = (): OnrampProvider[] =>
  PROVIDERS.filter((p) => p.status === 'live');

/** Live providers we earn on, in display order. The first is the hero. */
export const revenueProviders = (): OnrampProvider[] =>
  liveProviders().filter((p) => p.tier === 'revenue');

/** Live providers offered as trusted alternatives (no margin). */
export const fallbackProviders = (): OnrampProvider[] =>
  liveProviders().filter((p) => p.tier === 'fallback');

/** The single most prominent live provider, or null if none are live yet. */
export const primaryProvider = (): OnrampProvider | null =>
  revenueProviders()[0] ?? liveProviders()[0] ?? null;

/** Providers to tease as "coming soon" (in review). */
export const comingSoonProviders = (): OnrampProvider[] =>
  PROVIDERS.filter((p) => p.status === 'coming_soon');

/** Disclosures for the privacy policy — only for what's actually live. */
export const liveLegalDisclosures = (): { name: string; text: string }[] =>
  liveProviders()
    .filter((p) => p.legalDisclosure)
    .map((p) => ({ name: p.name, text: p.legalDisclosure! }));
