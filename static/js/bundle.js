(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
class AccountPage {
    constructor() {
        this._AuditList = [];
        this._AuditType = null;
        this._Users = [];
        this._UserInvites = [];
    }

    init() {
        if ($("#account-audit-wrapper").length == 0) return;

        this.PollAccountAudit();
        this.PollAccountUsers();
        setInterval(async () => {
            await this.PollAccountAudit();
            //await this.PollAccountUsers();
        }, 1000);

        $("body")
            .on("click", "#btn-adduser", (e) => {
                e.preventDefault();
                this.SendCreateAccountUser();
            })
            .on("click", ".copy-userinvite-btn", (e) => {
                const $this = $(e.currentTarget);

                navigator.clipboard.writeText($this.attr("data-invite-url"));
            });
    }

    PollAccountAudit = async () => {
        const auditType = $("#account-audit-types").val();
        if (this._AuditType == auditType) {
            return;
        }

        this._AuditType = auditType;

        const res = await $.get(`/dashboard/account/audit?type=${auditType}`);

        if (!res.success) {
            return;
        }

        this._AuditList = res.audit;

        this.BuildAuditList();
    };

    BuildAuditList() {
        const $wrapper = $("#account-audit-wrapper .row");
        $wrapper.empty();

        if (this._AuditList.length == 0) {
            $wrapper.append(`<div class="col-12"><div class="alert alert-info">No Audit Events recorded</div></div>`);
            return;
        }

        for (let i = 0; i < this._AuditList.length; i++) {
            const audit = this._AuditList[i];
            $wrapper.append(this.BuildAuditUI(audit));
        }
    }

    BuildAuditUI(audit) {
        const $col = $("<div/>").addClass("col-12 col-md-6 col-lg-4 col-xl-3");
        const $div = $("<div/>").addClass("rounded account-audit-item mb-3 p-3");

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
            month: "long", // "October"
            day: "2-digit", // "27"
            year: "numeric", // "2025"
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false, // 24-hour format
        });

        $div.append(`<h5 class="m-0">${auditTypeString}</h5>`);
        $div.append(`<div>${formatted}</div>`);
        $div.append(`<div>${audit.message}</div>`);
        $col.append($div);
        return $col;
    }

    PollAccountUsers = async () => {
        const res = await $.get(`/dashboard/account/users`);

        if (!res.success) {
            return;
        }

        this._Users = res.users;

        this.BuildUsersUI();
    };

    BuildUsersUI() {
        const $wrapper = $("#account-users-wrapper");
        $wrapper.empty();

        for (let i = 0; i < this._Users.length; i++) {
            const User = this._Users[i];

            $wrapper.append(this.BuildUserUI(User));
        }
    }

    BuildUserUI(User) {
        const $div = $("<div/>").addClass("account-user rounded mb-3 p-3 d-flex flex-md-row flex-column align-items-center");

        const $title = $(`<div class="mb-2 m-md-0"></div>`);
        const $icon = $(`<i class="fas fa-user me-2 fa-lg"></i>`);

        const $deleteBtn = $(`<button class="btn btn-danger delete-user-btn ms-md-auto"></button>`);

        $deleteBtn.append(`<i class="fas fa-trash"></i>`);
        $deleteBtn.append(`<span class="ms-2 d-md-none d-inline-block">Delete User</span>`);

        if (User.isAccountAdmin) {
            $icon.removeClass("fa-user").addClass("fa-user-shield");
            $deleteBtn.prop("disabled", true).removeClass("delete-user-btn");
        } else {
            $deleteBtn.attr("data-bs-toggle", "tooltip").attr("data-bs-placement", "bottom").attr("data-bs-title", "Delete User");

            new bootstrap.Tooltip($deleteBtn.get(0));
        }

        $title.append($icon);
        $title.append(`<h6 class="m-0 d-inline-block">${User.email}</h6>`);

        $div.append($title);
        $div.append($deleteBtn);

        return $div;
    }

    SendCreateAccountUser = async () => {
        const email = $("#inp_useremail").val();
        const _csrf = $("#account_csrf").val();
        const res = await $.post("/dashboard/account/users", { email, _csrf });
    };
}

const accountPage = new AccountPage();
module.exports = accountPage;

},{}],2:[function(require,module,exports){
class AgentMap {
    constructor(agent) {
        this.agent = agent;
        this.created = false;

        this.MarkerIcons = {};

        this.players = [];
        this.buildings = [];
    }

    CreateMarkerIcons = () => {
        var MarkerIcon = L.Icon.extend({
            options: {
                shadowUrl: "",
                iconSize: [50, 50],
                shadowSize: [50, 50],
                iconAnchor: [25, 50],
                shadowAnchor: [25, 50],
                popupAnchor: [0, -50],
            },
        });

        this.MarkerIcons.Blank = new MarkerIcon({
            iconUrl: "/public/images/map/blank_marker.png",
        });
        this.MarkerIcons.PlayerOnline = new MarkerIcon({
            iconUrl: "/public/images/map/player_marker_online.png",
        });
        this.MarkerIcons.PlayerOffline = new MarkerIcon({
            iconUrl: "/public/images/map/player_marker_offline.png",
        });
        this.MarkerIcons.Home = new MarkerIcon({
            iconUrl: "/public/images/map/home_marker.png",
        });
        this.MarkerIcons.Station = new MarkerIcon({
            iconUrl: "/public/images/map/station_marker.png",
        });
        this.MarkerIcons.SpaceElevator = new MarkerIcon({
            iconUrl: "/public/images/map/selevator_marker.png",
        });
    };

    SetUpMap = () => {
        if ($("#playerMap").length == 0) {
            return;
        }

        if (this.created) {
            return;
        }

        this.CreateMarkerIcons();

        this.created = true;

        let bounds = [
            [-375e3, -324698.832031],
            [375e3, 425301.832031],
        ];

        this.playerGroup = L.layerGroup([]);
        this.buildingGroup = L.layerGroup([]);

        const mapImg = L.imageOverlay("/public/images/map.png", bounds);

        this.map = L.map("playerMap", {
            minZoom: -10,
            maxZoom: -5,
            zoom: -9,
            center: [0, 0],
            bounds,
            fullscreen: true,
            crs: L.CRS.Simple,
            layers: [mapImg, this.playerGroup, this.buildingGroup],
        });

        this.map.setMaxBounds(bounds);

        const layerControl = L.control.layers({}).addTo(this.map);
        layerControl.addOverlay(this.playerGroup, "Players");
        layerControl.addOverlay(this.buildingGroup, "Buildings");

        this.AddMapPlayers();
        this.AddBuildingMarkers();

        setInterval(() => {
            this.pollAgent();
        }, 10000);
        this.pollAgent();
    };

    AddMapPlayers = () => {
        this.playerGroup.clearLayers();

        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];

            var playerMarker = L.marker(
                this.GamelocationToMapLocation(
                    player.location.x,
                    player.location.y
                ),
                {
                    icon: player.online
                        ? this.MarkerIcons.PlayerOnline
                        : this.MarkerIcons.PlayerOffline,
                }
            );
            playerMarker.bindPopup(
                `<b>${player.username}</b><br><b>Online:</b>${
                    player.online ? "true" : "false"
                }`
            );

            this.playerGroup.addLayer(playerMarker);
        }
    };

    rotatePoints(center, points, yaw) {
        var res = [];
        var angle = yaw * (Math.PI / 180); // not really sure what this is
        for (var i = 0; i < points.length; i++) {
            var p = points[i];
            // translate to center
            var p2 = [p[0] - center[0], p[1] - center[1]];
            // rotate using matrix rotation
            var p3 = [
                Math.cos(angle) * p2[0] - Math.sin(angle) * p2[1],
                Math.sin(angle) * p2[0] + Math.cos(angle) * p2[1],
            ];
            // translate back to center
            var p4 = [p3[0] + center[0], p3[1] + center[1]];
            // done with that point
            res.push(p4);
        }
        return res;
    }

    CalcBuildingPolygon = (x, y, w, l, r) => {
        w = w * 100;
        l = l * 100;

        const hw = w / 2;
        const hl = l / 2;

        const points = [
            [x - hl, y - hw],
            [x + hl, y - hw],
            [x + hl, y + hw],
            [x - hl, y + hw],
        ];

        var polygon = L.polygon(points, {
            color: "green",
        });

        var center = [x, y];

        const polygonRotated = this.rotatePoints(center, points, r);
        polygon.setLatLngs(polygonRotated);

        return polygon;
    };

    AddBuildingMarkers = () => {
        this.buildingGroup.clearLayers();

        for (let i = 0; i < this.buildings.length; i++) {
            const building = this.buildings[i];

            const buildingLocation = this.GamelocationToMapLocation(
                building.location.x,
                building.location.y
            );

            // const bounds = building.boundingBox;
            // const width =
            //     Math.abs(bounds.min.x / 100) + Math.abs(bounds.max.x / 100);
            // const height =
            //     Math.abs(bounds.min.y / 100) + Math.abs(bounds.max.y / 100);

            // const buildingPoly = this.CalcBuildingPolygon(
            //     buildingLocation[0],
            //     buildingLocation[1],
            //     width,
            //     height,
            //     building.rotation
            // );

            // this.buildingGroup.addLayer(buildingPoly);

            if (building.class == "Build_TradingPost_C") {
                var buildingMarker = L.marker(buildingLocation, {
                    icon: this.MarkerIcons.Home,
                });

                this.buildingGroup.addLayer(buildingMarker);
            } else if (building.class == "Build_SpaceElevator_C") {
                var buildingMarker = L.marker(buildingLocation, {
                    icon: this.MarkerIcons.SpaceElevator,
                });

                this.buildingGroup.addLayer(buildingMarker);
            }
        }
    };

    Update(players, buildings) {
        this.players = players;
        this.buildings = buildings;

        this.AddMapPlayers();
        this.AddBuildingMarkers();
    }

    GamelocationToMapLocation = (x, y) => {
        return [-y, x];
    };

    pollAgent = async () => {
        const agentId = window.location.href.substring(
            window.location.href.lastIndexOf("/") + 1
        );
        try {
            const res = await $.get("/map/" + agentId + "/data");

            this.Update(res.players, res.buildings);
        } catch (err) {
            console.log(err);
        }
    };
}

module.exports = AgentMap;

},{}],3:[function(require,module,exports){
const AgentMap = require("./agentmap");
const WS = require("./ws");
const ModsPage = require("./mods-page");
const AccountPage = require("./account-page");
const ServerConsole = require("./server-console");

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

    WS.init();
    AccountPage.init();
    ServerConsole.init();

    window.displayFlashes();

    const lastServerTab = localStorage.getItem("ServerActiveTab");

    if ($(".server-tabs-header").length > 0) {
        if (lastServerTab) {
            $(
                '.server-tabs-header .nav-tabs a[href="' + lastServerTab + '"]',
            ).tab("show");
        } else {
            $(".server-tabs-header .nav-tabs a").first().tab("show");
        }

        if (lastServerTab == "#map") {
            window.agentMap.SetUpMap();
        } else if (lastServerTab == "#stats") {
            BuildAgentStats();
        }

        window.BuildAgentInstallCommands(
            window.agentName,
            window.agentMemory,
            window.agentPort,
            window.agentAPIKey,
        );
    }

    // When a tab is clicked (and shown), save it
    $('.server-tabs-header .nav-tabs a[data-bs-toggle="tab"]').on(
        "shown.bs.tab",
        function (e) {
            const activeTab = $(e.target).attr("href"); // e.g. "#profile"
            localStorage.setItem("ServerActiveTab", activeTab);
        },
    );

    // Try to get the last active tab from localStorage
    const lastAccountTab = localStorage.getItem("AccountActiveTab");

    // If a tab was saved before, show it
    if (lastAccountTab) {
        $(
            '.account-tabs-header .nav-tabs a[href="' + lastAccountTab + '"]',
        ).tab("show");
    } else {
        $(".account-tabs-header .nav-tabs a").first().tab("show");
    }

    // When a tab is clicked (and shown), save it
    $('.account-tabs-header .nav-tabs a[data-bs-toggle="tab"]').on(
        "shown.bs.tab",
        function (e) {
            const activeTab = $(e.target).attr("href"); // e.g. "#profile"
            localStorage.setItem("AccountActiveTab", activeTab);
        },
    );

    $("body")
        .on("change", "#inp_servermemory", (e) => {
            const $this = $(e.currentTarget);

            $("#inp_servermemory_value").text(
                `${parseFloat($this.val()).toFixed(1)}G`,
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
                },
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
                        `<option value="">Select Version</option>`,
                    );

                    for (let i = 0; i < theMod.versions.length; i++) {
                        const version = theMod.versions[i];
                        $versionBox.append(
                            `<option value="${version.version}">${version.version}</option>`,
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
            <span class="badge rounded-pill bg-info mb-1" data-event-type="${$select.val()}" style="font-size:12px">
                ${$select.find("option:selected").text()}
                <i class="fas fa-times ms-1 float-end" ></i>
            </span>
            `);

            $select.find("option:selected").remove();
        })
        .on("submit", ".edit-notification-form", async (e) => {
            e.preventDefault();

            const $form = $(e.currentTarget);
            const action = $form.attr("action");
            const data = {
                name: $form.find("#name").val(),
                type: parseInt($form.find("#type").val()),
                url: $form.find("#url").val(),
                eventTypes: [],
            };

            const $PillWrapper = $form.find(".event-types-pills");
            const $Pills = $PillWrapper.children();
            $Pills.each((index, el) => {
                const $el = $(el);
                data.eventTypes.push($el.attr("data-event-type"));
            });

            let csrfToken =
                document.getElementsByName("gorilla.csrf.Token")[0].value;

            try {
                const res = await $.ajax({
                    method: "post",
                    url: action,
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    data: JSON.stringify(data),
                    headers: { "X-CSRF-Token": csrfToken },
                }).promise();

                window.location = "/dashboard/integrations";
            } catch (err) {
                console.error(err);

                try {
                    const response = JSON.parse(err.responseText);
                    console.error("Error response JSON:", response);
                    toastr.error(response.error, "Error updating integration", {
                        timeOut: 4000,
                    });
                } catch {
                    console.error("Error response text:", err.responseText);
                    toastr.error(
                        err.responseText,
                        "Error updating integration",
                        { timeOut: 4000 },
                    );
                }
            }

            return true;
        })
        .on("submit", ".add-notification-form", async (e) => {
            e.preventDefault();

            const $form = $(e.currentTarget);
            const action = $form.attr("action");
            let csrfToken =
                document.getElementsByName("gorilla.csrf.Token")[0].value;

            const data = {
                name: $form.find("#name").val(),
                type: parseInt($form.find("#type").val()),
                url: $form.find("#url").val(),
                eventTypes: [],
            };

            const $PillWrapper = $form.find(".event-types-pills");
            const $Pills = $PillWrapper.children();
            $Pills.each((index, el) => {
                const $el = $(el);
                data.eventTypes.push($el.attr("data-event-type"));
            });

            try {
                const res = await $.ajax({
                    method: "post",
                    url: action,
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    data: JSON.stringify(data),
                    headers: { "X-CSRF-Token": csrfToken },
                }).promise();

                window.location = "/dashboard/integrations";
            } catch (err) {
                console.error(err);

                try {
                    const response = JSON.parse(err.responseText);
                    console.error("Error response JSON:", response);
                    toastr.error(response.error, "Error adding integration", {
                        timeOut: 4000,
                    });
                } catch {
                    console.error("Error response text:", err.responseText);
                    toastr.error(
                        err.responseText,
                        "Error updating integration",
                        { timeOut: 4000 },
                    );
                }
            }

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

            if (!$this.val().endsWith(".smmprofile")) {
                console.log("Not .smmprofile file extension!");
                return;
            }

            const file = $this.prop("files")[0];
            if (file) {
                var reader = new FileReader();
                reader.readAsText(file, "UTF-8");

                reader.onload = function (evt) {
                    ProcessSMMMetaDataFile(
                        $this.parent().find(".mod-list"),
                        evt.target.result,
                    );
                };
            }
        })
        .on("keyup", ".mod-search", (e) => {
            const $this = $(e.currentTarget);
            ModsPage.search = $this.val().toLowerCase();
            SortMods();
        })
        .on("click", ".install-mod-btn, .update-mod-btn", async (e) => {
            const $this = $(e.currentTarget);

            const agentId = $this.attr("data-agentid");
            const modReference = $this.attr("data-mod-reference");
            let csrfToken =
                document.getElementsByName("gorilla.csrf.Token")[0].value;

            try {
                const res = await $.ajax({
                    method: "post",
                    url: "/dashboard/mods/installmod",
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    data: JSON.stringify({
                        agentId,
                        modReference,
                    }),
                    headers: { "X-CSRF-Token": csrfToken },
                }).promise();
            } catch (err) {
                console.error(err);
            }

            ModsPage.UpdateView();
        })
        .on("click", ".uninstall-mod-btn", async (e) => {
            const $this = $(e.currentTarget);

            const agentId = $this.attr("data-agentid");
            const modReference = $this.attr("data-mod-reference");
            let csrfToken =
                document.getElementsByName("gorilla.csrf.Token")[0].value;

            try {
                const res = await $.ajax({
                    method: "post",
                    url: "/dashboard/mods/uninstallmod",
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    data: JSON.stringify({
                        agentId,
                        modReference,
                    }),
                    headers: { "X-CSRF-Token": csrfToken },
                }).promise();
            } catch (err) {
                console.error(err);
            }

            ModsPage.UpdateView();
        })
        .on("keyup", ".backup-search", (e) => {
            const $this = $(e.currentTarget);
            const $backupCard = $this.parent().parent().parent().parent();

            const search = $this.val().toLowerCase();
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
        .on("click", ".settings-mod-btn", (e) => {
            const $this = $(e.currentTarget);
            const modReference = $this.attr("data-mod-reference");

            ModsPage.OpenModSettings(modReference);
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
                $("#mod-settings-config-valid")
                    .removeClass()
                    .addClass("text-success")
                    .text("Valid Mod Config");
                $("#mod-settings-save-btn").prop("disabled", false);
            } else {
                $("#mod-settings-config-valid")
                    .removeClass()
                    .addClass("text-danger")
                    .text("Invalid Mod Config");
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
            window.openModal(
                "/public/modals",
                "create-server-modal",
                (modal) => {
                    let ServerName,
                        ServerPort,
                        ServerMemory,
                        ServerAdminPass,
                        ServerClientPass,
                        ServerAPIKey;

                    let workflowFinished = false;

                    const wizard = modal.find("#wizard");

                    wizard.on("change", "#inp_servermemory", (e) => {
                        const $this = $(e.currentTarget);

                        wizard
                            .find("#inp_servermemory_value")
                            .text(`${parseFloat($this.val()).toFixed(1)}G`);
                    });

                    wizard.steps({
                        onStepChanging: async (
                            event,
                            currentIndex,
                            newIndex,
                        ) => {
                            // if current index is on configuration page

                            if (currentIndex > newIndex) {
                                return false;
                            }

                            if (currentIndex == 0) {
                                ServerName = wizard
                                    .find("#inp_servername")
                                    .val();
                                ServerPort = wizard
                                    .find("#inp_serverport")
                                    .val();
                                ServerMemory = wizard
                                    .find("#inp_servermemory")
                                    .val();
                                ServerAdminPass = wizard
                                    .find("#inp_serveradminpass")
                                    .val();
                                ServerClientPass = wizard
                                    .find("#inp_serverclientpass")
                                    .val();

                                if (
                                    ServerName == "" ||
                                    ServerMemory < 3 ||
                                    ServerAdminPass == ""
                                ) {
                                    const errorBox = $(
                                        "#create-server-modal-config-error",
                                    );
                                    errorBox.removeClass("hidden");

                                    if (ServerName == "") {
                                        errorBox
                                            .find("ul")
                                            .append(
                                                "<ol>Please provide a server name!</ol>",
                                            );
                                    }

                                    if (ServerPort < 7000) {
                                        errorBox
                                            .find("ul")
                                            .append(
                                                "<ol>Server port must be greater or equal than 7000</ol>",
                                            );
                                    }

                                    if (ServerMemory < 3) {
                                        errorBox
                                            .find("ul")
                                            .append(
                                                "<ol>Server must have more than 3GB of memory</ol>",
                                            );
                                    }
                                    if (ServerAdminPass == "") {
                                        errorBox
                                            .find("ul")
                                            .append(
                                                "<ol>Please provide a server admin password!</ol>",
                                            );
                                    }
                                    return false;
                                }

                                ServerAPIKey =
                                    "AGT-API-" + makeapikey(32).toUpperCase();

                                BuildAgentInstallCommands(
                                    ServerName,
                                    ServerMemory,
                                    ServerPort,
                                    ServerAPIKey,
                                );
                            }

                            // Submit Create Task
                            if (currentIndex == 1) {
                                let csrfToken =
                                    document.getElementsByName(
                                        "gorilla.csrf.Token",
                                    )[0].value;

                                const postData = {
                                    serverName: ServerName,
                                    serverPort: parseInt(ServerPort),
                                    serverMemory:
                                        parseFloat(ServerMemory) *
                                        1024 *
                                        1024 *
                                        1024,
                                    serverAdminPass: ServerAdminPass,
                                    serverClientPass: ServerClientPass,
                                    serverApiKey: ServerAPIKey,
                                };
                                try {
                                    const res = await $.ajax({
                                        method: "post",
                                        url: "/dashboard/servers",
                                        contentType:
                                            "application/json; charset=utf-8",
                                        dataType: "json",
                                        data: JSON.stringify(postData),
                                        headers: { "X-CSRF-Token": csrfToken },
                                    }).promise();

                                    const workflowId = res.workflow_id;

                                    workflowFinished =
                                        BuildWorkflowActions(workflowId);
                                    setInterval(async () => {
                                        workflowFinished =
                                            BuildWorkflowActions(workflowId);
                                    }, 2000);
                                } catch (err) {
                                    console.error(err);
                                }
                            }

                            if (currentIndex == 2) {
                                return workflowFinished;
                            }
                            return true;
                        },
                    });
                },
            );
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
        })
        .on("click", ".server-action-btn", (e) => {
            const $this = $(e.currentTarget);
            const action = $this.attr("data-server-action");
            const agentId = $this.attr("data-agent-id");
            WS.sendServerAction(agentId, action);
        });

    SortMods();

    function SortMods() {
        const sortBy = $("#mods-sortby").val();

        if (sortBy == "az") {
            ModsPage.sort = "az";
            ModsPage.direction = "asc";
        } else if (sortBy == "za") {
            ModsPage.sort = "az";
            ModsPage.direction = "desc";
        } else if (sortBy == "downloads-high") {
            ModsPage.sort = "downloads";
            ModsPage.direction = "desc";
        } else if (sortBy == "downloads-low") {
            ModsPage.sort = "downloads";
            ModsPage.direction = "asc";
        }

        ModsPage.UpdateView();
    }

    function makeapikey(length) {
        let result = "";
        const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(
                Math.floor(Math.random() * charactersLength),
            );
            counter += 1;
        }
        return result;
    }

    async function BuildWorkflowActions(workflowId) {
        const workflowRes = await $.get(
            `/dashboard/servers/workflows/${workflowId}`,
        ).promise();

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

            $cardBody.append(
                `<div class="d-flex align-items-center gap-2"><i class="${iconClass}"></i><h6 class="m-0 p-0">${actionTypeString}</h6></div>`,
            );
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

    var tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]'),
    );
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
    const FilterInstalled = $("#server-filter-installed").prop("checked")
        ? 1
        : 0;
    const FilterRunning = $("#server-filter-running").prop("checked") ? 1 : 0;

    function doesMatch($el) {
        if (
            $el.attr("data-agentname").toLowerCase().includes(search) &&
            ($el.attr("data-online") == FilterOnline ||
                $el.attr("data-installed") == FilterInstalled ||
                $el.attr("data-running") == FilterRunning)
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

    console.log(JsonData);
    return;

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
            (m) => m.modName == modRef,
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
                const $this = $(e.currentTarget)
                    .parent()
                    .parent()
                    .parent()
                    .parent();
                $this.trigger("hidden.bs.modal");
                $this.remove();
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

function BuildAgentInstallCommands(agentName, smallmemory, serverport, apikey) {
    if (agentName == "") {
        $("#windows-install-agent textarea").val(
            "PLEASE PROVIDE A SERVER NAME!",
        );
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
    $("#windows-install-agent .standalone").text(
        WindowsStandaloneInstallCommand,
    );
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

function detectColorScheme() {
    if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
        return "dark";
    } else {
        return "light";
    }
}

$(document).ready(() => {
    main();
});

},{"./account-page":1,"./agentmap":2,"./mods-page":4,"./server-console":5,"./ws":6}],4:[function(require,module,exports){
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
            modal.find(".modal-title").text(`${selectedMod.mod.name} Settings`);
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

},{}],5:[function(require,module,exports){
const ws = require("./ws");

class ServerConsole extends EventTarget {
    constructor() {
        super();
        this.agentId = window.location.href.substring(
            window.location.href.lastIndexOf("/") + 1,
        );
        this.status = {
            running: false,
            installed: false,
            online: true,
        };
        this.lastLogIndex = 0;
        this.resetLogViewCounter = 0;

        this.cpuChart = null;
        this.ramChart = null;
        this.uptimeChart = null;
    }

    init() {
        if ($(".server-console").length == 0) {
            return;
        }

        this.$serverConsole = $(".server-console");

        $("body")
            .on("click", "#server-console-start-btn", (e) => {
                e.preventDefault();
                ws.sendServerAction(this.agentId, "startsfserver");
            })
            .on("click", "#server-console-stop-btn", (e) => {
                e.preventDefault();
                ws.sendServerAction(this.agentId, "stopsfserver");
            })
            .on("click", "#server-console-kill-btn", (e) => {
                e.preventDefault();
                ws.sendServerAction(this.agentId, "killsfserver");
            });

        ws.addEventListener("console.agent.status", (event) => {
            this.onStatusRecieved(event);
        });
        ws.addEventListener("console.agent.logs", (event) => {
            this.onLogsRecieved(event);
        });

        ws.addEventListener("console.agent.stats", (event) => {
            this.onStatsRecieved(event);
        });

        this.addEventListener("statusUpdated", this.onStatusUpdated);

        this.startTimer();
    }

    startTimer() {
        this.timer = setInterval(() => {
            this.getAgentStatus();
            this.getAgentLogs();
            this.getAgentStats();
        }, 1000);
    }

    deepEqual(x, y) {
        if (x === y) {
            return true;
        } else if (
            typeof x == "object" &&
            x != null &&
            typeof y == "object" &&
            y != null
        ) {
            if (Object.keys(x).length != Object.keys(y).length) return false;

            for (var prop in x) {
                if (y.hasOwnProperty(prop)) {
                    if (!this.deepEqual(x[prop], y[prop])) return false;
                } else return false;
            }

            return true;
        } else return false;
    }

    getAgentStatus() {
        const requestData = {
            action: "console.agent.status",
            agentId: this.agentId,
        };
        ws.send(requestData);
    }

    getAgentLogs() {
        if (!this.status.running) {
            return;
        }

        const requestData = {
            action: "console.agent.logs",
            agentId: this.agentId,
            lastLogIndex: this.lastLogIndex,
        };
        ws.send(requestData);
    }

    getAgentStats() {
        const requestData = {
            action: "console.agent.stats",
            agentId: this.agentId,
        };
        ws.send(requestData);
    }

    onStatusRecieved(event) {
        try {
            const prevStatus = this.status;
            this.status = event.detail;

            if (!this.deepEqual(prevStatus.installed, this.status.installed)) {
                this.dispatchEvent(new Event("statusUpdated"));
            }
            if (!this.deepEqual(prevStatus.online, this.status.online)) {
                this.dispatchEvent(new Event("statusUpdated"));
            }
            if (!this.deepEqual(prevStatus.running, this.status.running)) {
                this.dispatchEvent(new Event("statusUpdated"));
            }
        } catch (err) {
            console.error(err);
        }
    }

    onStatusUpdated() {
        console.log("status Updated");

        const $startBtn = $("#server-console-start-btn");
        const $stopBtn = $("#server-console-stop-btn");
        const $killBtn = $("#server-console-kill-btn");

        if (!this.status.online) {
            $startBtn.addClass("disabled");
            $startBtn.find("button").prop("disabled", true);
            $stopBtn.addClass("disabled");
            $stopBtn.find("button").prop("disabled", true);
            $killBtn.addClass("disabled");
            $killBtn.find("button").prop("disabled", true);

            this.$serverConsole.html("<p>server is currently offline</p>");
            return;
        }

        if (!this.status.running) {
            $startBtn.removeClass("disabled");
            $startBtn.find("button").prop("disabled", false);

            $stopBtn.addClass("disabled");
            $stopBtn.find("button").prop("disabled", true);
            $killBtn.addClass("disabled");
            $killBtn.find("button").prop("disabled", true);

            this.$serverConsole.html("<p>server is not running</p>");
        } else {
            $startBtn.addClass("disabled");
            $startBtn.find("button").prop("disabled", true);

            $stopBtn.removeClass("disabled");
            $stopBtn.find("button").prop("disabled", false);
            $killBtn.removeClass("disabled");
            $killBtn.find("button").prop("disabled", false);
        }
    }

    onLogsRecieved(event) {
        let logLines = event.detail.filter(Boolean); // removes null/undefined/empty safely

        this.resetLogViewCounter++;
        if (this.resetLogViewCounter === 120) {
            this.resetLogViewCounter = 0;
            this.$serverConsole.empty();
            this.lastLogIndex = 0;
        }

        if (logLines.length === 0) return;
        this.lastLogIndex += logLines.length;

        let html = "";
        for (const line of logLines) {
            const lower = line.toLowerCase();
            if (lower.includes("warning:")) {
                html += `<p class="text-warning">${line}</p>\n`;
            } else if (lower.includes("error:")) {
                html += `<p class="text-danger">${line}</p>\n`;
            } else {
                html += `<p>${line}</p>`;
            }
        }

        if (html == "") return;

        // 🔥 Single DOM update instead of hundreds
        this.$serverConsole.append(html);

        // Delay scroll update to next frame for smoother UI
        requestAnimationFrame(() => {
            this.$serverConsole.scrollTop(
                this.$serverConsole.prop("scrollHeight"),
            );
        });
    }
    onStatsRecieved(event) {
        const stats = event.detail;
        let count = 0;

        const cpuStats = [];
        const memStats = [];
        const runningStats = [];
        const runningBgColor = [];

        for (let i = stats.length - 1; i >= 0; i--) {
            if (count >= 50) {
                break;
            }
            const stat = stats[i];

            var date = new Date(1970, 0, 1); // Epoch
            date.setSeconds(stat.created_at.seconds);

            cpuStats.push({
                date:
                    date.getHours().pad(2) +
                    ":" +
                    date.getMinutes().pad(2) +
                    ":" +
                    date.getSeconds().pad(2),
                value: parseFloat(stat.cpu || 0),
            });
            memStats.push({
                date:
                    date.getHours().pad(2) +
                    ":" +
                    date.getMinutes().pad(2) +
                    ":" +
                    date.getSeconds().pad(2),
                value: parseFloat(stat.mem || 0),
            });
            const runningVal = stat.running ? 1 : -1;
            runningStats.push({
                date:
                    date.getHours().pad(2) +
                    ":" +
                    date.getMinutes().pad(2) +
                    ":" +
                    date.getSeconds().pad(2),
                value: runningVal,
            });

            if (!stat.running) {
                runningBgColor.push("rgba(255, 99, 132, 0.7)");
            } else {
                runningBgColor.push("rgba(75, 192, 192, 0.7)");
            }

            count++;
        }

        cpuStats.reverse();
        memStats.reverse();
        runningStats.reverse();
        runningBgColor.reverse();

        this.BuildAgentCPUStats(cpuStats);
        this.BuildAgentRAMStats(memStats);
        this.BuildAgentRunningStats(runningStats, runningBgColor);
    }

    BuildAgentCPUStats(data) {
        const textColour = $("body").hasClass("dark") ? "white" : "black";
        const gridColour = $("body").hasClass("dark") ? "#253a4b" : "black";

        if (this.cpuChart != null) {
            this.cpuChart.data.datasets[0].data = data.map((row) => row.value);
            this.cpuChart.data.labels = data.map((row) => row.date);
            this.cpuChart.update();
            return;
        }

        this.cpuChart = new Chart(document.getElementById("cpuChart"), {
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

    BuildAgentRAMStats(data) {
        const textColour = $("body").hasClass("dark") ? "white" : "black";

        if (this.ramChart != null) {
            this.ramChart.data.datasets[0].data = data.map((row) => row.value);
            this.ramChart.data.labels = data.map((row) => row.date);
            this.ramChart.update();
            return;
        }

        this.ramChart = new Chart(document.getElementById("ramChart"), {
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

    BuildAgentRunningStats(data, backgroundColor) {
        const textColour = $("body").hasClass("dark") ? "white" : "black";

        if (this.uptimeChart != null) {
            this.uptimeChart.data.datasets[0].data = data.map(
                (row) => row.value,
            );
            this.uptimeChart.data.labels = data.map((row) => row.date);
            this.uptimeChart.data.datasets[0].backgroundColor = backgroundColor;
            this.uptimeChart.update();
            return;
        }

        this.uptimeChart = new Chart(document.getElementById("uptimeChart"), {
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
}

serverConsole = new ServerConsole();
module.exports = serverConsole;

},{"./ws":6}],6:[function(require,module,exports){
class WS extends EventTarget {
    constructor() {
        super();
    }

    init() {
        this.reconnect();

        this.addEventListener("error", this.onError);
        this.addEventListener(
            "global.agent.action",
            this.onServerActionReceived,
        );
    }

    reconnect() {
        const hostname = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : "";
        if (hostname === "localhost") {
            this.ws = new WebSocket(`ws://${hostname}${port}/dashboard/ws`);
        } else {
            this.ws = new WebSocket(`wss://${hostname}${port}/dashboard/ws`);
        }

        this.ws.onopen = () => console.log("Connected to WebSocket");
        this.ws.onclose = (event) => {
            console.log("Connection closed", event.code, event.reason);
            console.log("Reconnecting..");
            this.reconnect();
        };
        this.ws.onerror = (err) => console.error(`Error: ${err.message}`);
        this.ws.onmessage = (event) => {
            const eventData = JSON.parse(event.data);
            const action = eventData.action;
            const data = eventData.data;

            const e = new CustomEvent(action, { detail: data });
            this.dispatchEvent(e);
        };
    }

    onError(event) {
        console.log("WS Error:", event.detail);
    }

    send(data) {
        this.ws.send(JSON.stringify(data));
    }

    sendServerAction(agentId, serverAction) {
        const data = {
            action: "global.agent.action",
            agentId: agentId,
            serverAction: serverAction,
        };
        this.send(data);
    }

    onServerActionReceived(event) {
        let ToastMessage = "Starting server in the background";
        if (event.detail.serverAction == "stopsfserver") {
            ToastMessage = "Stopping server in the background";
        } else if (event.detail.serverAction == "killsfserver") {
            ToastMessage = "Killing server in the background";
        }
        toastr.success("", ToastMessage, { timeOut: 5000 });
    }
}

const ws = new WS();
module.exports = ws;

},{}]},{},[3]);
