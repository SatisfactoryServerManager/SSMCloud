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
    let LinuxInstallCommand = `bash install-agent.sh --name "SSMAgent_${agentName}" --memory ${memory}`;

    if (portOffset > 0) {
        WindowsInstallCommand += ` -SERVERQUERYPORT ${serverqueryport}`;
        WindowsInstallCommand += ` -BEACONPORT ${beaconport}`;
        WindowsInstallCommand += ` -PORT ${port}`;

        LinuxInstallCommand += ` --serverqueryport ${serverqueryport}`;
        LinuxInstallCommand += ` --beaconport ${beaconport}`;
        LinuxInstallCommand += ` --port ${port}`;
    }

    $("#windows-install-agent span").text(WindowsInstallCommand);
    $("#linux-install-agent span").text(LinuxInstallCommand);
}

$(document).ready(() => {
    main();
});

},{}]},{},[1]);
