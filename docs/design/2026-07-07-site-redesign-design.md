# Site-wide Redesign — SSM Cyan Control-Console

**Date:** 2026-07-07
**Repo:** `ssmcloud-frontend`
**Status:** Approved design, ready for implementation planning

## 1. Goal

Reskin the entire SSM Cloud web front-end (authenticated dashboard + public landing)
into one cohesive visual identity: a **cyan, industrial "control-console"** language
derived from the SSM logo and the Satisfactory subject matter. Replace the current
generic Bootstrap-blue theme without rewriting the app's structure.

**Success:** every page reads as one system — consistent palette, typography, and
component primitives — in both dark (primary) and light themes, with no functional
regressions.

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Scope | Everything, delivered in phases |
| Implementation | **Re-theme, keep Bootstrap** — rewrite the `--ssm-*` token system, bridge Bootstrap's `--bs-*` vars, add a custom CSS layer for signature components. Bootstrap stays for grid/tabs/modals. |
| Theme | Dark-primary + full light theme + **manual toggle** overriding OS preference |
| Display font | Free Hemi-Head lookalike: **Exo 2** (SIL OFL), self-hosted |
| Delivery | **Single feature branch**, one PR at the end |
| Build | Edit source CSS → `make cleancss`; JS → `make bundle` |

## 3. Design language

- **Palette (dark, primary):** `--void #0C1015`, `--panel #121822`, `--panel-2 #1A2130`,
  brand `--brand #00AADD` / `--brand-deep #0084AB` / `--brand-bright #29CBF2`,
  semantic `--online #3FD07A`, `--warn #F2B33A`, `--hazard #FF5A24`, `--danger #E5544B`.
  Neutrals biased slightly toward the cyan brand.
- **Palette (light):** cool paper `#E6ECEF` grounds, panels near-white, brand darkened to
  `#0089B3` for contrast; sidebar stays dark for logo pop.
- **Typography:**
  - Display — **Exo 2** (self-hosted), heavy, italic, uppercase, letter-spaced;
    used with restraint on page titles, server/unit names, brand.
  - Body — system-ui / Segoe UI stack.
  - Data/labels — monospace stack (`ui-monospace, "Cascadia Mono", Consolas, …`) for all
    numeric readouts, IDs, versions, statuses. This is the typographic signature.
- **Signature components:** lit **status rail** on cards, **segmented LED meters** for
  CPU/RAM, **status lamps**, mono **readout tiles**, **hazard-striped** destructive
  actions, mono **section eyebrows** (`// Needs attention`).
- **Ground:** the existing Satisfactory presskit image is **kept** in both themes, but sunk
  behind a high-alpha, theme-colored veil (denser toward the bottom) so it reads as faint
  atmospheric texture behind the panels rather than a competing photo. The blueprint grid
  layers on top. One tunable token pair per theme (`--ground-veil-top/-bot`) sets how much
  of the landscape shows through; the background is `fixed` while content scrolls.
- **Motion (restrained):** meters fill on load, running lamp soft pulse, hover lift.
  Everything gated behind `prefers-reduced-motion`.

## 4. Architecture / approach

The app is already token-driven (`--ssm-*` in `static/css/master.css`) with a
`prefers-color-scheme` dark mode, and themed through Bootstrap + `main.css`. The redesign
works **through the token layer first**, then adds bespoke components.

Four layers:

1. **Tokens** (`master.css`): the palette + type tokens for both themes, keyed off
   `prefers-color-scheme` and a `data-theme` attribute (toggle wins).
2. **Bootstrap bridge** (`master.css`/`main.css`): map `--bs-primary`, `--bs-body-bg`,
   `--bs-body-color`, `--bs-border-color`, `--bs-card-*`, `--bs-nav-tabs-*`, etc. onto the
   tokens so stock Bootstrap components inherit the new look.
3. **Primitives** (`main.css`): reusable classes — `.status-lamp`, `.seg-meter`,
   `.readout`, `.status-rail`, `.tag`, `.mono`, `.section-head` — consumed by every page.
4. **Components/pages**: per-template restyles that assemble the primitives.

**Font delivery:** add Exo 2 woff2 files under `static/fonts/`, `@font-face` in
`master.css`, weights 500/600/700 + italics, self-hosted (no CDN). Update the head
templates to preload the display font.

**Theme toggle:** module in `src/client/app.js`; reads/writes `localStorage`, sets
`data-theme` on `<html>`, control rendered in the topbar. Rebuild via `make bundle`.

**Build:** `scripts/clean-css.sh` already minifies `main.css`, `public.css`, `login.css`,
`master.css`. No new CSS files required (keeps the build untouched); all new rules live in
those existing files. Run `make cleancss` after CSS edits, `make bundle` after JS edits.

## 5. Phases

Each phase is self-contained and independently shippable, all on one branch.

### Phase 0 — Design-system foundation
- Rewrite `master.css` tokens (both themes, `data-theme` support).
- Bootstrap `--bs-*` bridge.
- `@font-face` for Exo 2 + `static/fonts/` assets.
- Primitives in `main.css`: `.status-lamp`, `.seg-meter`, `.readout`, `.status-rail`,
  `.tag`, `.section-head`, `.mono`, display/utility type classes.
- Theme-toggle module in `src/client/app.js` + `localStorage` persistence.
- **Files:** `static/css/master.css`, `static/css/main.css`, `static/fonts/*`,
  `src/client/app.js`, `templates/includes/dashboard/head.tmpl` (preload font).

### Phase 1 — Shell (every authed page)
- `nav.tmpl`: sidebar with the logo (`static/images/ssm_logo_new_256.svg`), mono uppercase items,
  active cyan rail, footer status lamp; keep existing links/`active` logic.
- `page-header.tmpl` → topbar: account/breadcrumb, server count, profile, logout, **theme
  toggle**; preserve the account-switcher dropdown + logout routes.
- `footer.tmpl`: minimal restyle.
- **Files:** `templates/includes/dashboard/{nav,page-header,footer}.tmpl`, `main.css`.

### Phase 2 — Dashboard + Servers
- `small-server-card.tmpl` / `server-card.tmpl` → **unit panel** (status rail, readouts,
  seg-meters, tags, start/stop/kill ops).
- `status-card.tmpl` → readout/meter primitives.
- `index.tmpl` (Dashboard): fleet-summary tiles + **needs-attention** panel + unit grid.
- `servers.tmpl`: fleet summary + full-width search (single border) + filter chips +
  Deploy + unit grid.
- Preserve existing data bindings, `data-*` filter attributes, and server-action JS hooks.
- **Files:** `templates/pages/dashboard/{index,servers}.tmpl`,
  `templates/includes/dashboard/{small-server-card,server-card,status-card}.tmpl`,
  `main.css`.

### Phase 3 — Single-server detail (most complex)
- `server.tmpl` tab strip (`nav-tabs`) restyled to the console tab language.
- Reskin each include: `console`, `settings`, `installcommand`, `map`, `saves`, `backups`,
  `logs`, `mods`. Console/logs as terminal readouts; `save-card`/`backup-card` as readout
  panels.
- Recolor Chart.js **stats** (`includes/server/stats.tmpl` + `src/client/*`) to the
  semantic palette; frame the Leaflet **map** container.
- Preserve tab ids/anchors, websocket console hooks, agent JS globals.
- **Files:** `templates/pages/dashboard/server.tmpl`,
  `templates/includes/server/*.tmpl`,
  `templates/includes/dashboard/{save-card,backup-card}.tmpl`,
  relevant `src/client/*` for chart colors, `main.css`.

### Phase 4 — Account · Integrations · Profile
- `account.tmpl` (+ `includes/account/{users,audit,settings}.tmpl`),
  `account-create.tmpl`, `account-join.tmpl`.
- `integrations.tmpl`, `integration.tmpl`, `includes/components/{integration-card,
  integration-event-card,integration-event-details,add-integration-form,
  update-integration-form}.tmpl`.
- `profile.tmpl`.
- Mostly tables/forms/cards on Phase 0 primitives + Bootstrap bridge.
- **Files:** the above templates, `main.css`.

### Phase 5 — Public landing
- Overhaul `public.css` + `public/index.tmpl`: hero in the control-console language,
  feature sections, restyled `includes/public/nav`, footer. Align its head/token usage to
  the shared palette (it currently uses Bootstrap 5.2 + `public.css` only).
- **Files:** `templates/pages/public/index.tmpl`,
  `templates/includes/public/navigation.tmpl`, `static/css/public.css`.

## 6. Component primitives (spec)

- **`.status-lamp`** — 8–9px dot; `.on` green, `.run` cyan (optional `.pulse`), `.off` red;
  soft glow via `box-shadow`.
- **`.seg-meter`** — track + `%`-width fill overlaid with a segment-divider gradient;
  fill color shifts green→amber(`≥75`)→hazard(`≥90`).
- **`.readout`** — mono label + value tile (panel-2 background, hairline border).
- **`.status-rail`** — 4px lit bar on a card's left edge encoding online/offline.
- **`.tag`** — mono uppercase chip; variants `ok/no/upd/exp`.
- **`.section-head`** — mono `//` eyebrow + hairline rule + optional right meta.

## 7. Accessibility & quality floor

Visible keyboard focus on all interactive elements; `prefers-reduced-motion` respected;
WCAG-legible contrast in **both** themes; semantic status color separate from the brand
accent; no horizontal body scroll (wide content scrolls in its own container).

## 8. Out of scope

- Login/auth UI (external Authentik OAuth redirect).
- Docs site (`/docs`).
- `login.css` (legacy/unused — leave as-is or remove in a later cleanup).
- Backend/gRPC changes. Any new Dashboard aggregate metrics (players online, mods
  deployed, fleet-average load) are display-only; if the data isn't already available they
  are dropped rather than added to the backend.

## 9. Risks / open items

- **Exo 2 fidelity** — a lookalike, not Hemi Head; acceptable per decision. Keep the
  display treatment italic/uppercase to match the wordmark feel.
- **Bootstrap version skew** — dashboard uses BS 5.3, public uses BS 5.2; verify the
  `--bs-*` bridge on both.
- **Chart.js / Leaflet theming** — third-party color surfaces need explicit overrides, not
  just tokens.
- **Single large branch** — long-lived; mitigate by phase-ordered commits and keeping each
  phase green so partial review is possible.
- **Logo SVG font** — `ssm_logo_new_256.svg` renders its wordmark via the `Hemi Head`
  font referenced by name (not outlined paths). This matches current app behavior (nav +
  public already use it); if the wordmark must be pixel-stable, outline the text to paths
  in a later cleanup. Out of scope here.
