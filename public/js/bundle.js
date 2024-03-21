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
            $wrapper.append(
                `<div class="col-12"><div class="alert alert-info">No Audit Events recorded</div></div>`
            );
            return;
        }

        for (let i = 0; i < this._AuditList.length; i++) {
            const audit = this._AuditList[i];
            $wrapper.append(this.BuildAuditUI(audit));
        }
    }

    BuildAuditUI(audit) {
        const $col = $("<div/>").addClass("col-12 col-md-6 col-lg-4 col-xl-3");
        const $div = $("<div/>").addClass("rounded bg-primary shadow mb-3 p-3");

        let auditTypeString = "";
        switch (audit.type) {
            case "LOGIN_SUCCESS":
                auditTypeString = "Successful Login";
                break;
            case "LOGIN_FAILURE":
                auditTypeString = "Failed Login";
                break;
            case "CREATE_AGENT":
                auditTypeString = "New Agent";
                break;
            case "DELETE_AGENT":
                auditTypeString = "Agent Deleted";
                break;
            default:
                auditTypeString = "Unknown";
                break;
        }

        $div.append(`<h5 class="m-0">${auditTypeString}</h5>`);
        $div.append(`<div>${audit.createdAt}</div>`);
        $div.append(`<div>${audit.message}</div>`);
        $col.append($div);
        return $col;
    }

    PollAccountUsers = async () => {
        const res = await $.get(`/dashboard/account/users`);

        if (!res.success) {
            return;
        }

        this._Users = res.users.filter((u) => u.inviteCode == "" && u.active);
        this._UserInvites = res.users.filter(
            (u) => u.inviteCode != "" && !u.active
        );

        this.BuildUsersUI();
        this.BuildUserInvitesUI();
    };

    BuildUsersUI() {
        const $wrapper = $("#account-users-wrapper");
        $wrapper.empty();

        for (let i = 0; i < this._Users.length; i++) {
            const User = this._Users[i];

            $wrapper.append(this.BuildUserUI(User));
        }
    }

    BuildUserInvitesUI() {
        const $wrapper = $("#account-user-invites-wrapper");
        $wrapper.empty();

        if (this._UserInvites.length == 0) {
            $wrapper.append(
                `<div class="col-12"><div class="alert alert-info">There are no pending user invites</div></div>`
            );
            return;
        }

        for (let i = 0; i < this._UserInvites.length; i++) {
            const User = this._UserInvites[i];

            const $inviteUI = this.BuildUserUI(User);

            const $copyLink = $(
                `<button class="btn btn-light copy-userinvite-btn ms-md-auto"></button>`
            );
            $copyLink
                .attr("data-bs-toggle", "tooltip")
                .attr("data-bs-placement", "bottom")
                .attr("data-bs-title", "Copy Invite Link");

            new bootstrap.Tooltip($copyLink.get(0));
            const hostnameURL = `${location.protocol}//${location.hostname}${
                location.port != "" ? ":" + location.port : ""
            }`;
            const linkURL = `${hostnameURL}/acceptinvite/${User.inviteCode}`;

            $copyLink.attr("data-invite-url", linkURL);

            $copyLink.append(`<i class="fas fa-copy"></i>`);
            $copyLink.append(
                `<span class="ms-2 d-md-none d-inline-block">Delete User</span>`
            );

            const $deleteBtn = $inviteUI.find("button:last");
            $deleteBtn.removeClass("ms-md-auto").addClass("ms-3");
            $deleteBtn.before($copyLink);
            $wrapper.append($inviteUI);
        }
    }

    BuildUserUI(User) {
        const $div = $("<div/>").addClass(
            "bg-primary rounded shadow mb-3 p-3 d-flex flex-md-row flex-column align-items-center"
        );

        const $title = $(`<div class="mb-2 m-md-0"></div>`);
        const $icon = $(`<i class="fas fa-user me-2 fa-lg"></i>`);

        const $deleteBtn = $(
            `<button class="btn btn-danger delete-user-btn ms-md-auto"></button>`
        );

        $deleteBtn.append(`<i class="fas fa-trash"></i>`);
        $deleteBtn.append(
            `<span class="ms-2 d-md-none d-inline-block">Delete User</span>`
        );

        if (User.isAccountAdmin) {
            $icon.removeClass("fa-user").addClass("fa-user-shield");
            $deleteBtn.prop("disabled", true).removeClass("delete-user-btn");
        } else {
            $deleteBtn
                .attr("data-bs-toggle", "tooltip")
                .attr("data-bs-placement", "bottom")
                .attr("data-bs-title", "Delete User");

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

        const points = [
            [x, y],
            [x + l, y],
            [x + l, y + w],
            [x, y + w],
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
        return;
        this.buildingGroup.clearLayers();
        const buildingLocation = this.GamelocationToMapLocation(
            -50938.7109375,
            274269.9375
        );
        const buildingPoly = this.CalcBuildingPolygon(
            buildingLocation[0],
            buildingLocation[1],
            54,
            54,
            0
        );

        this.buildingGroup.addLayer(buildingPoly);

        const buildingLocation2 = this.GamelocationToMapLocation(
            -45500,
            277800
        );
        const buildingPoly2 = this.CalcBuildingPolygon(
            buildingLocation2[0],
            buildingLocation2[1],
            14,
            26,
            0
        );

        this.buildingGroup.addLayer(buildingPoly2);

        // WIP
        this.buildingGroup.clearLayers();
        for (let i = 0; i < this.buildings.length; i++) {
            const building = this.buildings[i];
            var buildingMarker = L.marker(
                this.GamelocationToMapLocation(0, 0),
                {
                    icon: this.MarkerIcons.Home,
                }
            );

            this.buildingGroup.addLayer(buildingMarker);
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

            this.Update(res.players, []);
            console.log(res);
        } catch (err) {
            console.log(err);
        }
    };
}

module.exports = AgentMap;

},{}],3:[function(require,module,exports){
const AgentMap = require("./agentmap");

const ModsPage = require("./mods-page");
const AccountPage = require("./account-page");

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

    AccountPage.init();

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
                window.location = "/dashboard/intergrations";
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
                window.location = "/dashboard/intergrations";
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
            ModsPage.search = $this.val().toLowerCase();
            SortMods();
        })
        .on("click", ".install-mod-btn, .update-mod-btn", (e) => {
            const $this = $(e.currentTarget);

            const agentId = $this.attr("data-agentid");
            const modId = $this.attr("data-mod-reference");

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
        .on("click", ".uninstall-mod-btn", (e) => {
            const $this = $(e.currentTarget);

            const agentId = $this.attr("data-agentid");
            const modId = $this.attr("data-mod-reference");

            $.post(
                "/dashboard/mods/uninstallmod",
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

            const mods = JSON.parse(localStorage.getItem("mods")).mods;
            const selectedMods = JSON.parse(
                localStorage.getItem("selectedMods")
            ).selectedMods;

            const mod = mods.find((m) => m.mod_reference == modReference);
            const selectedMod = selectedMods.find(
                (sm) => sm.mod.mod_reference == modReference
            );

            console.log(modReference, mod, selectedMod);

            if (mod == null || selectedMod == null) {
                return;
            }

            let modConfig = {};
            try {
                modConfig = JSON.parse(selectedMod.config);
            } catch (err) {
                modConfig = {};
            }

            window.openModal("/public/modals", "mod-settings", (modal) => {
                modal.find(".modal-title").text(`${mod.name} Settings`);
                modal
                    .find("#mod-settings-config")
                    .val(JSON.stringify(modConfig, null, 4));
                modal.find("#inp_mod_ref").val(mod.mod_reference);
                modal.find("#mod-csrf").val($("#csrf").val());
            });
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
        });

    SortMods();

    function SortMods() {
        const sortBy = $("#mods-sortby").val();
        const direction = $("#mods-sortby-direction").val();

        ModsPage.sort = sortBy;
        ModsPage.direction = direction;

        ModsPage.UpdateView();
    }

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

    window.agentMap = new AgentMap(window.agent);

    $('a[data-bs-toggle="tab"]').on("shown.bs.tab", (e) => {
        var target = $(e.target).attr("href"); // activated tab
        if (target == "#map") {
            window.agentMap.SetUpMap();
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
    console.log(search);

    function doesMatch($el) {
        if (
            $el.attr("data-agentname").toLowerCase().includes(search) &&
            $el.attr("data-online") == FilterOnline &&
            $el.attr("data-installed") == FilterInstalled
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

    let WindowsInstallCommand = `.\\install-agent.ps1 -AGENTNAME "SSMAgent_${agentName}" -MEMORY ${memory}`;
    let WindowsStandaloneInstallCommand = `.\\install-agent-standalone.ps1 -AGENTNAME "SSMAgent_${agentName}"`;

    let LinuxInstallCommand = `bash install-agent.sh --name "SSMAgent_${agentName}" --memory ${memory}`;
    let LinuxStandaloneInstallCommand = `bash install-agent-standalone.sh --name "SSMAgent_${agentName}"`;

    if (portOffset > 0) {
        WindowsInstallCommand += ` -PORTOFFSET ${portOffset}`;
        LinuxInstallCommand += ` --portoffset ${portOffset}`;
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

},{"./account-page":1,"./agentmap":2,"./mods-page":4}],4:[function(require,module,exports){
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

        const $card = $(`<div class="mod-card d-flex"></div>`);

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

},{}]},{},[3]);
