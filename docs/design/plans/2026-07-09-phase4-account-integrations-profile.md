# Phase 4 — Account · Integrations · Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the Account (settings/users/audit + create/join), Integrations (list + detail + forms), and Profile surfaces into the cyan control-console language using the Phase 0 primitives + Bootstrap bridge, with no functional regressions.

**Architecture:** These pages are tables/forms/cards. Move each surface off the legacy Bootstrap `.card`/`--ssm-*` look onto the console primitives already shipped in Phases 0–3 (`.card2`, `.section-head`, `.readout`, `.tag`, `.field`, `.btn2`, `.icobtn`, `.set-row`, `.ssm-alert`). Two surfaces (account users/audit lists, integration event-type pills) are built client-side in `src/client/*`, so their render functions are edited to emit the new markup. No backend/route changes.

**Tech Stack:** Go `html/template`, Bootstrap 5.3 grid + offcanvas/tabs, jQuery, browserify client JS (`make bundle`), FontAwesome, the `Makefile`.

## Global Constraints

- **Depends on Phases 0–3.** Branch `feature/ui-redesign`. Single feature branch, phase-ordered commits, keep each commit green.
- **No automated tests** — verify with `make cleancss` (CSS) / `make bundle` (JS) then `make run` on `:8083` against seeded data; check each surface in the browser.
- **Build rule:** edit source CSS (`static/css/main.css`) → `make cleancss` (regenerates `static/css/main.min.css`); edit client JS (`src/client/*`) → `make bundle` (regenerates `static/js/bundle.js`). Commit the regenerated artifact alongside the source.
- **Primitives consumed (defined in Phases 0–3, DO NOT redefine):** `.card2 > .hd/.bd/.right` (+ `.card2.danger`), `.section-head > .eyebrow/.rule/.meta`, `.readout > .k/.v` (+ `.blue/.orange/.green`), `.tag` (+ `.ok/.no/.upd/.exp`), `.field` / `select.field`, `.form-foot`, `.btn2` (+ `.outline/.danger/.warn`), `.icobtn` (+ `.danger`), `.set-row > .lab/.ctl` (+ `.range-ctl`), `.ssm-alert` (+ `.warn`), `.status-lamp` (+ `.on/.run/.off/.pulse`), `.mono`, `.op` (+ `.start/.stop/.kill`).
- **Design tokens (use these, never hardcode palette):** `--void, --panel, --panel-2, --line, --line-strong, --steel, --ink, --ink-dim, --brand, --brand-deep, --brand-bright, --online, --warn, --hazard, --danger, --mono, --display, --sans, --focus`.
- **Preserve every JS/data hook exactly** (per task): `#inp-account-name`, `data-save-for`, `#join-code`, `#regen-join-code`, `#copy-join-code`, `#account-users-wrapper`, `#account-audit-types`, `#account-audit-wrapper` **with a `.row` child** (`account-page.js` appends to `#account-audit-wrapper .row`), `.account-user`, `.account-audit-item`, `.delete-user-btn`, `.copy-userinvite-btn`, `#btn-adduser`, `#inp_useremail`, `#account_csrf`, `should-confirm-btn` + `data-confirm-title`, `#canvas-add-integration`, `.add-notification-form`, `.edit-notification-form`, `.event-types-pills`, `.add-event-type`, `sel_add_event_type`, `data-event-type`, the per-event offcanvas ids, and the template funcs `dict`, `OIDtoString`, `formatDate`, `toJsonPretty`, `.csrfField`.
- **Do NOT add missing functionality.** `account-page.js` references `#btn-adduser`/`#inp_useremail`/`#account_csrf` that no template currently renders — this pre-existing gap is out of scope; keep the hooks intact but do not build the missing add-user form.
- **A11y:** icon-only buttons need `aria-label`; keep visible focus (primitives already handle it).

---

### Task 1: Account page shell + tabs + Settings

**Files:**
- Modify: `templates/pages/dashboard/account.tmpl`
- Modify: `templates/includes/account/settings.tmpl`
- Modify: `static/css/main.css` (append a `/* ---- Phase 4: account ---- */` section)

**Interfaces:**
- Consumes: `.section-head`, `.card2`, `.set-row`, `.field`, `.btn2`, `.icobtn`.
- Produces: the account tab shell + Settings pane markup; the `.acct` list styling reused by Task 2.

- [ ] **Step 1: Replace the `.account-tabs-header` block in `account.tmpl`** (lines 13–25) with a section head + console-styled tab rail. Keep the same `href="#settings|#users|#audit"` anchors and `data-bs-toggle="tab"` so the Bootstrap tab mechanism is untouched:

```html
                    <div class="section-head"><span class="eyebrow">// Account</span><span class="rule"></span></div>
                    <ul class="nav nav-tabs account-tabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <a class="nav-link" data-bs-toggle="tab" href="#settings" aria-selected="false" role="tab" tabindex="-1"><i class="fas fa-sliders me-1"></i> Settings</a>
                        </li>
                        <li class="nav-item" role="presentation">
                            <a class="nav-link" data-bs-toggle="tab" href="#users" aria-selected="false" role="tab"><i class="fas fa-users me-1"></i> Users</a>
                        </li>
                        <li class="nav-item" role="presentation">
                            <a class="nav-link active" data-bs-toggle="tab" href="#audit" aria-selected="true" role="tab"><i class="fas fa-clock-rotate-left me-1"></i> Audit</a>
                        </li>
                    </ul>
```

(Note: the original markup had no `active` class on any tab; add `active` to the Audit tab to match its `aria-selected="true"`, and add `show active` to its pane in the next step so a pane is visible on load.)

- [ ] **Step 2: In `account.tmpl`, mark the audit pane active** — change `<div class="tab-pane fade" id="audit" role="tabpanel">` to `<div class="tab-pane fade show active" id="audit" role="tabpanel">`. Leave `#settings` and `#users` panes as `tab-pane fade`.

- [ ] **Step 3: Replace the body of `includes/account/settings.tmpl`** with `.card2` + `.set-row` markup. Preserve `#inp-account-name`, `data-save-for`, `#join-code`, `#regen-join-code`, `#copy-join-code`, the delete `should-confirm-btn` + `data-confirm-title` + href:

```html
{{define "includes/account/settings"}}

<div class="card2">
    <div class="hd"><h5>Settings</h5></div>
    <div class="bd">
        <div class="set-row">
            <div class="lab">
                <b>Account Name</b>
                <span>The name for this account</span>
            </div>
            <div class="ctl">
                <div class="input-group">
                    <input id="inp-account-name" type="text" class="field" value="{{.account.AccountName}}">
                    <button class="icobtn" data-save-for="inp-account-name" aria-label="Save account name" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="Save">
                        <i class="fa-solid fa-save"></i>
                    </button>
                </div>
            </div>
        </div>
        <div class="set-row">
            <div class="lab">
                <b>Account Join Code</b>
                <span>Use this code to join the account</span>
            </div>
            <div class="ctl">
                <div class="input-group">
                    <input id="join-code" type="text" readonly class="field mono" value="{{.account.JoinCode}}">
                    <button class="icobtn" id="regen-join-code" aria-label="Generate a new join code" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="Generate a new join code">
                        <i class="fa-solid fa-rotate"></i>
                    </button>
                    <button class="icobtn" id="copy-join-code" aria-label="Copy the join code" data-bs-toggle="tooltip" data-bs-placement="bottom" data-bs-title="Copy the join code">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="card2 danger">
    <div class="hd"><h5>Danger Area</h5></div>
    <div class="bd">
        <div class="set-row">
            <div class="lab">
                <b>Delete Account</b>
                <span>This will delete the account, servers &amp; integrations. <b>This action is irreversible and all data is lost!</b></span>
            </div>
            <div class="ctl">
                <a href="/dashboard/account/delete?id={{.account.Id}}" class="btn2 outline danger should-confirm-btn" data-confirm-title="Delete Account Confirmation">
                    <i class="fas fa-trash"></i> Delete Account
                </a>
            </div>
        </div>
    </div>
</div>

{{end}}
```

- [ ] **Step 4: Append the Phase-4 account CSS to `main.css`** (console-styled tabs + the input-group so `.field` + `.icobtn` sit flush; and the account list styling used in Task 2):

```css
/* ---- Phase 4: account ---- */
.account-tabs { border: 0; gap: 6px; margin-bottom: 18px; }
.account-tabs .nav-link { font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); background: var(--panel); border: 1px solid var(--line); border-radius: 3px; padding: 9px 15px; }
.account-tabs .nav-link:hover { color: var(--ink); border-color: var(--line-strong); }
.account-tabs .nav-link.active { color: var(--brand-bright); border-color: color-mix(in srgb, var(--brand) 45%, var(--line)); background: color-mix(in srgb, var(--brand) 10%, var(--panel)); }
.set-row .ctl .input-group { flex-wrap: nowrap; }
.set-row .ctl .input-group .field { border-radius: 3px 0 0 3px; }
.set-row .ctl .input-group .icobtn { border-radius: 0; margin-left: -1px; height: 36px; width: 40px; }
.set-row .ctl .input-group .icobtn:last-child { border-radius: 0 3px 3px 0; }

/* account users + audit lists (also written by src/client/account-page.js) */
.acct-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.account-user, .account-audit-item {
    background: var(--panel) !important; border: 1px solid var(--line) !important;
    border-bottom: 1px solid var(--line) !important; border-radius: 3px !important;
    box-shadow: none !important; padding: 14px 16px !important;
}
.account-user .fa-user, .account-user .fa-user-shield { color: var(--brand-bright); }
.account-user h6 { font-family: var(--sans); font-style: normal; text-transform: none; letter-spacing: 0; font-size: 14px; margin: 0; }
.account-audit-item h5 { font-family: var(--display); font-style: italic; text-transform: uppercase; font-size: 13px; letter-spacing: 0.03em; margin: 0 0 4px; color: var(--brand-bright); }
.account-audit-item > div { font-family: var(--mono); font-size: 11.5px; color: var(--steel); }
.account-audit-item > div:last-child { color: var(--ink-dim); margin-top: 4px; }
```

- [ ] **Step 5: Build + verify** — `make cleancss && make run` → `/dashboard/account`. Expected: a `// Account` eyebrow, three console tab chips (Audit active/cyan on load), Settings pane shows two `.set-row`s (name input + save icon; readonly mono join code + regen/copy icons) and a red-bordered Danger card with an outlined-danger Delete button. The save/regen/copy tooltips + the delete confirm modal still fire.

- [ ] **Step 6: Commit**
```bash
git add templates/pages/dashboard/account.tmpl templates/includes/account/settings.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): account shell + settings console restyle"
```

---

### Task 2: Account Users + Audit (templates + client JS)

**Files:**
- Modify: `templates/includes/account/users.tmpl`
- Modify: `templates/includes/account/audit.tmpl`
- Modify: `src/client/account-page.js`

**Interfaces:**
- Consumes: `.card2`, `.section-head`, `.field`, `.icobtn`, `.acct-list`, `.account-user`, `.account-audit-item` (Task 1 CSS).
- Produces: the two dynamic panes. `#account-users-wrapper`, `#account-audit-wrapper > .row`, `#account-audit-types` preserved.

- [ ] **Step 1: Replace `includes/account/users.tmpl`** with a `.card2` wrapper; keep `#account-users-wrapper` and make it a `.acct-list`:

```html
{{define "includes/account/users"}}
<div class="card2">
    <div class="hd"><h5>Users</h5></div>
    <div class="bd">
        <div id="account-users-wrapper" class="acct-list"></div>
    </div>
</div>
{{end}}
```

- [ ] **Step 2: Replace `includes/account/audit.tmpl`** with a `.card2` wrapper + a `select.field` type filter. **Keep `#account-audit-types`, `#account-audit-wrapper`, and the inner `.row`** (the JS appends to `#account-audit-wrapper .row`):

```html
{{define "includes/account/audit"}}
<div class="card2">
    <div class="hd">
        <h5>Audit</h5>
        <div class="right">
            <label for="account-audit-types" class="mono" style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--steel);">Type</label>
            <select id="account-audit-types" class="field">
                <option value="">All</option>
                <option value="added-user">Users Added</option>
                <option value="removed-user">Users Removed</option>
                <option value="added-integration">Integrations Added</option>
                <option value="removed-integration">Integrations Removed</option>
                <option value="added-agent">Servers Added</option>
                <option value="removed-agent">Servers Removed</option>
            </select>
        </div>
    </div>
    <div class="bd">
        <div id="account-audit-wrapper">
            <div class="acct-list row"></div>
        </div>
    </div>
</div>
{{end}}
```

(The `.row` keeps the JS selector `#account-audit-wrapper .row` valid; `.acct-list` on the same element gives the grid layout. The JS appends `.col-*` children — see Step 3, which drops the Bootstrap col wrapper so grid items lay out directly.)

- [ ] **Step 3: In `src/client/account-page.js`, update `BuildAuditUI`** (currently wraps each item in a `.col-12 col-md-6 col-lg-4 col-xl-3` and an `.account-audit-item mb-3 p-3`). Replace its body so it emits a bare `.account-audit-item` (the `.acct-list` grid handles columns) while keeping the class name and content:

```javascript
    BuildAuditUI(audit) {
        const $div = $("<div/>").addClass("account-audit-item");

        let auditTypeString = "";
        switch (audit.type) {
            case "added-user":
                auditTypeString = "User Added";
                break;
            case "removed-user":
                auditTypeString = "User Removed";
                break;
            case "added-integration":
                auditTypeString = "Integration Added";
                break;
            case "removed-integration":
                auditTypeString = "Integration Removed";
                break;
            case "added-agent":
                auditTypeString = "Server Added";
                break;
            case "removed-agent":
                auditTypeString = "Server Removed";
                break;
            default:
                auditTypeString = "Unknown";
                break;
        }

        const date = new Date(audit.createdAt);

        const formatted = date.toLocaleString("en-US", {
            month: "long",
            day: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

        $div.append(`<h5 class="m-0">${auditTypeString}</h5>`);
        $div.append(`<div>${formatted}</div>`);
        $div.append(`<div>${audit.message}</div>`);
        return $div;
    }
```

- [ ] **Step 4: In `account-page.js`, update the empty-audit branch in `BuildAuditList`** so the "no events" note uses `.ssm-alert` and doesn't rely on a `.col-12`. Replace:

```javascript
            $wrapper.append(`<div class="col-12"><div class="alert alert-info">No Audit Events recorded</div></div>`);
```

with:

```javascript
            $wrapper.append(`<div class="ssm-alert warn" style="grid-column:1/-1;"><i class="fas fa-circle-info"></i> No Audit Events recorded</div>`);
```

- [ ] **Step 5: In `account-page.js`, update `BuildUserUI`** so the user card drops the Bootstrap grid padding classes (the `.account-user` CSS from Task 1 owns padding) and uses `.btn2 outline danger` for delete. Replace the two lines that set classes/markup:

Change
```javascript
        const $div = $("<div/>").addClass("account-user rounded mb-3 p-3 d-flex flex-md-row flex-column align-items-center");
```
to
```javascript
        const $div = $("<div/>").addClass("account-user d-flex flex-md-row flex-column align-items-center");
```

and change
```javascript
        const $deleteBtn = $(`<button class="btn btn-danger delete-user-btn ms-md-auto"></button>`);
```
to
```javascript
        const $deleteBtn = $(`<button class="btn2 outline danger delete-user-btn ms-md-auto"></button>`);
```

(Leave the rest of `BuildUserUI` — icon swap, tooltip, `.delete-user-btn` removal for admins — unchanged.)

- [ ] **Step 6: Build + verify** — `make bundle && make run` → `/dashboard/account`. Expected: **Audit** tab shows a card with a `select.field` Type filter and a responsive grid of audit tiles (mono date + message, cyan italic title); changing the filter refetches (`PollAccountAudit`). **Users** tab shows a grid of user rows (cyan user icon, email, outlined-danger delete; admin row shows shield icon + disabled delete). Empty audit shows the amber `.ssm-alert` note.

- [ ] **Step 7: Commit**
```bash
git add templates/includes/account/users.tmpl templates/includes/account/audit.tmpl src/client/account-page.js static/js/bundle.js
git commit -m "feat(ui): account users + audit console restyle"
```

---

### Task 3: Account Create + Join pages

**Files:**
- Modify: `templates/pages/dashboard/account-create.tmpl`
- Modify: `templates/pages/dashboard/account-join.tmpl`

**Interfaces:**
- Consumes: `.card2`, `.field`, `.btn2`, `.ssm-alert`. These are standalone pages (no nav/page-header — centered card).

- [ ] **Step 1: Replace the card block in `account-create.tmpl`** (the `<div class="card ...">` through its close, lines 7–31). Keep the POST action, `.csrfField`, `inp_accountName`, and error handling:

```html
        <div class="card2 mx-auto my-auto" style="max-width:650px;width:100%;">
            <div class="hd"><h5>Create New Account</h5></div>
            <div class="bd">
                <p>Ready to set up a new account? If not, you can join an existing account here: <a href="/dashboard/account/join">Join Account</a></p>
                <p>To create a new account please provide an account name below.</p>
                {{if .errorMessage}}
                    <div class="ssm-alert warn"><i class="fas fa-triangle-exclamation"></i> {{.errorMessage}}</div>
                {{end}}
                <form method="post" action="/dashboard/account/create">
                    {{ .csrfField }}
                    <label for="inp_accountName" class="mono" style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--steel);display:block;margin-bottom:6px;">Account Name</label>
                    <input type="text" class="field" name="inp_accountName" id="inp_accountName" placeholder="Example Account" style="width:100%;margin-bottom:16px;">
                    <button type="submit" class="btn2"><i class="fa-solid fa-plus"></i> Create Account</button>
                </form>
            </div>
        </div>
```

- [ ] **Step 2: Replace the card block in `account-join.tmpl`** (lines 7–31) analogously. Keep the POST action, `.csrfField`, `inp_joincode`:

```html
        <div class="card2 mx-auto my-auto" style="max-width:650px;width:100%;">
            <div class="hd"><h5>Join Existing Account</h5></div>
            <div class="bd">
                <p>Ready to join an account? If not, you can create a new account here: <a href="/dashboard/account/create">Create Account</a></p>
                <p>To join an account please provide the join code below.</p>
                {{if .errorMessage}}
                    <div class="ssm-alert warn"><i class="fas fa-triangle-exclamation"></i> {{.errorMessage}}</div>
                {{end}}
                <form method="post" action="/dashboard/account/join">
                    {{ .csrfField }}
                    <label for="inp_joincode" class="mono" style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--steel);display:block;margin-bottom:6px;">Join Code</label>
                    <input type="text" class="field mono" name="inp_joincode" id="inp_joincode" placeholder="Join Code" style="width:100%;margin-bottom:16px;">
                    <button type="submit" class="btn2"><i class="fa-solid fa-link"></i> Join Account</button>
                </form>
            </div>
        </div>
```

- [ ] **Step 2b: Confirm no CSS change is needed** — both pages use only existing primitives (`.card2`, `.field`, `.btn2`, `.ssm-alert`), so no `make cleancss` is required for this task.

- [ ] **Step 3: Verify** — `make run`, then visit `/dashboard/account/create` and `/dashboard/account/join` (reachable when the logged-in user has no account, or by direct URL). Expected: a centered console card with an uppercase mono field label, a `.field` input, and a cyan `.btn2` submit; a bad submit shows the amber `.ssm-alert`.

- [ ] **Step 4: Commit**
```bash
git add templates/pages/dashboard/account-create.tmpl templates/pages/dashboard/account-join.tmpl
git commit -m "feat(ui): account create + join console restyle"
```

---

### Task 4: Profile page

**Files:**
- Modify: `templates/pages/dashboard/profile.tmpl`
- Modify: `static/css/main.css` (append `/* ---- Phase 4: profile ---- */`)

**Interfaces:**
- Consumes: `.card2`, `.field`, `.btn2`, `.icobtn`, `.readout`, `.ssm-alert`.
- Produces: the profile avatar/settings card + API-keys card. Preserves both POST forms, `.csrfField`, `#inp_new_apikey`, `#refresh-new-api-key`, delete-key links.

- [ ] **Step 1: Replace the `<div class="row">…</div>` body of `profile.tmpl`** (lines 12–108) with two `.card2`s. Preserve form actions `/profile/update` and `/dashboard/profile/apikey`, both `.csrfField`, the field names (`inp_email`, `inp_password`, `inp_confirmpassword`, `token`, `inp_new_apikey`), `#refresh-new-api-key`, and the delete-key hrefs:

```html
                    <div class="row g-3">
                        <div class="col-12 col-md-4 col-lg-3">
                            <div class="card2">
                                <div class="hd"><h5>Profile</h5></div>
                                <div class="bd">
                                    <div class="text-center mb-3">
                                        <img src="/dashboard/profile/image" alt="Profile image" class="profile-avatar" width="180" height="180">
                                    </div>
                                    <form action="/profile/update" method="post">
                                        {{ .csrfField }}
                                        <label for="inp_email" class="fld-lab">Email</label>
                                        <input id="inp_email" type="text" class="field w-100 mb-3" value="{{.user.Email}}" name="inp_email">
                                        <label for="inp_password" class="fld-lab">Password</label>
                                        <input id="inp_password" type="password" class="field w-100 mb-3" value="" name="inp_password">
                                        <label for="inp_confirmpassword" class="fld-lab">Confirm Password</label>
                                        <input id="inp_confirmpassword" type="password" class="field w-100 mb-3" value="" name="inp_confirmpassword">
                                        <label for="token" class="fld-lab">2FA Code</label>
                                        <input id="token" class="field mono w-100 mb-3 text-center" type="text" name="token" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" placeholder="123456">
                                        <button type="submit" class="btn2 w-100"><i class="fas fa-save"></i> Update Settings</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                        <div class="col-12 col-md-8 col-lg-9">
                            <div class="card2">
                                <div class="hd"><h5>API Keys</h5></div>
                                <div class="bd">
                                    <label for="inp_new_apikey" class="fld-lab">Add API Key</label>
                                    <form action="/dashboard/profile/apikey" method="post">
                                        {{ .csrfField }}
                                        <div class="input-group mb-2">
                                            <input type="text" class="field mono flex-grow-1" name="inp_new_apikey" id="inp_new_apikey" value="">
                                            <button type="button" class="icobtn" aria-label="Generate a new key"><i class="fas fa-refresh" id="refresh-new-api-key"></i></button>
                                            <button class="btn2" type="submit"><i class="fas fa-plus"></i> Add Key</button>
                                        </div>
                                    </form>
                                    <p class="empty-note">If you are happy with the current API key, copy it <b>BEFORE</b> clicking Add Key.</p>

                                    {{if not .user.APIKeys }}
                                        <div class="ssm-alert warn"><i class="fas fa-circle-info"></i> There are currently no API keys set up on your account.</div>
                                    {{end}}

                                    {{range .user.APIKeys }}
                                        <div class="readout apikey-row">
                                            <div class="k"><i class="fas fa-key me-1"></i> API Key</div>
                                            <div class="v mono">API-••••{{.ShortKey}}</div>
                                            <a href="/dashboard/profile/deletekey/{{.ShortKey}}" class="icobtn danger" aria-label="Delete API key"><i class="fas fa-trash"></i></a>
                                        </div>
                                    {{end}}
                                </div>
                            </div>
                        </div>
                    </div>
```

- [ ] **Step 2: Append the profile CSS to `main.css`**:

```css
/* ---- Phase 4: profile ---- */
.fld-lab { display: block; font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--steel); margin-bottom: 6px; }
.profile-avatar { border-radius: 4px; border: 1px solid var(--line); background: var(--panel-2); padding: 10px; object-fit: contain; }
.profile-avatar-wrap { display: inline-block; }
#refresh-new-api-key { cursor: pointer; }
.apikey-row { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 12px; margin-bottom: 8px; }
.apikey-row .v { justify-self: start; }
.apikey-row .icobtn { grid-column: 3; }
.profile-avatar + form { margin-top: 4px; }
.card2 .input-group .field { border-radius: 3px 0 0 3px; }
.card2 .input-group .icobtn { border-radius: 0; height: 36px; margin-left: -1px; }
.card2 .input-group .btn2 { border-radius: 0 3px 3px 0; margin-left: -1px; height: 36px; }
```

- [ ] **Step 3: Build + verify** — `make cleancss && make run` → `/dashboard/profile`. Expected: left console card with avatar in a framed tile, mono uppercase field labels, `.field` inputs, cyan full-width Update button; right console card with an API-key input group (mono field + generate icon + cyan Add Key) and existing keys as `.readout` rows with a danger delete icon. Generate-key JS still populates the field; delete-key link still works. **Note:** the original used `value="<%=user.email%>"` (an un-rendered EJS artifact) — this step swaps it to the correct Go binding `{{.user.Email}}`; confirm the email prefills.

- [ ] **Step 4: Commit**
```bash
git add templates/pages/dashboard/profile.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): profile page console restyle"
```

---

### Task 5: Integrations list + card + add form (offcanvas)

**Files:**
- Modify: `templates/pages/dashboard/integrations.tmpl`
- Modify: `templates/includes/components/integration-card.tmpl`
- Modify: `templates/includes/components/add-integration-form.tmpl`
- Modify: `static/css/main.css` (append `/* ---- Phase 4: integrations ---- */`)

**Interfaces:**
- Consumes: `.card2`, `.section-head`, `.tag`, `.field`, `.btn2`, `.icobtn`, `.ssm-alert`.
- Produces: the integrations list + the `.int-row` card + the offcanvas add-form. Preserves `#canvas-add-integration`, `.add-notification-form`, `.event-types-pills`, `.add-event-type`, `sel_add_event_type`, `dict`, `OIDtoString`.

- [ ] **Step 1: Replace the `.row` body of `integrations.tmpl`** (lines 15–36) with a section head + Deploy-style add button + list. Keep the offcanvas trigger attributes:

```html
                    <div class="section-head">
                        <span class="eyebrow">// Integrations</span>
                        <span class="rule"></span>
                        <button class="btn2" type="button" data-bs-toggle="offcanvas" data-bs-target="#canvas-add-integration" aria-controls="canvas-add-integration">
                            <i class="fa-solid fa-plus"></i> Add Integration
                        </button>
                    </div>

                    {{if not .integrations}}
                        <div class="ssm-alert warn"><i class="fas fa-circle-info"></i> It looks like you have no integrations set up yet!</div>
                    {{end}}

                    <div class="int-list">
                        {{range $integration := .integrations}}
                            {{template "includes/components/integration-card" (dict "integration" $integration) }}
                        {{end}}
                    </div>
```

- [ ] **Step 2: Replace the body of `integration-card.tmpl`** with an `.int-row` (keeps the type icon, name, URL, event-type count as a `.tag`, and the view link):

```html
{{define "includes/components/integration-card"}}
{{$integration:=.integration}}

<a class="int-row" href="/dashboard/integrations/{{OIDtoString $integration.ID}}">
    <span class="int-icon">
        {{if eq $integration.Type 0}}<i class="fa-solid fa-plug"></i>
        {{else if eq $integration.Type 1}}<i class="fa-brands fa-discord"></i>{{end}}
    </span>
    <span class="int-name">{{$integration.Name}}</span>
    <span class="int-url mono">{{$integration.Url}}</span>
    <span class="tag">{{len $integration.EventTypes}} events</span>
    <span class="int-go"><i class="fa-solid fa-chevron-right"></i></span>
</a>

{{end}}
```

(`fa-webhook` is a Pro-only FA icon; swap to the free `fa-plug`. The whole row is now the link, so the separate view button is dropped.)

- [ ] **Step 3: Restyle `add-integration-form.tmpl`** to console fields. Keep `.add-notification-form`, `.csrfField`, field ids (`name`, `type`, `url`), `.event-types-pills`, `sel_add_event_type`, `.add-event-type`, and the `$globalEventTypes` range:

```html
{{define "includes/components/add-integration-form"}}

{{$globalEventTypes := .globalEventTypes}}

<form action="/dashboard/integrations/add" method="post" class="add-notification-form int-form">
    {{ .csrfField }}
    <label for="name" class="fld-lab">Integration Name</label>
    <input class="field w-100 mb-3" type="text" name="name" id="name" value="">

    <label for="type" class="fld-lab">Integration Type</label>
    <select name="type" id="type" class="field w-100 mb-3">
        <option value="0">Webhook</option>
        <option value="1">Discord</option>
    </select>

    <label for="url" class="fld-lab">Integration URL</label>
    <input class="field w-100 mb-3" type="text" name="url" id="url" value="">

    <label class="fld-lab">Selected Event Types</label>
    <div class="event-types-pills tag-wrap mb-3"></div>

    <label class="fld-lab">Add Event Types</label>
    <div class="input-group mb-3">
        <select name="sel_add_event_type" id="sel_add_event_type" class="field flex-grow-1">
            {{range $i, $e := $globalEventTypes}}
                <option value="{{$e}}">{{$e}}</option>
            {{end}}
        </select>
        <button class="icobtn add-event-type" aria-label="Add event type"><i class="fas fa-plus"></i></button>
    </div>

    <button class="btn2 w-100"><i class="fas fa-plus"></i> Add Integration</button>
</form>

{{end}}
```

- [ ] **Step 4: Update the `.add-event-type` pill-append markup in `src/client/app.js`** (lines ~201–206) so JS-added pills match the `.tag` look and stay removable via the existing `.event-types-pills svg` handler. Replace the appended template:

```javascript
            $pillWrapper.append(`
            <span class="tag" data-event-type="${$select.val()}">
                ${$select.find("option:selected").text()}
                <i class="fas fa-times ms-1"></i>
            </span>
            `);
```

(The removal handler `.on("click", ".event-types-pills svg", …)` still targets the rendered `<i>`→svg; `data-event-type` is preserved for form submit. This same markup is mirrored by the template pills in Task 6.)

- [ ] **Step 5: Append integrations CSS to `main.css`**:

```css
/* ---- Phase 4: integrations ---- */
.int-list { display: flex; flex-direction: column; gap: 10px; }
.int-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--panel); border: 1px solid var(--line); border-radius: 3px; text-decoration: none; color: var(--ink); transition: border-color .15s, transform .15s; }
.int-row:hover { border-color: var(--line-strong); transform: translateY(-1px); color: var(--ink); }
.int-icon { width: 36px; height: 36px; flex: 0 0 auto; display: grid; place-items: center; background: var(--panel-2); border: 1px solid var(--line); border-radius: 3px; color: var(--brand-bright); }
.int-name { font-family: var(--display); font-style: italic; text-transform: uppercase; font-size: 14px; font-weight: 800; letter-spacing: 0.02em; flex: 0 0 auto; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.int-url { color: var(--steel); font-size: 12px; flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.int-go { color: var(--ink-dim); flex: 0 0 auto; }
.int-form .input-group { flex-wrap: nowrap; }
.int-form .input-group .field { border-radius: 3px 0 0 3px; }
.int-form .input-group .icobtn { border-radius: 0 3px 3px 0; height: 36px; margin-left: -1px; }
.tag-wrap { display: flex; flex-wrap: wrap; gap: 6px; min-height: 20px; }
.tag-wrap .tag { cursor: default; }
.tag-wrap .tag i { cursor: pointer; opacity: 0.7; }
.tag-wrap .tag i:hover { opacity: 1; color: var(--danger); }
/* offcanvas → console panel */
.offcanvas { background: var(--panel) !important; color: var(--ink) !important; border-left: 1px solid var(--line) !important; }
.offcanvas .offcanvas-header { border-bottom: 1px solid var(--line); }
.offcanvas .offcanvas-title { font-family: var(--display); font-style: italic; text-transform: uppercase; font-size: 15px; letter-spacing: 0.03em; }
.offcanvas .btn-close { filter: invert(1) grayscale(1); opacity: 0.6; }
.offcanvas .btn-close:hover { opacity: 1; }
```

- [ ] **Step 6: Build both + verify** — `make bundle && make cleancss && make run` → `/dashboard/integrations`. Expected: a `// Integrations` head with a cyan Add Integration button that opens the right-side offcanvas (now a console panel with mono field labels, `.field` inputs, `.tag` pills, cyan submit). Each integration renders as an `.int-row` (icon + italic name + mono URL + events `.tag` + chevron) linking to its detail page. Adding an event type in the form appends a `.tag` pill; clicking its ✕ removes it. Empty state shows the amber alert.

- [ ] **Step 7: Commit**
```bash
git add templates/pages/dashboard/integrations.tmpl templates/includes/components/integration-card.tmpl templates/includes/components/add-integration-form.tmpl src/client/app.js static/js/bundle.js static/css/main.css static/css/main.min.css
git commit -m "feat(ui): integrations list + add-form console restyle"
```

---

### Task 6: Integration detail — update form + event cards + details

**Files:**
- Modify: `templates/pages/dashboard/integration.tmpl`
- Modify: `templates/includes/components/update-integration-form.tmpl`
- Modify: `templates/includes/components/integration-event-card.tmpl`
- Modify: `templates/includes/components/integration-event-details.tmpl`
- Modify: `static/css/main.css` (append to the integrations section)

**Interfaces:**
- Consumes: `.card2`, `.section-head`, `.tag`, `.field`, `.btn2`, `.readout`, `.int-row`, `.tag-wrap` (Task 5), `.term`, `.ssm-alert`.
- Produces: the detail page. Preserves `.edit-notification-form`, `.event-types-pills` + `data-event-type`, `.add-event-type`, per-event offcanvas ids, `should-confirm-btn`, `OIDtoString`, `formatDate`, `toJsonPretty`.

- [ ] **Step 1: Replace the two `.row` blocks in `integration.tmpl`** (lines 15–36) with a section head + the update form + an events section head + list. Keep the `dict` calls and the range over `.integrationEvents`:

```html
                    {{template "includes/components/update-integration-form" (dict "integration" .integration "globalEventTypes" $globalEventTypes)}}

                    <div class="section-head"><span class="eyebrow">// Integration events</span><span class="rule"></span><span class="meta">{{len .integrationEvents}} events</span></div>
                    {{if not .integrationEvents}}
                        <div class="ssm-alert warn"><i class="fas fa-circle-info"></i> It looks like you have no integration events yet!</div>
                    {{end}}
                    <div class="int-list">
                        {{range $event := .integrationEvents}}
                            {{template "includes/components/integration-event-card" (dict "event" $event)}}
                        {{end}}
                    </div>
```

- [ ] **Step 2: Restyle `update-integration-form.tmpl`** to a `.card2`. Keep `.edit-notification-form`, action URL, `.csrfField`, ids (`name`, `type`, `url`, `sel_add_event_type`), `.event-types-pills` with `data-event-type`, `.add-event-type`, and the delete `should-confirm-btn`. Render existing pills as `.tag` (matching the JS-added markup from Task 5 Step 4):

```html
{{define "includes/components/update-integration-form"}}

{{$integration:=.integration}}
{{$globalEventTypes := .globalEventTypes}}

<div class="card2">
    <div class="hd"><h5>Update Integration</h5></div>
    <div class="bd">
        <form action="/dashboard/integrations/{{OIDtoString $integration.ID}}/update" method="post" class="edit-notification-form int-form">
            {{ .csrfField }}
            <div class="row g-3">
                <div class="col-12 col-lg-6">
                    <label for="name" class="fld-lab">Integration Name</label>
                    <input class="field w-100 mb-3" type="text" name="name" id="name" value="{{$integration.Name}}">

                    <label for="type" class="fld-lab">Integration Type</label>
                    <select name="type" id="type" class="field w-100 mb-3">
                        <option value="0" {{if eq $integration.Type 0}}selected{{end}}>Webhook</option>
                        <option value="1" {{if eq $integration.Type 1}}selected{{end}}>Discord</option>
                    </select>

                    <label for="url" class="fld-lab">Integration URL</label>
                    <input class="field w-100 mb-3" type="text" name="url" id="url" value="{{$integration.Url}}">
                </div>
                <div class="col-12 col-lg-6">
                    <label class="fld-lab">Selected Event Types</label>
                    <div class="event-types-pills tag-wrap mb-3">
                        {{range $i, $e := $integration.EventTypes}}
                            <span class="tag" data-event-type="{{$e}}">{{$e}}<i class="fas fa-times ms-1"></i></span>
                        {{end}}
                    </div>

                    <label class="fld-lab">Add Event Types</label>
                    <div class="input-group mb-3">
                        <select name="sel_add_event_type" id="sel_add_event_type" class="field flex-grow-1">
                            {{range $e := $globalEventTypes}}
                                {{$found := false}}
                                {{range $eventType := $integration.EventTypes}}
                                    {{if eq $e $eventType}}{{$found = true}}{{end}}
                                {{end}}
                                {{if not $found}}<option value="{{$e}}">{{$e}}</option>{{end}}
                            {{end}}
                        </select>
                        <button class="icobtn add-event-type" aria-label="Add event type"><i class="fas fa-plus"></i></button>
                    </div>
                </div>
            </div>
            <div class="form-foot" style="display:flex;justify-content:space-between;">
                <button class="btn2"><i class="fas fa-save"></i> Update Integration</button>
                <a href="/dashboard/integrations/{{OIDtoString $integration.ID}}/delete" class="btn2 outline danger should-confirm-btn" data-confirm-title="Delete Integration"><i class="fas fa-trash"></i> Delete Integration</a>
            </div>
        </form>
    </div>
</div>

{{end}}
```

- [ ] **Step 3: Replace the card body in `integration-event-card.tmpl`** (lines 4–47, the visible card — keep the offcanvas block lines 49–57 intact) with an `.int-row` carrying an event-status `.tag`. Keep the offcanvas trigger `data-bs-target` id and the `OIDtoString`/`formatDate` funcs:

```html
{{define "includes/components/integration-event-card"}}
{{$event:=.event}}

<a class="int-row event-row" data-bs-toggle="offcanvas" data-bs-target="#canvas-view-integration-event-{{OIDtoString $event.ID}}" aria-controls="canvas-view-integration-event-{{OIDtoString $event.ID}}">
    <span class="int-name">{{$event.EventType}}</span>
    {{if eq $event.Status "pending"}}<span class="tag"><i class="fa-solid fa-clock"></i> Pending</span>
    {{else if eq $event.Status "processing"}}<span class="tag upd"><i class="fa-solid fa-rotate fa-spin-pulse"></i> Processing</span>
    {{else if eq $event.Status "sent"}}<span class="tag ok"><i class="fa-solid fa-circle-check"></i> Succeeded</span>
    {{else if eq $event.Status "failed"}}<span class="tag no"><i class="fa-solid fa-circle-xmark"></i> Failed</span>{{end}}
    <span class="int-url mono">Attempts: {{$event.Attempts}} / 5</span>
    <span class="mono" style="color:var(--steel);font-size:12px;flex:0 0 auto;">{{formatDate $event.CreatedAt}}</span>
    <span class="int-go"><i class="fa-solid fa-chevron-right"></i></span>
</a>

<div class="offcanvas offcanvas-bottom" tabindex="-1" id="canvas-view-integration-event-{{OIDtoString $event.ID}}" aria-labelledby="canvas-view-integration-event-{{OIDtoString $event.ID}}-label">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title" id="canvas-view-integration-event-{{OIDtoString $event.ID}}-label">Event Details</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
    </div>
    <div class="offcanvas-body">
        {{template "includes/components/integration-event-details" (dict "event" $event)}}
    </div>
</div>

{{end}}
```

- [ ] **Step 4: Restyle `integration-event-details.tmpl`** — request/response readouts + `.term` for the JSON payloads (`.term` from Phase 3 is the terminal readout). Keep `formatDate`, `toJsonPretty`, the status branches:

```html
{{define "includes/components/integration-event-details"}}
{{$event:=.event}}

<div class="row g-3">
    <div class="col-12 col-md-6">
        <div class="section-head"><span class="eyebrow">// Request</span><span class="rule"></span></div>
        <div class="readout mb-2"><div class="k">Request URL</div><div class="v mono">{{$event.URL}}</div></div>
        <div class="readout mb-2"><div class="k">Status</div><div class="v">
            {{if eq $event.Status "pending"}}<span class="tag"><i class="fa-solid fa-clock"></i> Pending</span>
            {{else if eq $event.Status "processing"}}<span class="tag upd"><i class="fa-solid fa-rotate fa-spin-pulse"></i> Processing</span>
            {{else if eq $event.Status "sent"}}<span class="tag ok"><i class="fa-solid fa-circle-check"></i> Succeeded</span>
            {{else if eq $event.Status "failed"}}<span class="tag no"><i class="fa-solid fa-circle-xmark"></i> Failed</span>{{end}}
        </div></div>
        <div class="readout mb-2"><div class="k">Date</div><div class="v mono">{{formatDate $event.CreatedAt}}</div></div>
        <div class="readout mb-3"><div class="k">Attempts</div><div class="v mono">{{$event.Attempts}} / 5</div></div>
        <pre class="term">{{toJsonPretty $event.Payload}}</pre>
    </div>
    <div class="col-12 col-md-6">
        <div class="section-head"><span class="eyebrow">// Response</span><span class="rule"></span></div>
        <div class="readout mb-3"><div class="k">Status Code</div><div class="v mono">{{$event.ResponseCode}}</div></div>
        <pre class="term">{{toJsonPretty $event.Response}}</pre>
    </div>
</div>
{{end}}
```

- [ ] **Step 5: Append the event-row CSS to `main.css`** (a few overrides on `.int-row` for the event variant so the status tag + attempts read well):

```css
.int-row.event-row .int-name { max-width: 200px; }
.int-row.event-row .tag { flex: 0 0 auto; }
.offcanvas-bottom { height: 60vh; }
.offcanvas-bottom .term { height: auto; max-height: 34vh; }
```

- [ ] **Step 6: Build + verify** — `make cleancss && make run` → open an integration from `/dashboard/integrations`. Expected: the Update card (console fields, existing event types as `.tag` pills with removable ✕, cyan Update + outlined-danger Delete). Below, a `// Integration events` head and a list of `.int-row` events (type + status `.tag` in ok/no/upd colors + attempts + date + chevron); clicking one opens the bottom offcanvas with request/response readouts and JSON in `.term` blocks. Adding/removing event types still submits correctly (`data-event-type` intact); Delete still confirms.

- [ ] **Step 7: Commit**
```bash
git add templates/pages/dashboard/integration.tmpl templates/includes/components/update-integration-form.tmpl templates/includes/components/integration-event-card.tmpl templates/includes/components/integration-event-details.tmpl static/css/main.css static/css/main.min.css
git commit -m "feat(ui): integration detail + events console restyle"
```

---

## Self-Review

**Spec coverage (design §5 Phase 4):**
- `account.tmpl` + `includes/account/{settings,users,audit}` → Tasks 1–2 ✓
- `account-create.tmpl`, `account-join.tmpl` → Task 3 ✓
- `profile.tmpl` → Task 4 ✓
- `integrations.tmpl`, `integration.tmpl`, `includes/components/{integration-card, integration-event-card, integration-event-details, add-integration-form, update-integration-form}` → Tasks 5–6 ✓
- "Mostly tables/forms/cards on Phase 0 primitives + Bootstrap bridge" — every surface moved onto `.card2`/`.readout`/`.field`/`.btn2`/`.tag`/`.section-head`; no new primitive invented, only thin layout classes (`.acct-list`, `.int-row`, `.apikey-row`, `.tag-wrap`, `.fld-lab`) ✓

**JS/data hooks preserved:** account (`#inp-account-name`, `data-save-for`, `#join-code`, `#regen-join-code`, `#copy-join-code`, `#account-users-wrapper`, `#account-audit-types`, `#account-audit-wrapper .row`, `.account-user`, `.account-audit-item`, `.delete-user-btn`); integrations (`#canvas-add-integration`, `.add-notification-form`, `.edit-notification-form`, `.event-types-pills`, `.add-event-type`, `sel_add_event_type`, `data-event-type`, per-event offcanvas ids, `should-confirm-btn`). The pill markup was changed in BOTH the template (Task 6 Step 2) and the JS append (Task 5 Step 4) so they stay identical, and the removal handler (`.event-types-pills svg`) still matches the rendered `<i>`→svg. The audit `.row` child is retained for `#account-audit-wrapper .row`.

**Placeholder scan:** no TBD/TODO; every step has full markup/CSS/JS.

**Type/name consistency:** `.acct-list` grid + `.account-user`/`.account-audit-item` styled in Task 1, emitted by Task 2 templates + JS; `.int-row`/`.int-list`/`.tag-wrap`/`.int-form` defined in Task 5 and reused in Task 6; `.fld-lab` defined in Task 4, reused in Tasks 5–6 (Task 4 ships first, so it exists before reuse); `.term` reused from Phase 3. `.card2 .input-group` flush-control rules are defined once (Task 4) and apply to the profile + integration forms.

**Ordering note:** Task 4 introduces `.fld-lab` and `.card2 .input-group` rules that Tasks 5–6 reuse — keep the task order (1→6) so each commit is self-consistent. If executed out of order, move the `.fld-lab` rule into whichever task ships first.

**Build discipline:** CSS-only tasks run `make cleancss`; JS-touching tasks (2, 5) run `make bundle`; Task 3 needs neither build (template-only, existing primitives). Every task commits the regenerated `*.min.css` / `bundle.js` with its source.
