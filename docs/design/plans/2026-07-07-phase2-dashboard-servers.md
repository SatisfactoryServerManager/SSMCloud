# Phase 2 — Dashboard + Servers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the server cards into control-console **unit panels** and rebuild the Dashboard overview and Servers pages using the Phase 0 primitives, matching the approved mockups, without breaking existing filter/action JS.

**Architecture:** Restyle the shared `status-card` into a `readout`, transform `server-card` (Dashboard) and `small-server-card` (Servers) into unit panels built from the `.status-rail`, `.status-lamp`, `.readout`, `.seg-meter`, `.tag` primitives, then rework the two page templates (fleet summary + full-width search/chips/deploy on Servers; section eyebrows + needs-attention on Dashboard). Aggregate figures are derived client-side from the rendered cards — no backend change.

**Tech Stack:** Go html/template, Bootstrap 5.3 grid, browserify client JS, FontAwesome, the `Makefile`.

## Global Constraints

- **Depends on Phase 0 (primitives) and Phase 1 (shell).** Branch `feature/ui-redesign`.
- **No automated tests** — verify with `make cleancss`/`make bundle` + `make run` on :8083 with real/seeded agents.
- **Preserve JS/data hooks exactly:** `server-action-btn` + `data-agent-id` + `data-server-action="start|stop|kill"`; filter attributes on the servers grid card `data-agentname`, `data-online`, `data-installed`, `data-running`; `should-confirm-btn` + `data-confirm-title`; `#add-server-btn`; `.server-search`; `#server-filter` + `.server-filter-checkbox` ids `server-filter-online|installed|running`; `#serverlist-wrapper`; `#server-count`; the `RoundTo` and `dict` template funcs.
- **Primitives consumed (defined in Phase 0, do not redefine):** `.status-rail(.online/.offline)`, `.status-lamp(.on/.run/.off/.pulse)`, `.readout(.k/.v)`, `.seg-meter > .seg-fill(.warn/.crit)`, `.tag(.ok/.no/.upd/.exp)`, `.section-head > .eyebrow/.rule/.meta`, `.mono`, `.display`.
- **Meter thresholds:** `.warn` at value ≥ 75, `.crit` at ≥ 90 (green otherwise).
- **A11y:** icon-only buttons need `aria-label`; motion behind `prefers-reduced-motion` (already in primitives).

---

### Task 1: Restyle `status-card` into a readout

**Files:**
- Modify: `templates/includes/dashboard/status-card.tmpl`
- Modify: `static/css/main.css:489-558` (the `.status-info-card ...` rules)

**Interfaces:**
- Consumes: `.readout` look; tokens.
- Produces: `status-card` renders as a readout tile but keeps its dict interface (`ClassColour`, `ClassID`, `Title`, `Data`, `Icon`) so `server-card` keeps calling it unchanged.

- [ ] **Step 1: Replace the template body of `status-card.tmpl`**

```html
{{define "includes/dashboard/status-card"}}
<div class="readout info-card-{{.ClassID}} {{.ClassColour}}">
    <div class="k">{{ if .Title }}{{.Title}}{{else}}Status{{end}}</div>
    <div class="v"><i class="fas {{.Icon}} me-1"></i>{{.Data}}</div>
</div>
{{end}}
```

- [ ] **Step 2: Replace `.status-info-card*` CSS (main.css 489–558) with color-accent-only rules**

```css
/* readout colour accents (status-card variants) */
.readout.blue   .v { color: var(--brand-bright); }
.readout.orange .v { color: var(--warn); }
.readout.green  .v { color: var(--online); }
.readout .v i { color: inherit; opacity: 0.9; }
```

(All base `.readout` styling comes from the Phase 0 primitive; only the colour variants remain here. Delete the old `.status-info-card`, `.status-info-card.blue/orange/green`, `.status-info-card-main/secondary/icon`, and `.page-header .status-info-card*` blocks.)

- [ ] **Step 3: Rebuild + verify**

`make cleancss && make run` → `/dashboard` (needs at least one started agent). Expected: the three per-card stats render as mono readout tiles (status in cyan, players neutral, mods green) instead of the old colored bars.

- [ ] **Step 4: Commit**
```bash
git add templates/includes/dashboard/status-card.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): status-card renders as readout tile"
```

---

### Task 2: Transform `server-card` into a unit panel (Dashboard)

**Files:**
- Modify: `templates/includes/dashboard/server-card.tmpl`
- Modify: `static/css/main.css` (append `.unit` panel + `.ops` button rules in a new "unit panel" section; retire the `.server-action-btn` colour rules by folding into `.op`)

**Interfaces:**
- Consumes: primitives + `status-card`.
- Produces: `.unit` card markup reused conceptually by Task 3.

- [ ] **Step 1: Replace `server-card.tmpl` body**

Keeps the `RoundTo`, `dict`, and `server-action-btn` hooks; swaps progress bars for seg-meters and layout for the unit panel:

```html
{{define "includes/dashboard/server-card"}}
<div class="col">
  {{$statusText := "Offline"}}
  {{if .Status.Online}} {{$statusText = "Online"}} {{end}}
  {{if .Status.Running}} {{$statusText = "Running"}} {{end}}
  {{if not .Status.Installed}} {{$statusText = "Not Installed"}} {{end}}
  {{$modCount := (len .ModConfig.SelectedMods)}}
  <article class="unit status-rail {{if .Status.Online}}online{{else}}offline{{end}}" id="server-card-{{.Id}}">
    <div class="unit-head">
      <div class="unit-id">
        <h5 class="unit-name">
          <span class="status-lamp {{if .Status.Online}}{{if .Status.Running}}run pulse{{else}}on{{end}}{{else}}off{{end}}"></span>
          {{.AgentName}}
        </h5>
        <span class="unit-code mono">unit {{.Id}}</span>
      </div>
      <a class="unit-cog" href="/dashboard/servers/{{.Id}}" aria-label="Configure {{.AgentName}}"><i class="fas fa-cog"></i></a>
    </div>

    <div class="readouts">
      {{template "includes/dashboard/status-card" (dict "ClassColour" "blue" "ClassID" "status" "Title" "Status" "Data" $statusText "Icon" "fa-server")}}
      {{template "includes/dashboard/status-card" (dict "ClassColour" "orange" "ClassID" "users" "Title" "Players" "Data" 0 "Icon" "fa-user")}}
      {{template "includes/dashboard/status-card" (dict "ClassColour" "green" "ClassID" "mods" "Title" "Mods" "Data" $modCount "Icon" "fa-pencil-ruler")}}
    </div>

    <div class="meters">
      <div class="meter-row">
        <span class="lbl mono">CPU</span>
        <div class="seg-meter"><div class="seg-fill {{if ge .Status.Cpu 90.0}}crit{{else if ge .Status.Cpu 75.0}}warn{{end}}" style="width: {{.Status.Cpu}}%"></div></div>
        <span class="val mono {{if ge .Status.Cpu 90.0}}crit{{else if ge .Status.Cpu 75.0}}warn{{end}}">{{RoundTo .Status.Cpu 0}}%</span>
      </div>
      <div class="meter-row">
        <span class="lbl mono">RAM</span>
        <div class="seg-meter"><div class="seg-fill {{if ge .Status.Ram 90.0}}crit{{else if ge .Status.Ram 75.0}}warn{{end}}" style="width: {{.Status.Ram}}%"></div></div>
        <span class="val mono {{if ge .Status.Ram 90.0}}crit{{else if ge .Status.Ram 75.0}}warn{{end}}">{{RoundTo .Status.Ram 0}}%</span>
      </div>
    </div>

    <div class="ops">
      <button data-agent-id="{{.Id}}" data-server-action="start" class="op start server-action-btn" {{if .Status.Running}}disabled{{end}}><i class="fas fa-play"></i>Start</button>
      <button data-agent-id="{{.Id}}" data-server-action="stop" class="op stop server-action-btn" {{if not .Status.Running}}disabled{{end}}><i class="fas fa-stop"></i>Stop</button>
      <button data-agent-id="{{.Id}}" data-server-action="kill" class="op kill server-action-btn" {{if not .Status.Running}}disabled{{end}}><span><i class="fas fa-skull-crossbones"></i>Kill</span></button>
    </div>
  </article>
</div>
{{end}}
```

- [ ] **Step 2: Append the unit-panel + ops CSS to `main.css`** (new "unit panel" section)

```css
/* ---- Unit panel ---- */
.unit {
    background: var(--panel); border: 1px solid var(--line); border-left: 0 !important;
    border-radius: 3px !important; padding: 18px 18px 16px 20px;
    display: flex; flex-direction: column; gap: 14px; margin-bottom: 16px;
    box-shadow: none !important; transition: transform .18s ease, border-color .18s ease;
}
.unit:hover { transform: translateY(-2px); border-color: var(--line-strong); }
.unit-head { display: flex; align-items: flex-start; gap: 12px; }
.unit-id { flex: 1; min-width: 0; }
.unit-name { margin: 0; font-family: var(--display); font-style: italic; text-transform: uppercase; font-size: 17px; font-weight: 800; letter-spacing: 0.02em; display: flex; align-items: center; gap: 9px; }
.unit-code { color: var(--steel); font-size: 11px; letter-spacing: 0.1em; margin-top: 5px; display: block; }
.unit-cog { width: 34px; height: 34px; flex: 0 0 auto; display: grid; place-items: center; background: var(--panel-2); border: 1px solid var(--line); color: var(--ink-dim); border-radius: 3px; text-decoration: none; }
.unit-cog:hover { color: var(--ink); border-color: var(--line-strong); }
.unit .readouts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.unit .meters { display: flex; flex-direction: column; gap: 10px; }
.unit .meter-row { display: grid; grid-template-columns: 40px 1fr 52px; align-items: center; gap: 12px; }
.unit .meter-row .lbl { font-size: 11px; letter-spacing: 0.12em; color: var(--ink-dim); text-transform: uppercase; }
.unit .meter-row .val { font-size: 13px; font-weight: 700; text-align: right; color: var(--ink); }
.unit .meter-row .val.warn { color: var(--warn); }
.unit .meter-row .val.crit { color: var(--hazard); }
.unit .ops { display: flex; gap: 8px; }
.op {
    flex: 1; height: 40px; border: 1px solid var(--line); cursor: pointer; background: var(--panel-2); color: var(--ink);
    font-family: var(--mono); font-weight: 700; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; gap: 7px;
}
.op i { margin: 0; font-size: 12px; }
.op:hover:not(:disabled) { border-color: var(--line-strong); }
.op.start { color: var(--online); border-color: color-mix(in srgb, var(--online) 32%, var(--line)); }
.op.stop  { color: var(--warn);   border-color: color-mix(in srgb, var(--warn) 30%, var(--line)); }
.op:disabled { opacity: 0.38; cursor: not-allowed; }
.op:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
.op.kill { color: #fff; border-color: color-mix(in srgb, var(--hazard) 45%, var(--line)); position: relative; overflow: hidden; }
.op.kill::before { content: ""; position: absolute; inset: 0; opacity: 0.16; background: repeating-linear-gradient(-45deg, var(--hazard) 0 9px, transparent 9px 18px); }
.op.kill span { position: relative; display: inline-flex; align-items: center; gap: 7px; }
.op.kill:hover:not(:disabled) { border-color: var(--hazard); }
```

- [ ] **Step 3: Neutralise the old `.server-action-btn` colour rules (main.css 587–599)**

Delete the `.server-action-btn { color:#fff... }`, `.server-action-btn:disabled`, `.server-action-btn i` blocks — the `.op*` rules now own these buttons. (Keep the class on the element for JS.)

- [ ] **Step 4: Rebuild + verify**

`make cleancss && make run` → `/dashboard`. Expected: each server renders as a unit panel — status rail (green online / red offline), lamp by the Exo 2 italic name, three readout tiles, segmented CPU/RAM meters that turn amber/red past 75/90, and Start/Stop/Kill with the hazard-striped Kill. Click Start/Stop on a test agent → the existing action still fires (websocket/AJAX unchanged).

- [ ] **Step 5: Commit**
```bash
git add templates/includes/dashboard/server-card.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): server-card unit panel with segmented meters"
```

---

### Task 3: Transform `small-server-card` into a compact unit panel (Servers)

**Files:**
- Modify: `templates/includes/dashboard/small-server-card.tmpl`

**Interfaces:**
- Consumes: `.unit`, primitives from Tasks 1–2.
- Produces: the servers-grid card. Preserves all filter/confirm hooks.

- [ ] **Step 1: Replace `small-server-card.tmpl` body**

Keeps `data-agentname/data-online/data-installed/data-running` (filter JS) and the delete `should-confirm-btn`:

```html
{{define "includes/dashboard/small-server-card"}}
<article class="unit status-rail {{if .Status.Online}}online{{else}}offline{{end}} server-card"
  data-agentname="{{.AgentName}}"
  data-online="{{if .Status.Online}}1{{else}}0{{end}}"
  data-installed="{{if .Status.Installed}}1{{else}}0{{end}}"
  data-running="{{if .Status.Running}}1{{else}}0{{end}}">
  <div class="unit-head">
    <div class="unit-id">
      <h5 class="unit-name">
        <span class="status-lamp {{if .Status.Online}}{{if .Status.Running}}run pulse{{else}}on{{end}}{{else}}off{{end}}"></span>
        {{.AgentName}}
      </h5>
      <span class="unit-code mono">unit {{.Id}}</span>
    </div>
    <div class="unit-actions">
      <a href="/dashboard/servers/{{.Id}}" class="unit-cog" aria-label="Configure {{.AgentName}}"><i class="fas fa-cog"></i></a>
      <a href="/dashboard/servers/delete?id={{.Id}}" class="unit-cog danger should-confirm-btn" aria-label="Delete {{.AgentName}}" data-confirm-title="Delete Agent Confirmation"><i class="fas fa-trash"></i></a>
    </div>
  </div>
  <div class="tags">
    {{if .Status.Installed}}
      <span class="tag ok"><i class="fas fa-circle-check"></i> Installed</span>
    {{else}}
      <span class="tag no"><i class="fas fa-circle-xmark"></i> Not installed</span>
    {{end}}
    {{if .Config.Version}}
      <span class="tag {{if ne .Config.Version .LatestAgentVersion}}upd{{end}}">{{.Config.Version}} / {{.LatestAgentVersion}}</span>
      <span class="tag {{if eq .ServerConfig.Branch "experimental"}}exp{{end}}">{{.ServerConfig.Branch}}</span>
    {{end}}
  </div>
</article>
{{end}}
```

- [ ] **Step 2: Add the `.unit-actions` helper CSS** (append to the unit-panel section in `main.css`)

```css
.unit-actions { display: flex; gap: 6px; flex: 0 0 auto; }
.unit-cog.danger:hover { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 50%, var(--line)); }
```

- [ ] **Step 3: Rebuild + verify filters**

`make cleancss && make run` → `/dashboard/servers`. Expected: compact unit panels with status rail, lamp+name, cog+delete, and Installed/version/branch tags. Toggle the filter dropdown switches (Online/Installed/Running) and confirm cards show/hide (the `data-*` attributes are intact). Click delete → the confirm modal still appears.

- [ ] **Step 4: Commit**
```bash
git add templates/includes/dashboard/small-server-card.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): compact unit panel for servers grid"
```

---

### Task 4: Rebuild the Servers page controls

**Files:**
- Modify: `templates/pages/dashboard/servers.tmpl`
- Modify: `static/css/main.css` (append servers-controls section)

**Interfaces:**
- Consumes: primitives; existing filter JS.
- Produces: full-width search + chips + deploy + grid. Preserves `#add-server-btn`, `.server-search`, `#server-filter`, checkbox ids, `#serverlist-wrapper`.

- [ ] **Step 1: Replace the `.row` inside `servers.tmpl` (the two-column create/list layout, current lines 13–96) with a single-column console layout**

```html
                    <div class="controls-bar">
                        <label class="ssm-search">
                            <i class="fas fa-magnifying-glass"></i>
                            <input type="text" class="server-search" placeholder="Search fleet…" aria-label="Search servers">
                        </label>
                        <div class="ssm-filters" id="server-filter">
                            <button type="button" class="chip dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"><i class="fa-solid fa-filter"></i> Filter</button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                <li class="dropdown-item"><div class="form-check form-switch"><input class="form-check-input server-filter-checkbox" role="switch" type="checkbox" id="server-filter-online" checked><label class="form-check-label" for="server-filter-online">Online</label></div></li>
                                <li class="dropdown-item"><div class="form-check form-switch"><input class="form-check-input server-filter-checkbox" role="switch" type="checkbox" id="server-filter-installed" checked><label class="form-check-label" for="server-filter-installed">Installed</label></div></li>
                                <li class="dropdown-item"><div class="form-check form-switch"><input class="form-check-input server-filter-checkbox" role="switch" type="checkbox" id="server-filter-running" checked><label class="form-check-label" for="server-filter-running">Running</label></div></li>
                            </ul>
                        </div>
                        <a href="" class="deploy-btn" id="add-server-btn"><i class="fas fa-plus"></i> Deploy Server</a>
                    </div>

                    {{if not .agents}}
                        <div class="alert alert-info">No servers yet — deploy your first server to bring a unit online.</div>
                    {{end}}
                    {{if .agents}}
                    <div class="grid" id="serverlist-wrapper">
                        {{range .agents}}
                            {{template "includes/dashboard/small-server-card" .}}
                        {{end}}
                    </div>
                    {{end}}
```

- [ ] **Step 2: Append the controls/grid CSS to `main.css`**

```css
/* ---- Servers controls ---- */
.controls-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 20px; }
.ssm-search { flex: 1 1 100%; display: flex; align-items: center; gap: 10px; background: var(--panel); border: 1px solid var(--line); border-radius: 3px; padding: 0 14px; height: 44px; }
.ssm-search:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px var(--focus); }
.ssm-search i { color: var(--steel); }
.ssm-search input { flex: 1; background: none; border: 0; outline: none; color: var(--ink); font-family: var(--mono); font-size: 13px; }
.ssm-search input::placeholder { color: var(--steel); }
.ssm-filters .chip { font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); background: var(--panel); border: 1px solid var(--line); border-radius: 3px; height: 42px; padding: 0 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.ssm-filters .chip::after { margin-left: 4px; }
.deploy-btn { margin-left: auto; height: 42px; padding: 0 18px; border: 0; background: var(--brand); color: #04222E; font-family: var(--mono); font-weight: 700; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; border-radius: 3px; display: inline-flex; align-items: center; gap: 9px; text-decoration: none; }
.deploy-btn:hover { background: var(--brand-bright); color: #04222E; }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
.grid .unit { margin-bottom: 0; }
```

- [ ] **Step 3: Rebuild + verify**

`make cleancss && make run` → `/dashboard/servers`. Expected: full-width search on its own row, a Filter chip (dropdown works) and a cyan Deploy Server button aligned right, then a responsive grid of compact unit panels. Search still filters (`.server-search` intact); `#add-server-btn` still opens the create wizard.

- [ ] **Step 4: Commit**
```bash
git add templates/pages/dashboard/servers.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): servers page console controls + grid"
```

---

### Task 5: Dashboard overview — section heads, fleet summary, needs-attention

**Files:**
- Modify: `templates/pages/dashboard/index.tmpl`
- Create: `src/client/dashboard-overview.js`
- Modify: `src/client/app.js` (require + init the module)
- Modify: `static/css/main.css` (append overview section)

**Interfaces:**
- Consumes: the rendered `server-card` DOM (each `#server-card-<id>` has a `.status-rail.online/offline`, a `.status-lamp.run`, CPU/RAM `.seg-fill[style=width]`, and a mods readout `.info-card-mods .v`).
- Produces: client-derived fleet tiles + attention list. No backend change (spec §8: aggregates are display-only).

- [ ] **Step 1: Wrap the Dashboard grid with section heads + mount points in `index.tmpl`**

Replace the `#agents-wrapper` block (current lines 14–25) with:

```html
                    {{if not .agents}}
                        <div class="alert alert-info">No servers yet — head to <a href="/dashboard/servers">Servers</a> to deploy your first one.</div>
                    {{end}}
                    {{if .agents}}
                    <div class="section-head"><span class="eyebrow">// Fleet overview</span><span class="rule"></span><span class="meta">{{len .agents}} units</span></div>
                    <div id="fleet-summary" class="fleet-summary"></div>

                    <div id="attention-head" class="section-head hidden"><span class="eyebrow">// Needs attention</span><span class="rule"></span><span class="meta" id="attention-meta"></span></div>
                    <div id="attention" class="attention"></div>

                    <div class="section-head"><span class="eyebrow">// All servers</span><span class="rule"></span></div>
                    <div id="agents-wrapper" class="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4">
                        {{range .agents}}
                            {{template "includes/dashboard/server-card" .}}
                        {{end}}
                    </div>
                    {{end}}
```

- [ ] **Step 2: Create `src/client/dashboard-overview.js`**

```javascript
// Derives fleet summary tiles + a "needs attention" list from the rendered
// server-card DOM. Display-only; no server round-trip.
function num(el) { return el ? parseFloat(el.textContent) || 0 : 0; }

function readCards() {
    return Array.prototype.map.call(document.querySelectorAll("#agents-wrapper .unit"), function (card) {
        const rail = card.classList.contains("online");
        const running = !!card.querySelector(".status-lamp.run");
        const cpuEl = card.querySelector(".meter-row .val");
        const vals = card.querySelectorAll(".meter-row .val");
        const name = (card.querySelector(".unit-name") || {}).textContent || "";
        return {
            name: name.trim(),
            online: rail,
            running: running,
            cpu: vals[0] ? num(vals[0]) : 0,
            ram: vals[1] ? num(vals[1]) : 0,
        };
    });
}

function tile(n, label, lamp) {
    return '<div class="ftile"><div class="ftile-top">' +
        (lamp ? '<span class="status-lamp ' + lamp + '"></span>' : "") +
        '<span class="ftile-n">' + n + '</span></div><span class="ftile-k">' + label + '</span></div>';
}

function render() {
    const wrap = document.getElementById("fleet-summary");
    if (!wrap) return;
    const cards = readCards();
    const online = cards.filter(function (c) { return c.online; });
    const running = cards.filter(function (c) { return c.running; });
    const offline = cards.length - online.length;

    wrap.innerHTML =
        tile(cards.length, "Servers", "") +
        tile(online.length, "Online", "on") +
        tile(running.length, "Running", "run") +
        tile(offline, "Offline", offline ? "off" : "");

    // attention
    const alerts = [];
    cards.forEach(function (c) {
        if (!c.online) alerts.push({ sev: "crit", m: c.name + " is offline", s: "Agent not reporting" });
        else if (c.ram >= 90 || c.cpu >= 90) alerts.push({ sev: "crit", m: c.name + " — " + (c.ram >= 90 ? "memory" : "CPU") + " at " + Math.max(c.ram, c.cpu) + "%", s: "Critical load" });
        else if (c.ram >= 75 || c.cpu >= 75) alerts.push({ sev: "warn", m: c.name + " under heavy load", s: "CPU " + c.cpu + "% · RAM " + c.ram + "%" });
    });
    const rank = { crit: 0, warn: 1, info: 2 };
    alerts.sort(function (a, b) { return rank[a.sev] - rank[b.sev]; });
    const att = document.getElementById("attention");
    const head = document.getElementById("attention-head");
    if (alerts.length) {
        head.classList.remove("hidden");
        document.getElementById("attention-meta").textContent = alerts.length + (alerts.length === 1 ? " item" : " items");
        att.innerHTML = alerts.map(function (a) {
            return '<div class="alert-row ' + a.sev + '"><div class="atxt"><div class="am">' + a.m + '</div><div class="as">' + a.s + '</div></div></div>';
        }).join("");
    } else {
        head.classList.add("hidden");
        att.innerHTML = "";
    }
}

module.exports = { init: function () { document.addEventListener("DOMContentLoaded", render); } };
```

- [ ] **Step 3: Wire it into `src/client/app.js`**

Add near the other requires / init calls:
```javascript
require("./dashboard-overview").init();
```

- [ ] **Step 4: Append overview CSS to `main.css`**

```css
/* ---- Dashboard overview ---- */
.fleet-summary { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 8px; }
.ftile { min-width: 110px; flex: 1; padding: 12px 16px; border: 1px solid var(--line); border-radius: 3px; background: var(--panel); display: flex; flex-direction: column; gap: 3px; }
.ftile-top { display: flex; align-items: center; gap: 8px; }
.ftile-n { font-family: var(--mono); font-size: 24px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
.ftile-k { font-family: var(--mono); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--steel); }
.attention { display: flex; flex-direction: column; gap: 8px; }
.alert-row { display: flex; align-items: center; gap: 14px; background: var(--panel); border: 1px solid var(--line); border-left: 3px solid var(--steel); border-radius: 3px; padding: 12px 14px; }
.alert-row.crit { border-left-color: var(--danger); }
.alert-row.warn { border-left-color: var(--warn); }
.alert-row .am { font-weight: 700; font-size: 14px; font-family: var(--sans); }
.alert-row .as { font-family: var(--mono); font-size: 11px; color: var(--steel); margin-top: 2px; }
.hidden { display: none; }
```

- [ ] **Step 5: Rebuild both bundles + verify**

`make bundle && make cleancss && make run` → `/dashboard`. Expected: `// Fleet overview` eyebrow + summary tiles (Servers/Online/Running/Offline with lamps), a `// Needs attention` list that appears only when a server is offline or a meter is ≥75/90 (sorted worst-first), then `// All servers` with the unit-panel grid. With all servers healthy and online, the attention section is hidden.

- [ ] **Step 6: Commit**
```bash
git add templates/pages/dashboard/index.tmpl src/client/dashboard-overview.js src/client/app.js static/js/bundle.js static/css/main.css static/css/main.min.css
git commit -m "feat(ui): dashboard overview with fleet summary + attention"
```

---

## Self-Review

**Spec coverage (spec §5 Phase 2):** server-card/small-server-card → unit panel (Tasks 2, 3) ✓; status-card → readout (Task 1) ✓; Dashboard fleet-summary tiles + needs-attention (Task 5) ✓; Servers full-width search + filter chips + Deploy (Task 4) ✓. Data bindings + filter/action JS preserved (constraints block, verified per task).

**Placeholder scan:** no TBD/TODO; full markup, CSS, and JS in every step.

**Type/name consistency:** primitive classes (`.status-rail/.status-lamp/.readout/.seg-meter/.seg-fill/.tag/.section-head`) match Phase 0 exactly; `.unit`, `.op`, `.unit-cog`, `.unit-actions`, `.readouts`, `.meters`, `.meter-row` defined in Task 2 and reused consistently in Tasks 3–5; JS reads the same class/attribute names the templates emit (`#agents-wrapper .unit`, `.status-lamp.run`, `.meter-row .val`, `.unit-name`). `RoundTo .Status.Cpu 0` matches the existing helper's arity. Kept `server-action-btn`, `should-confirm-btn`, `.server-search`, `#server-filter`, `server-filter-online/installed/running`, `#serverlist-wrapper`, `#add-server-btn`, `#server-count`.

**Note for later phases:** the `.unit`, `.op`, `.readout`, `.seg-meter`, `.tag`, `.alert-row` patterns established here are reused by Phase 3 (server-detail cards) and Phase 4 (account/integrations). The global `.card` override in `main.css:41-48` still applies to non-unit cards; Phase 3/4 decide per-surface whether to keep `.card` or move to `.unit`.
