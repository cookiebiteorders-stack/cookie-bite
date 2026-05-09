(function () {
  try {
    var r = document.documentElement;
    var key = "cookie-bite-theme";
    var s = localStorage.getItem(key);
    var t =
      s === "dark" || s === "light"
        ? s
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    r.setAttribute("data-theme", t);
    r.style.colorScheme = t;
    if (t === "dark") {
      r.classList.add("dark");
    } else {
      r.classList.remove("dark");
    }
    var l = localStorage.getItem("lang");
    var lang = l === "en" || l === "ar" ? l : "ar";
    r.setAttribute("lang", lang);
    r.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    r.setAttribute("data-lang", lang);
  } catch (_) {
    /* ignore */
  }
})();
