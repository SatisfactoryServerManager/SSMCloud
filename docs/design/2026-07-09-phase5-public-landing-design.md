# Phase 5 — Public Landing "Mission Control" Design

**Date:** 2026-07-09
**Repo:** `ssmcloud-frontend`
**Status:** Approved design, ready for implementation planning
**Parent:** `2026-07-07-site-redesign-design.md` (§5 Phase 5) — this supersedes the
original one-paragraph Phase 5 scope with an expanded, approved design.

## 1. Goal

Rebuild the public landing page (`/`) as a **futuristic, interactive product tour** in
the SSM cyan control-console language: a cinematic scroll story over generated
Satisfactory-style imagery, with a **playable simulation of the dashboard** as the hero.

**Success:** the page reads as the same product as the redesigned dashboard, visitors
can "fly" a fake server from the hero, the page ships regardless of media-generation
budget, and no SEO/meta/function regresses.

## 2. Locked decisions

| Decision | Choice |
|---|---|
| Interactivity | **Both**: scroll-driven story + playable hero console |
| Media | **One hero video loop + 4 generated stills** (video is progressive enhancement) |
| Imagery style | **Game-faithful stylized** — original art *inspired by* Satisfactory (vibrant alien biomes, orange FICSIT-style machinery, conveyors, space-elevator silhouette); NOT game assets |
| Media source | Higgsfield connector; **stills first** (`nano_banana_2`, 2k, wide), then one image-to-video (Kling 3.0 Turbo, silent, ~6 s, 720p) **only if the 10-credit budget allows** |
| Asset approval | User approves each generated still/video before it is committed |
| Theme | **Dark-committed, single theme** — no toggle on public pages |
| JS architecture | New standalone vanilla-JS bundle `src/client/public.js` → `static/js/public.bundle.js` (browserify, added to `make bundle`); **no jQuery** (drop the vestigial jQuery CDN tag) |
| Bootstrap | Keep Bootstrap 5.2 CDN (grid + navbar collapse) per parent design |
| Page scope | Expanded story: hero + 4 scenes + CTA/footer (below) |
| Out of scope | Docs site, login/auth UI, backend, light theme |

## 3. Page structure — six scenes

1. **Nav** — console bar (from the approved artifact mockup): hex brand mark +
   "SSM *Cloud*" Exo 2 wordmark, mono-uppercase links Home / Discord / GitHub / Docs,
   ghost Log in + cyan Sign up. Preserve the `{{if .IsLoggedIn}}` Dashboard branch and
   the Bootstrap collapse toggler for mobile.
2. **S1 · Hero (full viewport)** — generated vista as a slow `<video autoplay muted
   loop playsinline>` behind the dark veil + blueprint grid; fallback/poster is the
   hero still with a slow CSS push-in (Ken Burns). Left column: eyebrow
   `// Satisfactory Server Manager`, display headline **"Mission control for your
   Satisfactory servers."**, lead copy, CTAs (*Sign up for free* → `/auth/login`,
   *Read the docs* → `/docs`), trust row (Free · Open source MIT · Discord community).
   Right column: the **playable console window** (§4).
3. **S2 · Fleet** — *"Your whole fleet on one screen."* Fleet summary tiles + a
   non-interactive unit-panel mock whose seg-meters fill when the scene scrolls into
   view. Backdrop: aerial mega-factory still.
4. **S3 · Control** — *"Saves, backups, and mods — handled."* Mini readout cards
   (save/backup) + a mod tag rack. Backdrop: foundry-interior still.
5. **S4 · Signals** — *"Know the moment it matters."* Terminal event feed that
   **types on line-by-line** when entering view; Discord / Webhooks / Email tags.
   Backdrop: night-biome-with-factory-lights still.
6. **S5 · CTA + footer** — open-source/MIT/Discord community block, large Sign-up CTA,
   slim mono footer keeping the existing copyright line
   (`© 2020–2025 Refined R&D · MIT License`).

## 4. Playable hero console (simulation spec)

An honest front-end simulation — a mono `SIM` tag sits in the window title bar.

- **State:** two units — `EU-Alpha` (initially running: CPU ~42 %, RAM ~78 %,
  12 players) and `US-Bravo` (initially offline). Fleet tiles (Servers / Online /
  Running / Offline) recompute from unit state.
- **Start:** lamp → cyan `run pulse`, status readout → *Running*, CPU/RAM ramp from 0
  toward per-unit targets over ~2 s with gentle ±3 % jitter thereafter, players tick
  up one at a time, feed logs `server.started`.
- **Stop:** meters wind down to 0 over ~1.5 s, players drain, lamp → red, feed logs
  `server.stopped`.
- **Kill:** instant drop to 0, brief hazard flash on the panel, feed logs
  `server.killed`.
- **Ambient:** while a unit runs, a random `player.joined` / `player.left` feed line
  every 6–12 s (bounded player count 0–24).
- **Buttons** are real `<button>`s with disabled states mirroring the dashboard rules
  (Start disabled while running; Stop/Kill disabled while stopped), keyboard-focusable.
- **Reduced motion:** no jitter, no pulse, transitions become instant state changes.
- Pure JS module (~150 lines), zero network calls.

## 5. Scroll system

- IntersectionObserver adds `.in` to each scene at ~25 % visibility (one-shot); CSS
  transitions do all animation: rise/fade for content, width transitions for
  seg-meter fills, staggered reveal for terminal lines.
- Backdrops: `background-attachment: fixed` cover images under per-scene veil
  gradients (same layering as the dashboard ground) — no JS parallax.
- All motion gated behind `prefers-reduced-motion`; with reduced motion, scenes render
  fully visible with no observers needed.
- **No-JS gate:** `public.js` adds a `js` class to `<html>` on startup; all
  hidden-until-reveal styles are scoped under `.js`, so without JS every scene renders
  fully visible by default.

## 6. Generated assets (10-credit budget)

| # | Asset | Prompt subject | Spec |
|---|---|---|---|
| 1 | `scene-hero` | Alien grasslands vista, massive orange/white modular factory, conveyor networks, space-elevator silhouette, dusk cyan sky | 21:9, 2k still — also the video poster |
| 2 | `scene-fleet` | Aerial view over a sprawling multi-tier factory complex, conveyor arteries, alien terrain horizon | 16:9, 2k still |
| 3 | `scene-control` | Foundry interior, molten-metal glow, pipes and lifts, industrial haze | 16:9, 2k still |
| 4 | `scene-signals` | Night biome, factory lit up with orange/cyan lights, beacon tower, starfield | 16:9, 2k still |
| 5 | `hero-loop` | Image-to-video from approved #1: slow push-in, drifting clouds, subtle conveyor motion; silent, ~6 s, 720p, loopable | **Only if credits remain** after stills |

Workflow: generate stills → user approves each → download into repo → attempt video
last. If video is unaffordable or rejected, the Ken Burns fallback ships and the
`<video>` slot remains wired for a future drop-in.

Storage: `static/images/public/scene-*.jpg` (compressed ≲300 KB each),
`static/videos/hero-loop.mp4` (≲5 MB). Preload tags in the head updated to match
(old `home_*.webp` preloads removed; those images become unused by the page).

## 7. Files

| File | Change |
|---|---|
| `templates/pages/public/index.tmpl` | Rewrite body as the six scenes; keep `<head>` SEO/meta/canonical; update preloads; drop jQuery CDN tag; add `public.bundle.js` script tag; keep Bootstrap 5.2 CSS+JS CDN |
| `templates/includes/public/navigation.tmpl` | Console restyle; preserve all links + `IsLoggedIn` branch + collapse toggler |
| `static/css/public.css` | Full rewrite in the console token language; self-contained `:root` token block copied from the master **dark** palette (public page does not load `master.css`); Exo 2 `@font-face` reusing `static/fonts/exo2-*.woff2` |
| `src/client/public.js` | **New**: scene observer + hero video guards (mobile / reduced-motion / Save-Data → poster) + console simulation |
| `Makefile` | Add `browserify src/client/public.js -o static/js/public.bundle.js` to `bundle` |
| `static/images/public/*`, `static/videos/*` | **New** generated assets |

Build: `make cleancss` after CSS edits, `make bundle` after JS edits (both artifacts
committed, matching repo convention).

## 8. Quality floor

Video suppressed (poster shown) on `max-width: 768px`, `prefers-reduced-motion`, and
`Save-Data`; visible keyboard focus on all interactive elements; scenes stack cleanly
on mobile with backdrops switching to `scroll` attachment (iOS `fixed` quirk); no
horizontal body scroll; meta description/canonical/HandheldFriendly preserved;
page works fully with JS disabled (scenes visible, console static, video absent).

## 9. Risks / notes

- **Credit budget (10, free plan):** stills ~1–2 credits each expected; video may not
  fit. Design ships without it by construction.
- **`background-attachment: fixed`** is ignored on iOS Safari — scenes fall back to
  `scroll` attachment via media query; acceptable.
- **Copyright:** all generated imagery is original inspired-by art; no Coffee Stain
  assets. The existing presskit images remain in use only on the dashboard side.
- **Bootstrap 5.2 vs 5.3 skew** (parent design risk): public page keeps its own CSS
  scope; the console tokens are self-contained so no `--bs-*` bridge is needed here
  beyond the navbar collapse behavior.
