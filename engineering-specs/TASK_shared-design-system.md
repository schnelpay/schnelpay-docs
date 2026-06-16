# Task: Shared Design System (tokens) across Marketing, Admin & Dashboard

**Repos:** `schnelpay-marketing`, `schnelpay-admin`, `schnelpay-dashboard`
**Admin + dashboard deploy from `main` → production. Every push is live.**
**Status:** Not started. Scheduled AFTER Coinbase + Stripe integration work is complete.

---

## Goal

One source of truth for design decisions (fonts, font sizes, colors, spacing) so
changing a value once propagates to every page that references it — no more editing
page by page. The three apps already share the same visual language (navy `#2C3340`,
gold `#C9A84C`, Playfair Display headings, Jost body); this makes that sharing
*structural* instead of *by repetition*.

Trigger/motivation: the Convert page has hardcoded tiny fonts (e.g. `12px`) that are
too small and need a global tweak — currently impossible without editing each element.

---

## STEP 0 (do first): Understand what marketing's `app > template >` actually does

Randeep referenced marketing having an `app > template >` structure and assumes it
gives change-once-applies-everywhere leverage. VERIFY this before replicating it:

- In Next.js, a `template.tsx` is a **layout** wrapper (shared structure/chrome), NOT
  necessarily a design-token system.
- Check whether marketing's templates deliver style propagation via **CSS variables /
  a tokens file / globals.css**, OR whether marketing ALSO uses hardcoded inline styles
  (in which case it has the same limitation and isn't the model to copy).
- Whatever mechanism actually gives propagation is the one to standardize across all
  three apps. If marketing already has a good token setup, copy it. If not, design it
  fresh and apply to all three.

---

## The key technical nuance (this determines the whole approach)

Our convention is **"inline styles only in components."** Inline styles
(`style={{ fontSize: '12px' }}`) do NOT read from `globals.css`. So simply "having
templates that refer to globals.css" will NOT propagate to inline-styled values —
you'd still be editing page by page.

The real fix is **design tokens**: define each decision once, centrally; components
reference the token NAME, not a hardcoded literal. Change the token → everything
updates.

### Recommended: Option A — CSS variables in globals.css, read from inline styles
Bridges inline styles to a central source. Define in `globals.css`:
```css
:root {
  --color-navy: #2C3340;
  --color-gold: #C9A84C;
  --font-heading: 'Playfair Display', serif;
  --font-body: 'Jost', sans-serif;
  --font-size-xs: 13px;   /* was 12px — bump for readability/a11y */
  --font-size-sm: 14px;
  --font-size-body: 15px;
  --font-size-h2: 19px;
  --space-sm: 10px;
  --space-md: 16px;
}
```
Then in components: `style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-navy)' }}`.
- Keeps the "inline styles in components" convention intact.
- Closest to what marketing likely already does — least disruptive.
- Change a variable in globals.css → every component using it updates.

### Alternative: Option B — shared `theme.ts` constants
`export const FONT = { sm: 14, body: 15, h2: 19 }`, `COLOR = { navy, gold }`, imported
everywhere. More "React-native" but requires importing the theme into every component.

**Lean Option A.** Shared globals.css/token file lives in one place; all three apps
reference the same token names.

---

## The honest cost (set expectations)

Retrofitting tokens means going through EVERY existing admin + dashboard component and
replacing hardcoded values (`'12px'`, `'#2C3340'`, etc.) with token references. That IS
the page-by-page work we're trying to escape — but it's a ONE-TIME pass. After it,
those properties are forever change-once. There is no shortcut that skips the initial
sweep; the payoff is it's the LAST sweep needed for those properties.

`ProviderPicker.tsx` is a good first conversion target — it's recent, self-contained,
and full of hardcoded sizes (`'12px'`, `'13.5px'`, `'15px'`, `'19px'`) that should
become tokens. Use it as the pattern, then roll out.

---

## Why this pairs with two other parked tasks (do them together)

1. **Light-theme exploration** — tokens make a theme switch dramatically easier: flip
   token values (or swap a token set) instead of editing every component. Build tokens
   FIRST, then the light theme becomes a token-value change, not a rewrite. (Ref: the
   "role-reassignment" light/dark approach from the Colibri mockup — navy = canvas in
   dark / text+primary-action in light; gold = fill in dark / accent-only in light.)

2. **Accessibility fixes (current score 88)** — the 12px fonts hurt readability AND
   a11y; contrast failures (likely gold-on-light pairs) are color-token changes. Once
   type scale + colors are tokens, both a11y fixes become central edits + a WCAG
   contrast check, not per-page work.

→ Treat tokens as the FOUNDATION for theme + a11y. Same project, right order:
   **tokens → light theme → contrast/a11y pass.**

---

## Conventions / guardrails (all three repos)
- Inline styles only in components (tokens via CSS variables preserve this).
- `./node_modules/.bin/tsc --noEmit` from inside each repo before commit (NOT `npx tsc`).
- `git add` specific files (not `-A`). Commit each repo separately.
- Admin + dashboard = production on push. Marketing per its own deploy.
  Test each app after changes; confirm on live page after Cloudflare build (~2 min).
- `overflow-x: clip` (not hidden) to preserve sticky behavior, if touched.
- Dark-theme overrides currently need globals.css `!important` due to specificity —
  the token migration may let us reduce reliance on `!important`; check don't assume.

## Suggested build order
1. Step 0: inspect marketing's template/style mechanism; decide token home.
2. Define the token set (colors, font family, type scale w/ readability fix, spacing).
3. Put tokens in a shared globals.css (or per-repo globals referencing the same names).
4. Convert `ProviderPicker.tsx` first as the reference pattern; verify visually.
5. Roll out component-by-component across dashboard, then admin, then align marketing.
6. Per app: tsc clean → test → commit (specific files) → push → confirm live.
7. THEN: light-theme token set, then contrast/a11y pass.

## Definition of done (foundation phase)
- A single token set (colors, fonts, type scale, spacing) referenced by components.
- Changing one token value visibly updates every referencing page in an app.
- The Convert page's tiny-font issue fixed via a token change, not inline edits.
- Verified on live admin + dashboard pages.
- Light-theme + a11y tracked as the next phases on top of the token foundation.
