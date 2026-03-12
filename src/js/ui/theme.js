function initTheme() {
    var saved = fk_theme_get();
    if (saved) {
        document.documentElement.setAttribute("data-theme", saved);
    }
    renderThemeIcon();
    document.getElementById("theme_toggle").addEventListener("click", toggleTheme);
}

function toggleTheme() {
    var current = document.documentElement.getAttribute("data-theme");
    var isDark;
    if (current === "dark") {
        isDark = false;
    } else if (current === "light") {
        isDark = true;
    } else {
        isDark = !window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    var next = isDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    fk_theme_set(next);
    renderThemeIcon();
}

function renderThemeIcon() {
    var btn = document.getElementById("theme_toggle");
    var current = document.documentElement.getAttribute("data-theme");
    var isDark;
    if (current === "dark") {
        isDark = true;
    } else if (current === "light") {
        isDark = false;
    } else {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    btn.innerHTML = isDark
        ? hb.getSvg("sun_icon", { class_string: "theme_icon" })
        : hb.getSvg("moon_icon", { class_string: "theme_icon" });
}

function fk_theme_get() {
    try { return localStorage.getItem("fk_theme"); } catch (e) { return null; }
}

function fk_theme_set(val) {
    try { localStorage.setItem("fk_theme", val); } catch (e) {}
}
