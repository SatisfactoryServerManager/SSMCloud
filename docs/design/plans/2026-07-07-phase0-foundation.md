# Phase 0 — Design-System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the cyan control-console design system — palette tokens (both themes + manual toggle), Bootstrap variable bridge, the self-hosted Exo 2 display font, reusable component primitives, and the theme-toggle module — so subsequent phases can assemble pages from it and most stock Bootstrap UI reskins automatically.

**Architecture:** Everything flows through `static/css/master.css` (tokens + Bootstrap `--bs-*` bridge + `@font-face`) and `static/css/main.css` (new primitive classes). Themes are keyed off both `prefers-color-scheme` and a `data-theme` attribute on `<html>`; a small module in `src/client/app.js` toggles and persists it. Legacy `--ssm-*` token names are preserved (re-pointed at the new palette) so existing templates keep rendering during later phases.

**Tech Stack:** Go html/template, Bootstrap 5.3, plain CSS (no preprocessor), browserify bundle from `src/client/`, `cleancss` minifier, all driven by the `Makefile`.

## Global Constraints

- **Branch:** all work on `feature/ui-redesign`. Do not touch `main`.
- **No automated test harness exists** for templates/CSS. Verification for every task = rebuild assets and load the app, confirming the stated visual/behavioural outcome. There are no unit tests to write.
- **Build commands (run from repo root, bash):** `make cleancss` after any `static/css/*.css` edit (regenerates `.min.css`); `make bundle` after any `src/client/*.js` edit (regenerates `static/js/bundle.js`); `make build` compiles the Go app to `bin/ssmcloud-frontend`; `make run` does bundle + cleancss + build + run on port 8083.
- **Do not edit `*.min.css` or `static/js/bundle.js` by hand** — they are generated. Edit the source, run the make target.
- **Palette (dark, primary):** `--void #0C1015`, `--panel #121822`, `--panel-2 #1A2130`, `--rail #090C11`, `--line rgba(255,255,255,.08)`, `--line-strong rgba(255,255,255,.15)`, `--ink #E8EEF4`, `--ink-dim #93A0B2`, `--steel #647085`, `--brand #00AADD`, `--brand-bright #29CBF2`, `--brand-deep #0084AB`, `--online #3FD07A`, `--warn #F2B33A`, `--hazard #FF5A24`, `--danger #E5544B`.
- **Palette (light):** `--void #E6ECEF`, `--rail #0E1520`, `--panel #FAFCFD`, `--panel-2 #EDF1F4`, `--line rgba(16,26,40,.10)`, `--line-strong rgba(16,26,40,.18)`, `--ink #14202B`, `--ink-dim #4E5B6B`, `--steel #74828F`, `--brand #0089B3`, `--brand-bright #00AADD`, `--brand-deep #026A8C`, `--online #17A65B`, `--warn #B9861A`, `--hazard #D8431A`, `--danger #C43A32`.
- **Fonts:** display `--display: "Exo 2", system-ui, sans-serif`; body `--sans: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`; data `--mono: ui-monospace, "Cascadia Mono", "Cascadia Code", Consolas, "SFMono-Regular", Menlo, monospace`.
- **Accessibility floor:** every interactive element keeps a visible focus state; all motion gated behind `prefers-reduced-motion: reduce`.

---

### Task 1: Self-host the Exo 2 display font

**Files:**
- Create: `static/fonts/exo2-latin-600-normal.woff2`, `static/fonts/exo2-latin-700-normal.woff2`, `static/fonts/exo2-latin-600-italic.woff2`, `static/fonts/exo2-latin-700-italic.woff2`
- Modify: `static/css/master.css` (prepend `@font-face` blocks)
- Modify: `templates/includes/dashboard/head.tmpl:96` (add font preload near the icon/manifest links)

**Interfaces:**
- Produces: font family name `"Exo 2"` available to CSS, referenced later as the `--display` token in Task 2.

- [ ] **Step 1: Download the four woff2 files**

Download Exo 2 (SIL OFL 1.1, by Natanael Gama) Latin subset woff2 files into `static/fonts/`. Source: https://gwfh.mranftl.com/fonts/exo-2?subsets=latin (or the Google Fonts GitHub `apache/exo-2` / `google/fonts` repo). Save exactly these filenames:
- `exo2-latin-600-normal.woff2`
- `exo2-latin-700-normal.woff2`
- `exo2-latin-600-italic.woff2`
- `exo2-latin-700-italic.woff2`

- [ ] **Step 2: Add `@font-face` blocks at the top of `static/css/master.css`**

Insert before the existing `:root {` line:

```css
/* ---- Display face: Exo 2 (self-hosted, SIL OFL) ---- */
@font-face {
    font-family: "Exo 2";
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url("/public/fonts/exo2-latin-600-normal.woff2") format("woff2");
}
@font-face {
    font-family: "Exo 2";
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url("/public/fonts/exo2-latin-700-normal.woff2") format("woff2");
}
@font-face {
    font-family: "Exo 2";
    font-style: italic;
    font-weight: 600;
    font-display: swap;
    src: url("/public/fonts/exo2-latin-600-italic.woff2") format("woff2");
}
@font-face {
    font-family: "Exo 2";
    font-style: italic;
    font-weight: 700;
    font-display: swap;
    src: url("/public/fonts/exo2-latin-700-italic.woff2") format("woff2");
}
```

Note: `/public/` is the URL prefix that serves `static/` (same prefix used by existing `/public/css/...` links). Confirm by grepping `r.Static`/`StaticFS` in `main.go` if unsure.

- [ ] **Step 3: Preload the primary display weight in `head.tmpl`**

In `templates/includes/dashboard/head.tmpl`, immediately after line 95 (`<meta name="viewport" ... />` block) and before the apple-touch-icon link, add:

```html
        <link rel="preload" href="/public/fonts/exo2-latin-700-italic.woff2" as="font" type="font/woff2" crossorigin />
```

- [ ] **Step 4: Rebuild CSS and the app**

Run: `make cleancss && make build`
Expected: both succeed with no errors; `static/css/master.min.css` regenerated (newer mtime).

- [ ] **Step 5: Verify the font loads**

Run `make run`, open http://localhost:8083, log in, open DevTools → Network → Font. Add a temporary `<span style="font-family:'Exo 2';font-weight:700;font-style:italic">TEST</span>` to any page if needed, or check that the preloaded woff2 returns HTTP 200 (not 404). Confirm no 404 for the font URL.
Expected: `exo2-latin-700-italic.woff2` loads with status 200.

- [ ] **Step 6: Commit**

```bash
git add static/fonts/ static/css/master.css static/css/master.min.css templates/includes/dashboard/head.tmpl
git commit -m "feat(ui): self-host Exo 2 display font"
```

---

### Task 2: Rewrite the palette tokens (both themes + data-theme)

**Files:**
- Modify: `static/css/master.css:1-89` (replace the `:root` block and the `@media (prefers-color-scheme: dark)` block; keep the offcanvas/badge rules below line 89)

**Interfaces:**
- Consumes: `"Exo 2"` font family from Task 1.
- Produces: theme tokens `--void --rail --panel --panel-2 --line --line-strong --ink --ink-dim --steel --brand --brand-bright --brand-deep --online --warn --hazard --danger --grid --focus`, font tokens `--display --sans --mono`, and re-pointed legacy `--ssm-*` tokens. All consumed by Tasks 3–5 and all later phases.

- [ ] **Step 1: Replace lines 1–37 (the `:root` block) with the light-default palette + font tokens + legacy bridge**

```css
:root {
    /* fonts */
    --display: "Exo 2", system-ui, "Segoe UI", sans-serif;
    --sans: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --mono: ui-monospace, "Cascadia Mono", "Cascadia Code", Consolas, "SFMono-Regular", Menlo, monospace;

    /* light theme (default) */
    --void: #E6ECEF;
    --rail: #0E1520;
    --panel: #FAFCFD;
    --panel-2: #EDF1F4;
    --line: rgba(16, 26, 40, 0.10);
    --line-strong: rgba(16, 26, 40, 0.18);
    --ink: #14202B;
    --ink-dim: #4E5B6B;
    --steel: #74828F;
    --brand: #0089B3;
    --brand-bright: #00AADD;
    --brand-deep: #026A8C;
    --online: #17A65B;
    --warn: #B9861A;
    --hazard: #D8431A;
    --danger: #C43A32;
    --grid: rgba(16, 26, 40, 0.035);
    --focus: color-mix(in srgb, var(--brand) 30%, transparent);

    /* legacy --ssm-* bridge (keeps existing templates working) */
    --ssm-bg-colour: var(--void);
    --ssm-text-colour: var(--ink);
    --ssm-text-inverted-colour: #fff;
    --ssm-text-hover-colour: var(--ink-dim);
    --ssm-sidebar-bg-colour: var(--rail);
    --ssm-sidebar-item-active-bg-colour: var(--panel-2);
    --ssm-sidebar-item-text-color: var(--ink);
    --ssm-sidebar-item-text-hover-color: #fff;
    --ssm-btn-bg-colour: var(--brand);
    --ssm-btn-bg-disabled-colour: var(--line-strong);
    --ssm-btn-bg-hover-colour: var(--brand-bright);
    --ssm-btn-border-colour: var(--brand-deep);
    --ssm-card-bg-colour: var(--panel);
    --ssm-card-header-bg: var(--panel-2);
    --ssm-card-border-colour: var(--line);
    --ssm-card-inner-bg-colour: var(--panel-2);
    --ssm-input-bg-colour: var(--panel-2);
    --ssm-input-alt-bg-colour: var(--panel);
    --ssm-input-border-colour: var(--line);
    --ssm-tabs-bg-colour: var(--panel-2);
    --ssm-tabs-tab-bg-colour: var(--panel);
    --ssm-tabs-tab-border-colour: var(--line);
    --ssm-tabs-tab-bg-hover-colour: var(--line-strong);
    --ssm-tabs-tab-border-hover-colour: var(--line-strong);
    --ssm-log-viewer-bg-colour: var(--panel-2);
    --ssm-log-viewer-border-colour: var(--line);
    --ssm-link-text-colour: var(--brand);
    --ssm-link-text-hover-colour: var(--brand-bright);
}

/* base type + ground */
body {
    font-family: var(--sans);
    background-color: var(--void);
    color: var(--ink);
}
h1, h2, h3, h4, h5, .display-5, .display-6 {
    font-family: var(--display);
}
```

- [ ] **Step 2: Define a reusable dark-palette token set and apply it to all three triggers**

Replace the entire existing `@media (prefers-color-scheme: dark) { ... }` block (old lines 39–89) with a single shared declaration list applied to the OS-dark media query **and** the explicit `data-theme` selectors. Use a CSS custom-property indirection so the values are written once:

```css
/* dark palette values, written once */
@media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
        --void: #0C1015;
        --rail: #090C11;
        --panel: #121822;
        --panel-2: #1A2130;
        --line: rgba(255, 255, 255, 0.08);
        --line-strong: rgba(255, 255, 255, 0.15);
        --ink: #E8EEF4;
        --ink-dim: #93A0B2;
        --steel: #647085;
        --brand: #00AADD;
        --brand-bright: #29CBF2;
        --brand-deep: #0084AB;
        --online: #3FD07A;
        --warn: #F2B33A;
        --hazard: #FF5A24;
        --danger: #E5544B;
        --grid: rgba(120, 190, 230, 0.028);
        --ssm-text-inverted-colour: #04222E;
    }
}
:root[data-theme="dark"] {
    --void: #0C1015;
    --rail: #090C11;
    --panel: #121822;
    --panel-2: #1A2130;
    --line: rgba(255, 255, 255, 0.08);
    --line-strong: rgba(255, 255, 255, 0.15);
    --ink: #E8EEF4;
    --ink-dim: #93A0B2;
    --steel: #647085;
    --brand: #00AADD;
    --brand-bright: #29CBF2;
    --brand-deep: #0084AB;
    --online: #3FD07A;
    --warn: #F2B33A;
    --hazard: #FF5A24;
    --danger: #E5544B;
    --grid: rgba(120, 190, 230, 0.028);
    --ssm-text-inverted-colour: #04222E;
}
```

(The `:root[data-theme="light"]` case needs no override block — light is the `:root` default from Step 1, and `:not([data-theme="light"])` stops the OS-dark rule from fighting an explicit light choice.)

- [ ] **Step 3: Remove the old dark-mode body background image**

The old dark block set a Satisfactory presskit `background-image` on `body`. The redesign uses a flat gunmetal ground, so it must not return. Confirm the replacement in Step 2 contains no `background-image` rule. Leave the `.offcanvas` and `.badge` rules (old lines 103–114) intact below.

- [ ] **Step 4: Rebuild and verify dark theme**

Run: `make cleancss && make run`
Open http://localhost:8083 with OS in dark mode. Expected: dashboard ground is near-black gunmetal `#0C1015`, cards are `#121822`, primary buttons/links are cyan `#00AADD`. No Satisfactory background image.

- [ ] **Step 5: Verify manual override**

In DevTools console: `document.documentElement.setAttribute('data-theme','light')`. Expected: page switches to the light paper palette immediately. Then `setAttribute('data-theme','dark')` → returns to gunmetal, regardless of OS setting.

- [ ] **Step 6: Commit**

```bash
git add static/css/master.css static/css/master.min.css
git commit -m "feat(ui): cyan/gunmetal palette tokens with data-theme support"
```

---

### Task 3: Bridge Bootstrap `--bs-*` variables to the tokens

**Files:**
- Modify: `static/css/master.css` (append a Bootstrap-bridge block after the token blocks, before the `.offcanvas` rules)

**Interfaces:**
- Consumes: theme tokens from Task 2.
- Produces: themed Bootstrap components (buttons, cards, tables, tabs, forms, dropdowns) site-wide.

- [ ] **Step 1: Append the bridge block**

```css
/* ---- Bootstrap variable bridge ---- */
:root {
    --bs-body-bg: var(--void);
    --bs-body-color: var(--ink);
    --bs-emphasis-color: var(--ink);
    --bs-secondary-bg: var(--panel);
    --bs-tertiary-bg: var(--panel-2);
    --bs-border-color: var(--line);
    --bs-border-color-translucent: var(--line);

    --bs-primary: var(--brand);
    --bs-primary-rgb: 0, 170, 221;
    --bs-link-color: var(--brand);
    --bs-link-color-rgb: 0, 170, 221;
    --bs-link-hover-color: var(--brand-bright);

    --bs-body-font-family: var(--sans);
}
.card {
    --bs-card-bg: var(--panel);
    --bs-card-cap-bg: var(--panel-2);
    --bs-card-border-color: var(--line);
    --bs-card-color: var(--ink);
}
.table {
    --bs-table-bg: transparent;
    --bs-table-color: var(--ink);
    --bs-table-border-color: var(--line);
    --bs-table-striped-bg: color-mix(in srgb, var(--panel-2) 60%, transparent);
    --bs-table-striped-color: var(--ink);
}
.nav-tabs {
    --bs-nav-tabs-border-color: var(--line);
    --bs-nav-tabs-link-active-bg: var(--panel);
    --bs-nav-tabs-link-active-color: var(--brand);
    --bs-nav-tabs-link-active-border-color: var(--line) var(--line) var(--panel);
}
.form-control, .form-select {
    background-color: var(--panel-2);
    color: var(--ink);
    border-color: var(--line);
}
.form-control:focus, .form-select:focus {
    background-color: var(--panel-2);
    color: var(--ink);
    border-color: var(--brand);
    box-shadow: 0 0 0 0.2rem var(--focus);
}
.dropdown-menu {
    --bs-dropdown-bg: var(--panel);
    --bs-dropdown-color: var(--ink);
    --bs-dropdown-border-color: var(--line);
    --bs-dropdown-link-color: var(--ink);
    --bs-dropdown-link-hover-bg: var(--panel-2);
    --bs-dropdown-link-hover-color: var(--ink);
}
.btn-primary {
    --bs-btn-bg: var(--brand);
    --bs-btn-border-color: var(--brand-deep);
    --bs-btn-hover-bg: var(--brand-bright);
    --bs-btn-hover-border-color: var(--brand);
    --bs-btn-active-bg: var(--brand-deep);
    --bs-btn-color: #04222E;
    --bs-btn-hover-color: #04222E;
}
```

- [ ] **Step 2: Rebuild**

Run: `make cleancss && make build`
Expected: succeeds, no errors.

- [ ] **Step 3: Verify Bootstrap components**

Run `make run`, open the Servers page (`/dashboard/servers`). Expected: the "Create New Server" `.btn-success`/`.btn-primary`, card headers, `.form-control` search box, and the filter `.dropdown-menu` all render in the new palette (cyan primary, gunmetal panels) in dark mode. Open the Account page and confirm any `.table` uses token colors.

- [ ] **Step 4: Commit**

```bash
git add static/css/master.css static/css/master.min.css
git commit -m "feat(ui): bridge Bootstrap variables to design tokens"
```

---

### Task 4: Add component primitives to `main.css`

**Files:**
- Modify: `static/css/main.css` (append a clearly-delimited "design-system primitives" section at end of file)

**Interfaces:**
- Consumes: theme tokens from Task 2.
- Produces: classes `.mono`, `.display`, `.eyebrow`, `.section-head` (+ `.rule`, `.meta`), `.status-lamp` (+ `.on/.run/.off/.pulse`), `.seg-meter` (+ `.seg-fill`, `.warn/.crit`), `.readout` (+ `.k/.v`), `.status-rail` (host class + `.online/.offline`), `.tag` (+ `.ok/.no/.upd/.exp`). Consumed by Phases 1–5.

- [ ] **Step 1: Append the primitives block to `static/css/main.css`**

```css
/* ============================================================
   Design-system primitives (Phase 0)
   ============================================================ */
.mono { font-family: var(--mono); font-variant-numeric: tabular-nums; }
.display { font-family: var(--display); font-style: italic; text-transform: uppercase; letter-spacing: 0.03em; font-weight: 700; }

/* section eyebrow: mono // label + hairline rule + optional right meta */
.section-head { display: flex; align-items: center; gap: 14px; margin: 26px 0 14px; }
.section-head .eyebrow { font-family: var(--mono); font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--ink-dim); white-space: nowrap; }
.section-head .rule { flex: 1; height: 1px; background: var(--line); }
.section-head .meta { font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; color: var(--steel); }

/* status lamp */
.status-lamp { display: inline-block; width: 9px; height: 9px; border-radius: 50%; flex: 0 0 auto; background: var(--steel); }
.status-lamp.on  { background: var(--online); box-shadow: 0 0 8px color-mix(in srgb, var(--online) 75%, transparent); }
.status-lamp.run { background: var(--brand-bright); box-shadow: 0 0 8px color-mix(in srgb, var(--brand-bright) 75%, transparent); }
.status-lamp.off { background: var(--danger); opacity: 0.8; }

/* segmented LED meter */
.seg-meter { position: relative; height: 16px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 2px; overflow: hidden; }
.seg-meter .seg-fill { height: 100%; width: 0; background: var(--online); transition: width 1s cubic-bezier(.2,.7,.2,1); }
.seg-meter .seg-fill.warn { background: var(--warn); }
.seg-meter .seg-fill.crit { background: var(--hazard); }
.seg-meter::after { content: ""; position: absolute; inset: 0; pointer-events: none; background-image: repeating-linear-gradient(90deg, transparent 0 8px, var(--panel) 8px 10px); }

/* readout tile */
.readout { background: var(--panel-2); border: 1px solid var(--line); border-radius: 3px; padding: 9px 11px; }
.readout .k { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--steel); }
.readout .v { font-family: var(--mono); font-size: 15px; font-weight: 700; margin-top: 3px; font-variant-numeric: tabular-nums; }

/* left status rail on a card-like host */
.status-rail { position: relative; }
.status-rail::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 3px 0 0 3px; background: var(--steel); }
.status-rail.online::before  { background: var(--online); box-shadow: 0 0 14px color-mix(in srgb, var(--online) 55%, transparent); }
.status-rail.offline::before { background: var(--danger); opacity: 0.55; }

/* mono tag chip */
.tag { font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-dim); background: var(--panel-2); border: 1px solid var(--line); border-radius: 2px; padding: 4px 9px; display: inline-flex; align-items: center; gap: 6px; }
.tag.ok  { color: var(--online); border-color: color-mix(in srgb, var(--online) 30%, var(--line)); }
.tag.no  { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 30%, var(--line)); }
.tag.upd { color: var(--brand-bright); border-color: color-mix(in srgb, var(--brand) 40%, var(--line)); }
.tag.exp { color: var(--warn); }

@keyframes ssm-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.status-lamp.pulse { animation: ssm-pulse 1.8s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
    .status-lamp.pulse { animation: none; }
    .seg-meter .seg-fill { transition: none; }
}
```

- [ ] **Step 2: Rebuild**

Run: `make cleancss && make build`
Expected: succeeds.

- [ ] **Step 3: Verify primitives render**

Temporarily paste this into any dashboard page body (e.g. top of `templates/pages/dashboard/servers.tmpl` inside `.container-fluid`), run `make run`, view the page:

```html
<div class="section-head"><span class="eyebrow">// primitive check</span><span class="rule"></span><span class="meta">demo</span></div>
<span class="status-lamp on"></span><span class="status-lamp run pulse"></span><span class="status-lamp off"></span>
<div class="seg-meter" style="max-width:200px"><div class="seg-fill" style="width:82%"></div></div>
<div class="readout" style="max-width:120px"><div class="k">CPU</div><div class="v">82%</div></div>
<span class="tag ok">✓ Installed</span><span class="tag upd">▲ update</span>
```

Expected: green/cyan/red lamps (cyan one pulsing), a segmented meter ~82% green, a readout tile, and two tag chips — all in token colors. **Remove the temporary markup after verifying** and rebuild.

- [ ] **Step 4: Commit**

```bash
git add static/css/main.css static/css/main.min.css
git commit -m "feat(ui): add design-system component primitives"
```

---

### Task 5: Theme-toggle module + no-flash init

**Files:**
- Modify: `src/client/app.js` (add and require a theme module)
- Create: `src/client/theme.js`
- Modify: `templates/includes/dashboard/head.tmpl` (inline pre-paint theme script in `<head>`)

**Interfaces:**
- Consumes: `data-theme` token behaviour from Task 2.
- Produces: global `window.SSMTheme.toggle()` and `window.SSMTheme.set(mode)`; a `[data-ssm-theme-toggle]` attribute that any button (added in Phase 1's topbar) can carry to become the toggle. Persists choice in `localStorage` key `ssm-theme`.

- [ ] **Step 1: Inspect `src/client/app.js` to learn its module style**

Run: `sed -n '1,30p' src/client/app.js`
Expected: shows whether it uses CommonJS `require(...)` (browserify). Assume `require` is available (browserify bundles it).

- [ ] **Step 2: Create `src/client/theme.js`**

```javascript
// Manual light/dark theme toggle, persisted to localStorage.
// data-theme on <html> overrides the OS prefers-color-scheme.
const KEY = "ssm-theme";

function apply(mode) {
    if (mode === "light" || mode === "dark") {
        document.documentElement.setAttribute("data-theme", mode);
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
}

function current() {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr) return attr;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function set(mode) {
    apply(mode);
    try { localStorage.setItem(KEY, mode); } catch (e) { /* ignore */ }
}

function toggle() {
    set(current() === "dark" ? "light" : "dark");
}

function init() {
    try {
        const saved = localStorage.getItem(KEY);
        if (saved) apply(saved);
    } catch (e) { /* ignore */ }
    document.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-ssm-theme-toggle]");
        if (btn) { e.preventDefault(); toggle(); }
    });
}

window.SSMTheme = { set: set, toggle: toggle, current: current };
module.exports = { init: init };
```

- [ ] **Step 3: Require and init it from `src/client/app.js`**

At the top of `src/client/app.js` add the require alongside the existing requires, and call `init()` on DOM ready. Add:

```javascript
const ssmTheme = require("./theme");
document.addEventListener("DOMContentLoaded", function () { ssmTheme.init(); });
```

(If `app.js` already has a `DOMContentLoaded` handler, add `ssmTheme.init();` inside it instead of adding a second listener.)

- [ ] **Step 4: Add a no-flash init script to `head.tmpl`**

To avoid a light→dark flash before `bundle.js` (which is `defer`) runs, add this **inline, non-deferred** script inside `<head>` in `templates/includes/dashboard/head.tmpl`, right after the opening `<head>` `<meta charset>` line:

```html
        <script>
            (function () {
                try {
                    var t = localStorage.getItem("ssm-theme");
                    if (t) document.documentElement.setAttribute("data-theme", t);
                } catch (e) {}
            })();
        </script>
```

- [ ] **Step 5: Rebuild the bundle and app**

Run: `make bundle && make build`
Expected: browserify writes `static/js/bundle.js` with no errors; build succeeds.

- [ ] **Step 6: Verify toggle + persistence**

Run `make run`, open the dashboard. In DevTools console run `window.SSMTheme.toggle()`. Expected: palette flips light/dark. Run it again → flips back. Set `window.SSMTheme.set('light')`, then reload the page. Expected: page loads in light with **no dark flash** (the head script applied it pre-paint). Confirm `localStorage.getItem('ssm-theme')` is `"light"`.

- [ ] **Step 7: Commit**

```bash
git add src/client/theme.js src/client/app.js static/js/bundle.js templates/includes/dashboard/head.tmpl
git commit -m "feat(ui): theme toggle module with persisted no-flash init"
```

---

## Self-Review

**Spec coverage (spec §5 Phase 0 bullets):**
- Rewrite master.css tokens both themes + data-theme → Task 2. ✓
- Bootstrap `--bs-*` bridge → Task 3. ✓
- `@font-face` for Exo 2 + `static/fonts/` → Task 1. ✓
- Primitives in main.css (status-lamp, seg-meter, readout, status-rail, tag, section-head, mono, display) → Task 4. ✓
- Theme-toggle module in app.js + localStorage → Task 5. ✓
- head.tmpl font preload → Task 1 Step 3; no-flash theme init → Task 5 Step 4. ✓

**Placeholder scan:** No TBD/TODO; every code step contains full CSS/JS. Font binaries are an explicit download step (Task 1 Step 1), not a placeholder.

**Type/name consistency:** Primitive class names used identically across the plan (`.seg-fill` inside `.seg-meter`; `.eyebrow/.rule/.meta` inside `.section-head`; `.status-lamp .on/.run/.off/.pulse`; `.status-rail .online/.offline`; `.tag .ok/.no/.upd/.exp`). Token names match the Global Constraints list verbatim. `window.SSMTheme` API (`set/toggle/current`) and `[data-ssm-theme-toggle]` hook are defined in Task 5 and referenced by Phase 1's topbar (documented in the interface block).

**Naming note for later phases:** Phase 1 topbar toggle button must carry `data-ssm-theme-toggle`; Phase 2 unit cards reuse `.status-rail`, `.seg-meter`, `.readout`, `.tag`, `.status-lamp`; Phase 1 sidebar uses `static/images/ssm_logo_new_256.svg`.
