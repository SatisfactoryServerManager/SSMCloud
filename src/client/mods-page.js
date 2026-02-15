class ModsPage {
    constructor() {
        this.page = 0;

        this.sort = "az";
        this.direction = "asc";

        this.search = "";
    }

    GetMods = async () => {
        this.agentId = window.location.href.substring(
            window.location.href.lastIndexOf("/") + 1,
        );

        const res = await $.get(
            `/dashboard/mods?page=${this.page}&sort=${this.sort}&direction=${this.direction}&search=${this.search}&agentid=${this.agentId}`,
        );

        this.mods = res.mods;
        this.pages = res.pages;

        this.totalMods = res.totalMods;
        this.installedMods = res.agentModConfig.selectedMods;

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
    };

    UpdateView = async () => {
        if ($(".mod-list").length == 0) return;

        await this.GetMods();
        await this.BuildPagination();

        const $wrapper = $(".mod-list .row");
        $wrapper.empty();

        for (let i = 0; i < this.mods.length; i++) {
            const mod = this.mods[i];
            const $modCard = this.BuildModCard(mod);
            $wrapper.append($modCard);
        }

        $("#mod-count").text(
            `${this.installedMods.length} / ${this.totalMods}`,
        );
    };

    BuildPagination = async () => {
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

    BuildModCard(mod) {
        const $col = $(
            `<div class="col-12 col-md-6 col-xl-6 col-xxl-4 mb-3"></div>`,
        );

        const $card = $(`<div class="card card-inner mod-card"></div>`);

        const $logo = $("<div/>").addClass("mod-image");
        $logo.append(
            `<img src="${mod.logo_url == "" || mod.logo_url == null ? "https://ficsit.app/images/no_image.webp" : mod.logo_url}" alt=""/>`,
        );
        $card.append($logo);

        const $modInfo = $(
            `<div class="mod-info flex-shrink-1"><div class="d-flex flex-column"></div></div>`,
        );
        const $innerInfo = $modInfo.find("div");

        $innerInfo.append(`
        <a href="https://ficsit.app/mod/${mod.mod_reference}" target="_blank">
            <h4>${mod.mod_name}</h4>
        </a>`);

        const $badgeWrapper = $(
            `<div class="d-flex flex-column flex-xl-row"></div>`,
        );
        $innerInfo.append($badgeWrapper);

        $badgeWrapper.append(
            `<span class="badge bg-light border-light text-black mb-1 mb-xl-0 p-2">Latest Version: ${mod.versions[0].version}</span>`,
        );

        if (mod.installed) {
            if (mod.pendingInstall) {
                $badgeWrapper.append(
                    `<span class="badge bg-warning border-success text-black p-2 mb-1 mb-xl-0 ms-xl-2">Pending Version: ${mod.desiredVersion}</span>`,
                );
            } else {
                $badgeWrapper.append(
                    `<span class="badge bg-success border-success text-black p-2 mb-1 mb-xl-0 ms-xl-2">Installed Version: ${mod.installedVersion}</span>`,
                );
            }
        } else if (mod.pendingInstall) {
            $badgeWrapper.append(
                `<span class="badge bg-warning border-success text-black p-2 mb-1 mb-xl-0 ms-xl-2">Pending Version: ${mod.desiredVersion}</span>`,
            );
        }

        const $ButtonsWrapper = $(
            `<div class="mod-buttons ms-auto d-flex flex-column"></div>`,
        );

        if (!mod.installed) {
            $ButtonsWrapper.append(
                `<button class="btn btn-primary flex-grow-1 install-mod-btn" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}">
                <i class="fas fa-download"></i>
                </button>`,
            );
        } else {
            $ButtonsWrapper.append(`<button class="btn btn-light flex-grow-1 settings-mod-btn rounded-top rounded-bottom-0" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}">
            <i class="fas fa-cog"></i>
            </button>`);

            if (mod.needsUpdate) {
                $ButtonsWrapper.append(`<button class="btn btn-warning update-mod-btn flex-grow-1 rounded-0" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}">
                <i class="fas fa-upload"></i>
                </button>`);
            }

            $ButtonsWrapper.append(` <button class="btn btn-danger flex-grow-1 uninstall-mod-btn rounded-top-0 rounded-bottom" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}">
            <i class="fas fa-trash"></i>
            </button>`);
        }

        $card.append($modInfo);
        $card.append($ButtonsWrapper);
        $col.append($card);

        return $col;
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
                    document.getElementsByName("gorilla.csrf.Token")[0].value;

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
