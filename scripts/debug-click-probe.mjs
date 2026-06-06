import { chromium } from "playwright";

const url = process.argv[2] ?? "https://cookie-bite.com/";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(url, { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(8000);

const blockers = await page.evaluate(() => {
  const vw = innerWidth;
  const vh = innerHeight;
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const s = getComputedStyle(el);
    if (s.position !== "fixed") continue;
    const r = el.getBoundingClientRect();
    if (r.width < vw * 0.9 || r.height < vh * 0.9) continue;
    if (s.pointerEvents === "none" || s.visibility === "hidden" || s.display === "none") continue;
    const op = parseFloat(s.opacity);
    if (!Number.isNaN(op) && op < 0.05) continue;
    out.push({
      tag: el.tagName,
      cls: String(el.className).slice(0, 100),
      z: s.zIndex,
      op: s.opacity,
      pe: s.pointerEvents,
    });
  }
  return out;
});

console.log("URL", url);
console.log("BLOCKERS", JSON.stringify(blockers, null, 2));

const before = page.url();
const shopCount = await page.locator('a[href="/shop"]').count();
console.log("SHOP_LINK_COUNT", shopCount);

const shopMeta = await page.evaluate(() => {
  return [...document.querySelectorAll('a[href="/shop"]')].map((a, i) => {
    const s = getComputedStyle(a);
    const r = a.getBoundingClientRect();
    return {
      i,
      text: a.textContent?.trim().slice(0, 30),
      visible: s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0,
      pe: s.pointerEvents,
      display: s.display,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      parentNav: a.closest("nav")?.getAttribute("aria-label") ?? null,
    };
  });
});
console.log("SHOP_LINKS_META", JSON.stringify(shopMeta, null, 2));

const shop = page.locator('a[href="/shop"]').first();

if (shopCount > 0) {
  const box = await shop.boundingBox();
  const cx = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const cy = (box?.y ?? 0) + (box?.height ?? 0) / 2;
  const stack = await page.evaluate(({ x, y }) => {
    const out = [];
    const seen = new Set();
    let el = document.elementFromPoint(x, y);
    for (let i = 0; i < 12 && el && !seen.has(el); i++) {
      seen.add(el);
      const s = getComputedStyle(el);
      out.push({
        tag: el.tagName,
        cls: String(el.className).slice(0, 90),
        href: el.closest?.("a")?.getAttribute?.("href") ?? null,
        pe: s.pointerEvents,
        z: s.zIndex,
        pos: s.position,
      });
      el = el.parentElement;
    }
    return out;
  }, { x: cx, y: cy });
  console.log("HIT_STACK_AT_SHOP_LINK", JSON.stringify(stack, null, 2));
  try {
    const [resp] = await Promise.all([
      page.waitForURL(/\/shop/, { timeout: 15000 }).catch(() => null),
      shop.click({ timeout: 10000 }),
    ]);
    console.log("WAIT_FOR_SHOP_URL", resp ? page.url() : "timeout");
  } catch (e) {
    console.log("CLICK_ERROR", e.message);
  }
  await page.waitForTimeout(2000);
}

const headersOnPage = await page.evaluate(() =>
  [...document.querySelectorAll("header")].map((h) => ({
    cls: String(h.className).slice(0, 120),
    display: getComputedStyle(h).display,
    pe: getComputedStyle(h).pointerEvents,
  })),
);
console.log("ALL_HEADERS", JSON.stringify(headersOnPage, null, 2));

const jsErrors = [];
page.on("pageerror", (e) => jsErrors.push(String(e.message).slice(0, 200)));
await page.waitForTimeout(1000);
console.log("JS_ERRORS", JSON.stringify(jsErrors));

const headerNav = await page.evaluate(() => {
  const header = document.querySelector("header.cb-pl-navbar");
  if (!header) return { found: false };
  const nav = header.querySelector('nav[aria-label]');
  const links = nav ? [...nav.querySelectorAll("a[href]")].map((a) => ({
    href: a.getAttribute("href"),
    text: a.textContent?.trim().slice(0, 20),
    pe: getComputedStyle(a).pointerEvents,
    display: getComputedStyle(a).display,
    rect: a.getBoundingClientRect(),
  })) : [];
  return {
    found: true,
    navDisplay: nav ? getComputedStyle(nav).display : null,
    linkCount: links.length,
    links,
  };
});
console.log("HEADER_NAV", JSON.stringify(headerNav, null, 2));

try {
  const headerShop = page.locator("header.cb-pl-navbar nav a[href='/shop']").first();
  if (await headerShop.count()) {
    await headerShop.click({ timeout: 8000 });
    await page.waitForTimeout(2500);
    console.log("HEADER_SHOP_NAV", before, "->", page.url());
  } else {
    console.log("HEADER_SHOP_NAV", "no header shop link in DOM");
  }
} catch (e) {
  console.log("HEADER_SHOP_CLICK_ERR", e.message);
}

console.log("HERO_NAV", before, "->", page.url());
await browser.close();
