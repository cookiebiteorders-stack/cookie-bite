/**
 * Loki-style shapeshift orchestration (DOM-safe for React: no innerHTML swaps unless requested).
 * Page transitions are handled separately — do not intercept Next.js <Link> navigation.
 */

export type LokiTransformOptions = {
  /** Default particle count (halved on coarse pointer / touch). */
  particleCount?: number;
};

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isLowParticleDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const touch =
    "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;
  return coarse || touch;
}

function effectiveParticleCount(base: number) {
  const n = Math.max(12, Math.floor(base));
  return isLowParticleDevice() ? Math.max(8, Math.floor(n / 2)) : n;
}

export class LokiParticles {
  private readonly rect: DOMRect;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    decay: number;
    color: string;
  }[] = [];
  private raf = 0;

  constructor(element: HTMLElement) {
    this.rect = element.getBoundingClientRect();
    this.canvas = document.createElement("canvas");
    this.canvas.className = "loki-particle-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    const left = this.rect.left + window.scrollX;
    const top = this.rect.top + window.scrollY;
    this.canvas.style.cssText = [
      "position:absolute",
      "pointer-events:none",
      "z-index:9998",
      `left:${left}px`,
      `top:${top}px`,
      `width:${this.rect.width}px`,
      `height:${this.rect.height}px`,
    ].join(";");
    document.body.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("LokiParticles: 2d context unavailable");
    }
    this.ctx = ctx;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.floor(this.rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(this.rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  spawn(count: number) {
    const w = this.rect.width;
    const h = this.rect.height;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 1,
        size: Math.random() * 3 + 1,
        life: 1,
        decay: Math.random() * 0.025 + 0.015,
        color: Math.random() > 0.5 ? "#C9A84C" : "#00FF88",
      });
    }
    this.animate();
  }

  private animate = () => {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    this.particles = this.particles.filter((p) => p.life > 0);
    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.shadowColor = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });
    if (this.particles.length > 0) {
      this.raf = requestAnimationFrame(this.animate);
    } else {
      this.destroy();
    }
  };

  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas.remove();
  }
}

function clearInlineAnim(el: HTMLElement) {
  el.style.animation = "";
  el.style.opacity = "";
  el.style.filter = "";
  el.style.willChange = "";
  el.style.boxShadow = "";
}

async function applyMorphAndText(el: HTMLElement) {
  const morph = el.dataset.lokiMorph;
  if (morph && el instanceof HTMLImageElement) {
    el.src = morph;
    return;
  }
  const to = el.dataset.lokiTo;
  if (to && (el instanceof HTMLButtonElement || el.tagName === "BUTTON")) {
    el.textContent = to;
  }
}

export class LokiTransform {
  private readonly particleCount: number;
  private readonly abort = new AbortController();
  private readonly registered = new WeakSet<HTMLElement>();
  private boundEls: { el: Element; type: string; fn: (e: Event) => void }[] =
    [];
  private mutationObserver?: MutationObserver;
  private scanScheduled = false;

  constructor(options: LokiTransformOptions = {}) {
    this.particleCount = options.particleCount ?? 60;
  }

  dispose() {
    this.mutationObserver?.disconnect();
    this.mutationObserver = undefined;
    this.abort.abort();
    for (const { el, type, fn } of this.boundEls) {
      el.removeEventListener(type, fn);
    }
    this.boundEls = [];
    document.querySelectorAll(".loki-particle-canvas").forEach((node) => node.remove());
  }

  /** Full interactive sequence (hover/click/scroll). */
  async transform(el: HTMLElement) {
    if (el.dataset.lokiRunning === "true") return;
    el.dataset.lokiRunning = "true";

    if (prefersReducedMotion()) {
      await this.reducedTransform(el);
      delete el.dataset.lokiRunning;
      return;
    }

    const n = effectiveParticleCount(this.particleCount);
    el.style.willChange = "transform, opacity, filter";

    try {
      el.style.animation = "loki-distort 0.35s ease-in-out forwards";
      await wait(200);

      const rect = el.getBoundingClientRect();
      const ghost = el.cloneNode(true) as HTMLElement;
      ghost.removeAttribute("data-loki");
      ghost.querySelectorAll("[data-loki]").forEach((node) => {
        node.removeAttribute("data-loki");
      });
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.cssText = [
        "position:fixed",
        "pointer-events:none",
        "z-index:9997",
        `left:${rect.left}px`,
        `top:${rect.top}px`,
        `width:${rect.width}px`,
        `height:${rect.height}px`,
        "box-sizing:border-box",
        "animation:loki-ghost 0.5s ease-out forwards",
      ].join(";");
      document.body.appendChild(ghost);

      const particles = new LokiParticles(el);
      particles.spawn(n);
      await wait(150);

      el.style.animation = "loki-glitch 0.15s steps(1) forwards";
      await wait(150);

      el.style.opacity = "0";
      el.style.animation = "none";
      await wait(100);

      await applyMorphAndText(el);

      el.style.opacity = "1";
      el.style.animation =
        "loki-emerge 0.35s cubic-bezier(0.23, 1, 0.32, 1) forwards";
      await wait(350);

      el.style.animation = "loki-seal 0.4s ease-out forwards";
      await wait(400);

      ghost.remove();
    } finally {
      clearInlineAnim(el);
      delete el.dataset.lokiRunning;
    }
  }

  /** Route “rebirth” — phases 4→6→7 only, syncs with App Router without killing children. */
  async playRouteArrival(el: HTMLElement) {
    if (el.dataset.lokiRouteRunning === "true") return;
    el.dataset.lokiRouteRunning = "true";

    if (prefersReducedMotion()) {
      el.style.opacity = "0";
      await wait(16);
      el.style.transition = "opacity 0.28s ease-out";
      el.style.opacity = "1";
      await wait(300);
      el.style.transition = "";
      el.style.opacity = "";
      delete el.dataset.lokiRouteRunning;
      return;
    }

    const n = effectiveParticleCount(Math.floor(this.particleCount * 0.45));
    el.style.willChange = "transform, opacity, filter";

    try {
      el.style.animation = "loki-glitch 0.14s steps(1) forwards";
      await wait(120);

      const particles = new LokiParticles(el);
      particles.spawn(n);
      await wait(120);

      el.style.animation =
        "loki-emerge 0.38s cubic-bezier(0.23, 1, 0.32, 1) forwards";
      el.style.opacity = "1";
      await wait(380);

      el.style.animation = "loki-seal 0.38s ease-out forwards";
      await wait(380);
    } finally {
      clearInlineAnim(el);
      delete el.dataset.lokiRouteRunning;
    }
  }

  private async reducedTransform(el: HTMLElement) {
    el.style.opacity = "0.85";
    await wait(40);
    await applyMorphAndText(el);
    el.style.transition = "opacity 0.32s ease-out";
    el.style.opacity = "1";
    await wait(340);
    el.style.transition = "";
  }

  private bind(el: Element, type: string, fn: (e: Event) => void) {
    el.addEventListener(type, fn, { signal: this.abort.signal });
    this.boundEls.push({ el, type, fn });
  }

  private attachInteractiveTargets(el: HTMLElement) {
    if (typeof document === "undefined") return;
    const trigger = (el.dataset.loki || "").trim();
    if (
      trigger === "page-transition" ||
      trigger === "page-route" ||
      el.dataset.lokiSkipInit === "true" ||
      this.registered.has(el)
    ) {
      return;
    }

    if (
      trigger !== "hover" &&
      trigger !== "click" &&
      trigger !== "scroll" &&
      trigger !== "auto"
    ) {
      return;
    }

    this.registered.add(el);

    if (trigger === "hover") {
      this.bind(el, "mouseenter", () => {
        void this.transform(el);
      });
    } else if (trigger === "click") {
      this.bind(el, "click", () => {
        void this.transform(el);
      });
    } else if (trigger === "scroll") {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            void this.transform(el);
            obs.disconnect();
          }
        },
        { threshold: 0.3 },
      );
      obs.observe(el);
      this.abort.signal.addEventListener("abort", () => obs.disconnect(), {
        once: true,
      });
    } else if (trigger === "auto") {
      requestAnimationFrame(() => void this.transform(el));
    }
  }

  /** Scan `[data-loki]` once — also called after DOM mutations. */
  syncInteractiveTargetsFromDom() {
    if (typeof document === "undefined") return;
    document
      .querySelectorAll<HTMLElement>("[data-loki]")
      .forEach((el) => this.attachInteractiveTargets(el));
  }

  private scheduleDomSync() {
    if (this.scanScheduled || typeof document === "undefined") return;
    this.scanScheduled = true;
    requestAnimationFrame(() => {
      this.scanScheduled = false;
      this.syncInteractiveTargetsFromDom();
    });
  }

  /** Register `[data-loki]` (excluding route shell); watches DOM so client navigated pages bind too. */
  init() {
    if (typeof document === "undefined") return;

    this.syncInteractiveTargetsFromDom();

    this.mutationObserver = new MutationObserver(() =>
      this.scheduleDomSync(),
    );
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}
