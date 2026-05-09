"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Send, X } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/utils";
import { buttonClassName } from "@/components/ui/button";
import {
  FAB_SIZE_PX,
  clampFabBottom,
  defaultFabPosition,
  fabInsetPx,
  fabTopLeftFromStored,
  loadFabPosition,
  rectToFabPosition,
  saveFabPosition,
  type MrBrownieFabPosition,
} from "@/lib/mr-brownie/fab-position";

type ChatMessage = { role: "user" | "assistant"; content: string };

/** شعار Mr. Brownie — PNG بخلفية شفافة في `public/brand/` */
const MR_BROWNIE_MASCOT_SRC = "/brand/mr-brownie-mascot.png";

const DRAG_THRESHOLD_PX = 8;
const SETTLE_MS = 360;

const ROLE_LABEL_AR: Record<string, string> = {
  guest: "زائر",
  customer: "عميل",
  staff: "موظف",
  admin: "مشرف",
  owner: "مالك",
};

const SUGGESTIONS_SHOP = [
  "رشّح لي هدية مناسبة 🎁",
  "إيش أنسب منتج مع القهوة؟",
  "متى يكون التوصيل مجاني؟",
  "وين الكوكيز الأكثر طلباً؟",
] as const;

const SUGGESTIONS_STAFF = [
  "ملخص سريع لما أحتاجه في الطلبات اليوم",
  "خطوات التحقق قبل الشحن",
  "إيش أذكر للعميل عن وقت التجهيز؟",
] as const;

const SUGGESTIONS_EXEC = [
  "ملخص اليوم مقارنة بالأسبوع (من البيانات المتاحة)",
  "أكثر المنتجات مبيعاً حسب السياق",
  "إيش أنصح أعمل أولاً كخطوة تشغيلية؟",
] as const;

function suggestionsForRole(role: string | null): readonly string[] {
  if (role === "staff") return SUGGESTIONS_STAFF;
  if (role === "admin" || role === "owner") return SUGGESTIONS_EXEC;
  return SUGGESTIONS_SHOP;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 639px)").matches;
}

function clampDragPosition(left: number, top: number, vw: number, vh: number) {
  const inset = fabInsetPx();
  return {
    left: Math.max(inset, Math.min(vw - FAB_SIZE_PX - inset, left)),
    top: Math.max(72, Math.min(vh - FAB_SIZE_PX - (isMobileViewport() ? 96 : inset), top)),
  };
}

/**
 * موضع اللوحة: عمودياً فوق أو تحت الزر حسب موقعه، وأفقياً بعكس الجانب
 * (يمين الشاشة ← اللوحة تتمدد يسار الزر، والعكس).
 */
type PanelPlacement = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  maxHeightPx: number;
};

const PANEL_GAP_PX = 12;
const PANEL_MAX_W_PX = 540;
/** أقل ارتفاع معقول للوحة كاملة — يفضّل قلب الاتجاه إن المساحة أصغر */
const MIN_TOTAL_PANEL_PX = 500;
/** أقصى ارتفاع للوحة (يتقاطع مع المساحة الفعلية تحت/فوق الزر) */
const DEFAULT_PANEL_MAX_H = 640;
const MIN_SPACE_TO_TRY_PANEL = 160;

function computeSmartPanelPlacement(r: DOMRect): PanelPlacement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const mobile = isMobileViewport();
  const safeTop = 24; // Less conservative safe area to allow taller panel
  const safeBottom = mobile ? 88 : 24;
  const gap = PANEL_GAP_PX;
  const panelW = Math.min(PANEL_MAX_W_PX, vw - 32);

  const fabCx = r.left + r.width / 2;
  const fabCy = r.top + r.height / 2;

  let spaceBelow = vh - r.bottom - gap - safeBottom;
  let spaceAbove = r.top - gap - safeTop;

  const preferBelow = fabCy < vh * 0.5;
  let useBelow: boolean;
  if (preferBelow && spaceBelow >= MIN_SPACE_TO_TRY_PANEL) useBelow = true;
  else if (!preferBelow && spaceAbove >= MIN_SPACE_TO_TRY_PANEL) {
    useBelow = false;
  } else {
    useBelow = spaceBelow >= spaceAbove;
  }

  let space = useBelow ? spaceBelow : spaceAbove;
  const otherSide = useBelow ? spaceAbove : spaceBelow;
  if (space < MIN_TOTAL_PANEL_PX && otherSide > space + 24) {
    useBelow = !useBelow;
    space = useBelow ? spaceBelow : spaceAbove;
  }

  let top: number | undefined;
  let bottom: number | undefined;
  
  // Make the panel much taller by default, but bounded by vh
  const heightCap = Math.min(850, Math.floor(vh * 0.92));
  // Force a minimum height of 650px so the content is always visible
  let maxH = Math.min(heightCap, Math.max(650, space), vh - safeTop - safeBottom);

  if (useBelow) {
    top = Math.round(r.bottom + gap);
    bottom = undefined;
    // If it overflows the bottom, push it up
    if (top + maxH + safeBottom > vh) {
      top = Math.max(safeTop, vh - safeBottom - maxH);
    }
  } else {
    bottom = Math.round(vh - r.top + gap);
    top = undefined;
    // If it overflows the top, push it down
    // The top edge is vh - bottom - maxH. It must be >= safeTop
    if (vh - bottom - maxH < safeTop) {
      bottom = Math.max(safeBottom, vh - safeTop - maxH);
    }
  }

  let left: number | undefined;
  let right: number | undefined;
  if (fabCx < vw / 2) {
    left = Math.round(
      Math.min(Math.max(16, r.right + gap), vw - panelW - 16),
    );
  } else {
    right = Math.round(
      Math.min(Math.max(16, vw - r.left + gap), vw - panelW - 16),
    );
  }

  const maxHeightPx = Math.min(Math.max(Math.floor(maxH), 0), vh - 24);

  return {
    top,
    bottom,
    left,
    right,
    maxHeightPx,
  };
}

function placementFromStoredFab(
  pos: MrBrownieFabPosition,
  vw: number,
  vh: number,
): PanelPlacement {
  const { left, top } = fabTopLeftFromStored(pos, vw, vh);
  const r = new DOMRect(left, top, FAB_SIZE_PX, FAB_SIZE_PX);
  return computeSmartPanelPlacement(r);
}

export function MrBrownieChat() {
  const { lines } = useCart();
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [fabPos, setFabPos] = useState<MrBrownieFabPosition>(() =>
    defaultFabPosition(false),
  );
  const [dragPx, setDragPx] = useState<{ left: number; top: number } | null>(null);
  const [settling, setSettling] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [panelPlacement, setPanelPlacement] = useState<PanelPlacement | null>(
    null,
  );
  const fabRef = useRef<HTMLButtonElement>(null);
  const dragSession = useRef<{
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);
  const pointerMoved = useRef(false);
  const dragFlushRafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ left: number; top: number } | null>(null);
  const settleRafRef = useRef<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const flushPendingDrag = useCallback(() => {
    dragFlushRafRef.current = null;
    const p = pendingDragRef.current;
    if (p) setDragPx(p);
  }, []);

  const cancelDragRaf = useCallback(() => {
    if (dragFlushRafRef.current != null) {
      cancelAnimationFrame(dragFlushRafRef.current);
      dragFlushRafRef.current = null;
    }
    pendingDragRef.current = null;
  }, []);

  const cancelSettleRaf = useCallback(() => {
    if (settleRafRef.current != null) {
      cancelAnimationFrame(settleRafRef.current);
      settleRafRef.current = null;
    }
  }, []);

  const runSettleAnimation = useCallback(
    (
      from: { left: number; top: number },
      to: { left: number; top: number },
      nextPos: MrBrownieFabPosition,
    ) => {
      cancelSettleRaf();
      setDragPx(null);

      const snap =
        prefersReducedMotion() ||
        (Math.abs(from.left - to.left) < 2 &&
          Math.abs(from.top - to.top) < 2);

      if (snap) {
        setFabPos(nextPos);
        saveFabPosition(nextPos);
        setSettling(null);
        return;
      }

      setSettling({
        left: Math.round(from.left),
        top: Math.round(from.top),
      });

      const start = performance.now();
      const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / SETTLE_MS);
        const e = easeOutCubic(t);
        const left = Math.round(from.left + (to.left - from.left) * e);
        const top = Math.round(from.top + (to.top - from.top) * e);
        setSettling({ left, top });
        if (t < 1) {
          settleRafRef.current = requestAnimationFrame(step);
        } else {
          settleRafRef.current = null;
          setFabPos(nextPos);
          saveFabPosition(nextPos);
          setSettling(null);
        }
      };
      settleRafRef.current = requestAnimationFrame(step);
    },
    [cancelSettleRaf],
  );

  useEffect(() => {
    return () => {
      cancelDragRaf();
      cancelSettleRaf();
    };
  }, [cancelDragRaf, cancelSettleRaf]);

  useEffect(() => {
    const saved = loadFabPosition();
    const mobile = isMobileViewport();
    if (saved) {
      setFabPos({
        ...saved,
        bottomPx: clampFabBottom(saved.bottomPx, window.innerHeight, mobile),
      });
    } else {
      setFabPos(defaultFabPosition(mobile));
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      const mobile = isMobileViewport();
      setFabPos((p) => ({
        ...p,
        bottomPx: clampFabBottom(p.bottomPx, window.innerHeight, mobile),
      }));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setPanelPlacement(placementFromStoredFab(fabPos, vw, vh));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, fabPos]);

  /** إغلاق عند الضغط أو اللمس خارج لوحة الشات (أي مكان في الصفحة عدا المحتوى). */
  useEffect(() => {
    if (!open) return;

    const closeIfOutside = (e: PointerEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      const t = e.target;
      if (t instanceof Node && panel.contains(t)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", closeIfOutside, true);
    return () => document.removeEventListener("pointerdown", closeIfOutside, true);
  }, [open]);

  const submitMessage = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || loading) return;

      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: "user", content: trimmed },
      ];
      setMessages(nextMessages);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/mr-brownie/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages,
            cart: { lines },
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            data?.error?.ar ??
            data?.error?.en ??
            "حدث خطأ. تحقق من الاتصال أو أعد المحاولة.";
          setError(msg);
          return;
        }
        const reply = typeof data?.reply === "string" ? data.reply : "";
        if (!reply) {
          setError("Empty reply from assistant.");
          return;
        }
        const metaRole = data?.meta?.role;
        if (typeof metaRole === "string" && metaRole.length > 0) {
          setSessionRole(metaRole);
        }
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      } catch {
        setError("Network error.");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, lines],
  );

  const send = useCallback(() => {
    void submitMessage(input);
  }, [input, submitMessage]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (open) return;
    const el = fabRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragSession.current = {
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect.left,
      originTop: rect.top,
    };
    pointerMoved.current = false;
    el.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const session = dragSession.current;
    if (!session) return;
    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    if (!pointerMoved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
    pointerMoved.current = true;
    const rawLeft = session.originLeft + dx;
    const rawTop = session.originTop + dy;
    const { left, top } = clampDragPosition(
      rawLeft,
      rawTop,
      window.innerWidth,
      window.innerHeight,
    );
    pendingDragRef.current = { left, top };
    if (dragFlushRafRef.current == null) {
      dragFlushRafRef.current = requestAnimationFrame(flushPendingDrag);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = fabRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }

    cancelDragRaf();

    const session = dragSession.current;
    const didMove = pointerMoved.current;
    dragSession.current = null;
    pointerMoved.current = false;

    if (!didMove) {
      setDragPx(null);
      const fabEl = fabRef.current;
      if (fabEl && typeof window !== "undefined") {
        setPanelPlacement(
          computeSmartPanelPlacement(fabEl.getBoundingClientRect()),
        );
      }
      setOpen(true);
      return;
    }

    if (session) {
      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;
      const { left, top } = clampDragPosition(
        session.originLeft + dx,
        session.originTop + dy,
        window.innerWidth,
        window.innerHeight,
      );
      const rect = new DOMRect(left, top, FAB_SIZE_PX, FAB_SIZE_PX);
      const mobile = isMobileViewport();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const next = rectToFabPosition(rect, vw, vh, mobile);
      const to = fabTopLeftFromStored(next, vw, vh);
      runSettleAnimation({ left, top }, to, next);
      return;
    }
    setDragPx(null);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = fabRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    cancelDragRaf();
    dragSession.current = null;
    pointerMoved.current = false;
    setDragPx(null);
  };

  const pillPos = dragPx ?? settling;

  /* موضع الـ FAB عبر DOM API بدل style في JSX — useLayoutEffect يمنع وميض الموضع */
  useLayoutEffect(() => {
    const el = fabRef.current;
    if (!el) return;
    el.style.setProperty("position", "fixed");
    el.style.setProperty("z-index", "40");
    el.style.setProperty("touch-action", "none");
    const pos = dragPx ?? settling;
    if (pos) {
      el.style.setProperty("left", `${pos.left}px`);
      el.style.setProperty("top", `${pos.top}px`);
      el.style.setProperty("right", "auto");
      el.style.setProperty("bottom", "auto");
      el.style.setProperty(
        "will-change",
        dragPx ? "transform, left, top" : "left, top",
      );
    } else {
      const inset = fabInsetPx();
      if (fabPos.side === "left") {
        el.style.setProperty("left", `${inset}px`);
        el.style.setProperty("right", "auto");
      } else {
        el.style.setProperty("right", `${inset}px`);
        el.style.setProperty("left", "auto");
      }
      el.style.setProperty("bottom", `${fabPos.bottomPx}px`);
      el.style.setProperty("top", "auto");
      el.style.removeProperty("will-change");
    }
  }, [dragPx, settling, fabPos.side, fabPos.bottomPx]);

  /* موضع لوحة المحادثة — ديناميكي بدون خاصية style في JSX */
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el || !open || !panelPlacement) return;
    const p = panelPlacement;
    el.style.setProperty("height", `${p.maxHeightPx}px`);
    el.style.setProperty("max-height", `${p.maxHeightPx}px`);
    el.style.setProperty(
      "min-height",
      `${Math.min(420, p.maxHeightPx)}px`,
    );
    if (p.top != null) {
      el.style.setProperty("top", `${p.top}px`);
      el.style.setProperty("bottom", "auto");
    } else if (p.bottom != null) {
      el.style.setProperty("bottom", `${p.bottom}px`);
      el.style.setProperty("top", "auto");
    }
    if (p.left != null) {
      el.style.setProperty("left", `${p.left}px`);
      el.style.setProperty("right", "auto");
    } else if (p.right != null) {
      el.style.setProperty("right", `${p.right}px`);
      el.style.setProperty("left", "auto");
    }
  }, [open, panelPlacement]);

  const idleFab =
    dragPx == null && settling == null && !open;

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={cn(
          "relative flex h-14 w-14 cursor-grab select-none items-center justify-center overflow-visible rounded-full bg-transparent shadow-none",
          "ring-2 ring-cb-terracotta-dark/25 ring-offset-2 ring-offset-[color-mix(in_oklab,var(--background)_92%,transparent)]",
          "drop-shadow-[0_4px_14px_rgba(42,24,16,0.35)] dark:ring-offset-cb-cream/10",
          "transition-[transform,box-shadow,left,right,bottom,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:drop-shadow-[0_6px_20px_rgba(232,93,24,0.35)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cb-focus",
          "touch-none active:cursor-grabbing",
          dragPx && "scale-[1.06] ring-cb-focus/50 transition-none",
          settling && "ring-cb-focus/30 transition-none",
          idleFab &&
            !prefersReducedMotion() &&
            "motion-safe:transform-gpu",
          open && "pointer-events-none opacity-0",
        )}
        aria-label="Mr. Brownie — اسحب للجانب للتثبيت، أو اضغط لفتح المحادثة"
      >
        <img
          src={MR_BROWNIE_MASCOT_SRC}
          alt=""
          width={56}
          height={56}
          decoding="async"
          draggable={false}
          className="pointer-events-none h-[52px] w-[52px] object-contain object-center mix-blend-multiply"
        />
      </button>

      {open && panelPlacement ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 dark:bg-black/55"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mr-brownie-title"
            className={cn(
              "mr-brownie-panel-animate fixed z-[51] grid w-[min(100vw-1.5rem,34rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-3xl border border-cb-border/80",
              "bg-cb-surface-elevated/95 shadow-[var(--shadow-glow-warm)] ring-1 ring-white/60 dark:bg-cb-surface-elevated dark:ring-white/10",
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-cb-border/60 bg-gradient-to-l from-cb-peach/85 via-cb-cream/50 to-cb-peach/40 px-4 py-3.5 dark:from-cb-peach-deep/35 dark:via-cb-surface-2/40 dark:to-cb-peach-deep/25">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <img
                  src={MR_BROWNIE_MASCOT_SRC}
                  alt="Mr. Brownie"
                  width={40}
                  height={40}
                  decoding="async"
                  draggable={false}
                  className="h-10 w-10 shrink-0 rounded-full bg-cb-cream object-cover object-center mix-blend-multiply"
                />
                <div className="min-w-0">
                  <p
                    id="mr-brownie-title"
                    className="font-serif text-lg font-semibold text-cb-text-strong"
                  >
                    Mr. Brownie
                  </p>
                  <p className="text-xs text-cb-text-muted">
                    {sessionRole
                      ? `الدور الفعلي في الإجابات: ${ROLE_LABEL_AR[sessionRole] ?? sessionRole}`
                      : isSignedIn
                        ? "مسجّل · أول رسالة تُظهر الدور (عميل / فريق / مشرف / مالك)"
                        : "زائر · كتالوج وأسئلة عامة فقط"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-cb-text-strong transition-colors hover:bg-white/70 dark:hover:bg-cb-surface-2/80"
                aria-label="إغلاق المحادثة"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div
              ref={scrollRef}
              className="flex h-full min-h-0 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
            >
              {messages.length === 0 ? (
                <p className="mr-auto max-w-[92%] rounded-2xl bg-gradient-to-br from-cb-cream to-cb-peach/40 px-3.5 py-2.5 text-sm leading-relaxed text-cb-text-strong shadow-[var(--shadow-card)] ring-1 ring-cb-border/50 dark:from-cb-surface-2 dark:to-cb-peach-deep/20">
                  مرحباً — أنا Mr. Brownie. اسأل عن النكهات، الهدايا، أو التوصيل.
                  اسحب الدبّ للأعلى أو الأسفل واليمين أو اليسار: النافذة تفتح من
                  الناحية المناسبة عشان ما تغطّيك ✨
                </p>
              ) : null}
              {messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                    m.role === "user"
                      ? "ml-auto bg-gradient-to-br from-cb-terracotta-dark to-cb-terracotta text-white shadow-[var(--shadow-card)]"
                      : "mr-auto bg-cb-cream/95 text-cb-text-strong ring-1 ring-cb-border/55 dark:bg-cb-surface-2",
                  )}
                >
                  {m.content}
                </div>
              ))}
              {loading ? (
                <p className="text-xs text-cb-text-muted">جاري التفكير…</p>
              ) : null}
              {error ? (
                <div
                  role="alert"
                  className="rounded-2xl border border-red-200/90 bg-red-50/95 px-3.5 py-3 text-sm leading-relaxed text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
                >
                  <p className="font-semibold">تعذر الرد الآن</p>
                  <p className="mt-1.5 text-[13px] opacity-95">{error}</p>
                  {error.includes("GEMINI") ||
                  error.includes("Google AI Studio") ||
                  error.includes("aistudio") ? (
                    <p className="mt-2 text-xs opacity-90">
                      رابط الحصول على المفتاح:{" "}
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline underline-offset-2 hover:opacity-100"
                      >
                        aistudio.google.com/apikey
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="relative z-[2] shrink-0 border-t border-cb-border/70 bg-cb-surface/95 p-3 shadow-[0_-8px_24px_-8px_rgba(42,24,16,0.12)] backdrop-blur-sm sm:p-4 dark:bg-cb-surface-elevated/95">
              {/* الإدخال أولاً حتى لا يُقصّ أسفل اللوحة عند ضيق الارتفاع */}
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={2}
                  placeholder="اكتب سؤالك…"
                  className="min-h-[48px] flex-1 resize-none rounded-2xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm text-cb-text-strong shadow-inner outline-none transition-shadow focus:border-cb-border-strong focus:ring-2 focus:ring-cb-focus/20"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className={cn(
                    buttonClassName("primary", "shrink-0 self-end px-4 py-3"),
                    "min-h-[48px] rounded-2xl shadow-[var(--shadow-card)]",
                  )}
                  aria-label="إرسال"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-2 mt-3 text-[11px] font-medium text-cb-text-muted">
                اقتراحات سريعة
              </p>
              <div className="flex max-h-[7rem] flex-wrap gap-2 overflow-y-auto overscroll-contain sm:max-h-[8rem]">
                {suggestionsForRole(sessionRole).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={loading}
                    onClick={() => void submitMessage(s)}
                    className={cn(
                      "rounded-full border border-cb-border/90 bg-cb-cream/80 px-3 py-1.5 text-left text-xs font-medium text-cb-text-strong",
                      "transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:bg-cb-peach/55 hover:shadow-sm",
                      "disabled:pointer-events-none disabled:opacity-50 dark:bg-cb-surface-2/90 dark:hover:bg-cb-peach-deep/35",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-cb-text-muted">
                Google Gemini · السياق والصلاحيات من السيرفر حسب دورك.
              </p>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
