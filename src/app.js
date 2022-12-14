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
        $("#webhooks-table").DataTable();
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
