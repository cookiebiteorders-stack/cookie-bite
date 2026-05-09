type Realm = "light" | "dark";

type RunLensParams = {
  originX: number;
  originY: number;
  targetRealm: Realm;
  onSwapTheme: () => void;
  onToggleClass?: (running: boolean) => void;
};

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function safeNumber(n: number, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

function easeInOutQuart(t: number) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class LokiLensEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private mountCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText =
      "position:fixed;inset:0;z-index:99999;pointer-events:none;will-change:transform,opacity";
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      canvas.remove();
      throw new Error("LokiLensEngine: Canvas context unavailable");
    }
    this.canvas = canvas;
    this.ctx = ctx;
  }

  private unmountCanvas() {
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }

  private getContext() {
    if (!this.canvas || !this.ctx) {
      throw new Error("LokiLensEngine: Canvas not mounted");
    }
    return { canvas: this.canvas, ctx: this.ctx };
  }

  private async phaseSeidrWarp() {
    document.body.style.filter = 'url("#seidr-warp")';
    const warp = document.getElementById("warp-anim") as SVGAnimateElement | null;
    const displace = document.getElementById(
      "displace-anim",
    ) as SVGAnimateElement | null;
    warp?.beginElement();
    displace?.beginElement();
    await wait(260);
    document.body.style.filter = "";
  }

  private async phaseLensIris(cx: number, cy: number, targetRealm: Realm) {
    const { canvas, ctx } = this.getContext();
    const irisColor =
      targetRealm === "dark" ? "rgba(7,10,15,0.96)" : "rgba(251,245,230,0.96)";
    const maxRadius = Math.hypot(
      Math.max(cx, window.innerWidth - cx),
      Math.max(cy, window.innerHeight - cy),
    );
    const duration = 340;
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const draw = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const r = easeInOutQuart(t) * maxRadius;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = irisColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";

        if (r > 8) {
          const safeCx = safeNumber(cx);
          const safeCy = safeNumber(cy);
          const innerR = Math.max(0, safeNumber(r - 12));
          const outerR = Math.max(innerR + 0.001, safeNumber(r + 12, innerR + 12));
          const grad = ctx.createRadialGradient(
            safeCx,
            safeCy,
            innerR,
            safeCx,
            safeCy,
            outerR,
          );
          grad.addColorStop(0, "rgba(61,255,192,0)");
          grad.addColorStop(0.35, "rgba(61,255,192,0.75)");
          grad.addColorStop(0.55, "rgba(201,168,76,0.95)");
          grad.addColorStop(0.72, "rgba(139,92,246,0.65)");
          grad.addColorStop(1, "rgba(255,58,110,0)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = 18;
          ctx.shadowBlur = 24;
          ctx.shadowColor = "#3DFFC0";
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        if (t < 1) requestAnimationFrame(draw);
        else resolve();
      };
      requestAnimationFrame(draw);
    });
  }

  private async phaseBifrostRing(cx: number, cy: number) {
    const { canvas, ctx } = this.getContext();
    const colors = [
      "#FF3A6E",
      "#FF7A1A",
      "#FFD700",
      "#3DFFC0",
      "#00AAFF",
      "#8B5CF6",
      "#FF3AFF",
    ];
    const rings = colors.map((color, i) => ({
      color,
      radius: 0,
      alpha: 1,
      speed: 8 + i * 2.25,
      width: Math.max(1.5, 4 - i * 0.35),
      born: performance.now() + i * 22,
    }));

    const duration = 320;
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const draw = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        for (const ring of rings) {
          if (now < ring.born) continue;
          ring.radius += ring.speed;
          ring.alpha = Math.max(
            0,
            1 - ring.radius / (Math.hypot(canvas.width, canvas.height) * 0.7),
          );
          ctx.globalAlpha = ring.alpha;
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = ring.width;
          ctx.shadowBlur = 16;
          ctx.shadowColor = ring.color;
          ctx.beginPath();
          ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        if (t < 1) requestAnimationFrame(draw);
        else resolve();
      };
      requestAnimationFrame(draw);
    });
  }

  private async phaseRealmTear(targetRealm: Realm) {
    const { canvas, ctx } = this.getContext();
    const tearColor = targetRealm === "dark" ? "#3DFFC0" : "#C9902A";
    const fillColor = targetRealm === "dark" ? "#070A0F" : "#FBF5E6";
    const midY = canvas.height / 2;
    const duration = 260;
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const draw = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const gap = easeInOutCubic(t) * (canvas.height * 0.58);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, canvas.width, Math.max(0, midY - gap / 2));
        ctx.fillRect(0, midY + gap / 2, canvas.width, canvas.height);

        if (gap > 2) {
          const grad = ctx.createLinearGradient(0, midY - gap / 2, 0, midY + gap / 2);
          grad.addColorStop(0, "transparent");
          grad.addColorStop(0.12, tearColor);
          grad.addColorStop(0.5, fillColor);
          grad.addColorStop(0.88, tearColor);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.shadowBlur = 36;
          ctx.shadowColor = tearColor;
          ctx.fillRect(0, midY - gap / 2, canvas.width, gap);
          ctx.shadowBlur = 0;
        }

        if (t < 1) requestAnimationFrame(draw);
        else resolve();
      };
      requestAnimationFrame(draw);
    });
  }

  private async phaseZenithFlash(targetRealm: Realm) {
    const { canvas, ctx } = this.getContext();
    const flash =
      targetRealm === "dark" ? "rgba(61,255,192,0.92)" : "rgba(255,210,100,0.92)";
    const duration = 140;
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const draw = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const alpha = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = flash;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        if (t < 1) requestAnimationFrame(draw);
        else resolve();
      };
      requestAnimationFrame(draw);
    });
  }

  private async phaseReform() {
    document.body.classList.add("loki-reforming");
    await wait(280);
    document.body.classList.remove("loki-reforming");
  }

  private async phaseSealGlow(cx: number, cy: number, targetRealm: Realm) {
    const { canvas, ctx } = this.getContext();
    const glow = targetRealm === "dark" ? "#3DFFC0" : "#C9902A";
    const duration = 360;
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const draw = (now: number) => {
        const t = Math.min((now - start) / duration, 1);
        const r = Math.max(34.001, safeNumber(34 + t * 116, 34.001));
        const alpha = (1 - t) * 0.72;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = alpha;
        const safeCx = safeNumber(cx);
        const safeCy = safeNumber(cy);
        const grad = ctx.createRadialGradient(
          safeCx,
          safeCy,
          34,
          safeCx,
          safeCy,
          r,
        );
        grad.addColorStop(0, glow);
        grad.addColorStop(0.52, `${glow}80`);
        grad.addColorStop(1, "transparent");
        ctx.strokeStyle = glow;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        if (t < 1) requestAnimationFrame(draw);
        else resolve();
      };
      requestAnimationFrame(draw);
    });
  }

  async run(params: RunLensParams) {
    const { originX, originY, targetRealm, onSwapTheme, onToggleClass } = params;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onSwapTheme();
      return;
    }

    onToggleClass?.(true);
    this.mountCanvas();
    try {
      await this.phaseSeidrWarp();
      await this.phaseLensIris(originX, originY, targetRealm);
      await this.phaseBifrostRing(originX, originY);
      await this.phaseRealmTear(targetRealm);
      await this.phaseZenithFlash(targetRealm);
      onSwapTheme();
      await this.phaseReform();
      await this.phaseSealGlow(originX, originY, targetRealm);
    } finally {
      this.unmountCanvas();
      onToggleClass?.(false);
    }
  }
}

