// ProviderPicker.tsx
// ---------------------------------------------------------------------------
// Renders the on-ramp options on the Buy Crypto page, driven entirely by
// providers.config.ts. It does NOT know which providers exist or their status
// — it just reads the selectors. Flip a flag in the config and this updates.
//
// Hierarchy (the honest one we settled on):
//   1. The single primary REVENUE provider gets the prominent card.
//   2. Any other live providers (revenue or fallback) render as secondary
//      options below it. A merchant-of-record / zero-margin provider like
//      Stripe lives here as a trusted alternative — never as the hero.
//   3. In-review providers optionally show as muted "coming soon" markers.
//
// Wiring: this component is presentational. It calls onSelect(provider) with
// the chosen provider; the parent Buy Crypto page owns the actual flow
// (destination-address input, provider SDK/redirect, etc.) and the secrets.
// ---------------------------------------------------------------------------

import {
  primaryProvider,
  liveProviders,
  comingSoonProviders,
  type OnrampProvider,
} from './providers.config';

const NAVY = '#2C3340';
const GOLD = '#C9A84C';
const SLATE = '#5b6472';
const LINE = 'rgba(255,255,255,0.12)';

interface ProviderPickerProps {
  /** Called when the user picks a usable provider. Parent owns the flow. */
  onSelect: (provider: OnrampProvider) => void;
  /** Show in-review providers as muted "coming soon" markers. Default true. */
  showComingSoon?: boolean;
}

export default function ProviderPicker({
  onSelect,
  showComingSoon = true,
}: ProviderPickerProps) {
  const primary = primaryProvider();
  const secondary = liveProviders().filter((p) => p.id !== primary?.id);
  const soon = showComingSoon ? comingSoonProviders() : [];

  // No provider is live yet — honest empty state, not a broken picker.
  if (!primary) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          color: SLATE,
          fontFamily: 'Jost, sans-serif',
          border: `1px solid ${LINE}`,
          borderRadius: '14px',
        }}
      >
        Crypto purchases are coming soon. Check back shortly.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Jost, sans-serif', maxWidth: '440px', width: '100%' }}>
      {/* Primary provider — the prominent card */}
      <button
        onClick={() => onSelect(primary)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '20px',
          background: NAVY,
          border: `1.5px solid ${GOLD}`,
          borderRadius: '14px',
          cursor: 'pointer',
          textAlign: 'left',
          color: '#fff',
        }}
      >
        <img
          src={primary.logo}
          alt={primary.name}
          width={44}
          height={44}
          style={{ borderRadius: '10px', flexShrink: 0, background: '#fff', padding: '4px' }}
        />
        <span style={{ flex: 1 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: 'Playfair Display, serif',
                fontSize: '19px',
                fontWeight: 600,
              }}
            >
              {primary.name}
            </span>
            {primary.badge && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: NAVY,
                  background: GOLD,
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                {primary.badge}
              </span>
            )}
          </span>
          <span
            style={{
              display: 'block',
              marginTop: '4px',
              fontSize: '13.5px',
              lineHeight: 1.4,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            {primary.tagline}
          </span>
        </span>
        <span aria-hidden style={{ color: GOLD, fontSize: '20px' }}>
          →
        </span>
      </button>

      {/* Secondary live options (incl. trusted-fallback providers) */}
      {secondary.length > 0 && (
        <>
          <div
            style={{
              margin: '18px 0 10px',
              fontSize: '12px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: SLATE,
            }}
          >
            Or complete with
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {secondary.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  background: 'transparent',
                  border: `1px solid ${LINE}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#fff',
                }}
              >
                <img
                  src={p.logo}
                  alt={p.name}
                  width={32}
                  height={32}
                  style={{ borderRadius: '8px', flexShrink: 0, background: '#fff', padding: '3px' }}
                />
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: '15px', fontWeight: 500 }}>{p.name}</span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '12.5px',
                      color: 'rgba(255,255,255,0.6)',
                      marginTop: '2px',
                    }}
                  >
                    {p.tagline}
                  </span>
                </span>
                <span aria-hidden style={{ color: SLATE, fontSize: '18px' }}>
                  →
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Coming soon — muted, non-interactive */}
      {soon.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginTop: '18px',
            paddingTop: '16px',
            borderTop: `1px solid ${LINE}`,
          }}
        >
          {soon.map((p) => (
            <span
              key={p.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                color: SLATE,
                border: `1px dashed ${LINE}`,
                borderRadius: '999px',
                padding: '5px 12px',
              }}
            >
              {p.name}
              <span style={{ opacity: 0.7 }}>· {p.comingSoonNote ?? 'Soon'}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
