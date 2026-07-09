const ws = require("./ws");

// Mods manager for the server-detail "Mods" tab. Mod data is fetched over the
// dashboard websocket (action "console.agent.mods") instead of a REST poll, so
// the installed/pending state of each mod can be refreshed live — the list is
// re-requested every 5s, so a mod that finishes installing on the agent flips
// its buttons/tags without a page reload.
class ModsPage {
    constructor() {
        this.page = 0;

        this.sort = "az";
        this.direction = "asc";

        this.search = "";

        this.mods = [];
        this.installedMods = [];
        this.totalMods = 0;
        this.pages = 0;

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

        ws.send({
            action: "console.agent.mods",
            agentId: this.agentId,
            page: this.page,
            sort: this.sort,
            direction: this.direction,
            search: this.search,
        });
    };

    // Kept as the public entry point used by app.js (sort/search/install/
    // uninstall/settings-save) — a view update is now a fresh websocket request.
    UpdateView = () => {
        this.RequestMods();
    };

    onModsReceived = (event) => {
        if ($(".mod-list").length === 0) return;

        const detail = event.detail || {};

        this.mods = detail.mods || [];
        this.pages = detail.pages || 0;
        this.totalMods = detail.totalMods || 0;
        this.installedMods =
            (detail.agentModConfig && detail.agentModConfig.selectedMods) || [];

        for (let i = 0; i < this.mods.length; i++) {
            const mod = this.mods[i];
            mod.installed = false;
            mod.needsUpdate = false;
            mod.installedVersion = "0.0.0";
            mod.desiredVersion = "0.0.0";
            mod.pendingInstall = false;

            const selectedMod = this.installedMods.find(
                (sm) => sm.mod.mod_reference == mod.mod_reference,
            );

            if (selectedMod == null) continue;

            mod.installed = selectedMod.installed;
            mod.needsUpdate = selectedMod.needsUpdate;
            mod.installedVersion = selectedMod.installedVersion;
            mod.desiredVersion = selectedMod.desiredVersion;
            mod.pendingInstall =
                selectedMod.desiredVersion != selectedMod.installedVersion;
        }

        this.BuildPagination();
        this.RenderMods();

        $("#mod-count").text(
            `${this.installedMods.length} / ${this.totalMods}`,
        );
    };

    // Whether a mod passes the offcanvas filter checkboxes. A missing checkbox
    // (e.g. filter markup not present) is treated as "show". Semantics are AND:
    // the mod's install state must be enabled, and update-only mods are hidden
    // when the "Update Available" box is unchecked.
    MatchesFilter(mod) {
        const checked = (id) => {
            const $el = $(id);
            return $el.length === 0 ? true : $el.prop("checked");
        };

        const showInstalled = checked("#check-installed");
        const showNotInstalled = checked("#check-not-installed");
        const showNeedsUpdate = checked("#check-needs-update");

        const stateOk = mod.installed ? showInstalled : showNotInstalled;
        const updateOk = mod.needsUpdate ? showNeedsUpdate : true;

        return stateOk && updateOk;
    }

    // Re-render the currently-held page of mods, applying the filter checkboxes.
    // Called from onModsReceived and directly by the checkbox change handlers in
    // app.js (no refetch needed — it filters the data already in memory).
    RenderMods = () => {
        const $wrapper = $(".mod-list .row");
        if ($wrapper.length === 0) return;

        $wrapper.empty();

        for (let i = 0; i < this.mods.length; i++) {
            const mod = this.mods[i];
            if (!this.MatchesFilter(mod)) continue;
            $wrapper.append(this.BuildModCard(mod));
        }
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
    // each with data-agentid + data-mod-reference.
    BuildModCard(mod) {
        const $row = $(`<div class="mod" data-mod-reference="${mod.mod_reference}"></div>`);

        const logo =
            mod.logo_url == "" || mod.logo_url == null
                ? "https://ficsit.app/images/no_image.webp"
                : mod.logo_url;
        $row.append(`<div class="thumb"><img src="${logo}" alt=""/></div>`);

        const $info = $(`<div class="info"></div>`);
        $info.append(
            `<b><a href="https://ficsit.app/mod/${mod.mod_reference}" target="_blank" rel="noopener">${mod.mod_name}</a></b>`,
        );

        let tags = `<span class="tag">v${mod.versions[0].version}</span>`;
        if (mod.installed) {
            if (mod.pendingInstall) {
                tags += `<span class="tag upd">→ v${mod.desiredVersion}</span>`;
            } else {
                tags += `<span class="tag ok">v${mod.installedVersion}</span>`;
            }
        } else if (mod.pendingInstall) {
            tags += `<span class="tag upd">→ v${mod.desiredVersion}</span>`;
        }
        $info.append(`<span class="mod-tags">${tags}</span>`);
        $row.append($info);

        const $acts = $(`<div class="acts"></div>`);
        if (!mod.installed) {
            $acts.append(
                `<button class="icobtn install-mod-btn" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}" aria-label="Install mod"><i class="fas fa-download"></i></button>`,
            );
        } else {
            $acts.append(
                `<button class="icobtn settings-mod-btn" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}" aria-label="Mod settings"><i class="fas fa-cog"></i></button>`,
            );
            if (mod.needsUpdate) {
                $acts.append(
                    `<button class="icobtn warn update-mod-btn" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}" aria-label="Update mod"><i class="fas fa-upload"></i></button>`,
                );
            }
            $acts.append(
                `<button class="icobtn danger uninstall-mod-btn" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}" aria-label="Uninstall mod"><i class="fas fa-trash"></i></button>`,
            );
        }
        $row.append($acts);

        return $row;
    }

    OpenModSettings(modReference) {
        const selectedMod = this.installedMods.find(
            (sm) => sm.mod.mod_reference == modReference,
        );

        if (selectedMod == null) {
            return;
        }

        let modConfig = {};
        try {
            modConfig = JSON.parse(selectedMod.config);
        } catch (err) {
            modConfig = {};
        }

        window.openModal("/public/modals", "mod-settings", (modal) => {
            modal
                .find(".modal-title")
                .text(`${selectedMod.mod.mod_name} Settings`);
            modal
                .find("#mod-settings-config")
                .val(JSON.stringify(modConfig, null, 4));
            modal.find("#inp_mod_ref").val(selectedMod.mod.mod_reference);

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
