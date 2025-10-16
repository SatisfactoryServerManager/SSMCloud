(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
const AgentMap = require("./agentmap");

window.agentMap = new AgentMap(window.agent);

function main() {
    window.agentMap.SetUpMap();
}

$(document).ready(() => {
    main();
});

},{"./agentmap":1}]},{},[2]);
