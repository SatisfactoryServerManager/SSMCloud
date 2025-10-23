const AgentMap = require("./agentmap");

const ModsPage = require("./mods-page");
const AccountPage = require("./account-page");
const modsPage = require("./mods-page");

function main() {
    const currentScheme = detectColorScheme();

    $("body").addClass(currentScheme);

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
        iconName: "custom-webhook",
        icon: [
            130,
            121,
            [],
            "e001",
            "M60.467 50.345C55.1 59.367 49.958 68.104 44.709 76.775C43.361 79.001 42.694 80.814 43.771 83.644C46.744 91.461 42.55 99.068 34.667 101.133C27.233 103.081 19.99 98.195 18.515 90.236C17.208 83.191 22.675 76.285 30.442 75.184C31.093 75.091 31.757 75.08 32.851 74.998C36.657 68.616 40.556 62.079 44.666 55.186C37.235 47.797 32.812 39.159 33.791 28.456C34.483 20.89 37.458 14.352 42.896 8.99301C53.311 -1.26899 69.2 -2.93099 81.463 4.94601C93.241 12.512 98.635 27.25 94.037 39.864C90.57 38.924 87.079 37.976 83.241 36.935C84.685 29.922 83.617 23.624 78.887 18.229C75.762 14.667 71.752 12.8 67.192 12.112C58.051 10.731 49.076 16.604 46.413 25.576C43.39 35.759 47.965 44.077 60.467 50.345Z M75.794 39.676C79.575 46.346 83.414 53.117 87.219 59.826C106.451 53.876 120.951 64.522 126.153 75.92C132.436 89.688 128.141 105.995 115.801 114.489C103.135 123.209 87.117 121.719 75.895 110.518C78.755 108.124 81.629 105.719 84.7 103.15C95.784 110.329 105.478 109.991 112.675 101.49C118.812 94.238 118.679 83.425 112.364 76.325C105.076 68.132 95.314 67.882 83.514 75.747C78.619 67.063 73.639 58.448 68.899 49.701C67.301 46.753 65.536 45.043 61.934 44.419C55.918 43.376 52.034 38.21 51.801 32.422C51.572 26.698 54.944 21.524 60.215 19.508C65.436 17.511 71.563 19.123 75.075 23.562C77.945 27.189 78.857 31.271 77.347 35.744C76.927 36.991 76.383 38.198 75.794 39.676Z M84.831 94.204C77.226 94.204 69.593 94.204 61.679 94.204C59.46 103.331 54.667 110.7 46.408 115.386C39.988 119.028 33.068 120.263 25.703 119.074C12.143 116.887 1.055 104.68 0.0790008 90.934C-1.026 75.363 9.677 61.522 23.943 58.413C24.928 61.99 25.923 65.601 26.908 69.169C13.819 75.847 9.289 84.261 12.952 94.782C16.177 104.041 25.337 109.116 35.283 107.153C45.44 105.149 50.561 96.708 49.936 83.161C59.565 83.161 69.202 83.061 78.832 83.21C82.592 83.269 85.495 82.879 88.328 79.564C92.992 74.109 101.576 74.601 106.599 79.753C111.732 85.018 111.486 93.49 106.054 98.533C100.813 103.399 92.533 103.139 87.63 97.896C86.622 96.815 85.828 95.532 84.831 94.204Z",
        ],
    };

    window.FontAwesome.library.add(faWebhook);

    AccountPage.init();

    // Try to get the last active tab from localStorage
    const lastServerTab = localStorage.getItem("ServerActiveTab");

    // If a tab was saved before, show it
    if (lastServerTab) {
        $('.server-tabs-header .nav-tabs a[href="' + lastServerTab + '"]').tab("show");
    } else {
        $(".server-tabs-header .nav-tabs a").first().tab("show");
    }

    // When a tab is clicked (and shown), save it
    $('.server-tabs-header .nav-tabs a[data-bs-toggle="tab"]').on("shown.bs.tab", function (e) {
        const activeTab = $(e.target).attr("href"); // e.g. "#profile"
        localStorage.setItem("ServerActiveTab", activeTab);
    });

    // Try to get the last active tab from localStorage
    const lastAccountTab = localStorage.getItem("AccountActiveTab");

    // If a tab was saved before, show it
    if (lastAccountTab) {
        $('.account-tabs-header .nav-tabs a[href="' + lastAccountTab + '"]').tab("show");
    } else {
        $(".account-tabs-header .nav-tabs a").first().tab("show");
    }

    // When a tab is clicked (and shown), save it
    $('.account-tabs-header .nav-tabs a[data-bs-toggle="tab"]').on("shown.bs.tab", function (e) {
        const activeTab = $(e.target).attr("href"); // e.g. "#profile"
        localStorage.setItem("AccountActiveTab", activeTab);
    });

    $("body")
        .on("change", "#inp_servermemory", (e) => {
            const $this = $(e.currentTarget);

            $("#inp_servermemory_value").text(`${parseFloat($this.val()).toFixed(1)}G`);

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
            window.openModal("/public/modals", "server-action-confirm", (modal) => {
                modal.find(".modal-title").text($this.attr("data-confirm-title"));

                const $confirmBtn = modal.find("#confirm-action");
                $confirmBtn.attr("data-href", $this.attr("href"));
                $confirmBtn.attr("data-action", $this.attr("data-action"));
            });
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
                    $versionBox.append(`<option value="">Select Version</option>`);

                    for (let i = 0; i < theMod.versions.length; i++) {
                        const version = theMod.versions[i];
                        $versionBox.append(`<option value="${version.version}">${version.version}</option>`);
                    }
                }
            }
        })
        .on("click", ".add-event-type", (e) => {
            e.preventDefault();
            const $this = $(e.currentTarget);
            const $select = $this.parent().find("select");
            if ($select.val() == null) return;

            const $pillWrapper = $this.parent().parent().find(".event-types-pills");

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
                data.eventTypes.push(parseInt($el.attr("data-event-type-id")));
            });

            $.ajax({
                method: "post",
                url: action,
                enctype: "multipart/form-data",
                data: data,
            }).then(() => {
                window.location = "/dashboard/integrations";
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
                window.location = "/dashboard/integrations";
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
                    ProcessSMMMetaDataFile($this.parent().find(".mod-list"), evt.target.result);
                };
            }
        })
        .on("keyup", ".mod-search", (e) => {
            const $this = $(e.currentTarget);
            ModsPage.search = $this.val().toLowerCase();
            SortMods();
        })
        .on("click", ".install-mod-btn, .update-mod-btn", (e) => {
            const $this = $(e.currentTarget);

            const agentId = $this.attr("data-agentid");
            const modReference = $this.attr("data-mod-reference");

            $.post(
                "/dashboard/mods/installmod",
                {
                    agentId,
                    modReference,
                },
                () => {
                    modsPage.UpdateView();
                }
            );
        })
        .on("click", ".uninstall-mod-btn", (e) => {
            const $this = $(e.currentTarget);

            const agentId = $this.attr("data-agentid");
            const modReference = $this.attr("data-mod-reference");

            $.post(
                "/dashboard/mods/uninstallmod",
                {
                    agentId,
                    modReference,
                },
                () => {
                    modsPage.UpdateView();
                }
            );
        })
        .on("keyup", ".backup-search", (e) => {
            const $this = $(e.currentTarget);
            const $backupCard = $this.parent().parent().parent().parent();

            const search = $this.val().toLowerCase();
            $backupCard.find(".backup-card").each((index, ele) => {
                const $ele = $(ele);
                if (!$ele.attr("data-backupname").toLowerCase().includes(search)) {
                    $ele.parent().addClass("hidden");
                } else {
                    $ele.parent().removeClass("hidden");
                }
            });
        })
        .on("keyup", ".server-search", (e) => {
            FilterServerList();
        })
        .on("change", ".server-filter-checkbox", (e) => {
            FilterServerList();
        })
        .on("click", "#ssmagent-copykey", (e) => {
            const $this = $(e.currentTarget);
            navigator.clipboard.writeText($this.attr("data-key"));
            toastr.success("", "API key has been copied to clipboard", {
                timeOut: 4000,
            });
        })
        .on("change", "#mods-sortby", (e) => {
            SortMods();
        })
        .on("change", "#mods-sortby-direction", (e) => {
            SortMods();
        })
        .on("click", ".settings-mod-btn", (e) => {
            const $this = $(e.currentTarget);
            const modReference = $this.attr("data-mod-reference");

            modsPage.OpenModSettings(modReference);
        })
        .on("keyup", "#mod-settings-config", (e) => {
            const $this = $(e.currentTarget);

            let isValid = false;
            try {
                JSON.parse($this.val());

                isValid = true;
            } catch (err) {
                isValid = false;
            }

            if (isValid) {
                $("#mod-settings-config-valid").removeClass().addClass("text-success").text("Valid Mod Config");
                $("#mod-settings-save-btn").prop("disabled", false);
            } else {
                $("#mod-settings-config-valid").removeClass().addClass("text-danger").text("Invalid Mod Config");
                $("#mod-settings-save-btn").prop("disabled", true);
            }
        })
        .on("click", "#mods-pagination .mod-page", (e) => {
            $("#mods-pagination li").removeClass("active");
            const $this = $(e.currentTarget);

            const page = parseInt($this.attr("data-page"));
            ModsPage.GoToPage(page);
        })
        .on("click", "#mods-pagination .mod-page-prev", (e) => {
            ModsPage.PreviousPage();
        })
        .on("click", "#mods-pagination .mod-page-next", (e) => {
            ModsPage.NextPage();
        })
        .on("click", "#refresh-new-api-key", (e) => {
            e.preventDefault();

            $("#inp_new_apikey").val(`API-${makeapikey(32)}`);
        })
        .on("click", "#add-server-btn", (e) => {
            e.preventDefault();
            window.openModal("/public/modals", "create-server-modal", (modal) => {
                let ServerName, ServerPort, ServerMemory, ServerAdminPass, ServerClientPass, ServerAPIKey;

                let workflowFinished = false;

                const wizard = modal.find("#wizard");

                wizard.on("change", "#inp_servermemory", (e) => {
                    const $this = $(e.currentTarget);

                    wizard.find("#inp_servermemory_value").text(`${parseFloat($this.val()).toFixed(1)}G`);
                });

                wizard.steps({
                    onStepChanging: (event, currentIndex, newIndex) => {
                        // if current index is on configuration page

                        if (currentIndex > newIndex) {
                            return false;
                        }

                        if (currentIndex == 0) {
                            ServerName = wizard.find("#inp_servername").val();
                            ServerPort = wizard.find("#inp_serverport").val();
                            ServerMemory = wizard.find("#inp_servermemory").val();
                            ServerAdminPass = wizard.find("#inp_serveradminpass").val();
                            ServerClientPass = wizard.find("#inp_serverclientpass").val();

                            if (ServerName == "" || ServerMemory < 3 || ServerAdminPass == "") {
                                const errorBox = $("#create-server-modal-config-error");
                                errorBox.removeClass("hidden");

                                if (ServerName == "") {
                                    errorBox.find("ul").append("<ol>Please provide a server name!</ol>");
                                }

                                if (ServerPort < 7000) {
                                    errorBox.find("ul").append("<ol>Server port must be greater or equal than 7000</ol>");
                                }

                                if (ServerMemory < 3) {
                                    errorBox.find("ul").append("<ol>Server must have more than 3GB of memory</ol>");
                                }
                                if (ServerAdminPass == "") {
                                    errorBox.find("ul").append("<ol>Please provide a server admin password!</ol>");
                                }
                                return false;
                            }

                            ServerAPIKey = "AGT-API-" + makeapikey(32).toUpperCase();

                            BuildAgentInstallCommands(ServerName, ServerMemory, ServerPort, ServerAPIKey);
                        }

                        // Submit Create Task
                        if (currentIndex == 1) {
                            const postData = {
                                serverName: ServerName,
                                serverPort: parseInt(ServerPort),
                                serverMemory: parseFloat(ServerMemory) * 1024 * 1024 * 1024,
                                serverAdminPass: ServerAdminPass,
                                serverClientPass: ServerClientPass,
                                serverApiKey: ServerAPIKey,
                            };

                            $.post(`/dashboard/servers`, postData)
                                .promise()
                                .then((res) => {
                                    const workflowId = res.workflow_id;

                                    workflowFinished = BuildWorkflowActions(workflowId);
                                    setInterval(async () => {
                                        workflowFinished = BuildWorkflowActions(workflowId);
                                    }, 2000);
                                })
                                .catch((err) => {
                                    console.error(err);
                                });
                        }

                        if (currentIndex == 2) {
                            return workflowFinished;
                        }
                        return true;
                    },
                });
            });
        })
        .on("click", "#copy-join-code", (e) => {
            e.preventDefault();
            const code = $("#join-code").val();
            navigator.clipboard.writeText(code);

            toastr.success("", "Account join code copied to clipboard", {
                timeOut: 4000,
            });
        })
        .on("click", ".copy-btn", (e) => {
            e.preventDefault();
            const $this = $(e.currentTarget);
            const $parent = $this.parent();
            let CopyString = "";

            if ($parent.find("textarea").length > 0) {
                CopyString = $parent.find("textarea").val();
            }
            if ($parent.find("input[type=text]").length > 0) {
                CopyString = $parent.find("input[type=text]").val();
            }

            if (CopyString == "") return;

            navigator.clipboard.writeText(CopyString.trim());

            toastr.success("", "Copied to clipboard", {
                timeOut: 3000,
            });
        });

    SortMods();

    function SortMods() {
        const sortBy = $("#mods-sortby").val();
        const direction = $("#mods-sortby-direction").val();

        ModsPage.sort = sortBy;
        ModsPage.direction = direction;

        ModsPage.UpdateView();
    }

    function makeapikey(length) {
        let result = "";
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
        }
        return result;
    }

    async function BuildWorkflowActions(workflowId) {
        const workflowRes = await $.get(`/dashboard/servers/workflows/${workflowId}`).promise();

        const workflowData = workflowRes.workflow;

        const $wrapper = $("#create-agent-workflow-wrapper");

        if ($wrapper.length == 0) {
            return;
        }

        $wrapper.empty();
        let hasReachedRunning = false;

        for (let i = 0; i < workflowData.actions.length; i++) {
            const action = workflowData.actions[i];

            const $card = $("<div/>").addClass("card card-inner mb-2");
            $wrapper.append($card);
            const $cardBody = $("<div/>").addClass("card-body");
            $card.append($cardBody);

            let iconClass = "fa-regular fa-circle";

            if (action.status == "") {
                if (!hasReachedRunning) {
                    iconClass = "fas fa-spinner fa-spin";
                    hasReachedRunning = true;
                }
            } else if (action.status == "completed") {
                iconClass = "fa-regular fa-circle-check text-success";
            } else if (action.status == "failed") {
                iconClass = "fa-solid fa-triangle-exclamation text-danger";
            }

            let actionTypeString;
            switch (action.type) {
                case "create-agent":
                    actionTypeString = "Create new SSM server";
                    break;
                case "wait-for-online":
                    actionTypeString = "Waiting for new server to come online";
                    break;
                case "install-server":
                    actionTypeString = "Sending install SF server task";
                    break;
                case "wait-for-installed":
                    actionTypeString = "Waiting for SF server to install";
                    break;
                case "start-server":
                    actionTypeString = "Sending start SF server task";
                    break;
                case "wait-for-running":
                    actionTypeString = "Waiting for SF server to start";
                    break;
                case "claim-server":
                    actionTypeString = "Sending claim server Task";
                    break;
                default:
                    actionTypeString = action.type;
            }

            $cardBody.append(`<div class="d-flex align-items-center gap-2"><i class="${iconClass}"></i><h6 class="m-0 p-0">${actionTypeString}</h6></div>`);
        }

        let workflowFinished = true;

        for (let i = 0; i < workflowData.actions.length; i++) {
            const action = workflowData.actions[i];
            if (action.status == "") {
                workflowFinished = false;
                break;
            }
        }

        return workflowFinished;
    }

    $("#inp_maxplayers").on("input change", () => {
        const val = $("#inp_maxplayers").val();
        $("#max-players-value").text(`${val} / 500`);
    });

    if ($("#inp_maxplayers").length > 0) {
        const val = $("#inp_maxplayers").val();
        $("#max-players-value").text(`${val} / 500`);
    }

    if ($("#inp_new_apikey").length > 0) {
        $("#inp_new_apikey").val(`API-${makeapikey(32)}`);
    }

    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    window.agentMap = new AgentMap(window.agent);

    $('a[data-bs-toggle="tab"]').on("shown.bs.tab", (e) => {
        var target = $(e.target).attr("href"); // activated tab
        if (target == "#map") {
            window.agentMap.SetUpMap();
        }

        if (target == "#stats") {
            BuildAgentStats();
        }
    });
}

function FilterServerList() {
    $wrapper = $("#serverlist-wrapper");

    const search = $(".server-search").val().toLowerCase();
    const FilterOnline = $("#server-filter-online").prop("checked") ? 1 : 0;
    const FilterInstalled = $("#server-filter-installed").prop("checked") ? 1 : 0;
    const FilterRunning = $("#server-filter-running").prop("checked") ? 1 : 0;

    function doesMatch($el) {
        if (
            $el.attr("data-agentname").toLowerCase().includes(search) &&
            ($el.attr("data-online") == FilterOnline || $el.attr("data-installed") == FilterInstalled || $el.attr("data-running") == FilterRunning)
        ) {
            return true;
        } else {
            return false;
        }
    }

    $wrapper.find(".server-card").each((index, ele) => {
        const $ele = $(ele);
        if (!doesMatch($ele)) {
            $ele.parent().addClass("hidden");
        } else {
            $ele.parent().removeClass("hidden");
        }
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
        const existingMod = localStorageMods.mods.find((m) => m.modName == modRef);
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

            modalEl.find("button.btn-close").on("click", (e) => {
                e.preventDefault();
                const $this = $(e.currentTarget).parent().parent().parent().parent();
                $this.trigger("hidden.bs.modal");
                $this.remove();
                $this.modal("hide");
                $("body").removeClass("modal-open").attr("style", null);
                $(".modal-backdrop").remove();
            });

            modalEl.on("hidden.bs.modal", () => {
                $(this).remove();
                $('[name^="__privateStripe"]').remove();
                if (options.allowBackdropRemoval == true) $(".modal-backdrop").remove();
            });
            modalEl.modal("show");
            if (callback) callback(modalEl);
        },
        dataType: "html",
    });
};

function BuildAgentInstallCommands(agentName, smallmemory, serverport, apikey) {
    if (agentName == "") {
        $("#windows-install-agent textarea").val("PLEASE PROVIDE A SERVER NAME!");
        $("#linux-install-agent textarea").val("PLEASE PROVIDE A SERVER NAME!");
        return;
    }

    const memory = parseFloat(smallmemory) * 1024 * 1024 * 1024;

    const portString = parseFloat(serverport);
    const portOffset = portString - 7777;

    let WindowsInstallCommand = `Set-ExecutionPolicy Bypass -Scope Process -Force; $s="$env:TEMP\\ssm-agent-install.ps1"; iwr -useb https://tinyurl.com/ssm-agent-install-ps1 -OutFile $s; & $s -AGENTNAME "SSMAgent_${agentName}" -MEMORY ${memory} -SSMAPIKEY "${apikey}"`;
    let WindowsStandaloneInstallCommand = `Set-ExecutionPolicy Bypass -Scope Process -Force; $s="$env:TEMP\\ssm-agent-standalone-ps1"; iwr -useb https://tinyurl.com/ssm-agent-standalone-ps1 -OutFile $s; & $s -AGENTNAME "SSMAgent_${agentName}" -SSMAPIKEY "${apikey}"`;

    let LinuxInstallCommand = `wget -q https://tinyurl.com/ssm-agent-install-sh -O - | bash -s -- --name "SSMAgent_${agentName}" --memory ${memory} --apikey "${apikey}"`;
    let LinuxStandaloneInstallCommand = `wget -q https://tinyurl.com/ssm-agent-standalone-sh -O - | bash -s -- --name "SSMAgent_${agentName}" --apikey "${apikey}"`;

    if (portOffset > 0) {
        WindowsInstallCommand += ` -PORTOFFSET ${portOffset}`;
        LinuxInstallCommand += ` --portoffset ${portOffset}`;
    }

    WindowsStandaloneInstallCommand += ` -PORTOFFSET ${portOffset}`;
    LinuxStandaloneInstallCommand += ` --portoffset ${portOffset}`;

    $("#windows-install-agent .docker").val(WindowsInstallCommand);
    $("#windows-install-agent .standalone").text(WindowsStandaloneInstallCommand);
    $("#linux-install-agent .docker").text(LinuxInstallCommand);
    $("#linux-install-agent .standalone").text(LinuxStandaloneInstallCommand);
}

window.BuildAgentInstallCommands = BuildAgentInstallCommands;

Number.prototype.pad = function (width, z) {
    let n = this;
    z = z || "0";
    n = n + "";
    return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

function BuildAgentStats() {
    if (window.builtAgentStats != null && window.builtAgentStats) return;
    BuildAgentCPUStats();
    BuildAgentRAMStats();
    BuildAgentRunningStats();

    window.builtAgentStats = true;
}

function BuildAgentCPUStats() {
    if ($("#cpuChart").length == 0) return;

    const textColour = $("body").hasClass("dark") ? "white" : "black";
    const gridColour = $("body").hasClass("dark") ? "#253a4b" : "black";

    const agent = window.agent;

    let data = [];
    if (agent.stats != null) {
        const cpuStats = agent.stats;

        let count = 0;

        for (let i = cpuStats.length - 1; i >= 0; i--) {
            if (count >= 50) {
                break;
            }
            const stat = cpuStats[i];

            const date = new Date(stat.createdAt);

            data.push({
                date: date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2),
                value: parseFloat(stat.cpu),
            });

            count++;
        }
    }

    data.reverse();

    new Chart(document.getElementById("cpuChart"), {
        type: "line",
        data: {
            labels: data.map((row) => row.date),
            datasets: [
                {
                    label: "Percent",
                    data: data.map((row) => row.value),
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        color: textColour,
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: textColour,
                    },
                    grid: {
                        color: gridColour,
                    },
                },
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: textColour,
                    },
                    grid: {
                        color: gridColour,
                    },
                },
            },
        },
    });
}

function BuildAgentRAMStats() {
    if ($("#ramChart").length == 0) return;

    const textColour = $("body").hasClass("dark") ? "white" : "black";

    const agent = window.agent;
    let data = [];
    if (agent.stats != null) {
        const cpuStats = agent.stats;

        let count = 0;

        for (let i = cpuStats.length - 1; i >= 0; i--) {
            if (count >= 50) {
                break;
            }
            const stat = cpuStats[i];

            const date = new Date(stat.createdAt);

            data.push({
                date: date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2),
                value: parseFloat(stat.mem),
            });

            count++;
        }
    }

    data.reverse();

    new Chart(document.getElementById("ramChart"), {
        type: "line",
        data: {
            labels: data.map((row) => row.date),
            datasets: [
                {
                    label: "Percent",
                    data: data.map((row) => row.value),
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        color: textColour,
                    },
                },
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: textColour,
                    },
                },
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: textColour,
                    },
                },
            },
        },
    });
}

function BuildAgentRunningStats() {
    if ($("#uptimeChart").length == 0) return;

    const textColour = $("body").hasClass("dark") ? "white" : "black";

    const agent = window.agent;
    let data = [];
    let backgroundColor = [];
    if (agent.stats != null) {
        const cpuStats = agent.stats;

        let count = 0;

        for (let i = cpuStats.length - 1; i >= 0; i--) {
            if (count >= 50) {
                break;
            }
            const stat = cpuStats[i];

            const date = new Date(stat.createdAt);

            if (!stat.running) {
                backgroundColor.push("rgba(255, 99, 132, 0.7)");
            } else {
                backgroundColor.push("rgba(75, 192, 192, 0.7)");
            }

            data.push({
                date: date.getHours().pad(2) + ":" + date.getMinutes().pad(2) + ":" + date.getSeconds().pad(2),
                value: stat.running == true ? 1 : -1,
            });

            count++;
        }
    }

    data.reverse();

    new Chart(document.getElementById("uptimeChart"), {
        type: "bar",
        data: {
            labels: data.map((row) => row.date),
            datasets: [
                {
                    label: "Running",
                    data: data.map((row) => row.value),
                    backgroundColor,
                },
            ],
        },
        options: {
            plugins: {
                legend: {
                    labels: {
                        color: textColour,
                    },
                },
            },
            scales: {
                y: {
                    min: -1,
                    max: 1,
                    ticks: {
                        color: textColour,
                        stepSize: 1,
                    },
                },
                x: {
                    ticks: {
                        color: textColour,
                    },
                },
            },
        },
    });
}

function detectColorScheme() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
    } else {
        return "light";
    }
}

$(document).ready(() => {
    main();
});
