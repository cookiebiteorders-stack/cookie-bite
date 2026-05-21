(function () {
  try {
    var r = document.documentElement;
    r.setAttribute("data-theme", "light");
    r.style.colorScheme = "light";
    r.classList.remove("dark");
    var l = localStorage.getItem("lang");
    var lang = l === "en" || l === "ar" ? l : "ar";
    r.setAttribute("lang", lang);
    r.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    r.setAttribute("data-lang", lang);
  } catch {
    /* ignore */
  }
})();
