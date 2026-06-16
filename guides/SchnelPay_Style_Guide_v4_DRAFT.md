# SchnelPay Style Guide — v4 (Draft)
**Visual Design System · June 2026 · supersedes v3 (May 14, 2026)**
Dashboard · Admin · Marketing · Legal · Mobile
Randeep Singh · SchnelPay LLC

**What's new in v4:** three named themes (Marketing, Admin/Dashboard, Legal); the
marketing-specific tokens (category palette, spacing, radii, card semantics) are now
OFFICIAL ecosystem tokens; a full responsive system; a page-template registry.

---

## 01 — Ecosystem Tokens (single source of truth)

Every app's `globals.css` `:root` carries these. Canonical names are `--bg-*`,
`--gold-*`, `--text-*`, `--border-*`, `--font-*`; the `--color-*` names are
LEGACY ALIASES kept for backward compat and must always point at canonical tokens,
never at raw hex.

### Surfaces (darkest → lightest)
| Token | Value | Use |
|---|---|---|
| `--bg-darkest` | #141920 | footer only |
| `--bg-input` | #1E2530 | inputs, table heads, tab bars |
| `--bg-deep` | #252B36 | sidebar, top bar — **never cards** |
| `--bg-base` | #2C3340 | page background |
| `--bg-card` | #384254 | cards, panels, modals |

### Gold
| Token | Value | Use |
|---|---|---|
| `--gold-core` | #C2A03F | PRIMARY — buttons, nav, badges, links |
| `--gold-brand` | #C9A84C | logo "PAY", marketing highlights only |
| `--gold-soft` | #E0C878 | hover glow, accents only — never buttons/text |
| `--gold-dark` | #9A7D2A | depth, gradient endings |

Marketing-only transparent golds (distinct from `--gold-soft`, a solid):
`--color-gold-soft` rgba(194,160,63,0.4) rings · `--color-gold-faint` 0.2 dividers ·
`--color-gold-tint` 0.10 active states.

### Text — 3 tiers only. Never #FFFFFF.
`--text-primary` #F4F5F6 · `--text-secondary` #A7B0BC · `--text-subtle` #6B7A8D

### Borders
`--border-default` rgba(255,255,255,0.10) · `--border-subtle` 0.07 ★ ·
`--border-faint` 0.04 · `--border-gold` rgba(194,160,63,0.25)

### Status (system feedback ONLY, never decorative)
`--success` #4ade80 · `--warning` #facc15 · `--error` #f87171 · `--info` #60a5fa

### Category palette (blog tags, tier accents, eyebrows) — now ecosystem-official
business #34D399 · education #A78BFA · payments #60A5FA · security var(--gold-core) ·
tax #FB7185 · teal #2DD4BF · warm #FB923C · mauve #E879F9
**Never for system feedback** — Received/Sent, completed/failed, up/down use
`--success`/`--error`, not the category greens/roses.

### On-gold text + chain brand colors (NEW in v4)
`--text-on-gold` #0a0d12 — dark text on gold buttons/badges (the only sanctioned
dark-on-gold value). Chain brand colors: `--chain-eth` #627EEA · `--chain-btc`
#F7931A · `--chain-sol` #9945FF — asset icons/accents only.

### Spacing / Radii / Card semantics — ecosystem-official
Spacing: 4/8/12/16/20/24/32/36/40/48 (`--space-1…12`).
Radii: `--radius-sm` 8 · `--radius-md` 12 · `--radius-lg` clamp(12px,1.5vw,20px) ·
`--radius-pill` 100px.
Cards consume `--card-*` tokens (bg/border/ring/radius/shadow/padding); change once
in `:root`, every card updates. `--card-bg-default: var(--bg-card)` with
`--card-bg: var(--card-bg-default)` indirection for future variants.

### Fonts — per-app loading, same result
| Token | Resolves to | Loading |
|---|---|---|
| `--font-display` | Playfair Display | Marketing: next/font injects `--font-playfair`, display references it first. Admin/Dashboard: raw string. |
| `--font-ui` | Jost | same pattern (`--font-jost` on marketing) |
| `--font-mono` | JetBrains Mono | all amounts, addresses, hashes, code |

---

## 02 — The Three Themes

### Theme A — Marketing (schnelpay.com)
- **Headlines (h1/h2 ≥ 24px): Playfair Display** (`--font-display`). Playfair is a
  display serif — large sizes ONLY.
- h3–h6, body, UI: **Jost** (`--font-ui`).
- Gold accents: `--gold-core` interactive; `--gold-brand` for brand highlights.
- Cards: `--bg-card` (#384254), `--radius-lg`, `--card-*` semantics.
- Category palette for blog tags and section eyebrows.

### Theme B — Admin / Dashboard (admin. / dashboard.schnelpay.com)
- **Jost EVERYWHERE, including h1/h2.** Playfair never appears — it is illegible at
  UI sizes and breaks density.
- Type scale (Jost): H1 24/700 · H2 20/600 · H3 16/600 · body 14/400 ·
  labels 12/500 · eyebrow 11/700 CAPS ls:2px.
- **JetBrains Mono for every number, amount, address, hash.**
- Status colors strictly for system feedback.

### Theme C — Legal / Documents (terms, privacy, risk, compliance, beta)
Long-form legibility over display flair:
- Title: Playfair (it's marketing-site chrome) but **all body Jost**.
- Body 15–16px, line-height 1.8–1.9, `--text-secondary`.
- Section headings 22–24px Jost 700 `--text-primary` — NOT Playfair (too small).
- "At a glance" summary card at top (`--bg-card`, gold checkmarks).
- Sticky "On this page" TOC on desktop; collapses above content on mobile.
- Meta line (version, governing law, dates) in `--text-subtle` 13px.
- Minimal gold: links + active TOC item only.

---

## 03 — Responsive System (NEW in v4)

### Breakpoints (documented tokens — also used by media queries)
`--bp-sm` 640 · `--bp-md` 768 · `--bp-lg` 1024 · `--bp-xl` 1280 · `--bp-2xl` 1536

### Containers
`--container-sm…2xl` = 640/768/1024/1280/1440. Standard wrapper:
```css
.container { width:100%; max-width:var(--container-xl);
  margin-inline:auto; padding-inline:clamp(16px,4vw,32px); }
```
Never `width: 1200px` or fixed `padding: 40px` on page wrappers.

### Fluid type tokens
`--text-xs…2xl` via clamp (e.g. `--text-2xl: clamp(2rem, 1.5rem + 2vw, 3rem)`).
Marketing h1: `clamp(2rem, 5vw, 4rem)`; h2: `clamp(1.5rem, 4vw, 3rem)`.

### Fluid components
- Card padding: `--card-padding-y: clamp(20px,4vw,36px)`,
  `--card-padding-x: clamp(16px,4vw,40px)` — fixes oversized mobile cards.
- `--radius-lg` is fluid (see Radii).

### Hard rules
- Grids: 4-col → 2-col ≤768px; 3-col → 1-col ≤768px; 6-item grids ALWAYS
  `repeat(3,1fr)` — never auto-fit minmax.
- Tables: wrap in horizontal-scroll container on mobile.
- Media: `img, video, svg { max-width:100%; height:auto; }`
- Overflow: `body { overflow-x: clip; }` — **clip, NOT hidden** (hidden breaks
  sticky positioning; this was a deliberate May 6 fix — do not regress it).
- Motion: honor `prefers-reduced-motion: reduce` (kill animations/transitions).
- Sidebar (admin/dashboard): hidden ≤768px, hamburger + drawer w-72,
  backdrop rgba(0,0,0,0.6), z-50/z-40.

---

## 04 — Page Template Registry (NEW in v4)

Every marketing page declares which template it uses. Templates live in
`app/(templates)/` and are the consistency contract — new pages/posts pick a
template, never invent layout.

| Template | Intended use | Audit verdict (Jun 10) |
|---|---|---|
| `sp-tmpl-article-v001` | Blog posts (long-form, single column) | ✅ canonical (on-gold token applied) |
| `sp-tmpl-content-v001` | Content/legal pages (Theme C) | ✅ canonical (on-gold token applied) |
| `sp-tmpl-marketing-v001` | Landing/feature pages (hero + card grids) | ✅ canonical (on-gold token applied) |
| `sp-tmpl-media-v001` | Media-heavy pages | ✅ canonical — Playfair 72px stat is valid Theme A display |
| `sp-tmpl-split-v001` | Two-column split layouts | ✅ canonical — Playfair 28px stat ≥24px floor |
| `sp-tmpl-dashboard-v001` | Dashboard-style showcase | ✅ canonical after fixes: bg → `--bg-darkest`, status → `--success`/`--error`, chains → `--chain-*` tokens. Jost h1/h2 confirmed (Theme B compliant) |

**Rule:** every blog post is assigned a template (default: article-v001). The
planned shared `<BlogPostLayout>` is the implementation of article-v001; the ~20
existing hand-rolled post pages migrate to it (Phase 2 of the migration).

---

## 04b — Blog System (publishing rules)

The blog is driven by a single source of truth: `lib/blog-data.ts` (the `POSTS`
array). The index page (`app/(site)/blog/page.tsx`) and every category landing
page read from it. **A post does not exist until it is registered there** — adding
the `page.tsx` only makes the URL work; the post is invisible in navigation until
it has a `POSTS` entry.

### Publishing a new post — checklist
1. Create `app/(site)/blog/<slug>/page.tsx` using `<BlogPostLayout>` (Theme A).
2. Add ONE entry to `POSTS` in `lib/blog-data.ts` (slug, category, date, readTime,
   title, excerpt). The slug must match the folder exactly and be unique — a
   duplicate slug breaks the index render (React key collision).
3. `category` must be a valid `CategoryKey` (`security | business | payments |
   crypto | company`). The blog "Crypto Basics" tag = the `crypto` key (violet,
   `--color-cat-education`).
4. `date` format: `'Mon D, YYYY'` (e.g. `'Jun 9, 2026'`) — parseable by `new Date()`.
5. `tsc --noEmit` clean, preview locally, then commit + push (push deploys).

### Featured-post rotation (the rule that surprised us — now codified)
The featured slot is **automatic by date**, with an optional manual pin:
- **Default:** the NEWEST post by date is automatically featured. The previously
  featured post flows DOWN into the card grid in date order. So publishing a newer
  post automatically promotes it to Featured and demotes the prior one. No action
  needed.
- **Pin (override):** set `featured: true` on a post to PIN it as Featured
  regardless of date — use ONLY for an evergreen post you want kept up top for a
  long run (a launch announcement, a flagship explainer). Remove the flag to
  return to automatic date-based rotation.
- Implementation: `featuredPost()` returns `POSTS.find(p => p.featured) ??
  postsByDateDesc()[0]`. At most ONE post should carry `featured: true` at a time.

### Blog card layout (index grid)
Cards are flex columns with equal-height behaviour. To keep the grid visually clean:
- The excerpt has a fixed bottom margin; the **date + "Read more →" are wrapped in
  a footer `<div style={{ marginTop: 'auto' }}>`** so they anchor to the BOTTOM of
  every card. This makes all "Read more →" links and dates align on a common
  baseline regardless of excerpt length. Never let the date/CTA float mid-card.
- Card surface `--bg-card`, `--radius-md`/`lg`, gold "Read more →" (`--color-gold`).

---

## 05 — Golden Rules (applied without being asked)

### ALWAYS ✓
- `var(--token)` — never raw hex in component files (hex lives ONLY in `:root`).
- Cards `--bg-card` (#384254). Inputs `--bg-input`. Page `--bg-base`.
- Marketing h1/h2: `--font-display`. Admin/Dashboard ALL text: `--font-ui`.
- Playfair never below 24px, never in Admin/Dashboard, never for legal body.
- Amounts/addresses/hashes: `--font-mono`.
- Legal pages use Theme C scale.
- New pages/posts declare a template from the registry.
- Blog: register every post in `lib/blog-data.ts` (unique slug); newest post
  auto-features, `featured: true` only to pin an evergreen.
- Blog cards: date + "Read more →" anchored to card bottom (`marginTop: auto`
  footer) for baseline alignment.
- `tsc --noEmit` + `file` check before every commit; Python str.replace for edits.
- Each repo commits separately; descriptive messages
  (feat · fix · style · refac · chore · blog).
- Blog rotation: newest post = featured; previous featured → card.

### NEVER ✕
- Raw hex in components · #ffffff anywhere · #252B36 for cards.
- `--gold-brand` for interactive elements · `--gold-soft` for buttons/text.
- Playfair in Dashboard/Admin · non-mono for amounts.
- More than 3 text tiers.
- `body { overflow-x: hidden }` (use clip).
- nano/sed for source edits · commit without TypeScript check.
- Real credentials/keys/passwords in chat.

---

## 06 — Deployment Reference (unchanged from v3)
| Repo | URL | Platform | Deploy |
|---|---|---|---|
| schnelpay-backend | api.schnelpay.com | Railway | push → auto ~60s |
| schnelpay-dashboard | dashboard.schnelpay.com | Cloudflare Pages | push → auto ~2min |
| schnelpay-admin | admin.schnelpay.com | Cloudflare Pages | push → auto ~2min |
| schnelpay-marketing | schnelpay.com | Cloudflare Pages | push → auto ~2min |

**Migration note (June 2026):** marketing token sync to ecosystem standard is in
progress on branch `style-guide-migration`; merge to main only after page-by-page
verification. Dashboard/admin to receive the v4 responsive tokens in their own
commits.
