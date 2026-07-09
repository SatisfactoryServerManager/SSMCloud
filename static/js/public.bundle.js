(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
// Playable hero console: a small, honest front-end simulation of the dashboard.
// No network. Buttons follow dashboard rules (start disabled while running, etc).

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

var NAMES = ["xXPioneerXx", "SpaceGiraffe", "FicsitFan", "NuclearNelly", "BeltWizard", "CoalRoller"];

var units = {
    alpha: { el: null, status: "running", cpu: 42, ram: 78, players: 12, cpuT: 42, ramT: 78 },
    bravo: { el: null, status: "offline", cpu: 0, ram: 0, players: 0, cpuT: 46, ramT: 64 },
};

function feed(ev, detail) {
    var box = document.getElementById("sim-feed");
    if (!box) return;
    var d = new Date();
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    var ts = "[" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + "]";
    var p = document.createElement("p");
    p.innerHTML = '<span class="t">' + ts + '</span> <span class="ev">' + ev + "</span>  " + detail;
    box.insertBefore(p, box.firstChild);
    while (box.children.length > 4) box.removeChild(box.lastChild);
}

function setMeter(u, kind, value) {
    var m = u.el.querySelector('.meter[data-m="' + kind + '"]');
    var fill = m.querySelector(".fill");
    var val = m.querySelector(".val");
    var v = Math.round(value);
    fill.style.width = v + "%";
    val.textContent = v + "%";
    fill.classList.toggle("warn", v >= 75 && v < 90);
    fill.classList.toggle("crit", v >= 90);
    val.classList.toggle("warn", v >= 75 && v < 90);
    val.classList.toggle("crit", v >= 90);
}

function render(key) {
    var u = units[key];
    var lamp = u.el.querySelector(".unit-name .lamp");
    var status = u.el.querySelector(".ro-status .v");
    var players = u.el.querySelector(".ro-players .v");
    var running = u.status === "running";
    var offline = u.status === "offline";

    lamp.className = "lamp " + (offline ? "off" : running ? (reducedMotion ? "run" : "run pulse") : "on");
    u.el.classList.toggle("offline", offline);
    status.textContent = offline ? "Offline" : running ? "Running" : "Online";
    status.className = "v" + (running ? " cy" : "");
    players.textContent = u.players;
    setMeter(u, "cpu", u.cpu);
    setMeter(u, "ram", u.ram);

    u.el.querySelector('[data-act="start"]').disabled = running;
    u.el.querySelector('[data-act="stop"]').disabled = !running;
    u.el.querySelector('[data-act="kill"]').disabled = !running;

    var online = 0, run = 0;
    Object.keys(units).forEach(function (k) {
        if (units[k].status !== "offline") online++;
        if (units[k].status === "running") run++;
    });
    document.getElementById("f-online").textContent = online;
    document.getElementById("f-running").textContent = run;
    document.getElementById("f-offline").textContent = 2 - online;
}

function act(key, action) {
    var u = units[key];
    var name = key === "alpha" ? "EU-Alpha" : "US-Bravo";
    if (action === "start" && u.status !== "running") {
        u.status = "running";
        if (reducedMotion) { u.cpu = u.cpuT; u.ram = u.ramT; }
        feed("server.started", name);
    } else if (action === "stop" && u.status === "running") {
        u.status = "stopped";
        u.players = 0;
        if (reducedMotion) { u.cpu = 0; u.ram = 0; }
        feed("server.stopped", name);
    } else if (action === "kill" && u.status === "running") {
        u.status = "stopped";
        u.players = 0;
        u.cpu = 0;
        u.ram = 0;
        if (!reducedMotion) {
            u.el.classList.add("flash");
            setTimeout(function () { u.el.classList.remove("flash"); }, 650);
        }
        feed("server.killed", name);
    }
    render(key);
}

function tick() {
    Object.keys(units).forEach(function (key) {
        var u = units[key];
        var running = u.status === "running";
        var ct = running ? u.cpuT : 0;
        var rt = running ? u.ramT : 0;

        if (!reducedMotion) {
            u.cpu += (ct - u.cpu) * 0.16;
            u.ram += (rt - u.ram) * 0.16;
            if (running && Math.abs(ct - u.cpu) < 2) u.cpu = ct + (Math.random() * 6 - 3);
            if (running && Math.abs(rt - u.ram) < 2) u.ram = rt + (Math.random() * 6 - 3);
            u.cpu = Math.max(0, Math.min(99, u.cpu));
            u.ram = Math.max(0, Math.min(99, u.ram));
        }

        if (running && Math.random() < 0.06) {
            var name = key === "alpha" ? "EU-Alpha" : "US-Bravo";
            var who = NAMES[Math.floor(Math.random() * NAMES.length)];
            if (u.players <= 0 || (Math.random() < 0.6 && u.players < 24)) {
                u.players++;
                feed("player.joined", name + " · " + who);
            } else {
                u.players--;
                feed("player.left", name + " · " + who);
            }
        }
        render(key);
    });
}

function init() {
    var sim = document.getElementById("sim");
    if (!sim) return;
    Object.keys(units).forEach(function (key) {
        units[key].el = sim.querySelector('[data-unit="' + key + '"]');
    });
    sim.addEventListener("click", function (e) {
        var btn = e.target.closest(".op[data-act]");
        if (!btn || btn.disabled) return;
        var unit = btn.closest("[data-unit]");
        if (!unit) return;
        act(unit.getAttribute("data-unit"), btn.getAttribute("data-act"));
    });
    Object.keys(units).forEach(render);
    setInterval(tick, 500);
}

module.exports = { init: init };

},{}],2:[function(require,module,exports){
// SSM Cloud public landing: no-JS gate, scene reveals, hero video, sim boot.
document.documentElement.classList.add("js");

var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initReveal() {
    var scenes = document.querySelectorAll(".scene");
    if (reducedMotion || !("IntersectionObserver" in window)) {
        scenes.forEach(function (s) { s.classList.add("in"); });
        return;
    }
    var io = new IntersectionObserver(
        function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add("in");
                    io.unobserve(e.target);
                }
            });
        },
        { threshold: 0.25 }
    );
    scenes.forEach(function (s) { io.observe(s); });
}

function initVideo() {
    var video = document.getElementById("hero-video");
    var hero = document.querySelector(".hero");
    if (!video || !hero) return;
    var wide = window.matchMedia("(min-width: 769px)").matches;
    var saveData = navigator.connection && navigator.connection.saveData;
    if (!wide || reducedMotion || saveData) return;

    var src = document.createElement("source");
    src.src = "/public/videos/hero-loop.mp4";
    src.type = "video/mp4";
    video.addEventListener("canplay", function () {
        hero.classList.add("video-on");
        video.play().catch(function () {});
    });
    video.addEventListener("error", function () {
        hero.classList.remove("video-on");
    }, true);
    video.appendChild(src);
    video.load();
}

initReveal();
initVideo();
require("./public-sim").init();

},{"./public-sim":1}]},{},[2]);
