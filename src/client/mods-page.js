class ModsPage {
    constructor() {
        this.page = 0;

        this.sort = "az";
        this.direction = "asc";

        this.search = "";
    }

    GetMods = async () => {
        this.agentId = window.location.href.substring(
            window.location.href.lastIndexOf("/") + 1
        );

        const res = await $.get(
            `/dashboard/mods?page=${this.page}&sort=${this.sort}&direction=${this.direction}&search=${this.search}&agentid=${this.agentId}`
        );

        this.mods = res.mods;
        this.pages = res.pages;

        this.totalMods = res.totalMods;
        this.installedMods = res.installedMods;

        console.log(res);
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

        $("#mod-count").text(`${this.installedMods} / ${this.totalMods}`);
    };

    BuildPagination = async () => {
        const $pagination = $("#mods-pagination");
        $pagination.empty();

        const prevButtonDisabled = this.page == 0 ? "disabled" : "";
        const nextButtonDisabled =
            this.page == this.pages - 1 ? "disabled" : "";
        const $prevButton =
            $(`<li class="page-item ${prevButtonDisabled} flex-fill d-inline-block">
        <a class="page-link mod-page-prev h-100">
          <i class="fa-solid fa-chevron-left mt-1"></i>
        </a>
      </li>`);

        const $nextButton =
            $(`<li class="page-item ${nextButtonDisabled} flex-fill d-inline-block">
      <a class="page-link mod-page-next h-100">
        <i class="fa-solid fa-chevron-right mt-1"></i>
      </a>
    </li>`);

        $pagination.append($prevButton);

        for (let i = 1; i <= this.pages; i++) {
            const activePage = this.page + 1 == i ? "active" : "";
            $pagination.append(`
            <li class="page-item ${activePage}">
            <a class="page-link mod-page " data-page="${i - 1}" >${i}</a>
          </li>
            `);
        }
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
            `<div class="col-12 col-md-6 col-xl-6 col-xxl-4 mb-3"></div>`
        );

        const $card = $(`<div class="card card-inner mod-card"></div>`);

        const $logo = $("<div/>").addClass("mod-image");
        $logo.append(
            `<img src="${
                mod.logo == ""
                    ? "https://ficsit.app/images/no_image.webp"
                    : mod.logo
            }" alt=""/>`
        );
        $card.append($logo);

        const $modInfo = $(
            `<div class="mod-info flex-shrink-1"><div class="d-flex flex-column"></div></div>`
        );
        const $innerInfo = $modInfo.find("div");

        $innerInfo.append(`
        <a href="https://ficsit.app/mod/${mod.mod_reference}" target="_blank">
            <h4>${mod.name}</h4>
        </a>`);

        const $badgeWrapper = $(
            `<div class="d-flex flex-column flex-xl-row"></div>`
        );
        $innerInfo.append($badgeWrapper);

        $badgeWrapper.append(
            `<span class="badge bg-light border-light text-black mb-1 mb-xl-0 p-2">Latest Version: ${mod.versions[0].version}</span>`
        );

        if (mod.installed) {
            if (mod.pendingInstall) {
                $badgeWrapper.append(
                    `<span class="badge bg-warning border-success text-black p-2 mb-1 mb-xl-0 ms-xl-2">Pending Version: ${mod.desiredVersion}</span>`
                );
            } else {
                $badgeWrapper.append(
                    `<span class="badge bg-success border-success text-black p-2 mb-1 mb-xl-0 ms-xl-2">Installed Version: ${mod.installedVersion}</span>`
                );
            }
        } else if (mod.pendingInstall) {
            $badgeWrapper.append(
                `<span class="badge bg-warning border-success text-black p-2 mb-1 mb-xl-0 ms-xl-2">Pending Version: ${mod.desiredVersion}</span>`
            );
        }

        const $ButtonsWrapper = $(
            `<div class="mod-buttons ms-auto d-flex flex-column"></div>`
        );

        if (!mod.installed) {
            $ButtonsWrapper.append(
                `<button class="btn btn-primary flex-grow-1 install-mod-btn" data-agentid="${this.agentId}" data-mod-reference="${mod.mod_reference}">
                <i class="fas fa-download"></i>
                </button>`
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
}

const modsPage = new ModsPage();

module.exports = modsPage;
