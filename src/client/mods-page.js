const ws = require("./ws");

// Mods manager for the server-detail "Mods" tab.
//
// Every mutating click PREVIEWS first: the backend resolves the real dependency
// closure and answers with exactly what would change (added/removed/changed,
// dependencies flagged). The user confirms in a dialog, and the sync task the
// apply enqueues is then visible in the banner above the list — running with
// progress, deferred until the next restart, or dead with its error and a retry.
// Nothing about a mod change is allowed to happen invisibly.
//
// Mod data arrives over the dashboard websocket (action "console.agent.mods")
// and is re-requested every 5s, so a mod that finishes installing on the agent
// flips its buttons/tags without a page reload.
class ModsPage {
    constructor() {
        this.page = 0;

        this.sort = "az";
        this.direction = "asc";

        this.search = "";

        this.mods = [];
        // The agent's whole selection, flat: direct picks AND resolver-pulled
        // dependencies. Entries are AgentMod (snake_case over the wire).
        this.agentMods = [];
        this.totalMods = 0;
        this.pages = 0;

        // The change currently being previewed/applied, so the confirm buttons
        // can re-send it as an apply.
        this.pendingChange = null;
        this.awaitingPreview = false;
        this.awaitingApplyPending = false;

        this.tasks = [];

        this.pollInterval = 5000;
    }

    init() {
        if ($(".mod-list").length === 0) {
            return;
        }

        this.agentId = window.location.href.substring(
            window.location.href.lastIndexOf("/") + 1,
        );

        ws.addEventListener("console.agent.mods", (event) => {
            this.onModsReceived(event);
        });
        ws.addEventListener("console.agent.mods.preview", (event) => {
            this.onPreviewReceived(event);
        });
        ws.addEventListener("console.agent.mods.apply", (event) => {
            this.onApplyReceived(event);
        });
        ws.addEventListener("console.agent.tasks", (event) => {
            this.onTasksReceived(event);
        });

        // The websocket reports failures as a bare "error" frame with no
        // correlation id. While a preview/apply of ours is in flight, that
        // error is ours — an unresolvable selection ("requires SF >= 1.1") must
        // land in front of the user, never in a swallowed catch.
        ws.addEventListener("error", (event) => {
            // The banner's apply-now has no modal to render an error into, so it
            // toasts instead. Swallowing it would leave the user staring at a
            // "Mods pending" banner that never moves.
            if (this.awaitingApplyPending) {
                this.awaitingApplyPending = false;
                toastr.error(
                    String(event.detail || "Mod change failed"),
                    "Could not apply the pending mod change",
                );
                return;
            }

            if (!this.awaitingPreview) return;
            this.awaitingPreview = false;
            this.previewError = String(event.detail || "Mod change failed");
            this.previewData = null;
            this.RenderApplyModal();
        });

        this.timer = setInterval(() => {
            this.RequestMods();
        }, this.pollInterval);

        this.RequestMods();
    }

    // Ask the backend for the current page/sort/search over the websocket.
    // The response arrives asynchronously via onModsReceived.
    RequestMods = () => {
        if (!this.agentId) {
            this.agentId = window.location.href.substring(
                window.location.href.lastIndexOf("/") + 1,
            );
        }

        const f = this.FilterState();

        ws.send({
            action: "console.agent.mods",
            agentId: this.agentId,
            page: this.page,
            sort: this.sort,
            direction: this.direction,
            search: this.search,
            filterAvailable: f.available,
            filterInstalled: f.installed,
            onlyUpdatable: f.onlyUpdatable,
            includeHidden: f.includeHidden,
        });

        // The server-console panel polls the task list every second on this same
        // page, and we render off the same event. Only ask for it ourselves when
        // that panel is not present, so the mods tab still shows its sync banner.
        if ($(".server-console").length === 0) {
            ws.send({
                action: "console.agent.tasks",
                agentId: this.agentId,
            });
        }
    };

    // Read the offcanvas filter checkboxes. Filtering is done server-side, so
    // these values are sent with every request. Missing checkboxes fall back to
    // the defaults (show available + installed, no update-only, hide hidden).
    FilterState() {
        const checked = (id, def) => {
            const $el = $(id);
            return $el.length === 0 ? def : $el.prop("checked");
        };

        return {
            available: checked("#check-available", true),
            installed: checked("#check-installed", true),
            onlyUpdatable: checked("#check-only-updatable", false),
            includeHidden: checked("#check-show-hidden", false),
        };
    }

    // Kept as the public entry point used by app.js (sort/search/settings-save)
    // — a view update is a fresh websocket request.
    UpdateView = () => {
        this.RequestMods();
    };

    // AgentMod arrives with protobuf's Go json tags (snake_case), while the
    // preview's ChangedMod uses camelCase. Read both rather than depending on
    // which side of that line a field happens to fall.
    static Field(obj, snake, camel) {
        if (obj == null) return undefined;
        return obj[snake] !== undefined ? obj[snake] : obj[camel];
    }

    AgentMod(modReference) {
        return this.agentMods.find(
            (am) => ModsPage.Field(am, "mod_reference", "modReference") == modReference,
        );
    }

    onModsReceived = (event) => {
        if ($(".mod-list").length === 0) return;

        const detail = event.detail || {};

        this.mods = detail.mods || [];
        this.pages = detail.pages || 0;
        this.totalMods = detail.totalMods || 0;
        this.agentMods = detail.agentMods || [];

        for (let i = 0; i < this.mods.length; i++) {
            const mod = this.mods[i];
            mod.installed = false;
            mod.needsUpdate = false;
            mod.installedVersion = "";
            mod.desiredVersion = "";
            mod.latestVersion = "";
            mod.direct = false;
            mod.pendingInstall = false;

            const agentMod = this.AgentMod(mod.mod_reference);
            if (agentMod == null) continue;

            mod.installed = !!agentMod.installed;
            mod.needsUpdate = !!ModsPage.Field(agentMod, "needs_update", "needsUpdate");
            mod.installedVersion =
                ModsPage.Field(agentMod, "installed_version", "installedVersion") || "";
            mod.desiredVersion =
                ModsPage.Field(agentMod, "desired_version", "desiredVersion") || "";
            mod.latestVersion =
                ModsPage.Field(agentMod, "latest_version", "latestVersion") || "";
            mod.direct = !!agentMod.direct;
            // Selected at a version the agent has not got on disk yet.
            mod.pendingInstall =
                mod.desiredVersion != "" && mod.desiredVersion != mod.installedVersion;
        }

        this.BuildPagination();
        this.RenderMods();
        this.RenderUpdateAll();

        // The dashboard's server card counts DIRECT mods only — the ones the
        // user chose. Counting resolver-pulled dependencies here would make the
        // two disagree.
        const directCount = this.agentMods.filter((am) => !!am.direct).length;
        $("#mod-count").text(`${directCount} / ${this.totalMods}`);
    };

    // "Update all" is only meaningful when something is actually behind.
    RenderUpdateAll = () => {
        const $btn = $("#mods-update-all-btn");
        if ($btn.length === 0) return;

        const any = this.agentMods.some(
            (am) => !!ModsPage.Field(am, "needs_update", "needsUpdate"),
        );
        $btn.toggleClass("hidden", !any);
        $btn.attr("data-agentid", this.agentId);
    };

    // A compact fingerprint of everything BuildModCard renders for a mod. Used
    // to decide whether a already-rendered card can be reused as-is.
    ModSignature(mod) {
        const latest =
            (mod.versions && mod.versions[0] && mod.versions[0].version) || "";
        return [
            mod.mod_name || "",
            mod.installed ? 1 : 0,
            mod.needsUpdate ? 1 : 0,
            mod.pendingInstall ? 1 : 0,
            mod.installedVersion,
            mod.desiredVersion,
            mod.latestVersion,
            latest,
            mod.logo_url || "",
        ].join("|");
    }

    // Reconcile the rendered mod cards against the current data. Cards whose
    // fingerprint is unchanged are reused in place (their <img> is never
    // re-fetched), so the 5s live poll doesn't flicker or re-download images.
    RenderMods = () => {
        const $wrapper = $(".mod-list .row");
        if ($wrapper.length === 0) return;
        const wrapperEl = $wrapper[0];

        // Index currently-rendered cards by mod reference.
        const prev = {};
        wrapperEl.querySelectorAll(".mod[data-mod-reference]").forEach((el) => {
            prev[el.getAttribute("data-mod-reference")] = el;
        });

        // Build the new ordered set, reusing unchanged nodes.
        const frag = document.createDocumentFragment();
        for (let i = 0; i < this.mods.length; i++) {
            const mod = this.mods[i];
            const sig = this.ModSignature(mod);
            const existing = prev[mod.mod_reference];

            let node;
            if (existing && existing.getAttribute("data-sig") === sig) {
                node = existing; // reuse untouched -> no image reload
            } else {
                node = this.BuildModCard(mod)[0];
            }
            delete prev[mod.mod_reference];
            frag.appendChild(node); // moves reused nodes out of the DOM
        }

        // replaceChildren drops any stale cards left in the wrapper and inserts
        // the freshly ordered set (reused nodes carried over via the fragment).
        wrapperEl.replaceChildren(frag);
    };

    BuildPagination = () => {
        const $pagination = $("#mods-pagination");
        $pagination.empty();

        const prevButtonDisabled = this.page === 0 ? "disabled" : "";
        const nextButtonDisabled =
            this.page === this.pages - 1 ? "disabled" : "";

        const $prevButton = $(`
        <li class="page-item ${prevButtonDisabled}">
            <a class="page-link mod-page-prev h-100"><i class="fa-solid fa-chevron-left mt-1"></i></a>
        </li>
    `);

        const $nextButton = $(`
        <li class="page-item ${nextButtonDisabled}">
            <a class="page-link mod-page-next h-100"><i class="fa-solid fa-chevron-right mt-1"></i></a>
        </li>
    `);

        $pagination.append($prevButton);

        const totalPages = this.pages;
        const currentPage = this.page + 1; // convert to 1-based
        const delta = 2; // how many pages to show around the current one
        const range = [];
        const rangeWithDots = [];
        let l;

        // Build range of page numbers to show
        for (let i = 1; i <= totalPages; i++) {
            if (
                i === 1 ||
                i === totalPages ||
                (i >= currentPage - delta && i <= currentPage + delta)
            ) {
                range.push(i);
            }
        }

        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l > 2) {
                    rangeWithDots.push("...");
                }
            }
            rangeWithDots.push(i);
            l = i;
        }

        // Render pagination items
        rangeWithDots.forEach((i) => {
            if (i === "...") {
                $pagination.append(`
                <li class="page-item disabled"><span class="page-link">…</span></li>
            `);
            } else {
                const active = i === currentPage ? "active" : "";
                $pagination.append(`
                <li class="page-item ${active}">
                    <a class="page-link mod-page" data-page="${i - 1}">${i}</a>
                </li>
            `);
            }
        });

        $pagination.append($nextButton);
    };

    PreviousPage() {
        if (this.page > 0) {
            this.page--;
        }

        this.UpdateView();
    }

    NextPage() {
        if (this.page < this.pages - 1) {
            this.page++;
        }

        this.UpdateView();
    }

    GoToPage(page) {
        if (page < 0) return;
        if (page > this.pages - 1) return;

        this.page = page;

        this.UpdateView();
    }

    // Console-native mod row. Preserves every hook app.js delegates on:
    // .install-mod-btn / .update-mod-btn / .uninstall-mod-btn / .settings-mod-btn
    // each with data-agentid + data-mod-reference. The update button also carries
    // the version it would move to, so the preview can be sent without a lookup.
    BuildModCard(mod) {
        const $row = $(
            `<div class="mod" data-mod-reference="${mod.mod_reference}" data-sig="${this.ModSignature(mod)}"></div>`,
        );

        const logo =
            mod.logo_url == "" || mod.logo_url == null
                ? "https://ficsit.app/images/no_image.webp"
                : mod.logo_url;
        $row.append(`<div class="thumb"><img src="${logo}" alt=""/></div>`);

        const $info = $(`<div class="info"></div>`);
        $info.append(
            `<b><a href="https://ficsit.app/mod/${mod.mod_reference}" target="_blank" rel="noopener">${mod.mod_name}</a></b>`,
        );

        const $tags = $(`<span class="mod-tags"></span>`);
        $tags.append(
            $("<span/>")
                .addClass("tag")
                .text(`v${(mod.versions[0] && mod.versions[0].version) || "?"}`),
        );

        if (mod.installed) {
            $tags.append(
                $("<span/>").addClass("tag ok").text(`v${mod.installedVersion}`),
            );
        }

        if (mod.needsUpdate) {
            // The version move, spelled out: an "Update" button that does not say
            // what it moves to is asking the user to trust it blindly.
            $tags.append(
                $("<span/>")
                    .addClass("tag upd mod-update")
                    .text(`${mod.installedVersion} → ${mod.latestVersion}`),
            );
        } else if (mod.pendingInstall) {
            $tags.append(
                $("<span/>").addClass("tag upd").text(`→ v${mod.desiredVersion}`),
            );
        }

        if (mod.installed && !mod.direct) {
            $tags.append($("<span/>").addClass("tag").text("dependency"));
        }

        $info.append($tags);
        $row.append($info);

        const $acts = $(`<div class="acts"></div>`);
        if (!mod.installed && !mod.pendingInstall) {
            $acts.append(
                `<button class="icobtn install-mod-btn" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}" aria-label="Install mod"><i class="fas fa-download"></i></button>`,
            );
        } else {
            $acts.append(
                `<button class="icobtn settings-mod-btn" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}" aria-label="Mod settings"><i class="fas fa-cog"></i></button>`,
            );
            if (mod.needsUpdate) {
                $acts.append(
                    `<button class="icobtn warn update-mod-btn" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}" data-version="${mod.latestVersion}" aria-label="Update mod"><i class="fas fa-upload"></i></button>`,
                );
            }
            $acts.append(
                `<button class="icobtn danger uninstall-mod-btn" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}" aria-label="Uninstall mod"><i class="fas fa-trash"></i></button>`,
            );
        }
        $row.append($acts);

        return $row;
    }

    // ---------------------------------------------------------------- preview

    // Every mutating click lands here. Nothing is written until the user has
    // seen what the backend says the change actually does.
    RequestPreview = (op, modReference, version) => {
        if (!this.agentId) return;

        this.pendingChange = {
            op: op,
            modReference: modReference || "",
            version: version || "",
        };
        this.previewData = null;
        this.previewError = null;
        this.awaitingPreview = true;

        // No eid in the frame — the BFF takes it from the session.
        ws.send({
            action: "console.agent.mods.preview",
            agentId: this.agentId,
            op: op,
            modReference: modReference || "",
            version: version || "",
        });

        window.openModal("/public/modals", "mod-apply-modal", (modal) => {
            this.$applyModal = modal;
            this.RenderApplyModal();
        });
    };

    onPreviewReceived = (event) => {
        if (!this.awaitingPreview) return;

        this.awaitingPreview = false;
        this.previewError = null;
        this.previewData = event.detail || {};
        this.RenderApplyModal();
    };

    ChangeTitle() {
        const c = this.pendingChange || {};
        if (c.op == "updateAll") return "Update all mods";
        if (c.op == "remove") return `Remove ${c.modReference}`;
        if (c.op == "setVersion") return `Update ${c.modReference}`;
        return `Install ${c.modReference}`;
    }

    RenderApplyModal() {
        const modal = this.$applyModal;
        if (!modal || modal.length === 0) return;

        const $body = modal.find("#mod-apply-body").empty();
        const $acts = modal.find("#mod-apply-actions").empty();

        modal.find(".modal-title").text(this.ChangeTitle());

        // An unresolvable selection is the whole reason preview exists. Show it.
        if (this.previewError) {
            $body.append(
                $("<p/>").addClass("mod-apply-error").text(this.previewError),
            );
            $acts.append(
                $("<button/>")
                    .addClass("btn2 outline mod-apply-close-btn")
                    .attr("type", "button")
                    .text("Close"),
            );
            return;
        }

        if (this.awaitingPreview || this.previewData == null) {
            $body.append(
                $("<p/>")
                    .addClass("mod-apply-line")
                    .text("Working out what this changes…"),
            );
            return;
        }

        const p = this.previewData;
        const added = p.added || [];
        const removed = p.removed || [];
        const changed = p.changed || [];

        const direct = (list) => list.filter((e) => !e.dependency);
        const deps = (list) => list.filter((e) => !!e.dependency);
        const names = (list) => list.map((e) => e.modReference).join(", ");

        direct(added).forEach((e) => {
            $body.append(
                $("<p/>")
                    .addClass("mod-apply-line")
                    .text(`Installs: ${e.modReference} ${e.to || ""}`.trim()),
            );
        });
        direct(removed).forEach((e) => {
            $body.append(
                $("<p/>")
                    .addClass("mod-apply-line")
                    .text(`Removes: ${e.modReference}`),
            );
        });

        changed.forEach((e) => {
            $body.append(
                $("<p/>")
                    .addClass("mod-apply-line")
                    .text(`${e.modReference}: ${e.from || "—"} → ${e.to || "—"}`),
            );
        });

        // Dependencies are the thing the old page never told anyone about.
        if (deps(added).length > 0) {
            $body.append(
                $("<p/>")
                    .addClass("mod-apply-line dep")
                    .text(`Also installs: ${names(deps(added))}`),
            );
        }
        if (deps(removed).length > 0) {
            $body.append(
                $("<p/>")
                    .addClass("mod-apply-line dep")
                    .text(
                        `Also removes: ${names(deps(removed))} (no longer required)`,
                    ),
            );
        }

        if (added.length == 0 && removed.length == 0 && changed.length == 0) {
            $body.append(
                $("<p/>")
                    .addClass("mod-apply-line")
                    .text("Nothing would change."),
            );
            $acts.append(
                $("<button/>")
                    .addClass("btn2 outline mod-apply-close-btn")
                    .attr("type", "button")
                    .text("Close"),
            );
            return;
        }

        if (p.serverRunning) {
            $body.append(
                $("<p/>")
                    .addClass("mod-apply-note")
                    .text(
                        "The server is running. Mods can only be written to disk while it is stopped.",
                    ),
            );

            $acts.append(
                $("<button/>")
                    .addClass("btn2 outline mod-apply-confirm-btn")
                    .attr("type", "button")
                    .attr("data-apply-now", "false")
                    .text("Apply on next restart"),
            );
            $acts.append(
                $("<button/>")
                    .addClass("btn2 mod-apply-confirm-btn")
                    .attr("type", "button")
                    .attr("data-apply-now", "true")
                    .text("Apply now — restarts the server"),
            );
            return;
        }

        // Server already stopped: applyNow is moot, so there is one button.
        $acts.append(
            $("<button/>")
                .addClass("btn2 mod-apply-confirm-btn")
                .attr("type", "button")
                .attr("data-apply-now", "false")
                .text("Apply"),
        );
    }

    // Confirm. Sends the change that was previewed — not a re-derived one.
    ConfirmApply = (applyNow) => {
        const c = this.pendingChange;
        if (!c) return;

        this.awaitingPreview = true; // an error frame from here is still ours

        ws.send({
            action: "console.agent.mods.apply",
            agentId: this.agentId,
            op: c.op,
            modReference: c.modReference,
            version: c.version,
            applyNow: !!applyNow,
        });

        this.CloseApplyModal();
    };

    CloseApplyModal = () => {
        if (this.$applyModal && this.$applyModal.length > 0) {
            this.$applyModal.find("button.btn-close").trigger("click");
        }
        this.$applyModal = null;
    };

    onApplyReceived = (event) => {
        this.awaitingPreview = false;
        this.awaitingApplyPending = false;

        const taskIds = (event.detail && event.detail.taskIds) || [];
        if (taskIds.length === 0) {
            toastr.info("", "No mod changes were needed", { timeOut: 4000 });
        } else {
            toastr.success("", "Mod change queued", { timeOut: 4000 });
        }

        this.pendingChange = null;
        this.UpdateView();
    };

    // ----------------------------------------------------------------- banner

    onTasksReceived = (event) => {
        if ($(".mod-list").length === 0) return;

        try {
            this.tasks = event.detail || [];
            this.RenderSyncBanner();
        } catch (err) {
            console.error(err);
        }
    };

    // The sync task is the change made visible. A deferred one waiting for the
    // next restart, a running one with its progress, a dead one with its error:
    // all three used to be invisible, and all three now live in this banner.
    RenderSyncBanner() {
        const $banner = $("#mod-sync-banner");
        if ($banner.length === 0) return;

        const syncs = (this.tasks || []).filter(
            (t) => (t.action || "") == "syncmods",
        );

        const pick = (status) => syncs.find((t) => (t.status || "") == status);

        // A pending sync is NOT necessarily a deferred one. Only requiresServerStopped
        // means "waiting for the next restart"; a pending sync WITHOUT it is gated on
        // its own chain's stopsfserver — the change is being applied right now, and
        // saying it will apply "the next time the server restarts" is simply false.
        const isDeferred = (t) => !!t.requires_server_stopped;
        const deferred = syncs.find(
            (t) => (t.status || "") == "pending" && isDeferred(t),
        );
        const chained = syncs.find(
            (t) => (t.status || "") == "pending" && !isDeferred(t),
        );

        const task = pick("running") || chained || deferred || pick("dead");

        if (!task) {
            $banner.addClass("hidden").empty();
            return;
        }

        // A chained pending sync belongs to the live apply-now chain, so it renders as
        // the running state (it has just not been claimed yet).
        const status =
            task === chained ? "running" : task.status || "";
        $banner
            .removeClass("hidden")
            .empty()
            .attr("class", `mod-sync mod-sync-${status}`);

        const $head = $("<div/>").addClass("mod-sync-head");
        const $act = $("<div/>").addClass("mod-sync-act");

        if (status == "running") {
            $head.append($("<b/>").text("Applying mods"));
            $head.append(
                $("<span/>")
                    .addClass("mod-sync-msg")
                    .text(
                        task.message ||
                            (task === chained
                                ? "Stopping the server to apply the mods…"
                                : "Syncing mods…"),
                    ),
            );

            const progress = task.progress || 0;
            const $bar = $("<div/>").addClass("task-progress");
            $bar.append(
                $("<div/>")
                    .addClass("task-progress-bar")
                    .css("width", `${progress}%`),
            );

            $banner.append($head);
            $banner.append($bar);
            $banner.append(
                $("<span/>").addClass("task-pct").text(`${progress}%`),
            );

            // A running sync is already in the agent's hands; cancelling it is
            // the only thing left to offer.
            $act.append(
                $("<button/>")
                    .addClass("btn2 outline agent-task-cancel-btn")
                    .attr("type", "button")
                    .attr("data-task-id", task.id)
                    .text("Cancel"),
            );
            $banner.append($act);
            return;
        }

        if (status == "dead") {
            $head.append($("<b/>").text("Mod sync failed"));
            $head.append(
                $("<span/>")
                    .addClass("mod-sync-msg err")
                    .text(task.last_error || "The agent could not apply the mods."),
            );

            $act.append(
                $("<button/>")
                    .addClass("btn2 outline agent-task-retry-btn")
                    .attr("type", "button")
                    .attr("data-task-id", task.id)
                    .text("Retry"),
            );

            $banner.append($head);
            $banner.append($act);
            return;
        }

        // pending: the change is written, but the agent cannot touch the Mods
        // directory under a live server, so it is waiting for the server to stop.
        $head.append($("<b/>").text("Mods pending"));
        $head.append(
            $("<span/>")
                .addClass("mod-sync-msg")
                .text(
                    "Changes will apply the next time the server restarts.",
                ),
        );

        $act.append(
            $("<button/>")
                .addClass("btn2 outline mod-sync-apply-now-btn")
                .attr("type", "button")
                .attr("data-task-id", task.id)
                .text("Apply now — restarts the server"),
        );
        $act.append(
            $("<button/>")
                .addClass("btn2 outline danger agent-task-cancel-btn")
                .attr("type", "button")
                .attr("data-task-id", task.id)
                .text("Cancel"),
        );

        $banner.append($head);
        $banner.append($act);
    }

    // The change this pending sync carries is ALREADY persisted, so re-sending it as
    // an add/remove/setVersion resolves to an empty diff and is dropped. applyPending
    // is the op that escalates it: the backend re-points the very sync that is
    // waiting onto a fresh stop -> sync -> start chain.
    //
    // Do NOT "simplify" this back into a bare stopsfserver. That releases the gate,
    // the sync runs — and then nothing brings the server back up.
    ApplyPendingNow = () => {
        if (!this.agentId) return;

        this.awaitingApplyPending = true;

        ws.send({
            action: "console.agent.mods.apply",
            agentId: this.agentId,
            op: "applyPending",
            modReference: "",
            version: "",
            applyNow: true,
        });
    };

    // ----------------------------------------------------------------- config

    OpenModSettings(modReference) {
        const agentMod = this.AgentMod(modReference);

        if (agentMod == null) {
            return;
        }

        const modName =
            ModsPage.Field(agentMod, "mod_name", "modName") || modReference;

        let modConfig = {};
        try {
            modConfig = JSON.parse(agentMod.config);
        } catch (err) {
            modConfig = {};
        }

        window.openModal("/public/modals", "mod-settings", (modal) => {
            modal.find(".modal-title").text(`${modName} Settings`);
            modal
                .find("#mod-settings-config")
                .val(JSON.stringify(modConfig, null, 4));
            modal.find("#inp_mod_ref").val(modReference);

            modal.find("#mod-settings-save-btn").on("click", async (e) => {
                e.preventDefault();
                let csrfToken =
                    document.getElementsByName("gorilla.csrf.Token")[0]?.value ?? "";

                const postData = {
                    configSetting: "modsettings",
                    modReference: modal.find("#inp_mod_ref").val(),
                    modConfig: modal.find("#mod-settings-config").val(),
                };

                try {
                    const res = await $.ajax({
                        method: "post",
                        url: `/dashboard/servers/${this.agentId}`,
                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        data: JSON.stringify(postData),
                        headers: { "X-CSRF-Token": csrfToken },
                    }).promise();

                    if (res.success) {
                        toastr.success("", "Mod Config Updated", {
                            timeOut: 4000,
                        });
                        modal.find("button.btn-close").trigger("click");
                        this.UpdateView();
                    }
                } catch (err) {
                    console.error(err);

                    try {
                        const response = JSON.parse(err.responseText);
                        console.error("Error response JSON:", response);
                        toastr.error(
                            response.error,
                            "Error updating mod config",
                            { timeOut: 4000 },
                        );
                    } catch {
                        console.error("Error response text:", err.responseText);
                    }
                }
            });
        });
    }
}

const modsPage = new ModsPage();

module.exports = modsPage;
