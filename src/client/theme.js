// Manual light/dark theme toggle, persisted to localStorage.
// data-theme on <html> overrides the OS prefers-color-scheme.
const KEY = "ssm-theme";

function apply(mode) {
    if (mode === "light" || mode === "dark") {
        document.documentElement.setAttribute("data-theme", mode);
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
}

function current() {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr) return attr;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function set(mode) {
    apply(mode);
    try { localStorage.setItem(KEY, mode); } catch (e) { /* ignore */ }
}

function toggle() {
    set(current() === "dark" ? "light" : "dark");
}

function init() {
    try {
        const saved = localStorage.getItem(KEY);
        if (saved) apply(saved);
    } catch (e) { /* ignore */ }
    document.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-ssm-theme-toggle]");
        if (btn) { e.preventDefault(); toggle(); }
    });
}

window.SSMTheme = { set: set, toggle: toggle, current: current };
module.exports = { init: init };
