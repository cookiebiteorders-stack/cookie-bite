const RETRY_DELAYS_MS = [0, 50, 150, 400] as const;

/** Scroll to an account dashboard section (`#orders`, `#addresses`, …). */
export function scrollToAccountSection(hash: string): boolean {
  if (typeof window === "undefined") return false;

  const id = decodeURIComponent(hash.replace(/^#/, "").trim());
  if (!id) return false;

  const targetPath = `/account#${id}`;
  const current = `${window.location.pathname}${window.location.hash}`;
  if (current !== targetPath) {
    window.history.pushState(null, "", targetPath);
  }

  const scroll = () => {
    const el = document.getElementById(id);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return true;
  };

  if (scroll()) return true;

  for (const delay of RETRY_DELAYS_MS) {
    window.setTimeout(() => scroll(), delay);
  }
  return false;
}
