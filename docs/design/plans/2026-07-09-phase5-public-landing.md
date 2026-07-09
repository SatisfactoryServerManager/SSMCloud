# Phase 5 — Public Landing "Mission Control" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Task 1 is a controller/user task (interactive asset approval) — do not dispatch it to a subagent.**

**Goal:** Rebuild the public landing page as a dark, cinematic, six-scene scroll story in the console design language, with a playable hero console simulation and generated Satisfactory-style backdrops.

**Architecture:** Full rewrite of `public.css` (self-contained dark token block — the public page does not load `master.css`), rewrite of `index.tmpl` body as six scenes over veiled generated imagery, console restyle of the public nav, and a new vanilla-JS browserify bundle (`public.js` + `public-sim.js`) driving scroll reveals, hero-video guards, and the sim. Assets come from the Higgsfield connector with per-asset user approval, stills first, video only if the 10-credit budget allows.

**Tech Stack:** Go html/template, Bootstrap 5.2 CDN (grid + navbar collapse only), vanilla JS via browserify, FontAwesome **removed** from the public page (nothing uses it after the redesign), Exo 2 self-hosted.

## Global Constraints

- **Spec:** `docs/design/2026-07-09-phase5-public-landing-design.md`. Branch `feature/ui-redesign`.
- **Dark-committed, single theme.** No theme toggle, no light palette, no `data-theme` handling on public pages.
- **Static serving:** everything under `static/` is served at `/public/*` (e.g. `static/videos/hero-loop.mp4` → `/public/videos/hero-loop.mp4`). Fonts already exist at `static/fonts/exo2-latin-{600-normal,700-italic}.woff2`.
- **Build:** CSS → `make cleancss`; JS → `make bundle`. Commit regenerated `public.min.css` / `public.bundle.js` with their sources. Do NOT run `make run` (long-running); visual verification is deferred to the user. Do NOT run any formatter on existing files.
- **Preserve:** nav links (`/`, `https://discord.gg/Vt8Rt2Vsqf`, `https://github.com/SatisfactoryServerManager/SSMCloud`, `/docs`), the `{{if .IsLoggedIn}}` Dashboard branch, `/auth/login` CTAs, head SEO (`<meta name="description">`, canonical `https://ssmcloud.hostxtra.co.uk`, viewport, HandheldFriendly), footer copyright line `© 2020 - 2025 Copyright: Refined R&D MIT License`.
- **Drop from the page:** jQuery CDN tag, bootswatch.min.css preload, FontAwesome JS/CSS tags, `logonbg.webp` + `home_*.webp` preloads. Keep the Bootstrap 5.2.3 CSS + bundle JS CDN tags (navbar collapse needs them).
- **No-JS gate:** `public.js` adds class `js` to `<html>`; every hidden-until-reveal style is scoped under `html.js` so the page renders fully without JS (video absent, console static).
- **Reduced motion:** all animation (Ken Burns, lamp pulse, meter jitter, reveals, type-on) disabled under `prefers-reduced-motion: reduce`.
- **Sim honesty:** the hero console shows a mono `SIM` tag; buttons follow dashboard rules (Start disabled while running, Stop/Kill disabled otherwise).
- **Media budget:** 10 Higgsfield credits, free plan. Stills first (user approves each before download/commit); video last and strictly optional — the page must ship without it.
- **Imagery is original "inspired-by" art** — evocative of Satisfactory (alien biomes, orange modular factories, conveyors, space elevator) but no game assets, logos, or trademarked names in prompts' output text.

---

### Task 1: Generate, approve, and commit media assets (CONTROLLER + USER — interactive)

**Files:**
- Create: `static/images/public/scene-hero.jpg`, `static/images/public/scene-fleet.jpg`, `static/images/public/scene-control.jpg`, `static/images/public/scene-signals.jpg`
- Create (optional): `static/videos/hero-loop.mp4`

**Interfaces:**
- Produces: the four backdrop paths above, consumed verbatim by Task 3's CSS, and the optional video consumed by Task 4's guard (`/public/videos/hero-loop.mp4`). If the video is not produced, later tasks change nothing — the JS `error` handler leaves the poster.

- [ ] **Step 1: Check budget** — call Higgsfield `balance`. Record credits. If < 4, stop and ask the user how to proceed (fewer stills vs. top-up).

- [ ] **Step 2: Generate the four stills one at a time** with `generate_image`, model `nano_banana_2`, resolution `2k`. Aspect: `21:9` for hero, `16:9` for the rest. After each generation, show it to the user (`job_display`) and get explicit approval before moving on; on rejection, refine the prompt and regenerate only if budget allows. Prompts:

1. `scene-hero` (21:9): "Vast alien grassland valley at dusk, enormous stylized orange-and-white modular factory complex with elevated conveyor belt networks, a towering space-elevator-like structure silhouetted on the horizon, teal-cyan sky with drifting clouds, vibrant stylized-realistic video-game concept art, wide establishing shot, no text, no characters"
2. `scene-fleet` (16:9): "Aerial view over a sprawling multi-tier stylized industrial factory complex on an alien planet, orange machinery and criss-crossing conveyor arteries, lush teal vegetation between structures, hazy horizon, stylized-realistic game concept art, no text, no characters"
3. `scene-control` (16:9): "Interior of a colossal stylized foundry, molten metal glow, heavy pipes and freight lifts, drifting industrial haze catching orange light, cool teal shadows, stylized-realistic game concept art, no text, no characters"
4. `scene-signals` (16:9): "Alien biome at night, a distant factory complex glowing with orange and cyan lights, a tall beacon tower blinking, starfield above dark rolling hills, stylized-realistic game concept art, tranquil, no text, no characters"

- [ ] **Step 3: Download approved stills into the repo.** For each approved asset URL: `curl -L -o static/images/public/scene-<name>.jpg "<url>"` (create the directory first: `mkdir -p static/images/public`).

- [ ] **Step 4: Compress to ≲300 KB each if oversized.** Check sizes (`ls -la static/images/public/`). If a file exceeds ~300 KB and `ffmpeg` is available: `ffmpeg -i scene-<name>.jpg -vf "scale=2560:-2" -q:v 7 scene-<name>-c.jpg && mv scene-<name>-c.jpg scene-<name>.jpg`. If ffmpeg is unavailable, commit the originals and note their sizes in the ledger (follow-up allowed).

- [ ] **Step 5: Attempt the hero video (optional).** Re-check `balance`. If enough credits remain for one video: import the approved hero still as a media reference (`media_import_url`), then `generate_video` with model `kling3_0_turbo` (check exact constraints first via `models_explore` action `get`), start_image = the hero still, duration 6, resolution 720p, prompt: "Slow cinematic push-in over the factory valley, clouds drifting, subtle conveyor motion, calm dusk light, seamless loopable motion, no text". Show the user; on approval `curl -L -o static/videos/hero-loop.mp4 "<url>"` (`mkdir -p static/videos`). If budget is insufficient or the result is rejected, skip — record the decision.

- [ ] **Step 6: Commit**
```bash
git add static/images/public static/videos 2>/dev/null; git add static/images/public
git commit -m "feat(ui): generated Satisfactory-style backdrops for public landing"
```

---

### Task 2: Public tokens, base, nav (public.css rewrite part 1 + navigation.tmpl)

**Files:**
- Rewrite: `static/css/public.css` (replace entire file)
- Rewrite: `templates/includes/public/navigation.tmpl`

**Interfaces:**
- Produces: the token block (`--void, --panel, --panel-2, --line, --line-strong, --ink, --ink-dim, --steel, --brand, --brand-bright, --brand-deep, --online, --warn, --hazard, --danger, --grid, --display, --sans, --mono, --btn-ink, --term-bg, --term-ink`), classes `.display`, `.mono`, `.eyebrow`, `.wrap`, `.btn`/`.btn.ghost`/`.btn.lg`, and the nav — all consumed by Task 3's markup and CSS.

- [ ] **Step 1: Replace the entire contents of `static/css/public.css`** with:

```css
/* SSM Cloud public landing — cyan control-console, dark-committed (Phase 5) */
@font-face {
    font-family: "Exo 2";
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url("/public/fonts/exo2-latin-600-normal.woff2") format("woff2");
}
@font-face {
    font-family: "Exo 2";
    font-style: italic;
    font-weight: 700;
    font-display: swap;
    src: url("/public/fonts/exo2-latin-700-italic.woff2") format("woff2");
}

:root {
    --display: "Exo 2", system-ui, "Segoe UI", sans-serif;
    --sans: system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --mono: ui-monospace, "Cascadia Mono", "Cascadia Code", Consolas, "SFMono-Regular", Menlo, monospace;
    --void: #0C1015;
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
    --btn-ink: #04222E;
    --term-bg: #05080C;
    --term-ink: #9FB2C4;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
    margin: 0;
    background-color: var(--void);
    background-image:
        linear-gradient(var(--grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--grid) 1px, transparent 1px);
    background-size: 34px 34px;
    color: var(--ink);
    font-family: var(--sans);
    font-size: 16px;
    line-height: 1.6;
}
a { color: var(--brand-bright); }
a:focus-visible, button:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }

.display {
    font-family: var(--display);
    font-style: italic;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.02em;
}
.mono { font-family: var(--mono); }
.wrap { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
.eyebrow {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--brand-bright);
}

/* buttons */
.btn2p {
    font-family: var(--mono); font-weight: 700; font-size: 11.5px; letter-spacing: 0.12em; text-transform: uppercase;
    border-radius: 3px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px;
    padding: 0 16px; height: 38px; border: 1px solid var(--brand-deep);
    background: var(--brand); color: var(--btn-ink); cursor: pointer;
}
.btn2p:hover { background: var(--brand-bright); color: var(--btn-ink); }
.btn2p.ghost { background: transparent; border-color: var(--line); color: var(--ink-dim); }
.btn2p.ghost:hover { border-color: var(--line-strong); color: var(--ink); background: var(--panel-2); }
.btn2p.lg { height: 46px; padding: 0 22px; font-size: 12.5px; }

/* nav */
.pnav {
    border-bottom: 1px solid var(--line);
    background: color-mix(in srgb, var(--panel) 82%, transparent);
    backdrop-filter: blur(6px);
    position: sticky; top: 0; z-index: 10;
}
.pnav .navbar { padding: 0; }
.pnav-in { display: flex; align-items: center; gap: 22px; min-height: 58px; width: 100%; }
.pbrand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--ink); }
.pbrand-mark {
    width: 30px; height: 30px; flex: 0 0 auto;
    background: var(--brand);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    display: grid; place-items: center;
}
.pbrand-mark span { font-family: var(--mono); font-weight: 700; font-size: 10px; color: var(--btn-ink); }
.pbrand-name { font-size: 16px; letter-spacing: 0.04em; }
.pbrand-name em { font-style: italic; color: var(--brand-bright); }
.pnav .navbar-nav { gap: 4px; }
.pnav .nav-link {
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--ink-dim); padding: 8px 10px; border-radius: 3px;
}
.pnav .nav-link:hover { color: var(--ink); background: var(--panel-2); }
.pnav-cta { margin-left: auto; display: flex; gap: 8px; align-items: center; }
.pnav .navbar-toggler { border: 1px solid var(--line); border-radius: 3px; }
.pnav .navbar-toggler-icon {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28147, 160, 178, 0.9%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e");
}
@media (max-width: 991px) {
    .pnav-cta { margin: 8px 0 12px; }
    .pnav-in { display: block; padding: 10px 0; }
    .pnav .navbar-collapse { border-top: 1px solid var(--line); margin-top: 10px; padding-top: 6px; }
    .pbrand { display: inline-flex; }
}
```

(Task 3 appends scene/console/footer CSS; class names here are prefixed `p`/`btn2p` to avoid colliding with Bootstrap's `.btn`/`.nav` utilities.)

- [ ] **Step 2: Replace `templates/includes/public/navigation.tmpl`** with:

```html
{{define "includes/public/nav"}}
<div class="pnav">
  <nav class="navbar navbar-expand-lg">
    <div class="wrap pnav-in">
      <a class="pbrand" href="/">
        <span class="pbrand-mark" aria-hidden="true"><span>SSM</span></span>
        <span class="pbrand-name display">SSM <em>Cloud</em></span>
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav">
          <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
          <li class="nav-item"><a class="nav-link" href="https://discord.gg/Vt8Rt2Vsqf">Discord</a></li>
          <li class="nav-item"><a class="nav-link" href="https://github.com/SatisfactoryServerManager/SSMCloud">GitHub</a></li>
          <li class="nav-item"><a class="nav-link" href="/docs">Docs</a></li>
        </ul>
        <div class="pnav-cta">
          {{if .IsLoggedIn}}
          <a class="btn2p" href="/dashboard">Dashboard</a>
          {{else}}
          <a class="btn2p ghost" href="/auth/login">Log in</a>
          <a class="btn2p" href="/auth/login">Sign up</a>
          {{end}}
        </div>
      </div>
    </div>
  </nav>
</div>
{{end}}
```

- [ ] **Step 3: Build + verify** — `make cleancss` exits 0 and regenerates `static/css/public.min.css`. (The page will look half-restyled until Task 3 — expected mid-phase state on the feature branch.)

- [ ] **Step 4: Commit**
```bash
git add static/css/public.css static/css/public.min.css templates/includes/public/navigation.tmpl
git commit -m "feat(ui): public tokens + console nav (phase 5)"
```

---

### Task 3: Six-scene page (index.tmpl rewrite + scenes/console CSS append)

**Files:**
- Rewrite: `templates/pages/public/index.tmpl`
- Modify: `static/css/public.css` (append scenes/console/footer CSS)

**Interfaces:**
- Consumes: Task 2 classes; Task 1 asset paths.
- Produces: the DOM contract Task 4/5 JS relies on — `html` (js class target), `.scene` (observer targets), `#hero-video` (empty `<video>` with `poster`), `.hero` (gets `.video-on`), and the sim contract: `#sim`, `[data-unit="alpha"|"bravo"]`, per-unit `.lamp`, `.ro-status .v`, `.ro-players .v`, `.meter[data-m="cpu"|"ram"] .fill/.val`, `.op[data-act="start"|"stop"|"kill"]`, fleet tiles `#f-servers #f-online #f-running #f-offline`, feed `#sim-feed`.

- [ ] **Step 1: Replace the entire contents of `templates/pages/public/index.tmpl`** with:

```html
{{define "public/index.tmpl"}}
<!DOCTYPE html>
<html lang="en">
    <head>
        <title>SSM Cloud</title>

        <link
            href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"
            rel="stylesheet"
            integrity="sha384-rbsA2VBKQhggwzxH7pPCaAqO46MgnOM80zW1RWuH61DGLwZJEdK2Kadq2F9CUG65"
            crossorigin="anonymous"
        />

        <link rel="preload" href="/public/fonts/exo2-latin-700-italic.woff2" as="font" type="font/woff2" crossorigin />
        <link rel="preload" href="/public/images/public/scene-hero.jpg" as="image" />

        <meta
            name="description"
            content="Satisfactory Server Manager (SSM) offers a cloud solution to manage all your Satisfactory server in one place"
        />
        <link rel="canonical" href="https://ssmcloud.hostxtra.co.uk" />
        <link rel="stylesheet" href="/public/css/public.min.css" />
        <meta name="HandheldFriendly" content="True" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    </head>

    <body>
        {{ template "includes/public/nav" .}}

        <!-- S1 · Hero -->
        <header class="scene hero" id="s-hero">
            <video id="hero-video" muted loop playsinline preload="none" poster="/public/images/public/scene-hero.jpg" aria-hidden="true" tabindex="-1"></video>
            <div class="hero-veil"></div>
            <div class="wrap hero-grid">
                <div class="reveal">
                    <span class="eyebrow">// Satisfactory Server Manager</span>
                    <h1 class="display">Mission control for your <span class="hl">Satisfactory</span> servers.</h1>
                    <p class="lead-p">
                        Manage and monitor every Satisfactory server from one console. Player counts,
                        performance meters, saves, backups, and mods — whether you run one server for
                        friends or a fleet for a hosting provider.
                    </p>
                    <div class="hero-ctas">
                        <a class="btn2p lg" href="/auth/login">Sign up for free</a>
                        <a class="btn2p ghost lg" href="/docs">Read the docs</a>
                    </div>
                    <div class="trust">
                        <span><span class="lamp on"></span>Free to use</span>
                        <span><span class="lamp run"></span>Open source · MIT</span>
                        <span><span class="lamp on"></span>Discord community</span>
                    </div>
                </div>

                <div class="win reveal" id="sim">
                    <div class="win-bar">
                        <span class="win-dot"></span><span class="win-dot"></span><span class="win-dot"></span>
                        <span class="win-title">ssmcloud — dashboard</span>
                        <span class="win-sim mono">SIM</span>
                    </div>
                    <div class="win-bd">
                        <div class="fleet">
                            <div class="ftile"><div class="n" id="f-servers">2</div><div class="k">Servers</div></div>
                            <div class="ftile"><div class="n"><span class="lamp on"></span><span id="f-online">1</span></div><div class="k">Online</div></div>
                            <div class="ftile"><div class="n"><span class="lamp run pulse"></span><span id="f-running">1</span></div><div class="k">Running</div></div>
                            <div class="ftile"><div class="n"><span class="lamp off"></span><span id="f-offline">1</span></div><div class="k">Offline</div></div>
                        </div>
                        <div class="units">
                            <article class="unit" data-unit="alpha">
                                <div>
                                    <h3 class="unit-name"><span class="lamp run pulse"></span>EU-Alpha</h3>
                                    <span class="unit-code mono">unit 6839f2 · v1.0.180</span>
                                </div>
                                <div class="ro-row">
                                    <div class="ro ro-status"><div class="k">Status</div><div class="v cy">Running</div></div>
                                    <div class="ro ro-players"><div class="k">Players</div><div class="v">12</div></div>
                                    <div class="ro"><div class="k">Mods</div><div class="v gr">8</div></div>
                                </div>
                                <div class="meter" data-m="cpu"><span class="lbl mono">CPU</span><div class="track"><div class="fill" style="width:42%"></div></div><span class="val mono">42%</span></div>
                                <div class="meter" data-m="ram"><span class="lbl mono">RAM</span><div class="track"><div class="fill warn" style="width:78%"></div></div><span class="val mono warn">78%</span></div>
                                <div class="ops">
                                    <button type="button" class="op start" data-act="start" disabled>Start</button>
                                    <button type="button" class="op stop" data-act="stop">Stop</button>
                                    <button type="button" class="op kill" data-act="kill"><span>Kill</span></button>
                                </div>
                            </article>
                            <article class="unit offline" data-unit="bravo">
                                <div>
                                    <h3 class="unit-name"><span class="lamp off"></span>US-Bravo</h3>
                                    <span class="unit-code mono">unit 92c4d1 · v1.0.179</span>
                                </div>
                                <div class="ro-row">
                                    <div class="ro ro-status"><div class="k">Status</div><div class="v">Offline</div></div>
                                    <div class="ro ro-players"><div class="k">Players</div><div class="v">0</div></div>
                                    <div class="ro"><div class="k">Mods</div><div class="v gr">3</div></div>
                                </div>
                                <div class="meter" data-m="cpu"><span class="lbl mono">CPU</span><div class="track"><div class="fill" style="width:0%"></div></div><span class="val mono">0%</span></div>
                                <div class="meter" data-m="ram"><span class="lbl mono">RAM</span><div class="track"><div class="fill" style="width:0%"></div></div><span class="val mono">0%</span></div>
                                <div class="ops">
                                    <button type="button" class="op start" data-act="start">Start</button>
                                    <button type="button" class="op stop" data-act="stop" disabled>Stop</button>
                                    <button type="button" class="op kill" data-act="kill" disabled><span>Kill</span></button>
                                </div>
                            </article>
                        </div>
                        <div class="sim-feed mono" id="sim-feed" aria-live="polite"></div>
                    </div>
                </div>
            </div>
        </header>

        <!-- S2 · Fleet -->
        <section class="scene band" id="s-fleet" style="--bg: url('/public/images/public/scene-fleet.jpg')">
            <div class="wrap band-grid">
                <div class="reveal">
                    <span class="eyebrow">// Fleet</span>
                    <h2 class="display">Your whole fleet on one screen.</h2>
                    <p>
                        Every server renders as a unit panel — status lamp, player count, mod count,
                        and live CPU/RAM meters. Search, filter, and deploy new servers from one place.
                    </p>
                </div>
                <div class="reveal vis">
                    <div class="fleet">
                        <div class="ftile"><div class="n">6</div><div class="k">Servers</div></div>
                        <div class="ftile"><div class="n"><span class="lamp on"></span>5</div><div class="k">Online</div></div>
                        <div class="ftile"><div class="n"><span class="lamp run pulse"></span>4</div><div class="k">Running</div></div>
                        <div class="ftile"><div class="n"><span class="lamp off"></span>1</div><div class="k">Offline</div></div>
                    </div>
                    <article class="unit">
                        <div>
                            <h3 class="unit-name"><span class="lamp run pulse"></span>AU-Delta</h3>
                            <span class="unit-code mono">unit 41ab77 · v1.0.180</span>
                        </div>
                        <div class="meter"><span class="lbl mono">CPU</span><div class="track"><div class="fill m1"></div></div><span class="val mono">64%</span></div>
                        <div class="meter"><span class="lbl mono">RAM</span><div class="track"><div class="fill warn m2"></div></div><span class="val mono warn">81%</span></div>
                    </article>
                </div>
            </div>
        </section>

        <!-- S3 · Control -->
        <section class="scene band" id="s-control" style="--bg: url('/public/images/public/scene-control.jpg')">
            <div class="wrap band-grid rev">
                <div class="reveal vis">
                    <div class="minis">
                        <div class="ro mini"><div class="k">Save · latest</div><div class="v cy">CoolIsland_autosave_0.sav</div><div class="k">Today 11:42 · 4.2 MB</div></div>
                        <div class="ro mini"><div class="k">Backup</div><div class="v">backup-2026-07-09.tar.gz</div><div class="k">Nightly · kept 14 days</div></div>
                        <div class="ro mini"><div class="k">Mods</div><div class="v"><span class="ptag ok">Ficsit Farming</span> <span class="ptag ok">Refined Power</span> <span class="ptag upd">Daisy Chains</span></div><div class="k">1 update available</div></div>
                    </div>
                </div>
                <div class="reveal">
                    <span class="eyebrow">// Control</span>
                    <h2 class="display">Saves, backups, and mods — handled.</h2>
                    <p>
                        Upload and download save files, schedule backups, and install or update mods
                        from the Satisfactory Mod Repository, per server, without touching a shell.
                    </p>
                </div>
            </div>
        </section>

        <!-- S4 · Signals -->
        <section class="scene band" id="s-signals" style="--bg: url('/public/images/public/scene-signals.jpg')">
            <div class="wrap band-grid rev2">
                <div class="reveal vis">
                    <div class="term">
                        <p><span class="t">[12:01:44]</span> <span class="ev">player.joined</span>   EU-Alpha · xXPioneerXx        <span class="ok">→ discord sent</span></p>
                        <p><span class="t">[12:02:10]</span> <span class="ev">server.started</span>  US-Charlie                    <span class="ok">→ webhook 200</span></p>
                        <p><span class="t">[12:03:31]</span> <span class="ev">mod.updated</span>     EU-Alpha · Ficsit Farming     <span class="ok">→ discord sent</span></p>
                        <p><span class="t">[12:04:02]</span> <span class="ev">server.offline</span>  US-Bravo                      <span class="wr">→ email queued</span></p>
                        <p><span class="t">[12:04:11]</span> <span class="ev">player.left</span>     EU-Alpha · SpaceGiraffe       <span class="ok">→ webhook 200</span></p>
                    </div>
                </div>
                <div class="reveal">
                    <span class="eyebrow">// Integrations</span>
                    <h2 class="display">Know the moment it matters.</h2>
                    <p>
                        Stay informed about server updates, player activity, and shutdowns as they
                        happen. SSM Cloud sends real-time events to the services you already use —
                        no dashboard-watching required.
                    </p>
                    <div class="ptags">
                        <span class="ptag ok">Discord</span>
                        <span class="ptag ok">Webhooks</span>
                        <span class="ptag ok">Email</span>
                    </div>
                </div>
            </div>
        </section>

        <!-- S5 · CTA -->
        <section class="scene cta" id="s-cta">
            <div class="wrap reveal">
                <span class="eyebrow">// Open source</span>
                <h2 class="display">Built in the open. Free to run.</h2>
                <p>
                    SSM Cloud is MIT-licensed and built by the community, for the community.
                    Bring your first server online in minutes.
                </p>
                <div class="hero-ctas cta-ctas">
                    <a class="btn2p lg" href="/auth/login">Sign up for free</a>
                    <a class="btn2p ghost lg" href="https://discord.gg/Vt8Rt2Vsqf">Join the Discord</a>
                </div>
            </div>
        </section>

        <footer class="pfoot">
            <div class="wrap pfoot-in mono">
                <span>© 2020 - 2025 Copyright:
                    <a href="https://github.com/SatisfactoryServerManager/SSMCloud">Refined R&amp;D</a>
                    MIT License.
                </span>
                <span><a href="https://github.com/SatisfactoryServerManager/SSMCloud">GitHub</a> · <a href="https://discord.gg/Vt8Rt2Vsqf">Discord</a> · <a href="/docs">Docs</a></span>
            </div>
        </footer>

        <script
            src="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/js/bootstrap.bundle.min.js"
            integrity="sha384-kenU1KFdBIe4zVF0s0G1M5b4hcpxyD9F7jL+jjXkk+Q2h455rYXK/7HAuoJl+0I4"
            crossorigin="anonymous"
        ></script>
    </body>
</html>
{{ end }}
```

(No jQuery, no FontAwesome, no bootswatch, no old webp preloads. The `public.bundle.js` script tag is added in Task 4 with the bundle itself.)

- [ ] **Step 2: Append the scenes/console/footer CSS to `static/css/public.css`**:

```css
/* ---- scenes ---- */
.scene { position: relative; }
.band {
    border-top: 1px solid var(--line);
    padding: 96px 0;
    background-image: linear-gradient(rgba(12, 16, 21, 0.88), rgba(12, 16, 21, 0.94)), var(--bg);
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
}
.band-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 56px; align-items: center; }
.band h2 { font-size: clamp(24px, 3vw, 32px); line-height: 1.12; margin: 12px 0 16px; text-wrap: balance; }
.band p { color: var(--ink-dim); max-width: 56ch; margin: 0 0 14px; }

/* reveal (scoped under html.js so no-JS renders everything) */
html.js .reveal { opacity: 0; transform: translateY(22px); transition: opacity 0.7s ease, transform 0.7s ease; }
html.js .scene.in .reveal { opacity: 1; transform: none; }
html.js .scene.in .reveal.vis { transition-delay: 0.15s; }

/* hero */
.hero { overflow: hidden; padding: 88px 0 72px; }
#hero-video {
    position: absolute; inset: 0; width: 100%; height: 100%;
    object-fit: cover; z-index: -2;
    background: url("/public/images/public/scene-hero.jpg") center/cover no-repeat;
}
.hero-veil {
    position: absolute; inset: 0; z-index: -1;
    background: linear-gradient(rgba(12, 16, 21, 0.82), rgba(12, 16, 21, 0.95));
}
@media (prefers-reduced-motion: no-preference) {
    .hero:not(.video-on) #hero-video { animation: kenburns 28s ease-in-out infinite alternate; }
    @keyframes kenburns { from { transform: scale(1); } to { transform: scale(1.08) translateY(-1.5%); } }
}
.hero-grid { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 48px; align-items: center; }
.hero h1 { font-size: clamp(30px, 4.2vw, 46px); line-height: 1.08; margin: 14px 0 18px; text-wrap: balance; }
.hero h1 .hl { color: var(--brand-bright); }
.lead-p { color: var(--ink-dim); font-size: 16.5px; max-width: 52ch; margin: 0 0 26px; }
.hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 22px; }
.trust { display: flex; gap: 18px; flex-wrap: wrap; font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--steel); }
.trust span { display: inline-flex; align-items: center; gap: 7px; }

/* console window + sim */
.win { background: var(--panel); border: 1px solid var(--line-strong); border-radius: 6px; box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.55); overflow: hidden; }
.win-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid var(--line); background: var(--panel-2); }
.win-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--steel); opacity: 0.55; }
.win-title { margin-left: 8px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; color: var(--steel); }
.win-sim { margin-left: auto; font-size: 9px; font-weight: 700; letter-spacing: 0.16em; color: var(--warn); border: 1px solid color-mix(in srgb, var(--warn) 40%, var(--line)); border-radius: 2px; padding: 2px 6px; }
.win-bd { padding: 16px; }
.fleet { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
.ftile { background: var(--panel-2); border: 1px solid var(--line); border-radius: 3px; padding: 10px 12px; }
.ftile .n { font-family: var(--mono); font-size: 20px; font-weight: 700; line-height: 1.1; display: flex; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; }
.ftile .k { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--steel); }
.lamp { width: 8px; height: 8px; border-radius: 50%; flex: 0 0 auto; display: inline-block; }
.lamp.on  { background: var(--online); box-shadow: 0 0 8px color-mix(in srgb, var(--online) 60%, transparent); }
.lamp.run { background: var(--brand-bright); box-shadow: 0 0 8px color-mix(in srgb, var(--brand-bright) 60%, transparent); }
.lamp.off { background: var(--danger); box-shadow: 0 0 8px color-mix(in srgb, var(--danger) 55%, transparent); }
@media (prefers-reduced-motion: no-preference) {
    .lamp.pulse { animation: pulse 2.2s ease-in-out infinite; }
    @keyframes pulse { 50% { opacity: 0.45; } }
}
.units { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.unit { position: relative; background: var(--panel-2); border: 1px solid var(--line); border-radius: 3px; padding: 12px 12px 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.unit::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--online); }
.unit.offline::before { background: var(--danger); }
.unit.flash { animation: flash 0.6s ease; }
@keyframes flash { 0%, 100% { box-shadow: none; } 40% { box-shadow: 0 0 0 2px var(--hazard) inset; } }
.unit-name { font-family: var(--display); font-style: italic; font-weight: 700; text-transform: uppercase; font-size: 13.5px; letter-spacing: 0.02em; display: flex; align-items: center; gap: 8px; margin: 0; }
.unit-code { font-size: 10px; letter-spacing: 0.1em; color: var(--steel); }
.ro-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.ro { background: var(--panel); border: 1px solid var(--line); border-radius: 3px; padding: 6px 8px; }
.ro .k { font-family: var(--mono); font-size: 8.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--steel); }
.ro .v { font-family: var(--mono); font-size: 12px; font-weight: 700; overflow-wrap: anywhere; }
.ro .v.cy { color: var(--brand-bright); }
.ro .v.gr { color: var(--online); }
.meter { display: grid; grid-template-columns: 32px 1fr 40px; gap: 8px; align-items: center; }
.meter .lbl { font-size: 9.5px; letter-spacing: 0.12em; color: var(--ink-dim); }
.meter .val { font-size: 11px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; }
.meter .val.warn { color: var(--warn); }
.meter .val.crit { color: var(--hazard); }
.track { height: 8px; background: var(--panel); border: 1px solid var(--line); border-radius: 2px; position: relative; overflow: hidden; }
.fill { position: absolute; inset: 0; background: var(--online); transition: width 0.4s ease;
    -webkit-mask-image: repeating-linear-gradient(90deg, #000 0 6px, transparent 6px 8px);
            mask-image: repeating-linear-gradient(90deg, #000 0 6px, transparent 6px 8px); }
.fill.warn { background: var(--warn); }
.fill.crit { background: var(--hazard); }
html.js .scene.in .fill.m1 { width: 64%; } html.js .fill.m1 { width: 0; transition: width 1s ease 0.3s; }
html.js .scene.in .fill.m2 { width: 81%; } html.js .fill.m2 { width: 0; transition: width 1s ease 0.45s; }
html:not(.js) .fill.m1 { width: 64%; } html:not(.js) .fill.m2 { width: 81%; }
.ops { display: flex; gap: 6px; }
.op { flex: 1; height: 28px; border: 1px solid var(--line); border-radius: 3px; background: var(--panel); font-family: var(--mono); font-weight: 700; font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.op.start { color: var(--online); border-color: color-mix(in srgb, var(--online) 32%, var(--line)); }
.op.stop  { color: var(--warn);   border-color: color-mix(in srgb, var(--warn) 30%, var(--line)); }
.op.kill  { position: relative; overflow: hidden; border-color: color-mix(in srgb, var(--hazard) 45%, var(--line)); }
.op.kill::before { content: ""; position: absolute; inset: 0; opacity: 0.16; background: repeating-linear-gradient(-45deg, var(--hazard) 0 7px, transparent 7px 14px); }
.op.kill span { position: relative; }
.op:disabled { opacity: 0.38; cursor: not-allowed; }
.sim-feed { margin-top: 12px; font-size: 10.5px; line-height: 1.8; color: var(--term-ink); min-height: 18px; }
.sim-feed p { margin: 0; white-space: pre-wrap; }
.sim-feed .t { color: var(--steel); }
.sim-feed .ev { color: var(--brand-bright); }

/* S3 minis + tags */
.minis { display: flex; flex-direction: column; gap: 10px; }
.ro.mini { padding: 12px 14px; display: flex; flex-direction: column; gap: 4px; }
.ro.mini .v { font-size: 13px; }
.ptags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
.ptag { font-family: var(--mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; border: 1px solid var(--line-strong); border-radius: 2px; padding: 5px 10px; color: var(--ink-dim); background: var(--panel); display: inline-block; }
.ptag.ok { color: var(--online); border-color: color-mix(in srgb, var(--online) 40%, var(--line)); }
.ptag.upd { color: var(--warn); border-color: color-mix(in srgb, var(--warn) 40%, var(--line)); }

/* terminal (S4) with type-on */
.term { background: var(--term-bg); border: 1px solid var(--line-strong); border-radius: 4px; font-family: var(--mono); font-size: 12px; line-height: 1.85; color: var(--term-ink); padding: 14px 16px; overflow-x: auto; }
.term p { margin: 0; white-space: pre; }
.term .t { color: var(--steel); }
.term .ev { color: var(--brand-bright); }
.term .ok { color: var(--online); }
.term .wr { color: var(--warn); }
@media (prefers-reduced-motion: no-preference) {
    html.js .term p { max-width: 0; overflow: hidden; }
    html.js .scene.in .term p { max-width: 100%; transition: max-width 1.1s steps(34); }
    html.js .scene.in .term p:nth-child(2) { transition-delay: 0.5s; }
    html.js .scene.in .term p:nth-child(3) { transition-delay: 1s; }
    html.js .scene.in .term p:nth-child(4) { transition-delay: 1.5s; }
    html.js .scene.in .term p:nth-child(5) { transition-delay: 2s; }
}

/* S5 CTA + footer */
.cta { border-top: 1px solid var(--line); padding: 96px 0; text-align: center; }
.cta p { color: var(--ink-dim); max-width: 56ch; margin: 0 auto 24px; }
.cta h2 { font-size: clamp(26px, 3.4vw, 36px); margin: 12px 0 16px; }
.cta-ctas { justify-content: center; }
.pfoot { border-top: 1px solid var(--line); padding: 26px 0 34px; }
.pfoot-in { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; justify-content: space-between; font-size: 11px; letter-spacing: 0.08em; color: var(--steel); }
.pfoot a { color: var(--ink-dim); text-decoration: none; }
.pfoot a:hover { color: var(--brand-bright); }

/* responsive */
@media (max-width: 920px) {
    .hero-grid, .band-grid { grid-template-columns: 1fr; gap: 36px; }
    .band-grid.rev .vis, .band-grid.rev2 .vis { order: 1; }
    .units { grid-template-columns: 1fr; }
    .fleet { grid-template-columns: repeat(2, 1fr); }
    .hero { padding-top: 56px; }
}
@media (max-width: 768px) {
    .band { background-attachment: scroll; }
    #hero-video { display: none; }
    .hero { background: url("/public/images/public/scene-hero.jpg") center/cover no-repeat; }
}
@media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    html.js .reveal { opacity: 1; transform: none; transition: none; }
    html.js .fill.m1 { width: 64%; transition: none; }
    html.js .fill.m2 { width: 81%; transition: none; }
    .fill { transition: none; }
}
```

- [ ] **Step 3: Build + verify** — `make cleancss` exits 0. Sanity-check template syntax: `go build ./...` exits 0 (templates are embedded/parsed at startup; the build at least catches file-level mistakes — full parse check happens on the user's `make run`).

- [ ] **Step 4: Commit**
```bash
git add templates/pages/public/index.tmpl static/css/public.css static/css/public.min.css
git commit -m "feat(ui): six-scene public landing over generated backdrops"
```

---

### Task 4: public.js — no-JS gate, scroll reveals, hero-video guards, bundle wiring

**Files:**
- Create: `src/client/public.js`
- Modify: `Makefile` (bundle target)
- Modify: `templates/pages/public/index.tmpl` (add the bundle script tag)

**Interfaces:**
- Consumes: DOM contract from Task 3 (`.scene`, `#hero-video`, `.hero`).
- Produces: `require("./public-sim").init()` call site — Task 5 must export `init()` from `src/client/public-sim.js`. Until Task 5 lands, this task creates a stub `public-sim.js` exporting a no-op `init`.

- [ ] **Step 1: Create `src/client/public.js`**:

```javascript
// SSM Cloud public landing: no-JS gate, scene reveals, hero video, sim boot.
document.documentElement.classList.add("js");

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initReveal() {
    var scenes = document.querySelectorAll(".scene");
    if (reducedMotion || !("IntersectionObserver" in window)) {
        scenes.forEach(function (s) { s.classList.add("in"); });
        return;
    }
    var io = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add("in");
                    io.unobserve(e.target);
                }
            });
        },
        { threshold: 0.25 }
    );
    scenes.forEach(function (s) { io.observe(s); });
}

function initVideo() {
    var video = document.getElementById("hero-video");
    var hero = document.querySelector(".hero");
    if (!video || !hero) return;
    var wide = window.matchMedia("(min-width: 769px)").matches;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (!wide || reducedMotion || saveData) return;

    var src = document.createElement("source");
    src.src = "/public/videos/hero-loop.mp4";
    src.type = "video/mp4";
    video.addEventListener("canplay", function () {
        hero.classList.add("video-on");
        video.play().catch(function () {});
    });
    video.addEventListener("error", function () {
        hero.classList.remove("video-on");
    }, true);
    video.appendChild(src);
    video.load();
}

initReveal();
initVideo();
require("./public-sim").init();
```

- [ ] **Step 2: Create the stub `src/client/public-sim.js`** (replaced by Task 5):

```javascript
// Hero console simulation — implemented in Phase 5 Task 5.
module.exports = { init: function () {} };
```

- [ ] **Step 3: Add the bundle line to the Makefile.** In the `bundle:` target, after the `map.bundle.js` line, add:

```makefile
	browserify src/client/public.js -o static/js/public.bundle.js
```

(Tab-indented, like the existing lines.)

- [ ] **Step 4: Add the script tag to `templates/pages/public/index.tmpl`.** Immediately after the Bootstrap bundle `<script>` tag, add:

```html
        <script defer src="/public/js/public.bundle.js"></script>
```

- [ ] **Step 5: Build + verify** — `make bundle` exits 0 and produces `static/js/public.bundle.js`.

- [ ] **Step 6: Commit**
```bash
git add src/client/public.js src/client/public-sim.js Makefile templates/pages/public/index.tmpl static/js/public.bundle.js
git commit -m "feat(ui): public bundle with scene reveals + hero video guards"
```

---

### Task 5: Hero console simulation

**Files:**
- Rewrite: `src/client/public-sim.js` (replace the stub)

**Interfaces:**
- Consumes: the Task 3 DOM contract inside `#sim` (see below) and Task 4's `init()` call.
- Produces: `module.exports = { init }`.

DOM contract (from Task 3): units `#sim [data-unit="alpha"|"bravo"]`; per unit: `.lamp` (first in `.unit-name`), `.ro-status .v`, `.ro-players .v`, `.meter[data-m="cpu"] .fill/.val`, `.meter[data-m="ram"] .fill/.val`, buttons `.op[data-act="start"|"stop"|"kill"]`; fleet counters `#f-online`, `#f-running`, `#f-offline` (`#f-servers` is static); feed container `#sim-feed`.

- [ ] **Step 1: Replace `src/client/public-sim.js`** with:

```javascript
// Playable hero console: a small, honest front-end simulation of the dashboard.
// No network. Buttons follow dashboard rules (start disabled while running, etc).

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

var NAMES = ["xXPioneerXx", "SpaceGiraffe", "FicsitFan", "NuclearNelly", "BeltWizard", "CoalRoller"];

var units = {
    alpha: { el: null, status: "running", cpu: 42, ram: 78, players: 12, cpuT: 42, ramT: 78 },
    bravo: { el: null, status: "offline", cpu: 0, ram: 0, players: 0, cpuT: 46, ramT: 64 },
};

function feed(ev, detail) {
    var box = document.getElementById("sim-feed");
    if (!box) return;
    var d = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var ts = "[" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + "]";
    var p = document.createElement("p");
    p.innerHTML = '<span class="t">' + ts + '</span> <span class="ev">' + ev + "</span>  " + detail;
    box.insertBefore(p, box.firstChild);
    while (box.children.length > 4) box.removeChild(box.lastChild);
}

function setMeter(u, kind, value) {
    var m = u.el.querySelector('.meter[data-m="' + kind + '"]');
    var fill = m.querySelector(".fill");
    var val = m.querySelector(".val");
    var v = Math.round(value);
    fill.style.width = v + "%";
    val.textContent = v + "%";
    fill.classList.toggle("warn", v >= 75 && v < 90);
    fill.classList.toggle("crit", v >= 90);
    val.classList.toggle("warn", v >= 75 && v < 90);
    val.classList.toggle("crit", v >= 90);
}

function render(key) {
    var u = units[key];
    var lamp = u.el.querySelector(".unit-name .lamp");
    var status = u.el.querySelector(".ro-status .v");
    var players = u.el.querySelector(".ro-players .v");
    var running = u.status === "running";
    var offline = u.status === "offline";

    lamp.className = "lamp " + (offline ? "off" : running ? (reducedMotion ? "run" : "run pulse") : "on");
    u.el.classList.toggle("offline", offline);
    status.textContent = offline ? "Offline" : running ? "Running" : "Online";
    status.className = "v" + (running ? " cy" : "");
    players.textContent = u.players;
    setMeter(u, "cpu", u.cpu);
    setMeter(u, "ram", u.ram);

    u.el.querySelector('[data-act="start"]').disabled = running;
    u.el.querySelector('[data-act="stop"]').disabled = !running;
    u.el.querySelector('[data-act="kill"]').disabled = !running;

    var online = 0, run = 0;
    Object.keys(units).forEach(function (k) {
        if (units[k].status !== "offline") online++;
        if (units[k].status === "running") run++;
    });
    document.getElementById("f-online").textContent = online;
    document.getElementById("f-running").textContent = run;
    document.getElementById("f-offline").textContent = 2 - online;
}

function act(key, action) {
    var u = units[key];
    var name = key === "alpha" ? "EU-Alpha" : "US-Bravo";
    if (action === "start" && u.status !== "running") {
        u.status = "running";
        if (reducedMotion) { u.cpu = u.cpuT; u.ram = u.ramT; }
        feed("server.started", name);
    } else if (action === "stop" && u.status === "running") {
        u.status = "stopped";
        u.players = 0;
        if (reducedMotion) { u.cpu = 0; u.ram = 0; }
        feed("server.stopped", name);
    } else if (action === "kill" && u.status === "running") {
        u.status = "stopped";
        u.players = 0;
        u.cpu = 0;
        u.ram = 0;
        if (!reducedMotion) {
            u.el.classList.add("flash");
            setTimeout(function () { u.el.classList.remove("flash"); }, 650);
        }
        feed("server.killed", name);
    }
    render(key);
}

function tick() {
    Object.keys(units).forEach(function (key) {
        var u = units[key];
        var running = u.status === "running";
        var ct = running ? u.cpuT : 0;
        var rt = running ? u.ramT : 0;

        if (!reducedMotion) {
            u.cpu += (ct - u.cpu) * 0.16;
            u.ram += (rt - u.ram) * 0.16;
            if (running && Math.abs(ct - u.cpu) < 2) u.cpu = ct + (Math.random() * 6 - 3);
            if (running && Math.abs(rt - u.ram) < 2) u.ram = rt + (Math.random() * 6 - 3);
            u.cpu = Math.max(0, Math.min(99, u.cpu));
            u.ram = Math.max(0, Math.min(99, u.ram));
        }

        if (running && Math.random() < 0.06) {
            var name = key === "alpha" ? "EU-Alpha" : "US-Bravo";
            var who = NAMES[Math.floor(Math.random() * NAMES.length)];
            if (u.players <= 0 || (Math.random() < 0.6 && u.players < 24)) {
                u.players++;
                feed("player.joined", name + " · " + who);
            } else {
                u.players--;
                feed("player.left", name + " · " + who);
            }
        }
        render(key);
    });
}

function init() {
    var sim = document.getElementById("sim");
    if (!sim) return;
    Object.keys(units).forEach(function (key) {
        units[key].el = sim.querySelector('[data-unit="' + key + '"]');
    });
    sim.addEventListener("click", function (e) {
        var btn = e.target.closest(".op[data-act]");
        if (!btn || btn.disabled) return;
        var unit = btn.closest("[data-unit]");
        if (!unit) return;
        act(unit.getAttribute("data-unit"), btn.getAttribute("data-act"));
    });
    Object.keys(units).forEach(render);
    setInterval(tick, 500);
}

module.exports = { init: init };
```

- [ ] **Step 2: Build + verify** — `make bundle` exits 0; `static/js/public.bundle.js` regenerated and contains the sim (`grep -c "server.killed" static/js/public.bundle.js` ≥ 1).

- [ ] **Step 3: Commit**
```bash
git add src/client/public-sim.js static/js/public.bundle.js
git commit -m "feat(ui): playable hero console simulation"
```

---

## Final verification (user, on :8083)

`make run` → `/`: hero video (or Ken Burns) behind the veil; Start/Stop/Kill drive the sim (meters ramp/jitter, players tick, feed logs, tiles recompute, kill flashes); scenes reveal on scroll; terminal types on; mobile: video off, backdrops scroll-attached, scenes stack; reduced-motion: everything static; JS disabled: full page visible, console static; nav collapse works; all links + `IsLoggedIn` branch intact.

## Self-Review

**Spec coverage:** §3 scenes 1–6 → Tasks 2 (nav) + 3 (S1–S5, footer) ✓; §4 sim → Task 5 (state machine, dashboard button rules, ambient events bounded 0–24, hazard flash, reduced-motion instant, SIM tag in Task 3 markup) ✓; §5 scroll (observer .in at 0.25, fixed-attachment backdrops, motion gates, no-JS gate) → Tasks 3–4 ✓; §6 assets + approval workflow + budget fallback → Task 1 ✓; §7 files (incl. Makefile line, jQuery/bootswatch/FA/preload removals) → Tasks 2–4 ✓; §8 quality floor (video guards incl. Save-Data, iOS scroll-attachment fallback, focus-visible, no-JS) → Tasks 3–4 ✓.

**Placeholder scan:** none — full CSS/markup/JS in every code step; Task 4's sim stub is an explicit interface seam replaced by Task 5, not a placeholder left behind.

**Type/name consistency:** `.btn2p`/`.ptag`/`.pnav`/`.pfoot` prefixed to avoid Bootstrap collisions and used consistently across Tasks 2–3; sim DOM contract (`#sim`, `data-unit`, `data-act`, `data-m`, `#f-*`, `#sim-feed`, `.ro-status/.ro-players`) identical in Task 3 markup and Task 5 JS; `public-sim` export `{ init }` matches Task 4's `require("./public-sim").init()`; asset paths in Task 1 (`static/images/public/scene-*.jpg`, `static/videos/hero-loop.mp4`) match Task 3 CSS (`/public/images/public/scene-*.jpg`) and Task 4 JS (`/public/videos/hero-loop.mp4`); `.reveal.vis` delay class present in both markup and CSS; `m1`/`m2` meter classes defined in CSS and used in S2 markup.

**Ordering:** Task 1 first (assets referenced by Task 3); Tasks 2→3 (CSS classes before markup); Task 4 before 5 (stub seam). Video absence is safe at every stage (JS `error` handler → poster).
