(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function main() {
    toastr.options.closeButton = true;
    toastr.options.closeMethod = "fadeOut";
    toastr.options.closeDuration = 300;
    toastr.options.closeEasing = "swing";
    toastr.options.showEasing = "swing";
    toastr.options.timeOut = 30000;
    toastr.options.extendedTimeOut = 10000;
    toastr.options.progressBar = true;
    toastr.options.positionClass = "toast-bottom-right";

    const faWebhook = {
        prefix: "fac",
        iconName: "webhook",
        icon: [
            130,
            121,
            [],
            "e001",
            "M60.467 50.345C55.1 59.367 49.958 68.104 44.709 76.775C43.361 79.001 42.694 80.814 43.771 83.644C46.744 91.461 42.55 99.068 34.667 101.133C27.233 103.081 19.99 98.195 18.515 90.236C17.208 83.191 22.675 76.285 30.442 75.184C31.093 75.091 31.757 75.08 32.851 74.998C36.657 68.616 40.556 62.079 44.666 55.186C37.235 47.797 32.812 39.159 33.791 28.456C34.483 20.89 37.458 14.352 42.896 8.99301C53.311 -1.26899 69.2 -2.93099 81.463 4.94601C93.241 12.512 98.635 27.25 94.037 39.864C90.57 38.924 87.079 37.976 83.241 36.935C84.685 29.922 83.617 23.624 78.887 18.229C75.762 14.667 71.752 12.8 67.192 12.112C58.051 10.731 49.076 16.604 46.413 25.576C43.39 35.759 47.965 44.077 60.467 50.345Z M75.794 39.676C79.575 46.346 83.414 53.117 87.219 59.826C106.451 53.876 120.951 64.522 126.153 75.92C132.436 89.688 128.141 105.995 115.801 114.489C103.135 123.209 87.117 121.719 75.895 110.518C78.755 108.124 81.629 105.719 84.7 103.15C95.784 110.329 105.478 109.991 112.675 101.49C118.812 94.238 118.679 83.425 112.364 76.325C105.076 68.132 95.314 67.882 83.514 75.747C78.619 67.063 73.639 58.448 68.899 49.701C67.301 46.753 65.536 45.043 61.934 44.419C55.918 43.376 52.034 38.21 51.801 32.422C51.572 26.698 54.944 21.524 60.215 19.508C65.436 17.511 71.563 19.123 75.075 23.562C77.945 27.189 78.857 31.271 77.347 35.744C76.927 36.991 76.383 38.198 75.794 39.676Z M84.831 94.204C77.226 94.204 69.593 94.204 61.679 94.204C59.46 103.331 54.667 110.7 46.408 115.386C39.988 119.028 33.068 120.263 25.703 119.074C12.143 116.887 1.055 104.68 0.0790008 90.934C-1.026 75.363 9.677 61.522 23.943 58.413C24.928 61.99 25.923 65.601 26.908 69.169C13.819 75.847 9.289 84.261 12.952 94.782C16.177 104.041 25.337 109.116 35.283 107.153C45.44 105.149 50.561 96.708 49.936 83.161C59.565 83.161 69.202 83.061 78.832 83.21C82.592 83.269 85.495 82.879 88.328 79.564C92.992 74.109 101.576 74.601 106.599 79.753C111.732 85.018 111.486 93.49 106.054 98.533C100.813 103.399 92.533 103.139 87.63 97.896C86.622 96.815 85.828 95.532 84.831 94.204Z",
        ],
    };

    FontAwesome.library.add(faWebhook);

    $(".circle").each((index, el) => {
        const $el = $(el);
        console.log($el);

        const percentValue = $el.attr("data-percent");

        $el.circleProgress({
            startAngle: (-Math.PI / 4) * 2,
            value: percentValue / 100,
            size: 150,
            lineCap: "round",
            emptyFill: "rgba(255, 255, 255, .1)",
            fill: {
                color: "#ffa500",
            },
        }).on(
            "circle-animation-progress",
            function (event, progress, stepValue) {
                $(this)
                    .find("strong")
                    .text(`${(stepValue.toFixed(2) * 100).toFixed(0)}%`);
            }
        );
    });

    if ($("#agents-table").length > 0) {
        $("#agents-table").DataTable();
    }

    if ($(".backup-agent-table").length > 0) {
        $(".backup-agent-table").DataTable({
            order: [[1, "desc"]],
        });
    }

    if ($(".saves-table").length > 0) {
        $(".saves-table").DataTable({
            order: [[2, "desc"]],
        });
    }

    if ($("#users-table").length > 0) {
        $("#users-table").DataTable();
        $("#roles-table").DataTable();
        $("#invites-table").DataTable();
        $("#apikeys-table").DataTable();
        $("#account-events-table").DataTable();
    }

    if ($(".mods-table").length > 0) {
        $(".mods-table").DataTable();
    }

    $("body")
        .on("change", "#inp_servermemory", (e) => {
            const $this = $(e.currentTarget);

            $("#inp_servermemory_value").text(
                `${parseFloat($this.val()).toFixed(1)}G`
            );

            BuildAgentInstallCommands();
        })
        .on("change", "#inp_servername", (e) => {
            BuildAgentInstallCommands();
        })
        .on("change", "#inp_serverport", (e) => {
            BuildAgentInstallCommands();
        })
        .on("click", ".should-confirm-btn", (e) => {
            e.preventDefault();
            const $this = $(e.currentTarget);
            window.openModal(
                "/public/modals",
                "server-action-confirm",
                (modal) => {
                    modal
                        .find(".modal-title")
                        .text($this.attr("data-confirm-title"));

                    const $confirmBtn = modal.find("#confirm-action");
                    $confirmBtn.attr("data-href", $this.attr("href"));
                    $confirmBtn.attr("data-action", $this.attr("data-action"));
                }
            );
        })
        .on("click", "#server-action-confirm #cancel-action", (e) => {
            $("#server-action-confirm .btn-close").trigger("click");
        })
        .on("click", "#server-action-confirm #confirm-action", (e) => {
            const $this = $(e.currentTarget);
            window.location = $this.attr("data-href");

            $("#server-action-confirm .btn-close").trigger("click");
        })
        .on("change", ".inp_modid", (e) => {
            const $this = $(e.currentTarget);
            const $versionBox = $this.parent().parent().find(".inp_modversion");
            const value = $this.val();
            let localStorageMods = null;
            try {
                localStorageMods = JSON.parse(localStorage.getItem("mods"));
            } catch (err) {}

            if (localStorageMods) {
                let theMod = null;
                for (let i = 0; i < localStorageMods.mods.length; i++) {
                    const mod = localStorageMods.mods[i];
                    if (mod.modId == value) {
                        theMod = mod;
                        break;
                    }
                }

                if (theMod) {
                    $versionBox.empty();
                    $versionBox.append(
                        `<option value="">Select Version</option>`
                    );

                    for (let i = 0; i < theMod.versions.length; i++) {
                        const version = theMod.versions[i];
                        $versionBox.append(
                            `<option value="${version.version}">${version.version}</option>`
                        );
                    }
                }
            }
        })
        .on("click", ".add-event-type", (e) => {
            e.preventDefault();
            const $this = $(e.currentTarget);
            const $select = $this.parent().find("select");
            if ($select.val() == null) return;

            const $pillWrapper = $this
                .parent()
                .parent()
                .find(".event-types-pills");

            $pillWrapper.append(`
            <span class="badge rounded-pill bg-info mb-1" data-event-type-id="${$select.val()}" style="font-size:12px">
                ${$select.find("option:selected").text()}
                <i class="fas fa-times ms-1 float-end" ></i>
            </span>
            `);

            $select.find("option:selected").remove();
        })
        .on("submit", ".edit-notification-form", (e) => {
            e.preventDefault();

            const $form = $(e.currentTarget);
            const action = $form.attr("action");
            var data = $form.serializeArray().reduce(function (obj, item) {
                obj[item.name] = item.value;
                return obj;
            }, {});

            data.eventTypes = [];

            const $PillWrapper = $form.find(".event-types-pills");
            const $Pills = $PillWrapper.children();
            $Pills.each((index, el) => {
                const $el = $(el);
                data.eventTypes.push($el.attr("data-event-type-id"));
            });
            $.ajax({
                method: "post",
                url: action,
                enctype: "multipart/form-data",
                data: data,
            }).then(() => {
                window.location = "/dashboard/notifications";
            });

            return true;
        })
        .on("submit", ".add-notification-form", (e) => {
            e.preventDefault();

            const $form = $(e.currentTarget);
            const action = $form.attr("action");
            var data = $form.serializeArray().reduce(function (obj, item) {
                obj[item.name] = item.value;
                return obj;
            }, {});

            data.eventTypes = [];

            const $PillWrapper = $form.find(".event-types-pills");
            const $Pills = $PillWrapper.children();
            $Pills.each((index, el) => {
                const $el = $(el);
                data.eventTypes.push($el.attr("data-event-type-id"));
            });
            $.ajax({
                method: "post",
                url: action,
                enctype: "multipart/form-data",
                data: data,
            }).then(() => {
                window.location = "/dashboard/notifications";
            });

            return true;
        })
        .on("click", ".event-types-pills svg", (e) => {
            const $this = $(e.currentTarget);
            $this.parent().remove();
        })
        .on("change", ".smm-metadata-file", (e) => {
            const $this = $(e.currentTarget);

            if ($this.val() == "") {
                return;
            }

            if (!$this.val().endsWith(".json")) {
                console.log("Not Json file extension!");
                return;
            }

            const file = $this.prop("files")[0];
            if (file) {
                var reader = new FileReader();
                reader.readAsText(file, "UTF-8");

                reader.onload = function (evt) {
                    ProcessSMMMetaDataFile(
                        $this.parent().find(".mod-list"),
                        evt.target.result
                    );
                };
            }
        })
        .on("keyup", ".mod-search", (e) => {
            const $this = $(e.currentTarget);
            const searchText = $this.val().toLowerCase();
            const $modList = $this.parent().parent().find(".mod-list");

            $modList.find(".input-group").each((index, ele) => {
                const $ele = $(ele);
                if (
                    !$ele.attr("data-modref").toLowerCase().includes(searchText)
                ) {
                    $ele.addClass("hidden");
                } else {
                    $ele.removeClass("hidden");
                }
            });
        })
        .on("click", ".install-mod-btn", (e) => {
            const $this = $(e.currentTarget);

            const agentId = $this.attr("data-agentid");
            const modId = $this.attr("data-modid");

            $.post(
                "/dashboard/mods/installmod",
                {
                    _csrf: $("#_csrf").val(),
                    agentId,
                    modId,
                },
                () => {}
            );
        })
        .on("keyup", ".backup-search", (e) => {
            const $this = $(e.currentTarget);
            const $backupCard = $this.parent().parent().parent().parent();

            const search = $this.val().toLowerCase();
            console.log(search);
            $backupCard.find(".backup-card").each((index, ele) => {
                const $ele = $(ele);
                if (
                    !$ele.attr("data-backupname").toLowerCase().includes(search)
                ) {
                    $ele.parent().addClass("hidden");
                } else {
                    $ele.parent().removeClass("hidden");
                }
            });
        });

    $("#inp_maxplayers").on("input change", () => {
        const val = $("#inp_maxplayers").val();
        $("#max-players-value").text(`${val} / 500`);
    });

    if ($("#inp_maxplayers").length > 0) {
        const val = $("#inp_maxplayers").val();
        $("#max-players-value").text(`${val} / 500`);
    }

    if ($("#inp_servername").length > 0) {
        BuildAgentInstallCommands();
    }

    var tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function ProcessSMMMetaDataFile($wrapper, fileData) {
    let JsonData = null;
    try {
        JsonData = JSON.parse(fileData);
    } catch (err) {}

    if (JsonData == null) {
        return;
    }

    let localStorageMods = null;
    try {
        localStorageMods = JSON.parse(localStorage.getItem("mods"));
    } catch (err) {}

    if (localStorageMods == null) {
        console.log("LocalStorage mods is null!");
        return;
    }

    const smlVersion = JsonData.smlVersion;
    const installedMods = JsonData.installedMods;

    const modRefs = [];

    for (let modRef in installedMods) {
        const existingMod = localStorageMods.mods.find(
            (m) => m.modName == modRef
        );
        if (existingMod) {
            modRefs.push(modRef);
        }
    }

    $wrapper.find(".input-group").each((index, ele) => {
        const $ele = $(ele);
        if (modRefs.includes($ele.attr("data-modref"))) {
            $ele.find("input").prop("checked", true);
            console.log($ele.attr("data-modref"));
        }
    });
}

function OpenCreateServerModal() {
    window.openModal("/public/modals", "create-server-modal", (modal) => {});
}

window.openModal = function (modal_dir, modal_name, var1, var2) {
    let options = {
        allowBackdropRemoval: true,
    };

    let callback = null;

    if (arguments.length == 3) {
        callback = var1;
    } else if (arguments.length == 4) {
        options = var1;
        callback = var2;
    }

    if ($("body").hasClass("modal-open")) {
        return;
    }

    $.ajax({
        url: modal_dir + "/" + modal_name + ".html",
        success: function (data) {
            $("body").append(data);

            var modalEl = $("#" + modal_name);

            modalEl.find("button.close").on("click", (e) => {
                e.preventDefault();
                const $this = $(e.currentTarget)
                    .parent()
                    .parent()
                    .parent()
                    .parent();
                $this.remove();
                $this.trigger("hidden.bs.modal");
                $this.modal("hide");
                $("body").removeClass("modal-open").attr("style", null);
                $(".modal-backdrop").remove();
            });

            modalEl.on("hidden.bs.modal", () => {
                $(this).remove();
                $('[name^="__privateStripe"]').remove();
                if (options.allowBackdropRemoval == true)
                    $(".modal-backdrop").remove();
            });
            modalEl.modal("show");
            if (callback) callback(modalEl);
        },
        dataType: "html",
    });
};

function BuildAgentInstallCommands() {
    const agentName = $("#inp_servername").val();

    if (agentName == "") {
        $("#windows-install-agent span").text("PLEASE PROVIDE A SERVER NAME!");
        $("#linux-install-agent span").text("PLEASE PROVIDE A SERVER NAME!");
        return;
    }

    const memory =
        parseFloat($("#inp_servermemory").val()) * 1024 * 1024 * 1024;

    const portString = parseFloat($("#inp_serverport").val());
    const portOffset = portString - 15777;

    const serverqueryport = 15777 + portOffset;
    const beaconport = 15000 + portOffset;
    const port = 7777 + portOffset;

    let WindowsInstallCommand = `.\\install-agent.ps1 -AGENTNAME "SSMAgent_${agentName}" -MEMORY ${memory}`;
    let WindowsStandaloneInstallCommand = `.\\install-agent-standalone.ps1 -AGENTNAME "SSMAgent_${agentName}"`;

    let LinuxInstallCommand = `bash install-agent.sh --name "SSMAgent_${agentName}" --memory ${memory}`;
    let LinuxStandaloneInstallCommand = `bash install-agent-standalone.sh --name "SSMAgent_${agentName}"`;

    if (portOffset > 0) {
        WindowsInstallCommand += ` -SERVERQUERYPORT ${serverqueryport}`;
        WindowsInstallCommand += ` -BEACONPORT ${beaconport}`;
        WindowsInstallCommand += ` -PORT ${port}`;

        LinuxInstallCommand += ` --serverqueryport ${serverqueryport}`;
        LinuxInstallCommand += ` --beaconport ${beaconport}`;
        LinuxInstallCommand += ` --port ${port}`;
    }

    WindowsStandaloneInstallCommand += ` -PORTOFFSET ${portOffset}`;
    LinuxStandaloneInstallCommand += ` --portoffset ${portOffset}`;

    $("#windows-install-agent .docker span").text(WindowsInstallCommand);
    $("#windows-install-agent .standalone span").text(
        WindowsStandaloneInstallCommand
    );
    $("#linux-install-agent .docker span").text(LinuxInstallCommand);
    $("#linux-install-agent .standalone span").text(
        LinuxStandaloneInstallCommand
    );
}

$(document).ready(() => {
    main();
});

},{}]},{},[1]);
