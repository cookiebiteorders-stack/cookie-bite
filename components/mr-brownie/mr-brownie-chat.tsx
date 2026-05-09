"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Send, X } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/utils";
import { buttonClassName } from "@/components/ui/button";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import {
  clampFabBottom,
  defaultFabPosition,
  fabInsetPx,
  fabSizePx,
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
/** فترة أطول قليلاً من مدة الحركة (~1s) حتى لا يبدأ تجول جديد أثناء الانتقال */
const ROAM_INTERVAL_MS = 10_000;
const BUBBLE_INTERVAL_MS = 2 * 60 * 1000;
const BUBBLE_AUTO_HIDE_MS = 10000;
const WELCOME_BUBBLE_DELAY_MS = 4000;
const ROAM_STORAGE_KEY = "mr-brownie-roam-pos-v1";

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

const AMBIENT_MESSAGES_COMMON = [
  "👋 محتاج مساعدة سريعة؟ أنا معاك.",
  "💡 أقدر أرشّح لك منتج حسب ذوقك.",
  "🚚 لو حابب أعرفك على الشحن والتوصيل اكتبلي.",
  "🎁 أقدر أساعدك تختار هدية مناسبة فوراً.",
  "✨ عندك هدف معين؟ قولي وأنا أرتّب لك الخطوات.",
] as const;

const AMBIENT_MESSAGES_SIGNED_OUT = [
  "🔐 لو سجلت دخولك هقدر أساعدك بشكل أدق.",
  "🛍️ جرب تسألني عن أفضل المنتجات حالياً.",
] as const;

const AMBIENT_MESSAGES_SIGNED_IN = [
  "🤝 أهلاً بيك تاني! جاهز أساعدك فوراً.",
  "📦 أقدر أجاوبك عن الطلبات والتجهيز حسب السياق.",
] as const;

const AMBIENT_MESSAGES_WITH_CART = [
  "🧺 شايف عندك منتجات في السلة — تحب أساعدك تكمل الطلب؟",
  "💬 أقدر أراجع السلة معاك قبل الدفع.",
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
  const mobile = isMobileViewport();
  const size = fabSizePx(mobile);
  return {
    left: Math.max(inset, Math.min(vw - size - inset, left)),
    top: Math.max(72, Math.min(vh - size - (mobile ? 96 : inset), top)),
  };
}

function loadRoamingPosition(): { left: number; top: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ROAM_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as { left?: unknown }).left === "number" &&
      typeof (parsed as { top?: unknown }).top === "number"
    ) {
      return {
        left: (parsed as { left: number }).left,
        top: (parsed as { top: number }).top,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function saveRoamingPosition(pos: { left: number; top: number }): void {
  try {
    sessionStorage.setItem(ROAM_STORAGE_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

function buildAmbientMessages(isSignedIn: boolean, cartLines: number): readonly string[] {
  const withAuth = isSignedIn
    ? [...AMBIENT_MESSAGES_COMMON, ...AMBIENT_MESSAGES_SIGNED_IN]
    : [...AMBIENT_MESSAGES_COMMON, ...AMBIENT_MESSAGES_SIGNED_OUT];
  if (cartLines > 0) return [...withAuth, ...AMBIENT_MESSAGES_WITH_CART];
  return withAuth;
}

function subtotalFromLines(
  lines: { priceEgp: number; quantity: number }[],
): number {
  return lines.reduce((acc, l) => acc + l.priceEgp * l.quantity, 0);
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

  const spaceBelow = vh - r.bottom - gap - safeBottom;
  const spaceAbove = r.top - gap - safeTop;

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
  const heightCap = Math.min(DEFAULT_PANEL_MAX_H, Math.floor(vh * 0.92));
  // Force a minimum height of 650px so the content is always visible
  const maxH = Math.min(heightCap, Math.max(650, space), vh - safeTop - safeBottom);

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

export function MrBrownieChat() {
  const { lines } = useCart();
  const { isSignedIn } = useUser();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [fabPos, setFabPos] = useState<MrBrownieFabPosition>(() => {
    if (typeof window === "undefined") return defaultFabPosition(false);
    const mobile = isMobileViewport();
    const saved = loadFabPosition();
    if (!saved) return defaultFabPosition(mobile);
    return {
      ...saved,
      bottomPx: clampFabBottom(saved.bottomPx, window.innerHeight, mobile),
    };
  });
  const [dragPx, setDragPx] = useState<{ left: number; top: number } | null>(null);
  const [roamPx, setRoamPx] = useState<{ left: number; top: number } | null>(null);
  const [settling, setSettling] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [showNotifDot, setShowNotifDot] = useState(true);
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
  const bubbleHideTimerRef = useRef<number | null>(null);
  const lastBubbleIndexRef = useRef(-1);

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

  useEffect(() => {
    return () => {
      cancelDragRaf();
      cancelSettleRaf();
      if (bubbleHideTimerRef.current != null) {
        window.clearTimeout(bubbleHideTimerRef.current);
        bubbleHideTimerRef.current = null;
      }
    };
  }, [cancelDragRaf, cancelSettleRaf]);

  const hideBubble = useCallback(() => {
    setBubbleVisible(false);
    if (bubbleHideTimerRef.current != null) {
      window.clearTimeout(bubbleHideTimerRef.current);
      bubbleHideTimerRef.current = null;
    }
  }, []);

  const showBubble = useCallback((text: string) => {
    setBubbleText(text);
    setBubbleVisible(true);
    setShowNotifDot(true);
    if (bubbleHideTimerRef.current != null) {
      window.clearTimeout(bubbleHideTimerRef.current);
    }
    bubbleHideTimerRef.current = window.setTimeout(() => {
      setBubbleVisible(false);
      bubbleHideTimerRef.current = null;
    }, BUBBLE_AUTO_HIDE_MS);
  }, []);

  const fetchDynamicAmbientMessage = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/mr-brownie/ambient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: lines.length,
          cartSubtotalEgp: subtotalFromLines(lines),
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { message?: unknown };
      return typeof data.message === "string" && data.message.trim().length > 0
        ? data.message
        : null;
    } catch {
      return null;
    }
  }, [lines]);

  const pickRoamingTarget = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const inset = fabInsetPx();
    const size = fabSizePx(isMobileViewport());
    const safeTop = 86;
    const safeBottom = isMobileViewport() ? 104 : 86;
    const leftBandMax = Math.floor(vw * 0.34);
    const rightBandMin = Math.floor(vw * 0.66);

    const zones = [
      { xMin: inset, xMax: leftBandMax, yMin: safeTop, yMax: Math.floor(vh * 0.46) },
      { xMin: inset, xMax: leftBandMax, yMin: Math.floor(vh * 0.54), yMax: vh - safeBottom },
      { xMin: rightBandMin, xMax: vw - size - inset, yMin: safeTop, yMax: Math.floor(vh * 0.46) },
      { xMin: rightBandMin, xMax: vw - size - inset, yMin: Math.floor(vh * 0.54), yMax: vh - safeBottom },
    ];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const x = zone.xMin + Math.random() * Math.max(1, zone.xMax - zone.xMin - size);
    const y = zone.yMin + Math.random() * Math.max(1, zone.yMax - zone.yMin - size);
    return clampDragPosition(Math.round(x), Math.round(y), vw, vh);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cancel = scheduleEffectTask(() => {
      const saved = loadRoamingPosition();
      if (saved) {
        const p = clampDragPosition(saved.left, saved.top, window.innerWidth, window.innerHeight);
        setRoamPx(p);
        return;
      }
      const fallback = fabTopLeftFromStored(
        fabPos,
        window.innerWidth,
        window.innerHeight,
        isMobileViewport(),
      );
      const p = clampDragPosition(fallback.left, fallback.top, window.innerWidth, window.innerHeight);
      setRoamPx(p);
      saveRoamingPosition(p);
    });
    return cancel;
  }, [fabPos]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const tick = () => {
      if (open || dragSession.current || dragPx || settling) return;
      const p = pickRoamingTarget();
      setRoamPx(p);
      saveRoamingPosition(p);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const sz = fabSizePx(isMobileViewport());
      const next = rectToFabPosition(
        new DOMRect(p.left, p.top, sz, sz),
        vw,
        vh,
        isMobileViewport(),
      );
      setFabPos(next);
      saveFabPosition(next);
    };
    const id = window.setInterval(tick, ROAM_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [open, dragPx, settling, pickRoamingTarget]);

  useEffect(() => {
    const pool = buildAmbientMessages(Boolean(isSignedIn), lines.length);
    if (pool.length === 0) return;
    const pickRandom = () => {
      const options = pool.filter((_, i) => i !== lastBubbleIndexRef.current);
      const msg = options[Math.floor(Math.random() * options.length)];
      const idx = pool.indexOf(msg);
      lastBubbleIndexRef.current = idx;
      return msg;
    };
    const showSmartMessage = async () => {
      const dynamic = await fetchDynamicAmbientMessage();
      showBubble(dynamic ?? pickRandom());
    };

    const welcomeId = window.setTimeout(() => {
      if (!open) void showSmartMessage();
    }, WELCOME_BUBBLE_DELAY_MS);

    const periodicId = window.setInterval(() => {
      if (!open) void showSmartMessage();
    }, BUBBLE_INTERVAL_MS);

    return () => {
      window.clearTimeout(welcomeId);
      window.clearInterval(periodicId);
    };
  }, [isSignedIn, lines.length, open, showBubble, fetchDynamicAmbientMessage]);

  useEffect(() => {
    const onResize = () => {
      const mobile = isMobileViewport();
      setFabPos((p) => ({
        ...p,
        bottomPx: clampFabBottom(p.bottomPx, window.innerHeight, mobile),
      }));
      setRoamPx((p) => {
        if (!p) return p;
        const clamped = clampDragPosition(
          p.left,
          p.top,
          window.innerWidth,
          window.innerHeight,
        );
        saveRoamingPosition(clamped);
        return clamped;
      });
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
      const btn = fabRef.current;
      if (!btn) return;
      setPanelPlacement(computeSmartPanelPlacement(btn.getBoundingClientRect()));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open, fabPos, roamPx, dragPx, settling]);

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
      setShowNotifDot(false);
      hideBubble();
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
      const p = clampDragPosition(
        session.originLeft + dx,
        session.originTop + dy,
        window.innerWidth,
        window.innerHeight,
      );
      setDragPx(null);
      setSettling(null);
      setRoamPx(p);
      saveRoamingPosition(p);
      const sz = fabSizePx(isMobileViewport());
      const rect = new DOMRect(p.left, p.top, sz, sz);
      const next = rectToFabPosition(
        rect,
        window.innerWidth,
        window.innerHeight,
        isMobileViewport(),
      );
      setFabPos(next);
      saveFabPosition(next);
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

  /* موضع الـ FAB عبر DOM API بدل style في JSX — useLayoutEffect يمنع وميض الموضع */
  useLayoutEffect(() => {
    const el = fabRef.current;
    if (!el) return;
    el.style.setProperty("position", "fixed");
    el.style.setProperty("z-index", "40");
    el.style.setProperty("touch-action", "none");
    const pos = dragPx ?? settling ?? roamPx;
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
  }, [dragPx, settling, roamPx, fabPos.side, fabPos.bottomPx]);

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
  /** حركة تجوال ناعمة عبر CSS؛ أثناء السحب يُعطّل الانتقال لاستجابة فورية للمؤشر */
  const allowSmoothRoamMove =
    dragPx == null && !open && !prefersReducedMotion();
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
          "relative flex max-sm:h-[78px] max-sm:w-[78px] sm:h-[92px] sm:w-[92px] cursor-grab select-none items-center justify-center overflow-visible rounded-full bg-transparent shadow-none ring-0",
          "drop-shadow-[0_4px_14px_rgba(42,24,16,0.35)]",
          allowSmoothRoamMove &&
            "motion-safe:transform-gpu motion-safe:transition-[left,top,right,bottom,transform,filter,opacity] motion-safe:duration-[1000ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
          !allowSmoothRoamMove &&
            !dragPx &&
            "transition-[transform,filter,opacity] duration-200 ease-out",
          "hover:drop-shadow-[0_6px_20px_rgba(232,93,24,0.35)]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cb-focus",
          "touch-none active:cursor-grabbing",
          dragPx && "!transition-none scale-[1.06] ring-2 ring-cb-focus/50 ring-offset-0",
          settling && "!transition-none ring-2 ring-cb-focus/30 ring-offset-0",
          idleFab && !prefersReducedMotion() && "motion-safe:transform-gpu",
          open && "pointer-events-none opacity-0",
        )}
        aria-label="Mr. Brownie — اسحب لتحريك الأيقونة أو اضغط لفتح المحادثة"
      >
        {showNotifDot ? (
          <span className="absolute -right-0.5 -top-0.5 z-[3] h-3.5 w-3.5 rounded-full border-2 border-white bg-rose-500 [animation:ping_2s_ease-in-out_infinite]" />
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MR_BROWNIE_MASCOT_SRC}
          alt=""
          width={92}
          height={92}
          decoding="async"
          draggable={false}
          className="pointer-events-none max-sm:h-[73px] max-sm:w-[73px] sm:h-[87px] sm:w-[87px] object-contain object-center"
        />
        <div
          className={cn(
            "mr-brownie-ambient-bubble pointer-events-auto absolute left-1/2 top-full z-[4] mt-2 w-64 max-w-[min(16rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-cb-border/70 bg-cb-surface-elevated/95 px-3 py-2 text-xs text-cb-text-strong shadow-[var(--shadow-glow-warm)] backdrop-blur will-change-transform",
            "origin-top transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            bubbleVisible
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-1 scale-[0.96] opacity-0",
          )}
          role="status"
          aria-live="polite"
        >
          <p className="relative z-[1] leading-relaxed">{bubbleText}</p>
          <p className="relative z-[1] mt-1 text-[10px] text-cb-text-muted">
            اضغط على الأيقونة للرد 💬
          </p>
        </div>
      </button>

      {open && panelPlacement ? (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ease-out dark:bg-black/55"
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={MR_BROWNIE_MASCOT_SRC}
                  alt="Mr. Brownie"
                  width={56}
                  height={56}
                  decoding="async"
                  draggable={false}
                  className="max-sm:h-11 max-sm:w-11 sm:h-14 sm:w-14 shrink-0 rounded-full bg-transparent object-contain object-center"
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
