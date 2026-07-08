# Phase 3 — Single-Server Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the single-server detail page (`server.tmpl` + its 8 `includes/server/*` tabs) into the cyan control-console language: a persistent **command header**, a **vertical control sidebar** for section navigation, and console-styled panels for every tab — without breaking the Bootstrap tab mechanism, the websocket console, Chart.js stats, the Leaflet map, or any form/mods JS.

**Architecture:** The page keeps Bootstrap's tab plugin exactly as-is — the JS in `app.js` drives it through `.server-tabs-header .nav-tabs a` (`.tab("show")`, `shown.bs.tab`, `localStorage["ServerActiveTab"]`) with special `#map`→`agentMap.SetUpMap()` and `#stats`→`BuildAgentStats()` hooks. The redesign is therefore a **CSS + markup reskin**: the horizontal `.nav-tabs` becomes a vertical rack (same classes, same `href="#..."` anchors, same `.tab-pane` ids), a new always-visible `.cmd-head` sits above it carrying status + the console's Start/Stop/Kill buttons (which `server-console.js` delegates from `$("body")` by id, so they can live anywhere), and each tab's Bootstrap `card`/`bg-glass` markup is rebuilt from Phase-0 primitives + a small set of new Phase-3 components. Chart.js datasets in `server-console.js` are recolored to the semantic tokens; the map container is framed. No backend/gRPC change.

**Tech Stack:** Go html/template, Bootstrap 5.3 (tabs, offcanvas, tooltip, bootstrap-toggle), jQuery, browserify client JS (`server-console.js`, `agentmap.js`, `mods-page.js`, `app.js`), Chart.js, Leaflet, FontAwesome, the `Makefile`.

## Global Constraints

- **Depends on Phase 0 (primitives), Phase 1 (shell), Phase 2 (unit/op/readout/tag/section-head).** Branch `feature/ui-redesign`. One PR at the very end of the whole project — do **not** open a PR for this phase.
- **No automated tests** — verify with `make cleancss` (CSS), `make bundle` (JS) + `make run` on :8083 against a started, installed agent (and a never-started agent for the empty state).
- **Never hand-edit generated files:** `static/css/main.min.css` is produced by `make cleancss`; `static/js/bundle.js` by `make bundle`. Edit only `static/css/main.css`, `static/css/master.css`, and `src/client/*`. Commit the regenerated artifacts alongside their sources. Do not run a formatter over these files; keep edits surgical.
- **Git commits MUST OMIT the `Co-Authored-By: Claude` trailer** (user standing preference).
- **Keep the Bootstrap tab contract intact:** the nav container keeps classes `server-tabs-header` and `nav-tabs`; each nav item is an `<a class="nav-link" data-bs-toggle="tab" href="#<id>">`; each pane keeps `class="tab-pane fade"` + its id. Preserve the exact anchor `href`/pane ids: `#console`, `#settings`, `#installcommand`, `#map`, `#saves`, `#backups`, `#logs`, `#mods`. (These strings are persisted to `localStorage` and matched by JS.)
- **Preserve every JS/data hook exactly:**
  - Console (`server-console.js`): `.server-console` container (its presence gates the whole module); button ids `#server-console-start-btn`, `#server-console-stop-btn`, `#server-console-kill-btn` (delegated from `body`, toggled disabled by `onStatusUpdated`); canvas ids `cpuChart`, `ramChart`, `uptimeChart`.
  - Install (`app.js` `BuildAgentInstallCommands`): tab ids `#windows-install-agent`/`#linux-install-agent`, the `.server-install-command` container, and the `.docker` / `.standalone` target elements it writes into; `.copy-btn`; `window.agentName/agentMemory/agentPort/agentAPIKey` globals in the page `<script>` and `#inp_agent_id`.
  - Map (`agentmap.js`): `#playerMap` container (its presence gates the module); `window.agentMap.SetUpMap()` fires on `shown.bs.tab` for `#map`.
  - Settings: bootstrap-toggle inputs `data-toggle="toggle"` with ids `inp_updateonstart`, `inp_autorestart`, `inp_autoPause`, `inp_autoSaveOnDisconnect`, `inp_seasonalEvents`, `inp_sfbranch`; `#inp_autoSaveInterval`, `#inp_maxplayers` (range, mirrored to `#max-players-value` by `app.js`), `#inp_workerthreads`; hidden `_ConfigSetting` fields (`sfsettings`/`backupsettings`); buttons `#save-sf-settings`, `#save-backup-settings`, `#settings-dangerarea-installsf`, `.server-action-btn[data-server-action="install|update"]` + `data-agent-id`; `#ssmagent-copykey[data-key]` + `#ssmagent-shortkey` (tooltip); `{{ .csrfField }}`; `inp_backupinterval`, `inp_backupkeep`.
  - Saves: form `#save-upload-form` (`enctype`, action `/dashboard/servers/{{.agent.Id}}/saves`), `#inp-save-file`, `#btn-save-upload`, `{{ .csrfField }}`, `save-card` include.
  - Backups: `.backup-search` (filters `.backup-card` by `data-backupname` — `app.js`), `backup-card` include.
  - Logs: download anchors `/dashboard/download/log?agentid=…&logtype=Agent|FactoryGame`; `.log-viewer`; `displayLogLines` template func; `.agentLog`/`.gameLog` data.
  - Mods (`mods-page.js`): `.smm-metadata-file`, `.mod-list > .row`, `#mods-pagination` (+ `.mod-page/.mod-page-prev/.mod-page-next`), `#mods-sortby`, `#mod-count`, the offcanvas `#canvas-mods-filter` (+ `.mod-search`, `#check-not-installed/#check-installed/#check-needs-update`), `{{ .csrfField }}`.
- **Primitives consumed (defined earlier, do not redefine):** `.status-lamp(.on/.run/.off/.pulse)`, `.readout(.k/.v)(.blue/.orange/.green)`, `.status-rail(.online/.offline)`, `.tag(.ok/.no/.upd/.exp)`, `.section-head > .eyebrow/.rule/.meta`, `.op(.start/.stop/.kill)`, `.mono`, `.display`, `.deploy-btn`.
- **A11y:** icon-only controls need `aria-label`; visible keyboard focus; motion (running lamp) already gated by `prefers-reduced-motion` in Phase-0 primitives; new animated/scrolling regions must not introduce motion outside that gate. No horizontal body scroll — wide content (terminal, logs, map) scrolls inside its own container.
- **Reference mockup:** the approved interactive design artifact (`scratchpad/server-detail-redesign.html`) is the visual source of truth for layout, spacing, and the new component CSS. Exo 2 (display) and FontAwesome (icons) are the real faces on the live site; the mockup's system-font/Unicode fallbacks are not normative.

---

### Task 1: Server-detail shell — command header + vertical control sidebar

Rebuild `server.tmpl`'s installed-state layout: a persistent `.cmd-head` (status lamp + Exo 2 name + `server <id>` code + readout strip + Start/Stop/Kill ops) above a two-column `.console-grid` (vertical `.rack` sidebar nav + `.pane` content). The nav is the **same** `.server-tabs-header > ul.nav-tabs` restyled vertical; panes are unchanged wrappers that still `{{template}}` each include. This task establishes the chrome; the tab includes are reskinned in Tasks 2–8 (they keep working through the Bootstrap bridge in the meantime).

**Files:**
- Modify: `templates/pages/dashboard/server.tmpl`
- Modify: `static/css/main.css` (append a new "Server detail" section)

**Interfaces:**
- Consumes: Phase-0/2 primitives (`.status-lamp`, `.readout`, `.op`, `.section-head`).
- Produces: `.cmd-head`, `.console-grid`, `.rack`, `.rack-btn`, `.pane` classes reused by later tasks; the Start/Stop/Kill ops now carry the `#server-console-*` ids so `server-console.js` binds to them.

- [ ] **Step 1: Replace the `{{else}}` (installed) block of `server.tmpl` (current lines 81–136) with the command header + console grid**

Keep the `{{if not .agent.Config.Version}}` never-started branch untouched for now (Task 9 handles it). Replace only the installed layout:

```html
                    {{else}}
                        <div class="cmd-head {{if not .agent.Status.Online}}is-offline{{end}}">
                            <div class="cmd-top">
                                <div class="cmd-id">
                                    <h5 class="cmd-name">
                                        <span class="status-lamp {{if .agent.Status.Online}}{{if .agent.Status.Running}}run pulse{{else}}on{{end}}{{else}}off{{end}}"></span>
                                        {{.agent.AgentName}}
                                    </h5>
                                    <span class="cmd-code mono">server {{.agent.Id}}</span>
                                </div>
                                <div class="ops">
                                    <a id="server-console-start-btn" href="/dashboard/serveraction/start?id={{.agent.Id}}"><button class="op start server-action-btn" {{if .agent.Status.Running}}disabled{{end}}><i class="fas fa-play"></i> Start</button></a>
                                    <a id="server-console-stop-btn" href="/dashboard/serveraction/stop?id={{.agent.Id}}"><button class="op stop server-action-btn" {{if not .agent.Status.Running}}disabled{{end}}><i class="fas fa-stop"></i> Stop</button></a>
                                    <a id="server-console-kill-btn" href="/dashboard/serveraction/kill?id={{.agent.Id}}"><button class="op kill server-action-btn" {{if not .agent.Status.Running}}disabled{{end}}><span><i class="fas fa-skull-crossbones"></i> Kill</span></button></a>
                                </div>
                            </div>
                            <div class="cmd-readouts">
                                <div class="readout green"><div class="k">Status</div><div class="v">{{if .agent.Status.Running}}Running{{else if .agent.Status.Online}}Online{{else}}Offline{{end}}</div></div>
                                <div class="readout blue"><div class="k">Connection</div><div class="v">{{.agent.Config.IpAddress}}:{{.agent.Config.Port}}</div></div>
                                <div class="readout"><div class="k">Version</div><div class="v">{{.agent.Config.Version}}</div></div>
                                <div class="readout orange"><div class="k">SF Server</div><div class="v">{{.agent.Status.InstalledSfVersion}}</div></div>
                            </div>
                        </div>

                        <div class="console-grid">
                            <aside class="rack">
                                <div class="rack-label">// Sections</div>
                                <div class="server-tabs-header">
                                    <ul class="nav nav-tabs rack-nav" role="tablist">
                                        <li class="nav-item" role="presentation"><a class="nav-link rack-btn" data-bs-toggle="tab" href="#console" role="tab"><span class="gl"><i class="fas fa-terminal"></i></span> Console</a></li>
                                        <li class="nav-item" role="presentation"><a class="nav-link rack-btn" data-bs-toggle="tab" href="#settings" role="tab"><span class="gl"><i class="fas fa-cog"></i></span> Settings {{if ne .agent.Config.Version .agent.LatestAgentVersion}}<span class="dot warn" title="Update available"></span>{{end}}</a></li>
                                        <li class="nav-item" role="presentation"><a class="nav-link rack-btn" data-bs-toggle="tab" href="#installcommand" role="tab"><span class="gl"><i class="fas fa-download"></i></span> Install</a></li>
                                        <li class="nav-item" role="presentation"><a class="nav-link rack-btn" data-bs-toggle="tab" href="#map" role="tab" tabindex="-1"><span class="gl"><i class="fas fa-map-location-dot"></i></span> Map</a></li>
                                        <li class="nav-item" role="presentation"><a class="nav-link rack-btn" data-bs-toggle="tab" href="#saves" role="tab" tabindex="-1"><span class="gl"><i class="fas fa-floppy-disk"></i></span> Saves <span class="count">{{len .agent.Saves}}</span></a></li>
                                        <li class="nav-item" role="presentation"><a class="nav-link rack-btn" data-bs-toggle="tab" href="#backups" role="tab" tabindex="-1"><span class="gl"><i class="fas fa-clock-rotate-left"></i></span> Backups <span class="count">{{len .agent.Backups}}</span></a></li>
                                        <li class="nav-item" role="presentation"><a class="nav-link rack-btn" data-bs-toggle="tab" href="#logs" role="tab" tabindex="-1"><span class="gl"><i class="fas fa-list"></i></span> Logs</a></li>
                                        <li class="nav-item" role="presentation"><a class="nav-link rack-btn" data-bs-toggle="tab" href="#mods" role="tab" tabindex="-1"><span class="gl"><i class="fas fa-puzzle-piece"></i></span> Mods</a></li>
                                    </ul>
                                </div>
                            </aside>
                            <div class="pane">
                                <div id="myTabContent" class="tab-content">
                                    <div class="tab-pane fade" id="console" role="tabpanel">
                                        {{template "includes/server/console" .}}
                                    </div>
                                    <div class="tab-pane fade" id="settings" role="tabpanel">
                                        {{template "includes/server/settings" .}}
                                    </div>
                                    <div class="tab-pane fade" id="installcommand">
                                        {{template "includes/server/installcommand" .}}
                                    </div>
                                    <div class="tab-pane fade" id="map" role="tabpanel">
                                        {{template "includes/server/map" .}}
                                    </div>
                                    <div class="tab-pane fade" id="saves" role="tabpanel">
                                        {{template "includes/server/saves" .}}
                                    </div>
                                    <div class="tab-pane fade" id="backups">
                                        {{template "includes/server/backups" .}}
                                    </div>
                                    <div class="tab-pane fade" id="logs">
                                        {{template "includes/server/logs" .}}
                                    </div>
                                    <div class="tab-pane fade" id="mods">
                                        {{template "includes/server/mods" .}}
                                    </div>
                                </div>
                            </div>
                        </div>
                    {{end}}
```

Notes: the ops keep both `#server-console-*` ids (for `server-console.js` ws actions + disabled-toggling) **and** the `href`/`server-action-btn` fallback (matches the current console markup). The `.rack-btn` class is added alongside `.nav-link` so the Bootstrap tab plugin still recognises the anchors while our CSS restyles them.

- [ ] **Step 2: Append the "Server detail — shell" CSS to `main.css`**

```css
/* ==== Phase 3 — Server detail ==== */
/* command header */
.cmd-head { position: relative; background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 18px 20px; overflow: hidden; margin-bottom: 18px; }
.cmd-head::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--online); box-shadow: 0 0 14px color-mix(in srgb, var(--online) 55%, transparent); }
.cmd-head.is-offline::before { background: var(--danger); opacity: 0.6; box-shadow: none; }
.cmd-top { display: flex; align-items: flex-start; gap: 18px; flex-wrap: wrap; }
.cmd-id { flex: 1; min-width: 220px; }
.cmd-name { margin: 0; font-family: var(--display); font-style: italic; text-transform: uppercase; font-size: 26px; font-weight: 800; letter-spacing: 0.02em; display: flex; align-items: center; gap: 12px; }
.cmd-code { display: block; margin-top: 7px; font-size: 12px; letter-spacing: 0.1em; color: var(--steel); }
.cmd-head .ops { display: flex; gap: 8px; flex-wrap: wrap; }
.cmd-head .ops > a { text-decoration: none; }
.cmd-head .op { flex: 0 0 auto; }
.cmd-readouts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 18px; }
.cmd-readouts .readout .v { font-size: 15px; }

/* layout: vertical rack + pane */
.console-grid { display: grid; grid-template-columns: 232px 1fr; gap: 18px; align-items: start; }
.rack { background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 8px; position: sticky; top: 16px; }
.rack-label { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--steel); padding: 8px 10px 10px; }
/* restyle the Bootstrap nav-tabs into a vertical rack (override BS defaults) */
.rack .nav-tabs.rack-nav { display: flex; flex-direction: column; gap: 3px; border: 0; }
.rack .nav-tabs.rack-nav .nav-item { margin: 0; }
.rack-btn.nav-link { position: relative; display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; font-family: var(--mono); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; color: var(--ink-dim); background: none; border: 1px solid transparent; border-radius: 3px; padding: 10px 12px; }
.rack-btn.nav-link .gl { width: 16px; text-align: center; opacity: 0.7; }
.rack-btn.nav-link:hover { color: var(--ink); background: var(--panel-2); border-color: transparent; isolation: isolate; }
.rack-btn.nav-link.active { color: var(--brand-bright); background: color-mix(in srgb, var(--brand) 10%, var(--panel)); border-color: color-mix(in srgb, var(--brand) 40%, var(--line)); }
.rack-btn.nav-link.active .gl { opacity: 1; }
.rack-btn.nav-link.active::before { content: ""; position: absolute; left: -8px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: var(--brand-bright); }
.rack-btn .dot { margin-left: auto; width: 7px; height: 7px; border-radius: 50%; background: var(--warn); box-shadow: 0 0 7px color-mix(in srgb, var(--warn) 70%, transparent); }
.rack-btn .count { margin-left: auto; font-size: 10px; color: var(--steel); background: var(--panel-2); border: 1px solid var(--line); border-radius: 10px; padding: 1px 7px; }
.pane { min-width: 0; }

@media (max-width: 860px) {
    .console-grid { grid-template-columns: 1fr; }
    .rack { position: static; }
    .rack .nav-tabs.rack-nav { flex-direction: row; overflow-x: auto; }
    .rack-btn.nav-link { white-space: nowrap; }
    .rack-btn.nav-link.active::before { display: none; }
    .cmd-readouts { grid-template-columns: repeat(2, 1fr); }
}
```

- [ ] **Step 3: Rebuild + verify the shell**

`make cleancss && make run` → open a started, installed server at `/dashboard/servers/<id>`. Expected: command header with the running lamp, italic name, `server <id>`, four readouts, and Start/Stop/Kill ops; a left vertical rack listing all 8 sections with the active one lit cyan; clicking each rack item still switches panes (Bootstrap tab), the choice persists across reload (localStorage), and the Map/Console panes still initialise (charts render, map sizes) because ids/anchors are unchanged. Start/Stop still fire the websocket action. Narrow the window < 860px → the rack becomes a horizontal scroller and readouts go 2-up.

- [ ] **Step 4: Commit**
```bash
git add templates/pages/dashboard/server.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): server-detail command header + vertical control sidebar"
```

---

### Task 2: Console tab — terminal + recolored Chart.js stats

Reskin `console.tmpl` into a terminal-styled `.server-console` with a command-line footer, plus three console chart cards. Move the per-tab Start/Stop/Kill row out (now in the header) but keep `.server-console` and the canvas ids. Recolor the Chart.js datasets in `server-console.js` to the semantic tokens.

**Files:**
- Modify: `templates/includes/server/console.tmpl`
- Modify: `src/client/server-console.js` (chart colors only)
- Modify: `static/css/main.css` (append console/terminal + chart-card CSS)

**Interfaces:**
- Consumes: shell from Task 1.
- Produces: `.term`, `.chart-card` classes; keeps `.server-console`, `cpuChart/ramChart/uptimeChart`.

- [ ] **Step 1: Replace `console.tmpl` body**

```html
{{define "includes/server/console"}}

    <div class="section-head"><span class="eyebrow">// Console</span><span class="rule"></span><span class="meta">live · streaming</span></div>

    <div class="card2"><div class="bd">
        <div class="term server-console"></div>
    </div></div>

    <div class="chart-grid">
        <div class="chart-card">
            <div class="ch-hd"><span class="lbl">CPU</span></div>
            <div class="ch-body"><canvas id="cpuChart"></canvas></div>
        </div>
        <div class="chart-card">
            <div class="ch-hd"><span class="lbl">RAM</span></div>
            <div class="ch-body"><canvas id="ramChart"></canvas></div>
        </div>
        <div class="chart-card chart-wide">
            <div class="ch-hd"><span class="lbl">Uptime</span></div>
            <div class="ch-body"><canvas id="uptimeChart"></canvas></div>
        </div>
    </div>
{{end}}
```

Note: `.server-console` now also carries `.term` styling; `server-console.js` appends log lines into it unchanged. The Start/Stop/Kill buttons are gone from here — they live in the command header (same ids), so `onStatusUpdated` still toggles them.

- [ ] **Step 2: Append console + chart CSS to `main.css`**

```css
/* console terminal */
.card2 { background: var(--panel); border: 1px solid var(--line); border-radius: 4px; margin-bottom: 16px; }
.card2 > .hd { display: flex; align-items: center; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--line); }
.card2 > .hd h5 { margin: 0; font-family: var(--display); font-style: italic; text-transform: uppercase; font-size: 14px; font-weight: 800; letter-spacing: 0.03em; }
.card2 > .hd .right { margin-left: auto; display: flex; align-items: center; gap: 8px; }
.card2 > .bd { padding: 16px; }
.term { background: #0E141C; border: 1px solid var(--line-strong); border-radius: 4px; padding: 14px 16px; font-family: var(--mono); font-size: 12.5px; line-height: 1.7; height: 340px; overflow: auto; color: #9fb2c4; }
.term p { margin: 0; white-space: pre-wrap; }
:root[data-theme="dark"] .term { background: #05080C; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .term { background: #05080C; } }

/* charts */
.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.chart-card { background: var(--panel); border: 1px solid var(--line); border-radius: 4px; padding: 14px 16px; }
.chart-card .ch-hd { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
.chart-card .ch-hd .lbl { font-family: var(--mono); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--steel); }
.chart-card .ch-body { position: relative; height: 240px; width: 100%; }
.chart-card canvas { width: 100% !important; }
.chart-wide { grid-column: 1 / -1; }
@media (max-width: 860px) { .chart-grid { grid-template-columns: 1fr; } }
```

- [ ] **Step 3: Recolor the Chart.js datasets in `server-console.js`**

Find the three `new Chart(...)` blocks (cpu ≈ line 290, ram ≈ 344, uptime ≈ 395) and set the dataset/line colors to the tokens. Read the actual dataset option keys in place; change only colors — do **not** alter the data-mapping logic. Use these values:

- CPU chart: `borderColor: "#29CBF2"`, `backgroundColor: "rgba(41,203,242,0.15)"`.
- RAM chart: `borderColor: "#F2B33A"`, `backgroundColor: "rgba(242,179,58,0.15)"`.
- Uptime chart: keep its dynamic `backgroundColor` logic but set the base `borderColor: "#3FD07A"` and the default fill to `"rgba(63,208,122,0.15)"`.
- If the charts set `scales.*.grid.color` / `ticks.color`, set grid to `"rgba(255,255,255,0.06)"` and ticks to `"#647085"` so they read in both themes.

(These are the dark-palette hexes; Chart.js draws to canvas and can't read CSS vars, so literal hexes are correct here — they're legible on the dark `.term`/chart surfaces in both site themes.)

- [ ] **Step 4: Rebuild both + verify**

`make bundle && make cleancss && make run` → server `#console`. Expected: a dark terminal panel streaming log lines (auto-scrolling as before), and three chart cards (CPU cyan, RAM amber, Uptime green full-width) updating live from the websocket. Start/Stop/Kill in the header still control the server and enable/disable correctly.

- [ ] **Step 5: Commit**
```bash
git add templates/includes/server/console.tmpl src/client/server-console.js static/js/bundle.js static/css/main.css static/css/main.min.css
git commit -m "feat(ui): console tab terminal + semantic-colored charts"
```

---

### Task 3: Settings tab — readout strip, themed toggles, danger zone

Rebuild `settings.tmpl` from Bootstrap `card`/`bg-glass` into the console language: a top readout strip (status/connection/version/api key), a two-column body with the SF settings form (left) and Server Options + Backup Settings (right). Keep every form hook and the bootstrap-toggle inputs — theme the toggles via CSS rather than replacing the plugin.

**Files:**
- Modify: `templates/includes/server/settings.tmpl`
- Modify: `static/css/main.css` (append settings CSS + bootstrap-toggle theming)

**Interfaces:**
- Consumes: `.card2`, `.readout`, `.tag`, `.section-head`, `.op` and Task-1 shell.
- Produces: `.set-row`, `.field`, `.btn`(local) styles; a themed `.toggle` skin over bootstrap-toggle.

- [ ] **Step 1: Replace `settings.tmpl` body** (preserving all hooks; structure mirrors the mockup)

```html
{{define "includes/server/settings"}}

<div class="section-head"><span class="eyebrow">// Settings</span><span class="rule"></span><span class="meta">config</span></div>

{{if ne .agent.Config.Version .agent.LatestAgentVersion}}
<div class="ssm-alert warn"><i class="fas fa-triangle-exclamation"></i> Update available — installed <b>{{.agent.Config.Version}}</b>, latest <b>{{.agent.LatestAgentVersion}}</b>.</div>
{{end}}

<div class="stat-grid">
    <div class="readout"><div class="k">Server Status</div><div class="v st">
        {{if not .agent.Status.Online}}<span class="tag no">Offline</span>
        {{else}}<span class="tag ok">Online</span>
            {{if .agent.Status.Installed}}<span class="tag ok">Installed</span>{{else}}<span class="tag exp">Not Installed</span>{{end}}
            {{if .agent.Status.Running}}<span class="tag ok">Running</span>{{else}}<span class="tag exp">Idle</span>{{end}}
        {{end}}
    </div></div>
    <div class="readout"><div class="k">Connection</div><div class="v sm">{{.agent.Config.IpAddress}}:{{.agent.Config.Port}}</div></div>
    <div class="readout"><div class="k">SF Version</div><div class="v sm" id="sfserver-version">{{.agent.Status.InstalledSfVersion}} / {{.agent.Status.LatestSfVersion}}</div></div>
    <div class="readout"><div class="k">API Key</div><div class="v sm">
        <b id="ssmagent-shortkey" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-original-title="{{.agent.ApiKey}}">{{shortenApikey "AGT-API" .agent.ApiKey}}</b>
        <button class="icobtn" id="ssmagent-copykey" data-key="{{.agent.ApiKey}}" aria-label="Copy API key"><i class="fas fa-copy"></i></button>
    </div></div>
</div>

<div class="settings-cols">
    <div class="card2"><div class="hd"><h5>Satisfactory Server Settings</h5></div><div class="bd">
        <form action="" method="post" class="form-horizontal">
            {{ .csrfField }}
            <input type="hidden" name="_ConfigSetting" value="sfsettings" />
            <div class="set-row"><div class="lab"><b>Update Server On Start</b><span>Update Satisfactory server when SSM starts</span></div>
                <div class="ctl"><input name="inp_updateonstart" id="inp_updateonstart" type="checkbox" {{if .agent.ServerConfig.UpdateOnStart.Value}}checked{{end}} data-on="Enabled" data-off="Disabled" data-onstyle="success" data-offstyle="danger" data-toggle="toggle" data-width="120" data-size="small"/></div></div>
            <div class="set-row"><div class="lab"><b>Auto Restart Server</b><span>Restart the SF server if it crashes</span></div>
                <div class="ctl"><input name="inp_autorestart" id="inp_autorestart" type="checkbox" {{if .agent.ServerConfig.AutoRestart.Value}}checked{{end}} data-on="Enabled" data-off="Disabled" data-onstyle="success" data-offstyle="danger" data-toggle="toggle" data-width="120" data-size="small"/></div></div>
            <div class="set-row"><div class="lab"><b>Auto Pause Server</b><span>Pause when no players are online</span></div>
                <div class="ctl"><input name="inp_autoPause" id="inp_autoPause" type="checkbox" {{if .agent.ServerConfig.AutoPause.Value}}checked{{end}} data-on="Enabled" data-off="Disabled" data-onstyle="success" data-offstyle="danger" data-toggle="toggle" data-width="120" data-size="small"/></div></div>
            <div class="set-row"><div class="lab"><b>Auto Save On Disconnect</b><span>Save when a player disconnects</span></div>
                <div class="ctl"><input name="inp_autoSaveOnDisconnect" id="inp_autoSaveOnDisconnect" type="checkbox" {{if .agent.ServerConfig.AutoSaveOnDisconnect.Value}}checked{{end}} data-on="Enabled" data-off="Disabled" data-onstyle="success" data-offstyle="danger" data-toggle="toggle" data-width="120" data-size="small"/></div></div>
            <div class="set-row"><div class="lab"><b>Auto Save Interval</b><span>Time between automatic saves</span></div>
                <div class="ctl"><select name="inp_autoSaveInterval" id="inp_autoSaveInterval" class="field">
                    <option value="60" {{if eq .agent.ServerConfig.AutoSaveInterval 60}}selected{{end}}>1 Minute</option>
                    <option value="300" {{if eq .agent.ServerConfig.AutoSaveInterval 300}}selected{{end}}>5 Minutes</option>
                    <option value="600" {{if eq .agent.ServerConfig.AutoSaveInterval 600}}selected{{end}}>10 Minutes</option>
                    <option value="900" {{if eq .agent.ServerConfig.AutoSaveInterval 900}}selected{{end}}>15 Minutes</option>
                    <option value="1800" {{if eq .agent.ServerConfig.AutoSaveInterval 1800}}selected{{end}}>30 Minutes</option>
                    <option value="3600" {{if eq .agent.ServerConfig.AutoSaveInterval 3600}}selected{{end}}>1 Hour</option>
                </select></div></div>
            <div class="set-row"><div class="lab"><b>Seasonal Events</b><span>Enable or disable seasonal events</span></div>
                <div class="ctl"><input name="inp_seasonalEvents" id="inp_seasonalEvents" type="checkbox" {{if not .agent.ServerConfig.DisableSeasonalEvents.Value}}checked{{end}} data-on="Enabled" data-off="Disabled" data-onstyle="success" data-offstyle="danger" data-toggle="toggle" data-width="120" data-size="small"/></div></div>
            <div class="set-row"><div class="lab"><b>Max Players</b><span>Players that can join the server</span></div>
                <div class="ctl range-ctl"><input type="range" class="form-range" id="inp_maxplayers" name="inp_maxplayers" min="4" max="500" value="{{.agent.ServerConfig.MaxPlayers}}"/><span id="max-players-value" class="mono">0 / 500</span></div></div>
            <div class="set-row"><div class="lab"><b>Worker Threads</b><span>Worker threads allocated to the server</span></div>
                <div class="ctl"><input type="number" value="{{.agent.ServerConfig.WorkerThreads}}" id="inp_workerthreads" name="inp_workerthreads" class="field"/></div></div>
            <div class="set-row"><div class="lab"><b>Version Branch</b><span>Public or Experimental branch</span></div>
                <div class="ctl"><input name="inp_sfbranch" id="inp_sfbranch" type="checkbox" {{if eq .agent.ServerConfig.Branch "experimental"}}checked{{end}} data-on="Experimental" data-off="Public" data-onstyle="danger" data-offstyle="success" data-toggle="toggle" data-width="120" data-size="small"/></div></div>
            <div class="form-foot"><button class="btn2" id="save-sf-settings"><i class="fas fa-save"></i> Update Settings</button></div>
        </form>
    </div></div>

    <div class="settings-side">
        <div class="card2 danger"><div class="hd"><h5>Server Options</h5></div><div class="bd">
            <div class="set-row"><div class="lab"><b>Install / Reinstall Server</b><span>Install or reinstall the Satisfactory server</span></div>
                <div class="ctl"><button class="btn2 outline danger server-action-btn" id="settings-dangerarea-installsf" data-server-action="install" data-agent-id="{{.agent.Id}}"><i class="fas fa-download"></i> Install / Reinstall</button></div></div>
            <div class="set-row"><div class="lab"><b>Update Server</b><span>Update the Satisfactory server binary</span></div>
                <div class="ctl"><button class="btn2 outline warn server-action-btn" data-server-action="update" data-agent-id="{{.agent.Id}}"><i class="fa-solid fa-circle-arrow-up"></i> Update Server</button></div></div>
        </div></div>
        <div class="card2"><div class="hd"><h5>Backup Settings</h5></div><div class="bd">
            <form action="" method="post">
                {{ .csrfField }}
                <input type="hidden" name="_ConfigSetting" value="backupsettings" />
                <div class="set-row"><div class="lab"><b>Backup Interval</b><span>Hours between backups</span></div>
                    <div class="ctl"><input type="number" name="inp_backupinterval" class="field" id="inp_backupinterval" value="{{.agent.Config.BackupInterval}}"/></div></div>
                <div class="set-row"><div class="lab"><b>Backups To Keep</b><span>Rolling number of backups to retain</span></div>
                    <div class="ctl"><input type="number" name="inp_backupkeep" class="field" id="inp_backupkeep" value="{{.agent.Config.BackupKeepAmount}}"/></div></div>
                <div class="form-foot"><button class="btn2" id="save-backup-settings"><i class="fas fa-save"></i> Update Settings</button></div>
            </form>
        </div></div>
    </div>
</div>

{{ end }}
```

- [ ] **Step 2: Append settings CSS + bootstrap-toggle theming to `main.css`**

```css
/* settings */
.settings-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
.settings-side { display: flex; flex-direction: column; gap: 16px; }
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
.stat-grid .readout .v.sm { font-size: 13px; }
.stat-grid .readout .v.st { display: flex; flex-wrap: wrap; gap: 5px; }
.set-row { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: center; padding: 13px 0; border-bottom: 1px solid var(--line); }
.set-row:last-child { border-bottom: 0; }
.set-row .lab b { display: block; font-size: 13px; }
.set-row .lab span { display: block; font-size: 11.5px; color: var(--steel); margin-top: 2px; }
.set-row .ctl { justify-self: end; }
.set-row .range-ctl { display: flex; align-items: center; gap: 12px; }
.field { height: 36px; padding: 0 12px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 3px; color: var(--ink); font-family: var(--mono); font-size: 13px; min-width: 140px; }
select.field { cursor: pointer; }
.form-foot { text-align: right; margin-top: 14px; }
.btn2 { height: 40px; padding: 0 16px; border: 1px solid var(--brand-deep); border-radius: 3px; background: var(--brand); color: #04222E; font-family: var(--mono); font-weight: 700; font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.btn2:hover { background: var(--brand-bright); }
.btn2.outline { background: var(--panel-2); border-color: var(--line); color: var(--ink-dim); }
.btn2.outline.danger { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, var(--line)); }
.btn2.outline.warn { color: var(--warn); border-color: color-mix(in srgb, var(--warn) 40%, var(--line)); }
.btn2.outline:hover { border-color: var(--line-strong); }
.card2.danger { border-color: color-mix(in srgb, var(--danger) 30%, var(--line)); }
.card2.danger > .hd { border-bottom-color: color-mix(in srgb, var(--danger) 25%, var(--line)); }
.card2.danger > .hd h5 { color: var(--danger); }
.icobtn { width: 32px; height: 32px; display: inline-grid; place-items: center; background: var(--panel); border: 1px solid var(--line); border-radius: 3px; color: var(--ink-dim); cursor: pointer; font-size: 12px; text-decoration: none; }
.icobtn:hover { color: var(--brand-bright); border-color: color-mix(in srgb, var(--brand) 40%, var(--line)); }
.icobtn.danger:hover { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 45%, var(--line)); }
.ssm-alert { border-radius: 4px; padding: 12px 15px; font-size: 13px; margin-bottom: 16px; display: flex; gap: 10px; align-items: center; }
.ssm-alert.warn { background: color-mix(in srgb, var(--warn) 12%, var(--panel)); border: 1px solid color-mix(in srgb, var(--warn) 40%, var(--line)); color: var(--ink); }
.ssm-alert.warn i { color: var(--warn); }

/* theme bootstrap-toggle to the console palette */
.toggle.btn { border-radius: 3px !important; border: 1px solid var(--line) !important; font-family: var(--mono); font-size: 10px !important; letter-spacing: 0.08em; text-transform: uppercase; min-height: 32px; }
.toggle.btn .toggle-handle { background: var(--panel) !important; border-color: var(--line) !important; }
.toggle.off { background: var(--panel-2) !important; color: var(--steel) !important; }
.toggle.btn.btn-success { background: color-mix(in srgb, var(--online) 22%, var(--panel)) !important; color: var(--online) !important; }
.toggle.btn.btn-danger { background: color-mix(in srgb, var(--danger) 20%, var(--panel)) !important; color: var(--danger) !important; }

@media (max-width: 860px) { .settings-cols { grid-template-columns: 1fr; } .stat-grid { grid-template-columns: 1fr 1fr; } }
```

- [ ] **Step 3: Rebuild + verify**

`make cleancss && make run` → server `#settings`. Expected: readout strip with status tags + connection + version + copyable API key (copy button works, tooltip shows full key); left form with themed On/Off toggles (bootstrap-toggle still posts correctly), max-players slider mirrors to its readout, save buttons post (`_ConfigSetting` intact); right column danger-zone Install/Update (server-action still fires) + backup settings. Update-available banner shows only on version mismatch.

- [ ] **Step 4: Commit**
```bash
git add templates/includes/server/settings.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): settings tab console redesign"
```

---

### Task 4: Install Command tab — console copy blocks

Reskin `installcommand.tmpl` into console-style copy blocks with Windows/Ubuntu subtabs. Preserve the tab ids, `.server-install-command`, `.docker`/`.standalone` targets, and `.copy-btn`.

**Files:**
- Modify: `templates/includes/server/installcommand.tmpl`
- Modify: `static/css/main.css` (append install/copy-block + subtab CSS)

**Interfaces:**
- Consumes: `.card2`, `.section-head`.
- Produces: `.cmdbox`, `.subtabs` styles (reused by Task 9 empty state).

- [ ] **Step 1: Replace `installcommand.tmpl` body** (keep the nested Bootstrap tab ids + `.docker`/`.standalone` textareas + `.copy-btn`)

```html
{{define "includes/server/installcommand"}}

<div class="section-head"><span class="eyebrow">// Install Command</span><span class="rule"></span><span class="meta">agent bootstrap</span></div>

<div class="card2"><div class="bd">
    <ul class="nav nav-tabs subtabs server-install-tabs" role="tablist">
        <li class="nav-item" role="presentation"><a class="nav-link subtab active" data-bs-toggle="tab" href="#windows-install-agent" aria-selected="true" role="tab"><i class="fa-brands fa-windows"></i> Windows</a></li>
        <li class="nav-item" role="presentation"><a class="nav-link subtab" data-bs-toggle="tab" href="#linux-install-agent" aria-selected="false" role="tab" tabindex="-1"><i class="fa-brands fa-ubuntu"></i> Ubuntu / Debian</a></li>
    </ul>
    <div id="myTabContent" class="tab-content server-install-command">
        <div class="tab-pane fade active show" id="windows-install-agent" role="tabpanel">
            <h6 class="blk">Install agent using docker containers (default)</h6>
            <div class="cmdbox"><div class="glyph"><i class="fa-solid fa-terminal"></i></div><textarea class="docker" rows="3" readonly></textarea><button class="copy copy-btn" aria-label="Copy"><i class="fa-solid fa-copy"></i></button></div>
            <h6 class="blk">Install agent instance on local machine</h6>
            <div class="cmdbox"><div class="glyph"><i class="fa-solid fa-terminal"></i></div><textarea class="standalone" rows="3" readonly></textarea><button class="copy copy-btn" aria-label="Copy"><i class="fa-solid fa-copy"></i></button></div>
        </div>
        <div class="tab-pane fade" id="linux-install-agent" role="tabpanel">
            <h6 class="blk">Install agent using docker containers (default)</h6>
            <div class="cmdbox"><div class="glyph"><i class="fa-solid fa-terminal"></i></div><textarea class="docker" rows="3" readonly></textarea><button class="copy copy-btn" aria-label="Copy"><i class="fa-solid fa-copy"></i></button></div>
            <h6 class="blk">Install agent instance on local machine</h6>
            <div class="cmdbox"><div class="glyph"><i class="fa-solid fa-terminal"></i></div><textarea class="standalone" rows="3" readonly></textarea><button class="copy copy-btn" aria-label="Copy"><i class="fa-solid fa-copy"></i></button></div>
        </div>
    </div>
</div></div>
{{end}}
```

- [ ] **Step 2: Append install/copy-block CSS to `main.css`**

```css
/* horizontal sub-tabs (install command, and reused elsewhere) */
.subtabs.nav-tabs { border: 0; gap: 6px; margin-bottom: 14px; }
.subtabs .nav-item { margin: 0; }
.subtab.nav-link { font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-dim); background: var(--panel-2); border: 1px solid var(--line); border-radius: 3px; padding: 7px 13px; display: inline-flex; align-items: center; gap: 8px; }
.subtab.nav-link.active { color: var(--brand-bright); border-color: color-mix(in srgb, var(--brand) 40%, var(--line)); background: color-mix(in srgb, var(--brand) 10%, var(--panel)); }
h6.blk { font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--steel); margin: 4px 0 8px; }
.cmdbox { display: flex; align-items: stretch; border: 1px solid var(--line); border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
.cmdbox .glyph { display: grid; place-items: center; width: 42px; background: var(--panel-2); color: var(--steel); border-right: 1px solid var(--line); }
.cmdbox textarea { flex: 1; border: 0; outline: none; resize: none; background: var(--panel); color: var(--ink); font-family: var(--mono); font-size: 12px; padding: 10px 12px; line-height: 1.5; }
.cmdbox .copy { width: 46px; border: 0; border-left: 1px solid var(--line); background: var(--brand); color: #04222E; cursor: pointer; }
.cmdbox .copy:hover { background: var(--brand-bright); }
```

- [ ] **Step 3: Rebuild + verify**

`make cleancss && make run` → server `#installcommand`. Expected: Windows/Ubuntu subtabs switch; each shows two console copy blocks whose textareas are filled by `BuildAgentInstallCommands` (the `.docker`/`.standalone` targets) and the copy button copies the command. (If the textareas are empty, the JS globals/hook are broken — they should be intact from Task 1's `<script>`.)

- [ ] **Step 4: Commit**
```bash
git add templates/includes/server/installcommand.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): install-command tab console copy blocks"
```

---

### Task 5: Map tab — framed console container

Reskin `map.tmpl` into a `.card2` with a framed map body. Preserve `#playerMap` and the public-map link; `agentmap.js` sizes the map on `shown.bs.tab`.

**Files:**
- Modify: `templates/includes/server/map.tmpl`
- Modify: `static/css/main.css` (append map-frame CSS)

- [ ] **Step 1: Replace `map.tmpl` body**

```html
{{define "includes/server/map"}}

<div class="section-head"><span class="eyebrow">// Map</span><span class="rule"></span><span class="meta">player positions</span></div>

<div class="card2"><div class="hd"><h5>Live Map</h5><div class="right">
    <a href="/map/{{.agent.Id}}" class="icobtn" data-bs-toggle="tooltip" data-bs-placement="bottom" title="View Public Map" aria-label="View public map"><i class="fa-solid fa-earth-americas"></i></a>
</div></div><div class="bd" style="padding: 0;">
    <div id="playerMap" class="map-frame"></div>
</div></div>
{{end}}
```

- [ ] **Step 2: Append map CSS to `main.css`**

```css
.map-frame { height: calc(100vh - 260px); min-height: 380px; border-radius: 0 0 4px 4px; overflow: hidden; background: var(--panel-2); }
```

- [ ] **Step 3: Rebuild + verify**

`make cleancss && make run` → server `#map`. Expected: framed map fills the pane, tiles/markers load, and switching to the tab still triggers `SetUpMap()` (map is not greyed/zero-height). Public-map link opens `/map/<id>`.

- [ ] **Step 4: Commit**
```bash
git add templates/includes/server/map.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): map tab framed container"
```

---

### Task 6: Saves + Backups tabs — mini readout cards

Reskin `saves.tmpl`, `backups.tmpl`, and the `save-card` / `backup-card` includes into console mini-cards. Preserve the upload form, `.backup-search` + `data-backupname`, and the card dict interfaces.

**Files:**
- Modify: `templates/includes/server/saves.tmpl`
- Modify: `templates/includes/server/backups.tmpl`
- Modify: `templates/includes/dashboard/save-card.tmpl`
- Modify: `templates/includes/dashboard/backup-card.tmpl`
- Modify: `static/css/main.css` (append saves/backups + mini-card CSS)

**Interfaces:**
- Consumes: `.card2`, `.section-head`, `.icobtn`, `.btn2`.
- Produces: `.grid3`, `.mini`, `.bar`, `.drop`, `.search` styles.

- [ ] **Step 1: Read `save-card.tmpl` and `backup-card.tmpl` first** (they were not captured in this plan — read them to preserve their exact data fields, action routes, `data-backupname`, and any confirm hooks before rewriting). Then rewrite each into a `.mini` card:

```html
<!-- pattern for save-card.tmpl — map real fields/routes from the file you just read -->
<div class="mini">
  <h6>{{ /* save filename field */ }}</h6>
  <div class="rows"><span><b>Size:</b> {{ /* size */ }}</span><span><b>Saved:</b> {{ /* date */ }}</span></div>
  <div class="acts">
    <a class="icobtn" href="{{ /* download route */ }}" aria-label="Download"><i class="fas fa-download"></i></a>
    <a class="icobtn" href="{{ /* load route */ }}" aria-label="Load"><i class="fas fa-play"></i></a>
    <a class="icobtn danger should-confirm-btn" href="{{ /* delete route */ }}" aria-label="Delete" data-confirm-title="Delete Save Confirmation"><i class="fas fa-trash"></i></a>
  </div>
</div>
```

`backup-card.tmpl` follows the same shape but **must keep** `class="backup-card"` and `data-backupname="{{…}}"` on the root element (the `.backup-search` filter in `app.js` reads them), and a restore action.

- [ ] **Step 2: Replace `saves.tmpl` body** (keep `#save-upload-form`, `#inp-save-file`, `#btn-save-upload`, csrf, save-card loop)

```html
{{define "includes/server/saves"}}

<div class="section-head"><span class="eyebrow">// Saves</span><span class="rule"></span><span class="meta">{{len .agent.Saves}} files</span></div>

<div class="card2"><div class="hd"><h5>Upload Save</h5></div><div class="bd">
    <form id="save-upload-form" enctype="multipart/form-data" method="post" action="/dashboard/servers/{{.agent.Id}}/saves">
        {{ .csrfField }}
        <input type="hidden" name="inp_agentid" value="{{.agent.Id}}" />
        <div class="bar">
            <input class="field" type="file" name="file" id="inp-save-file" accept=".sav" style="flex:1; height:42px; padding-top:7px;" />
            <button class="btn2" id="btn-save-upload"><i class="fas fa-upload"></i> Upload</button>
        </div>
    </form>
</div></div>

<div class="card2"><div class="hd"><h5>Save Files</h5></div><div class="bd">
    {{if eq (len .agent.Saves) 0}}<p class="empty-note">There are currently no saves for this server yet.</p>{{end}}
    <div class="grid3">
        {{ range .agent.Saves}}
            {{template "includes/dashboard/save-card" (dict "save" . "agent" $.agent)}}
        {{end}}
    </div>
</div></div>
{{end}}
```

- [ ] **Step 3: Replace `backups.tmpl` body** (keep `.backup-search` + backup-card loop)

```html
{{define "includes/server/backups"}}

<div class="section-head"><span class="eyebrow">// Backups</span><span class="rule"></span><span class="meta">{{len .agent.Backups}} archives</span></div>

<div class="card2"><div class="hd"><h5>Backups</h5><div class="right">
    <label class="search"><i class="fas fa-magnifying-glass"></i><input type="text" placeholder="Search backups…" class="backup-search" aria-label="Search backups"></label>
</div></div><div class="bd">
    {{if eq (len .agent.Backups) 0}}<p class="empty-note">There are currently no backups for this server yet.</p>{{end}}
    <div class="grid3">
        {{ range .agent.Backups}}
            {{template "includes/dashboard/backup-card" (dict "backup" . "agent" $.agent)}}
        {{end}}
    </div>
</div></div>
{{end}}
```

- [ ] **Step 4: Append saves/backups/mini-card CSS to `main.css`**

```css
.grid3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; }
.mini { background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px; padding: 13px; }
.mini h6 { margin: 0 0 8px; font-family: var(--mono); font-size: 12px; letter-spacing: 0.04em; word-break: break-all; }
.mini .rows { font-family: var(--mono); font-size: 11px; color: var(--steel); line-height: 1.8; display: flex; flex-direction: column; }
.mini .rows b { color: var(--ink-dim); }
.mini .acts { display: flex; gap: 6px; margin-top: 11px; }
.bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.search { display: flex; align-items: center; gap: 9px; background: var(--panel-2); border: 1px solid var(--line); border-radius: 3px; height: 34px; padding: 0 12px; margin: 0; }
.search i { color: var(--steel); font-size: 12px; }
.search input { background: none; border: 0; outline: none; color: var(--ink); font-family: var(--mono); font-size: 12px; }
.search input::placeholder { color: var(--steel); }
.empty-note { color: var(--steel); font-family: var(--mono); font-size: 12px; margin: 0; }
```

- [ ] **Step 5: Rebuild + verify**

`make cleancss && make run` → `#saves` and `#backups`. Expected: upload row + a responsive grid of save mini-cards (download/load/delete work, delete still confirms); backups show a search that filters the mini-cards live (type a name → non-matching hide), download/restore/delete intact.

- [ ] **Step 6: Commit**
```bash
git add templates/includes/server/saves.tmpl templates/includes/server/backups.tmpl templates/includes/dashboard/save-card.tmpl templates/includes/dashboard/backup-card.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): saves + backups tabs console mini-cards"
```

---

### Task 7: Logs tab — dual terminal viewers

Reskin `logs.tmpl` into two terminal-styled log viewers (SSM + Satisfactory) with download buttons. Preserve download routes, `.log-viewer`, and `displayLogLines`.

**Files:**
- Modify: `templates/includes/server/logs.tmpl`
- Modify: `static/css/main.css` (append log-grid CSS)

- [ ] **Step 1: Replace `logs.tmpl` body**

```html
{{define "includes/server/logs"}}

<div class="section-head"><span class="eyebrow">// Logs</span><span class="rule"></span><span class="meta">ssm · satisfactory</span></div>

<div class="log-grid">
    <div class="card2"><div class="hd"><h5>SSM Log</h5><div class="right">
        <a href="/dashboard/download/log?agentid={{.agent.Id}}&logtype=Agent" class="btn2 outline"><i class="fas fa-download"></i> Download</a>
    </div></div><div class="bd">
        <div class="term log-viewer">
        {{if eq .agentLog.Type ""}}<p>No log entries for this log type.</p>
        {{else}}{{range displayLogLines .agentLog.LogLines}}<p>{{.}}</p>{{end}}{{end}}
        </div>
    </div></div>
    <div class="card2"><div class="hd"><h5>Satisfactory Log</h5><div class="right">
        <a href="/dashboard/download/log?agentid={{.agent.Id}}&logtype=FactoryGame" class="btn2 outline"><i class="fas fa-download"></i> Download</a>
    </div></div><div class="bd">
        <div class="term log-viewer">
        {{if eq .gameLog.Type ""}}<p>No log entries for this log type.</p>
        {{else}}{{range displayLogLines .gameLog.LogLines}}<p>{{.}}</p>{{end}}{{end}}
        </div>
    </div></div>
</div>
{{end}}
```

- [ ] **Step 2: Append log-grid CSS to `main.css`**

```css
.log-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.log-grid .term.log-viewer { height: 380px; }
@media (max-width: 860px) { .log-grid { grid-template-columns: 1fr; } }
```

(Reuses `.term` from Task 2 for the dark terminal look. If Task 2 has not landed, that class is defined there; this task depends on it.)

- [ ] **Step 3: Rebuild + verify**

`make cleancss && make run` → server `#logs`. Expected: two dark terminal panels side by side (stacked on mobile), each scrolling its log lines, with a Download button that hits the correct `logtype`. Empty logs show the placeholder line.

- [ ] **Step 4: Commit**
```bash
git add templates/includes/server/logs.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): logs tab dual terminal viewers"
```

---

### Task 8: Mods tab — console mod manager

Reskin `mods.tmpl` into the console language while preserving **every** `mods-page.js` hook (import file, mod list container, sort, pagination, offcanvas filter, count). This is markup + CSS only — do not touch `mods-page.js` logic; only ensure the class/id hooks it queries still exist.

**Files:**
- Modify: `templates/includes/server/mods.tmpl`
- Modify: `static/css/main.css` (append mods CSS)

**Interfaces:**
- Consumes: `.card2`, `.bar`, `.drop`, `.field`, `.tag`, `.icobtn`.
- Produces: `.mod` row styling, `.pagination` restyle.

- [ ] **Step 1: Replace `mods.tmpl` body** (keep `.smm-metadata-file`, `#mod-count`, `#mods-sortby`, `.mod-list > .row`, `#mods-pagination`, the offcanvas `#canvas-mods-filter` + `.mod-search` + the three check ids, `{{ .csrfField }}`)

```html
{{define "includes/server/mods"}}

{{ .csrfField }}

<div class="section-head"><span class="eyebrow">// Mods</span><span class="rule"></span><span class="meta"><span id="mod-count"></span> selected</span></div>

<div class="card2"><div class="bd">
    <div class="bar" style="margin-bottom:16px;">
        <label class="drop" style="flex:1; cursor:pointer;"><i class="fas fa-file-import"></i> Import SMM profile (.json) <input type="file" class="smm-metadata-file" hidden></label>
        <button class="btn2 outline" type="button" data-bs-toggle="offcanvas" data-bs-target="#canvas-mods-filter" aria-controls="canvas-mods-filter"><i class="fa-solid fa-filter"></i> Filter</button>
        <select class="field" style="height:42px;" name="inp_mod_sortby" id="mods-sortby">
            <option value="az">A–Z</option>
            <option value="za">Z–A</option>
            <option value="downloads-high">Downloads (High → Low)</option>
            <option value="downloads-low">Downloads (Low → High)</option>
        </select>
        <ul class="pagination m-0" id="mods-pagination"></ul>
    </div>
    <div class="mod-list">
        <div class="row"></div>
    </div>
</div></div>

<div class="offcanvas offcanvas-end" tabindex="-1" id="canvas-mods-filter" aria-labelledby="canvas-mods-filter-label">
    <div class="offcanvas-header">
        <h4 class="offcanvas-title" id="canvas-mods-filter-label">Filter Mods</h4>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body">
        <label class="search" style="height:42px; margin-bottom:16px;"><i class="fas fa-magnifying-glass"></i><input type="text" class="mod-search" placeholder="Search mods…"></label>
        <div class="section-head"><span class="eyebrow">// Installed</span><span class="rule"></span></div>
        <label class="check-row"><input class="form-check-input" type="checkbox" id="check-not-installed" checked> Not Installed</label>
        <label class="check-row"><input class="form-check-input" type="checkbox" id="check-installed" checked> Installed</label>
        <div class="section-head"><span class="eyebrow">// Update</span><span class="rule"></span></div>
        <label class="check-row"><input class="form-check-input" type="checkbox" id="check-needs-update" checked> Update Available</label>
    </div>
</div>
{{end}}
```

Note: `mods-page.js` injects mod cards into `.mod-list .row`. Confirm whether it emits Bootstrap column markup; if so keep the `.row` and let the injected `.col-*` children flow (the console `.mod` row styling below targets injected cards only if the JS emits them — if the JS emits its own card class, restyle that class instead, discovered by reading `mods-page.js` render output in Step 2).

- [ ] **Step 2: Read `mods-page.js` render function** to find the exact class names it injects for each mod card, then append CSS targeting those real classes (the `.mod` block below is the target shape — rename selectors to match the JS output):

```css
.check-row { display: flex; align-items: center; gap: 9px; font-family: var(--mono); font-size: 12px; color: var(--ink-dim); padding: 7px 0; }
.mod-list .mod, .mod-list [class*="mod-card"] { display: grid; grid-template-columns: 44px 1fr auto; gap: 12px; align-items: center; background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px; padding: 11px 13px; margin-bottom: 10px; }
.mod .thumb { width: 44px; height: 44px; border-radius: 4px; background: color-mix(in srgb, var(--brand) 16%, var(--panel)); display: grid; place-items: center; color: var(--brand-bright); }
.mod .info b { font-size: 13px; }
.mod .info span { display: block; font-family: var(--mono); font-size: 10.5px; color: var(--steel); margin-top: 3px; }
.pagination#mods-pagination { display: flex; gap: 5px; margin: 0; }
#mods-pagination .page-item .page-link, #mods-pagination .mod-page, #mods-pagination .mod-page-prev, #mods-pagination .mod-page-next { min-width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border: 1px solid var(--line); background: var(--panel); color: var(--ink-dim); border-radius: 3px; font-family: var(--mono); font-size: 12px; }
#mods-pagination .active .page-link, #mods-pagination li.active { color: var(--brand-bright); border-color: color-mix(in srgb, var(--brand) 40%, var(--line)); background: color-mix(in srgb, var(--brand) 10%, var(--panel)); }
```

- [ ] **Step 3: Rebuild + verify**

`make bundle && make cleancss && make run` → server `#mods`. (Rebuild the bundle only if Step 2 required a JS class rename; if `mods.tmpl` + CSS only, `make cleancss` suffices.) Expected: import row + Filter (opens offcanvas with search + themed checkboxes that still filter) + sort select + pagination; the mod list renders injected mod cards in the console style; count shows in the section head. Sorting, searching, pagination, install/uninstall all still function.

- [ ] **Step 4: Commit**
```bash
git add templates/includes/server/mods.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): mods tab console redesign"
```

---

### Task 9: Never-started empty state

Reskin the `{{if not .agent.Config.Version}}` branch of `server.tmpl` (a server that has never been started) into the console language: an offline command header (no ops/readouts, since there's no data) + an install-command card. Reuse `.cmd-head`, `.subtabs`, `.cmdbox` from earlier tasks.

**Files:**
- Modify: `templates/pages/dashboard/server.tmpl` (the top `{{if not .agent.Config.Version}}` block, current lines 15–80)

**Interfaces:**
- Consumes: `.cmd-head`, `.ssm-alert`, `.card2`, `.subtabs`, `.cmdbox` from Tasks 1/3/4.
- Produces: nothing new.

- [ ] **Step 1: Replace the never-started block** (keep the `#inp_servername/#inp_serverport/#inp_servermemory` hidden inputs the wizard/JS may read, and the nested install tab ids + `.docker`/`.standalone`)

```html
                    {{if not .agent.Config.Version}}
                    <div class="cmd-head is-offline">
                        <div class="cmd-top">
                            <div class="cmd-id">
                                <h5 class="cmd-name"><span class="status-lamp off"></span>{{.agent.AgentName}}</h5>
                                <span class="cmd-code mono">server {{.agent.Id}}</span>
                            </div>
                        </div>
                    </div>

                    <div class="ssm-alert warn"><i class="fas fa-triangle-exclamation"></i> This server has not been started yet. Run the install command on your host to bring the agent online.</div>

                    <input type="hidden" id="inp_servername" value="{{.agent.AgentName}}">
                    <input type="hidden" id="inp_serverport" value="{{.agent.Config.Port}}">
                    <input type="hidden" id="inp_servermemory" value="{{.agent.Config.Memory}}">

                    <div class="card2"><div class="hd"><h5>Install Command</h5></div><div class="bd">
                        <p class="empty-note" style="margin-bottom:14px;">When running this install script you will be prompted for the SSM URL (defaults to SSM Cloud) and your secure API key.</p>
                        <ul class="nav nav-tabs subtabs" role="tablist">
                            <li class="nav-item" role="presentation"><a class="nav-link subtab active" data-bs-toggle="tab" href="#windows-install-agent" aria-selected="true" role="tab"><i class="fa-brands fa-windows"></i> Windows</a></li>
                            <li class="nav-item" role="presentation"><a class="nav-link subtab" data-bs-toggle="tab" href="#linux-install-agent" aria-selected="false" role="tab" tabindex="-1"><i class="fa-brands fa-ubuntu"></i> Ubuntu / Debian</a></li>
                        </ul>
                        <div id="myTabContent" class="tab-content server-install-command">
                            <div class="tab-pane fade active show" id="windows-install-agent" role="tabpanel">
                                <h6 class="blk">Install agent using docker containers (default)</h6>
                                <div class="cmdbox"><div class="glyph"><i class="fa-solid fa-terminal"></i></div><textarea class="docker" rows="3" readonly></textarea><button class="copy copy-btn" aria-label="Copy"><i class="fa-solid fa-copy"></i></button></div>
                                <h6 class="blk">Install agent instance on local machine</h6>
                                <div class="cmdbox"><div class="glyph"><i class="fa-solid fa-terminal"></i></div><textarea class="standalone" rows="3" readonly></textarea><button class="copy copy-btn" aria-label="Copy"><i class="fa-solid fa-copy"></i></button></div>
                            </div>
                            <div class="tab-pane fade" id="linux-install-agent" role="tabpanel">
                                <h6 class="blk">Install agent using docker containers (default)</h6>
                                <div class="cmdbox"><div class="glyph"><i class="fa-solid fa-terminal"></i></div><textarea class="docker" rows="3" readonly></textarea><button class="copy copy-btn" aria-label="Copy"><i class="fa-solid fa-copy"></i></button></div>
                                <h6 class="blk">Install agent instance on local machine</h6>
                                <div class="cmdbox"><div class="glyph"><i class="fa-solid fa-terminal"></i></div><textarea class="standalone" rows="3" readonly></textarea><button class="copy copy-btn" aria-label="Copy"><i class="fa-solid fa-copy"></i></button></div>
                            </div>
                        </div>
                    </div></div>
                    {{else}}
```

(The original block used `<%=…%>` placeholders that never rendered in Go templates — this replaces them with the real `.agent.*` fields. Verify `.agent.Config.Memory`/`.agent.Config.Port` are the correct field names by checking Task 1's header, which already uses `.agent.Config.Port`.)

- [ ] **Step 2: Rebuild + verify**

`make cleancss && make run` → open a server that has never been started (no `Config.Version`). Expected: offline command header (red rail, off lamp, name + id), a warning banner, and the install-command card with working Windows/Ubuntu subtabs and copy blocks (textareas filled by `BuildAgentInstallCommands`). No sidebar/tabs appear for this state.

- [ ] **Step 3: Commit**
```bash
git add templates/pages/dashboard/server.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): never-started server empty state"
```

---

## Self-Review

**Spec coverage (design §5 Phase 3):** `server.tmpl` tab strip → vertical control sidebar + command header (Task 1) ✓; console/logs as terminals (Tasks 2, 7) ✓; settings (Task 3) ✓; installcommand (Task 4) ✓; map framed (Task 5) ✓; saves/backups + `save-card`/`backup-card` as readout panels (Task 6) ✓; mods (Task 8) ✓; Chart.js recolored to semantic palette (Task 2) ✓; never-started empty state (Task 9) ✓. Deviation from the design doc's original Phase 3 bullet ("tab strip restyled"): the approved mockup uses a **vertical control sidebar** instead of a horizontal strip — the master design doc's §5 Phase 3 line is updated to match.

**Placeholder scan:** Tasks 6 and 8 intentionally defer two card/render details to a documented "read the file first" step (`save-card`/`backup-card` fields; `mods-page.js` injected class names) because those source files were not read during planning — each step names exactly what to extract and gives the target markup/CSS shape. All other steps contain complete markup + CSS. No TBD/TODO left as an instruction to invent behaviour.

**Type/name consistency:** the Bootstrap tab contract (`.server-tabs-header`, `.nav-tabs`, `nav-link` anchors, `href`/pane ids `#console/#settings/#installcommand/#map/#saves/#backups/#logs/#mods`) is preserved verbatim from the current `server.tmpl` and matches the JS in `app.js`. New classes introduced in Task 1 (`.cmd-head`, `.console-grid`, `.rack`, `.rack-btn`, `.pane`) and Task 2 (`.card2`, `.term`, `.chart-card`) are reused by later tasks with the same names. Preserved JS hooks cross-checked against `server-console.js` (`.server-console`, `#server-console-*`, `cpuChart/ramChart/uptimeChart`), `agentmap.js` (`#playerMap`), `mods-page.js` (`.smm-metadata-file`, `.mod-list .row`, `#mods-sortby`, `#mods-pagination`, `#mod-count`, `.mod-search`, `#check-*`), and `app.js` (tab persistence, `.backup-search`, `#inp_maxplayers`→`#max-players-value`, `.server-action-btn`, `#ssmagent-copykey`). The console Start/Stop/Kill move to the header but keep `#server-console-start-btn/stop-btn/kill-btn` (delegated from `body`, so location-independent).

**Dependency order:** Task 1 (shell) first; Tasks 2–8 each depend on Task 1 and reuse `.card2`/`.term`/`.icobtn`/`.btn2` defined in Tasks 2–3; Task 7 reuses `.term` (Task 2), Task 9 reuses `.cmdbox`/`.subtabs` (Task 4) and `.ssm-alert` (Task 3). Execute in numeric order.
