# Phase 1 — Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the three shared dashboard-shell includes — sidebar (`nav.tmpl`), topbar (`page-header.tmpl`), footer (`footer.tmpl`) — plus the app-frame CSS, into the cyan control-console language, and wire the theme-toggle control into the topbar. This reskins the frame that wraps every authenticated page.

**Architecture:** The shell layout stays as-is (`#viewport` padding-left 250px, fixed `#sidebar`, `#content`, fixed `.page-footer`). We restyle it through the Phase 0 tokens/primitives, keep the Satisfactory presskit background but sink it behind a theme veil so it blends, and add a topbar toggle button carrying the `data-ssm-theme-toggle` hook from Phase 0.

**Tech Stack:** Go html/template, Bootstrap 5.3, plain CSS, FontAwesome icons, the `Makefile` build.

## Global Constraints

- **Depends on Phase 0** being merged (tokens, `--display`/`--mono`, primitives, `window.SSMTheme` + `[data-ssm-theme-toggle]` hook).
- **Branch:** `feature/ui-redesign`. **No automated tests** — verify by `make cleancss` + `make run`, loading the app on :8083.
- **Build:** `make cleancss` after CSS edits; `make build` to compile; do not hand-edit `*.min.css`.
- **Preserve behaviour:** keep every existing link/route (`/dashboard`, `/dashboard/servers`, `/dashboard/account`, `/dashboard/integrations`, `/docs`, `/auth/logout`, `/dashboard/profile`, account-switch dropdown), the `{{if eq .pageTitle ...}}active{{end}}` logic, the `data-bs-*` collapse/dropdown attributes, and the `#server-count` id.
- **Tokens/fonts:** `--rail --panel --panel-2 --line --line-strong --ink --ink-dim --steel --brand --brand-bright`, `--display`, `--mono`. Display headings use `var(--display)` italic uppercase; labels/counts use `var(--mono)`.
- **A11y:** visible focus on nav links, toggle, profile, logout; motion behind `prefers-reduced-motion`.

---

### Task 1: Flatten the body ground + base display type

**Files:**
- Modify: `static/css/main.css:6-16` (the `body` rule that sets the presskit background, and the `h5` rule)

**Interfaces:**
- Consumes: `--void`, `--grid`, `--ground-veil-top`, `--ground-veil-bot`, `--display`, `--sans` from Phase 0.
- Produces: a veiled-presskit app ground (Satisfactory photo sunk behind a theme scrim) with the faint blueprint grid on top; display font on headings.

- [ ] **Step 1: Replace the `body` background rule (main.css lines 6–12)**

Current:
```css
body {
    color: var(--ssm-text-colour);
    font-size: 16px;
    background: var(--ssm-bg-colour) url("/public/images/bgs/Presskit_1920x1080_NoLogo.webp") fixed 0 0;
    background-size: cover;
    background-repeat: no-repeat;
}
```
Replace with:
```css
body {
    color: var(--ink);
    font-size: 16px;
    font-family: var(--sans);
    /* Layered ground, top → bottom:
       1-2. blueprint grid
       3.   theme veil (high-alpha scrim, denser at the bottom) sinks the photo into the palette
       4.   the Satisfactory presskit, fixed, as faint atmospheric texture */
    background-color: var(--void);
    background-image:
        linear-gradient(var(--grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid) 1px, transparent 1px),
        linear-gradient(180deg, var(--ground-veil-top), var(--ground-veil-bot)),
        url("/public/images/bgs/Presskit_1920x1080_NoLogo.webp");
    background-size: 34px 34px, 34px 34px, cover, cover;
    background-position: 0 0, 0 0, center, center;
    background-repeat: repeat, repeat, no-repeat, no-repeat;
    background-attachment: fixed, fixed, fixed, fixed;
}
```

The veil tokens (`--ground-veil-top/-bot`, defined per theme in Phase 0) are the single tuning point: raise the alphas to sink the photo further into the palette, lower them to let more of the landscape through. Both themes use the same rule; only the veil color/alpha differs.

- [ ] **Step 2: Add a display-font rule for headings after the `body` rule**

Immediately after the `body` block, add:
```css
h1, h2, h3, h4, h5, h6 {
    font-family: var(--display);
    font-style: italic;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}
```
Leave the existing `h5 { margin: 4px 0; }` rule (main.css:14-16) in place below it.

- [ ] **Step 3: Rebuild**

Run: `make cleancss && make build`
Expected: succeeds.

- [ ] **Step 4: Verify**

`make run` → open `/dashboard`. Expected (dark): the Satisfactory presskit shows as a faint, near-black-tinted texture behind the panels — no bright/photographic patch competing with the UI — with the blueprint grid over it; page/card headings in Exo 2 italic uppercase. Toggle to light: same photo now sunk behind a pale paper scrim. In both, the background sits still while content scrolls (fixed). If the photo reads too strong or too washed, adjust `--ground-veil-*` in `master.css` and re-verify.

- [ ] **Step 5: Commit**
```bash
git add static/css/main.css static/css/main.min.css
git commit -m "feat(ui): flat token ground + display-font headings"
```

---

### Task 2: Restyle the sidebar

**Files:**
- Modify: `static/css/main.css:150-278` (the `#sidebar ...` block) and `:1004-1069` (mobile block)
- Modify: `templates/includes/dashboard/nav.tmpl` (add a footer status strip; keep existing structure/links)

**Interfaces:**
- Consumes: `--rail --panel-2 --ink --ink-dim --brand --mono --online`.
- Produces: the reskinned control-console sidebar. No new template contract.

- [ ] **Step 1: Replace the sidebar style block (main.css 150–278) with the console treatment**

Replace the entire run of `#sidebar` rules (from `/* Sidebar Styles */` through the `#viewport #sidebar .nav-item a span { ... }` rule ending at line 278) with:

```css
/* Sidebar Styles */
#sidebar {
    z-index: 1000;
    position: fixed;
    left: 250px;
    width: 250px;
    height: 100%;
    margin-left: -250px;
    overflow-y: auto;
    background: var(--rail);
    border-right: 1px solid var(--line);
}
#sidebar .navbar { padding: 0; margin: 0; height: 100%; }
#sidebar .navbar-header {
    text-align: center;
    display: block;
    width: 100%;
    padding: 20px 12px 16px;
    height: auto;
    border-bottom: 1px solid var(--line);
}
#sidebar .navbar-brand { margin: 0; padding: 0; width: 100%; }
#sidebar .navbar-brand img { width: 170px; max-width: 82%; height: auto; }
#sidebar .navbar-toggler {
    position: absolute; top: 18px; right: 12px;
    border-color: var(--line); background-color: var(--panel-2); color: var(--ink);
}
#sidebar .navbar-collapse { width: 100%; }
#sidebar .navbar-nav { width: 100%; height: 100%; padding: 12px 10px; }
#sidebar .nav-item { display: block; width: 100%; border-radius: 4px; margin: 2px 0; position: relative; }
#sidebar .nav-item.active,
#sidebar .nav-item.active:hover { background: var(--panel-2); }
#sidebar .nav-item.active::before {
    content: ""; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px;
    background: var(--brand); border-radius: 0 2px 2px 0;
    box-shadow: 0 0 10px color-mix(in srgb, var(--brand) 65%, transparent);
}
#sidebar .nav-item.active a,
#sidebar .nav-item.active:hover a { color: var(--ink); }
#sidebar .nav-item.active a svg,
#sidebar .nav-item.active a i { color: var(--brand); }
#sidebar .nav-item:hover { background-color: var(--panel-2); }
#sidebar .nav-item a {
    color: var(--ink-dim);
    font-family: var(--mono);
    font-size: 13px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 11px 14px;
    font-weight: 600;
    transition: none !important;
}
#sidebar .nav-item:hover a { color: var(--ink); }
#sidebar .nav-item.nav-item-bottom a { border: 0; }
#sidebar .nav-item a svg,
#sidebar .nav-item a i {
    margin-right: 12px; font-size: 17px; width: 17px; height: 17px; float: left; color: inherit;
}
#sidebar .nav-item .nav-link { display: flex; align-items: center; }
#viewport #sidebar .nav-item a span { font-size: 13px; line-height: 17px; display: inline-block; height: 17px; }
#sidebar .sidebar-status {
    padding: 12px 18px; border-top: 1px solid var(--line);
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--steel); display: flex; align-items: center; gap: 8px;
}
```

Note: the old `font-family: "hemihead"` on `.navbar-header` is intentionally dropped (unused/unloaded face).

- [ ] **Step 2: Add a status strip at the bottom of the sidebar nav in `nav.tmpl`**

In `templates/includes/dashboard/nav.tmpl`, immediately before the closing `</ul>` of `.navbar-nav` (after the Docs `nav-item-bottom` `<li>`), add:

```html
                <li class="sidebar-status">
                    <span class="status-lamp on"></span> All systems nominal
                </li>
```

- [ ] **Step 3: Rebuild + verify**

Run: `make cleancss && make run` → open `/dashboard/servers`. Expected: dark rail sidebar, logo at top on a bordered header, mono uppercase nav items, the **Servers** item highlighted with a cyan left rail and cyan icon, a green status lamp + "All systems nominal" pinned at the bottom.

- [ ] **Step 4: Commit**
```bash
git add static/css/main.css static/css/main.min.css templates/includes/dashboard/nav.tmpl
git commit -m "feat(ui): control-console sidebar"
```

---

### Task 3: Rebuild the topbar (page-header) + theme toggle

**Files:**
- Modify: `templates/includes/dashboard/page-header.tmpl` (restructure into eyebrow+title + actions incl. toggle)
- Modify: `static/css/main.css:296-334` (the `.page-header ...` rules)

**Interfaces:**
- Consumes: Phase 0 `window.SSMTheme` via `[data-ssm-theme-toggle]`, tokens, `--display`, `--mono`.
- Produces: the topbar. Keeps `#server-count`, profile dropdown, logout route.

- [ ] **Step 1: Replace the header markup in `page-header.tmpl`**

Replace the inner content of `<div class="row page-header">` (the whole `<div class="d-flex flex-column flex-lg-row align-items-center">` block) with:

```html
    <div class="d-flex flex-row align-items-center">
        <div class="crumb flex-grow-1">
            <span class="acct-eyebrow">{{.account.AccountName}}</span>
            <h3 class="crumb-title m-0">{{ .pageTitle }}</h3>
        </div>
        <div class="topbar-actions d-flex flex-row align-items-center">
            <div class="server-count-wrapper d-flex align-items-center me-2">
                <i class="fas fa-server me-2"></i>
                <span id="server-count">{{ len .agents }}</span>
            </div>
            <button type="button" class="topbar-icon me-2" data-ssm-theme-toggle aria-label="Toggle light/dark theme" title="Toggle theme">
                <i class="fa-solid fa-circle-half-stroke"></i>
            </button>
            <a href="/auth/logout" class="topbar-icon me-2 logout-btn" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="Log Out" aria-label="Log out">
                <i class="fa-solid fa-right-from-bracket"></i>
            </a>
            <div class="btn-group profile-btn-group" role="group" aria-label="Account menu">
                <a href="/dashboard/profile" class="btn w-100 d-flex align-items-center">
                    <img class="profile-image me-1" src="{{.user.ProfileImageUrl}}"/>
                    {{.user.Username}}
                </a>
                <div class="btn-group" role="group">
                    <button id="btnGroupDrop1" type="button" class="btn dropdown-toggle" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></button>
                    <ul class="dropdown-menu">
                        {{range .linkedAccounts}}
                            <li><a class="dropdown-item" href="/dashboard/account/switch?id={{.Id}}"><i class="fa-solid fa-building-shield me-2"></i> {{.AccountName}}</a></li>
                        {{end}}
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="/dashboard/account/create">Create Account</a></li>
                        <li><a class="dropdown-item" href="/dashboard/account/join">Join Account</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
```

- [ ] **Step 2: Replace the `.page-header` CSS (main.css 296–334)**

Replace from `.page-header {` through the `.page-header .profile-btn-group .btn { ... }` rule (ending line 334) with:

```css
.page-header {
    display: flex;
    align-items: center;
    padding: 14px 18px;
    background-color: color-mix(in srgb, var(--void) 80%, var(--panel));
    border-bottom: 1px solid var(--line);
    margin-bottom: 16px;
    box-shadow: none !important;
}
.page-header .crumb { min-width: 0; }
.page-header .crumb .acct-eyebrow {
    display: block; font-family: var(--mono); font-size: 10px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--steel);
}
.page-header .crumb-title {
    font-family: var(--display); font-style: italic; text-transform: uppercase;
    font-weight: 800; letter-spacing: 0.04em; color: var(--ink); line-height: 1; margin-top: 2px !important;
}
.page-header .server-count-wrapper {
    height: 38px; border: 1px solid var(--line); background: var(--panel-2);
    border-radius: 4px; padding: 0 12px; font-family: var(--mono); font-weight: 700; color: var(--ink);
}
.page-header .topbar-icon {
    width: 38px; height: 38px; display: grid; place-items: center;
    background: var(--panel-2); border: 1px solid var(--line); color: var(--ink-dim);
    border-radius: 4px; cursor: pointer; font-size: 15px; text-decoration: none;
}
.page-header .topbar-icon:hover { color: var(--ink); border-color: var(--line-strong); }
.page-header .topbar-icon:focus-visible,
.page-header .profile-btn-group:focus-within { outline: 2px solid var(--brand); outline-offset: 2px; }
.profile-btn-group {
    background-color: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow: hidden;
}
.profile-btn-group .profile-image { width: 28px; height: 28px; border-radius: 4px; }
.page-header .profile-btn-group .btn {
    background-color: transparent; color: var(--ink);
    font-family: var(--mono); font-size: 12px !important; height: 38px; font-weight: 600;
    line-height: 28px !important; border: 0;
}
```

- [ ] **Step 3: Rebuild + verify toggle**

Run: `make cleancss && make run` → open `/dashboard`. Expected: topbar shows a mono account eyebrow above the Exo 2 italic page title, a mono server-count chip, a half-circle theme-toggle icon, logout icon, and the profile dropdown. Click the toggle → theme flips light/dark and persists across reload (Phase 0 behaviour).

- [ ] **Step 4: Commit**
```bash
git add templates/includes/dashboard/page-header.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): control-console topbar with theme toggle"
```

---

### Task 4: Restyle the fixed footer

**Files:**
- Modify: `static/css/main.css:336-363` (the `.page-footer ...` rules)

**Interfaces:**
- Consumes: `--rail --line --steel --brand --mono`.
- Produces: minimal footer restyle. No template change.

- [ ] **Step 1: Replace the `.page-footer` rules (main.css 336–363)**

```css
.page-footer {
    position: fixed; bottom: 0; left: 0; width: 100%;
    background: var(--rail); color: var(--steel);
    border-top: 1px solid var(--line);
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
    font-weight: 400; height: 44px;
}
.page-footer .footer-copyright {
    position: absolute; left: 50%; bottom: 0; transform: translateX(-50%);
    width: 100%; line-height: 44px; padding: 0 !important;
}
.page-footer .footer-copyright a { color: var(--brand) !important; text-decoration: none; }
.page-footer .footer-copyright a:hover { color: var(--brand-bright) !important; }
```

Then adjust `#content { padding-bottom: 55px; }` (main.css:147) and `#viewport { ... }` are fine; only lower the footer height reference if content is clipped — verify in Step 2.

- [ ] **Step 2: Rebuild + verify**

Run: `make cleancss && make run`. Expected: slim dark footer with a mono copyright line and cyan link; no overlap with page content at the bottom of a long page (e.g. Servers). If content is clipped, set `#content { padding-bottom: 44px; }`.

- [ ] **Step 3: Commit**
```bash
git add static/css/main.css static/css/main.min.css
git commit -m "feat(ui): restyle fixed footer"
```

---

## Self-Review

**Spec coverage (spec §5 Phase 1):** sidebar with logo + mono items + active rail + footer lamp → Task 2 ✓; page-header → topbar with account/count/profile/logout/**theme toggle** → Task 3 ✓; footer restyle → Task 4 ✓; body-ground/veiled-presskit (discovered in main.css) → Task 1 ✓.

**Placeholder scan:** no TBD/TODO; all CSS/HTML given in full.

**Consistency:** `data-ssm-theme-toggle` matches the Phase 0 click hook exactly; `.status-lamp.on` matches the Phase 0 primitive; `#server-count`, `.profile-btn-group`, `.logout-btn`, `.server-count-wrapper` class/id names preserved from the original template so existing JS/tooltips keep working. Tokens match Phase 0 names verbatim.
