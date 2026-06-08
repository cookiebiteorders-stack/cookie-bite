/**
 * Inline CSS that must render correctly even when /_next/static CSS fails
 * (PWA stale cache, Hostinger missing static, deploy mismatch).
 */
export const CRITICAL_SHELL_CSS = [
  ":root{--cb-cream:#fffaf4;--background:#fffaf4;--foreground:#2d1810;--cb-text:#5c3d2e;--cb-text-strong:#2d1810;--cb-terracotta-dark:#ea580c;--cb-announcement-offset:0px;color-scheme:light}",
  "html,body{margin:0;padding:0;min-height:100%;background:var(--background);color:var(--foreground);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;line-height:1.5;-webkit-font-smoothing:antialiased}",
  "*,*::before,*::after{box-sizing:border-box}",
  "a{color:inherit;text-decoration:none}",
  "img,svg{display:block;max-width:100%}",
  ".cb-logo-mark{width:2.5rem;height:2.5rem;max-width:min(100%,4rem);max-height:4rem;flex-shrink:0;display:block}",
  ".cb-skip-link{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}",
  ".cb-skip-link:focus{left:1rem;top:calc(1rem + var(--cb-announcement-offset,0px));width:auto;height:auto;padding:.5rem 1rem;background:#fff;border:2px solid #ea580c;border-radius:.5rem;z-index:9999}",
  ".cb-pl-announcement{background:linear-gradient(90deg,#c2410c,#ea580c);color:#fff;padding:.35rem 0;font-size:12px;font-weight:500}",
  ".cb-pl-announcement .inline-flex{align-items:center;gap:2rem}",
  ".cb-storefront{min-height:100vh;background:var(--background);color:var(--foreground)}",
  ".desktop-header,.desktop-footer,.desktop-whatsapp-fab{display:none}",
  ".mobile-header{display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;border-bottom:1px solid #ffd4b8;background:var(--background)}",
  ".mobile-tab-bar,.mobile-footer{display:block}",
  "#main-content{flex:1 1 auto;width:100%}",
  "@media(min-width:768px){.desktop-header,.desktop-footer,.desktop-whatsapp-fab{display:block}.mobile-header,.mobile-tab-bar,.mobile-footer{display:none!important}}",
  "@media(max-width:767px){.desktop-header,.desktop-footer,.desktop-whatsapp-fab{display:none!important}.mobile-header{display:flex!important}.mobile-tab-bar,.mobile-footer{display:block!important}}",
].join("");
