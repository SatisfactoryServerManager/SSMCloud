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

// "system" clears the override so prefers-color-scheme wins again.
function saved() {
    try { return localStorage.getItem(KEY) || "system"; } catch (e) { return "system"; }
}

function set(mode) {
    apply(mode);
    try {
        if (mode === "light" || mode === "dark") {
            localStorage.setItem(KEY, mode);
        } else {
            localStorage.removeItem(KEY);
        }
    } catch (e) { /* ignore */ }
    markChoice();
}

function toggle() {
    set(current() === "dark" ? "light" : "dark");
}

function markChoice() {
    const mode = saved();
    document.querySelectorAll("[data-ssm-theme-set]").forEach(function (btn) {
        btn.classList.toggle("active", btn.getAttribute("data-ssm-theme-set") === mode);
    });
}

function init() {
    apply(saved());
    markChoice();
    document.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-ssm-theme-toggle]");
        if (btn) { e.preventDefault(); toggle(); return; }

        const choice = e.target.closest("[data-ssm-theme-set]");
        if (choice) { e.preventDefault(); set(choice.getAttribute("data-ssm-theme-set")); }
    });
}

window.SSMTheme = { set: set, toggle: toggle, current: current };
module.exports = { init: init };
