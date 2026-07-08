// Derives fleet summary tiles + a "needs attention" list from the rendered
// server-card DOM. Display-only; no server round-trip.
function num(el) { return el ? parseFloat(el.textContent) || 0 : 0; }

function readCards() {
    return Array.prototype.map.call(document.querySelectorAll("#agents-wrapper .unit"), function (card) {
        const rail = card.classList.contains("online");
        const running = !!card.querySelector(".status-lamp.run");
        const cpuEl = card.querySelector(".meter-row .val");
        const vals = card.querySelectorAll(".meter-row .val");
        const name = (card.querySelector(".unit-name") || {}).textContent || "";
        return {
            name: name.trim(),
            online: rail,
            running: running,
            cpu: vals[0] ? num(vals[0]) : 0,
            ram: vals[1] ? num(vals[1]) : 0,
        };
    });
}

function tile(n, label, lamp) {
    return '<div class="ftile"><div class="ftile-top">' +
        (lamp ? '<span class="status-lamp ' + lamp + '"></span>' : "") +
        '<span class="ftile-n">' + n + '</span></div><span class="ftile-k">' + label + '</span></div>';
}

function render() {
    const wrap = document.getElementById("fleet-summary");
    if (!wrap) return;
    const cards = readCards();
    const online = cards.filter(function (c) { return c.online; });
    const running = cards.filter(function (c) { return c.running; });
    const offline = cards.length - online.length;

    wrap.innerHTML =
        tile(cards.length, "Servers", "") +
        tile(online.length, "Online", "on") +
        tile(running.length, "Running", "run") +
        tile(offline, "Offline", offline ? "off" : "");

    // attention
    const alerts = [];
    cards.forEach(function (c) {
        if (!c.online) alerts.push({ sev: "crit", m: c.name + " is offline", s: "Agent not reporting" });
        else if (c.ram >= 90 || c.cpu >= 90) alerts.push({ sev: "crit", m: c.name + " — " + (c.ram >= 90 ? "memory" : "CPU") + " at " + Math.max(c.ram, c.cpu) + "%", s: "Critical load" });
        else if (c.ram >= 75 || c.cpu >= 75) alerts.push({ sev: "warn", m: c.name + " under heavy load", s: "CPU " + c.cpu + "% · RAM " + c.ram + "%" });
    });
    const rank = { crit: 0, warn: 1, info: 2 };
    alerts.sort(function (a, b) { return rank[a.sev] - rank[b.sev]; });
    const att = document.getElementById("attention");
    const head = document.getElementById("attention-head");
    if (alerts.length) {
        head.classList.remove("hidden");
        document.getElementById("attention-meta").textContent = alerts.length + (alerts.length === 1 ? " item" : " items");
        att.innerHTML = alerts.map(function (a) {
            return '<div class="alert-row ' + a.sev + '"><div class="atxt"><div class="am">' + a.m + '</div><div class="as">' + a.s + '</div></div></div>';
        }).join("");
    } else {
        head.classList.add("hidden");
        att.innerHTML = "";
    }
}

module.exports = { init: function () { document.addEventListener("DOMContentLoaded", render); } };
