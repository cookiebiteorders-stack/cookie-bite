"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Send, Square, X } from "lucide-react";
import {
  ChatImageAttachButton,
  ChatImagePreviewStrip,
  clearPendingAttachments,
  hasUploadingAttachments,
  readyAttachments,
  type PendingChatImage,
} from "@/components/chat/chat-image-attachment-input";
import { useCart } from "@/components/providers/cart-provider";
import { cn } from "@/lib/utils";
import { buttonClassName } from "@/components/ui/button";
import { streamMrBrownieChat } from "@/lib/mr-brownie/stream-client";
import { MessageBubble } from "@/components/ai-chat/message-bubble";
import {
  BUBBLE_AUTO_HIDE_MS,
  buildAmbientMessages,
  loadRoamingPosition,
  ROAM_INTERVAL_MS,
  ROAM_POST_UI_MS,
  saveRoamingPosition,
} from "@/lib/mr-brownie/ambient-copy";
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
import { pickRoamingTarget } from "@/lib/mr-brownie/roaming-target";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";

import { getOrCreateChatSessionId, isChatSessionUuid, CHAT_SESSION_ID_KEY } from "@/lib/chat/session-id";
import {
  loadPersistedMessages,
  mergeServerAndLocal,
  mrBrownieChatLsKey,
  savePersistedMessages,
  type ChatHistoryApiRow,
  type ChatMessagePersisted,
} from "@/lib/mr-brownie/chat-persistence";

type ChatMessage = ChatMessagePersisted;

/** شعار Mr. Brownie — PNG بخلفية شفافة في `public/brand/` */
const MR_BROWNIE_MASCOT_SRC = "/brand/mr-brownie-mascot.png";

const DRAG_THRESHOLD_PX = 8;

const ASSISTANT_FOR_ROLE_AR: Record<string, string> = {
  guest: "المساعد للزائر",
  customer: "المساعد للعميل",
  staff: "المساعد لفريق التشغيل",
  admin: "المساعد للأدمن",
  owner: "المساعد للأونر",
};

function assistantSubtitleAr(role: string | null, signedIn: boolean): string {
  if (!signedIn) return ASSISTANT_FOR_ROLE_AR.guest;
  const line = role ? ASSISTANT_FOR_ROLE_AR[role] : null;
  return line ?? "المساعد لحسابك";
}

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

function subtotalFromLines(
  lines: { priceEgp: number; quantity: number }[],
): number {
  return lines.reduce((acc, l) => acc + l.priceEgp * l.quantity, 0);
}

type MrBrownieChatProps = {
  /** Renders inside page layout (e.g. gift box sidebar) instead of a floating FAB. */
  embedded?: boolean;
};

export function MrBrownieChat({ embedded = false }: MrBrownieChatProps) {
  const { lines } = useCart();
  const { isSignedIn, user } = useUser();
  const clerkKey = isSignedIn && user?.id ? user.id : null;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingChatImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const skipLsSaveRef = useRef(true);
  const streamAbortRef = useRef<AbortController | null>(null);
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);

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
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [dragPx, setDragPx] = useState<{ left: number; top: number } | null>(null);
  const [roamPx, setRoamPx] = useState<{ left: number; top: number } | null>(null);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [edgePeek, setEdgePeek] = useState(false);
  const [showNotifDot, setShowNotifDot] = useState(true);
  const [sessionRole, setSessionRole] = useState<string | null>(null);
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bubbleHideTimerRef = useRef<number | null>(null);
  const lastBubbleIndexRef = useRef(-1);
  const openRef = useRef(false);
  const linesRef = useRef(lines);
  const isSignedInRef = useRef(Boolean(isSignedIn));
  const clerkUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    clerkUserIdRef.current = user?.id;
  }, [user?.id]);

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

  useEffect(() => {
    return () => {
      cancelDragRaf();
      if (bubbleHideTimerRef.current != null) {
        window.clearTimeout(bubbleHideTimerRef.current);
        bubbleHideTimerRef.current = null;
      }
    };
  }, [cancelDragRaf]);

  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const hideBubble = useCallback(() => {
    setBubbleVisible(false);
    setEdgePeek(false);
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
      setEdgePeek(false);
      bubbleHideTimerRef.current = null;
    }, BUBBLE_AUTO_HIDE_MS);
  }, []);

  const postMrBrownieAmbient = useCallback(async () => {
    const uidAtStart = clerkUserIdRef.current;
    try {
      const L = linesRef.current;
      const res = await fetch("/api/mr-brownie/ambient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: L.length,
          cartSubtotalEgp: subtotalFromLines(L),
        }),
      });
      if (!res.ok) return { message: null as string | null, role: null as string | null };
      const data = (await res.json()) as { message?: unknown; meta?: { role?: unknown } };
      const rawRole = data.meta?.role;
      const role =
        typeof rawRole === "string" && rawRole.trim().length > 0 ? rawRole.trim() : null;
      if (role && isSignedInRef.current && clerkUserIdRef.current === uidAtStart) {
        setSessionRole(role);
      }
      const message =
        typeof data.message === "string" && data.message.trim().length > 0
          ? data.message.trim()
          : null;
      return { message, role };
    } catch {
      return { message: null, role: null };
    }
  }, []);

  const fetchDynamicAmbientMessage = useCallback(async (): Promise<string | null> => {
    const { message } = await postMrBrownieAmbient();
    return message;
  }, [postMrBrownieAmbient]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!isSignedIn) {
        setSessionRole(null);
        return;
      }
      setSessionRole(null);
      void postMrBrownieAmbient().then(() => {
        if (cancelled) return;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, user?.id, postMrBrownieAmbient]);

  const pickRoamingTargetCb = useCallback(() => {
    return pickRoamingTarget(isMobileViewport());
  }, []);

  useEffect(() => {
    if (embedded || typeof window === "undefined") return;
    const cancel = scheduleEffectTask(() => {
      const saved = loadRoamingPosition();
      if (saved) {
        const p = clampDragPosition(
          saved.left,
          saved.top,
          window.innerWidth,
          window.innerHeight,
        );
        setRoamPx(p);
        return;
      }
      const fallback = fabTopLeftFromStored(
        fabPos,
        window.innerWidth,
        window.innerHeight,
        isMobileViewport(),
      );
      const p = clampDragPosition(
        fallback.left,
        fallback.top,
        window.innerWidth,
        window.innerHeight,
      );
      setRoamPx(p);
      saveRoamingPosition(p);
    });
    return cancel;
  }, [embedded, fabPos]);

  useEffect(() => {
    if (embedded || reduceMotion) return;
    const tick = () => {
      if (openRef.current || dragSession.current || dragPx) return;
      const p = pickRoamingTargetCb();
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

      window.setTimeout(() => {
        if (document.visibilityState === "hidden") return;
        if (openRef.current || dragSession.current) return;

        const pool = buildAmbientMessages(
          isSignedInRef.current,
          linesRef.current.length,
        );
        if (pool.length === 0) return;

        const pickRandom = () => {
          const options =
            pool.length <= 1
              ? pool
              : pool.filter((_, i) => i !== lastBubbleIndexRef.current);
          const msg =
            options[Math.floor(Math.random() * Math.max(1, options.length))] ??
            pool[0];
          const idx = pool.indexOf(msg);
          lastBubbleIndexRef.current = idx;
          return msg;
        };

        const runBubble = async () => {
          setEdgePeek(true);
          const dynamic = await fetchDynamicAmbientMessage();
          showBubble(dynamic ?? pickRandom());
        };

        void runBubble();
      }, ROAM_POST_UI_MS);
    };
    const id = window.setInterval(tick, ROAM_INTERVAL_MS);
    tick();
    return () => window.clearInterval(id);
  }, [
    embedded,
    reduceMotion,
    dragPx,
    pickRoamingTargetCb,
    showBubble,
    fetchDynamicAmbientMessage,
  ]);

  const enqueueSaveMessage = useCallback((role: "user" | "assistant", content: string) => {
    const sid = getOrCreateChatSessionId();
    if (!sid) return;
    void fetch("/api/chat/save", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sid,
        message: { role, content },
      }),
    }).catch(() => {});
  }, []);

  const pullRemoteHistory = useCallback(async () => {
    const key = mrBrownieChatLsKey(clerkKey);
    skipLsSaveRef.current = true;
    if (typeof window !== "undefined") {
      getOrCreateChatSessionId();
    }
    const local = loadPersistedMessages(key);
    setHistoryLoading(true);
    try {
      if (isSignedIn && typeof window !== "undefined") {
        const sidRaw = window.localStorage.getItem(CHAT_SESSION_ID_KEY);
        if (isChatSessionUuid(sidRaw)) {
          await fetch("/api/chat/handover", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guestSessionId: sidRaw }),
          }).catch(() => {});
        }
      }
      const sid = typeof window !== "undefined" ? getOrCreateChatSessionId() : "";
      const url = isSignedIn
        ? "/api/chat/history?limit=20"
        : `/api/chat/history?sessionId=${encodeURIComponent(sid)}&limit=20`;
      const res = await fetch(url, { credentials: "same-origin" });
      const data = (await res.json()) as { messages?: ChatHistoryApiRow[] };
      const server = Array.isArray(data.messages) ? data.messages : [];
      const merged = mergeServerAndLocal(server, local);
      setMessages(merged);
      savePersistedMessages(key, merged);
    } catch {
      setMessages(local);
    } finally {
      skipLsSaveRef.current = false;
      setHistoryLoading(false);
    }
  }, [clerkKey, isSignedIn]);

  const clearConversation = useCallback(async () => {
    const key = mrBrownieChatLsKey(clerkKey);
    const sid = getOrCreateChatSessionId();
    try {
      const res = await fetch("/api/chat/clear", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignedIn ? {} : { sessionId: sid }),
      });
      if (!res.ok) return;
      setMessages([]);
      savePersistedMessages(key, []);
    } catch {
      /* ignore */
    }
  }, [clerkKey, isSignedIn]);

  useEffect(() => {
    queueMicrotask(() => {
      void pullRemoteHistory();
    });
  }, [pullRemoteHistory]);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      void pullRemoteHistory();
    });
  }, [open, pullRemoteHistory]);

  useEffect(() => {
    if (skipLsSaveRef.current) return;
    const key = mrBrownieChatLsKey(clerkKey);
    const id = window.setTimeout(() => {
      savePersistedMessages(key, messages);
    }, 400);
    return () => window.clearTimeout(id);
  }, [messages, clerkKey]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  useEffect(() => {
    isSignedInRef.current = Boolean(isSignedIn);
  }, [isSignedIn]);

  useEffect(() => {
    if (embedded) return;
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
  }, [embedded]);

  useLayoutEffect(() => {
    if (historyLoading || !open) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [historyLoading, messages, open]);

  useEffect(() => {
    if (embedded || !open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [embedded, open]);

  /** إغلاق عند الضغط أو اللمس خارج لوحة الشات */
  useEffect(() => {
    if (embedded || !open) return;

    const closeIfOutside = (e: PointerEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      const t = e.target;
      if (t instanceof Node && panel.contains(t)) return;
      setOpen(false);
    };

    document.addEventListener("pointerdown", closeIfOutside, true);
    return () => document.removeEventListener("pointerdown", closeIfOutside, true);
  }, [embedded, open]);

  const submitMessage = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      const attachments = readyAttachments(pendingImages);
      if ((!trimmed && attachments.length === 0) || loading) return;
      if (hasUploadingAttachments(pendingImages)) return;

      const userContent = trimmed || "انظر الصورة المرفقة";
      const imageUrls = attachments.map((a) => a.url);
      const userTs = Date.now();
      const nextMessages: ChatMessage[] = [
        ...messages,
        {
          role: "user",
          content: userContent,
          imageUrls: imageUrls.length ? imageUrls : undefined,
          createdAt: userTs,
        },
      ];
      setMessages(nextMessages);
      enqueueSaveMessage("user", userContent);
      setInput("");
      clearPendingAttachments(pendingImages);
      setPendingImages([]);
      setLoading(true);
      setError(null);

      const assistantTs = Date.now();
      const streamingIdx = nextMessages.length;
      setStreamingIndex(streamingIdx);
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "", createdAt: assistantTs },
      ]);

      const controller = new AbortController();
      streamAbortRef.current = controller;

      try {
        const reply = await streamMrBrownieChat({
          messages: nextMessages.map(({ role, content, imageUrls: imgs }) => ({
            role,
            content,
            attachments: imgs?.map((url) => ({ url })),
          })),
          cartLines: lines,
          signal: controller.signal,
          callbacks: {
            onToken: (fullText) => {
              setMessages((prev) => {
                const copy = [...prev];
                if (copy[streamingIdx]) {
                  copy[streamingIdx] = { ...copy[streamingIdx], content: fullText };
                }
                return copy;
              });
            },
            onDone: (meta) => {
              const metaRole = meta?.role;
              if (typeof metaRole === "string" && metaRole.length > 0) {
                setSessionRole(metaRole);
              }
            },
            onError: (msg) => setError(msg),
          },
        });

        if (!reply.trim()) {
          setError("Empty reply from assistant.");
          setMessages((prev) => prev.slice(0, -1));
          return;
        }

        setMessages((prev) => {
          const copy = [...prev];
          if (copy[streamingIdx]) {
            copy[streamingIdx] = { ...copy[streamingIdx], content: reply };
          }
          return copy;
        });
        enqueueSaveMessage("assistant", reply);
      } catch (e) {
        if (controller.signal.aborted) {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[streamingIdx];
            if (last?.content.trim()) {
              enqueueSaveMessage("assistant", last.content);
              return copy;
            }
            return copy.slice(0, -1);
          });
        } else {
          setMessages((prev) => {
            if (prev[streamingIdx] && !prev[streamingIdx]?.content.trim()) {
              return prev.slice(0, -1);
            }
            return prev;
          });
          setError(e instanceof Error ? e.message : "Network error.");
        }
      } finally {
        streamAbortRef.current = null;
        setStreamingIndex(null);
        setLoading(false);
      }
    },
    [loading, messages, lines, enqueueSaveMessage, pendingImages],
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
      setOpen(true);
      setEdgePeek(false);
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
      setRoamPx(p);
      saveRoamingPosition(p);
      setEdgePeek(false);
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
    if (!open) setEdgePeek(false);
  };

  /* موضع الـ FAB عبر DOM API */
  useLayoutEffect(() => {
    if (embedded) return;
    const el = fabRef.current;
    if (!el) return;
    el.style.setProperty("position", "fixed");
    el.style.setProperty("z-index", "40");
    el.style.setProperty("touch-action", "none");
    const pos = dragPx ?? roamPx;
    if (pos) {
      el.style.setProperty("left", `${pos.left}px`);
      el.style.setProperty("top", `${pos.top}px`);
      el.style.setProperty("right", "auto");
      el.style.setProperty("bottom", "auto");
      el.style.setProperty(
        "will-change",
        dragPx ? "transform, left, top" : "left, top",
      );
      return;
    }
    el.style.removeProperty("will-change");
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
  }, [embedded, dragPx, roamPx, fabPos.side, fabPos.bottomPx]);

  const drawerSideClass =
    fabPos.side === "left" ? "cb-mr-brownie-drawer--left left-0" : "cb-mr-brownie-drawer--right right-0";

  const chatPanel = (
    <aside
      ref={panelRef}
      role={embedded ? "region" : "dialog"}
      aria-modal={embedded ? undefined : true}
      aria-labelledby="mr-brownie-title"
      className={cn(
        "cb-mr-brownie-drawer flex flex-col",
        embedded
          ? "cb-mr-brownie-drawer--embedded relative w-full overflow-hidden rounded-[14px]"
          : cn("fixed inset-y-0 z-[51] w-full max-w-[min(100vw,420px)]", drawerSideClass),
      )}
    >
            <div className="cb-mr-brownie-header flex shrink-0 items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={MR_BROWNIE_MASCOT_SRC}
                  alt="Mr. Brownie"
                  width={48}
                  height={48}
                  decoding="async"
                  draggable={false}
                  className="h-12 w-12 shrink-0 object-contain object-center"
                />
                <div className="min-w-0">
                  <p id="mr-brownie-title" className="cb-mr-brownie-header__title text-lg font-semibold">
                    Mr. Brownie
                  </p>
                  <p className="cb-mr-brownie-header__subtitle text-xs">
                    {assistantSubtitleAr(sessionRole, Boolean(isSignedIn))}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void clearConversation()}
                  className="cb-mr-brownie-header__btn rounded-full px-2.5 py-1.5 text-[11px] font-semibold"
                >
                  مسح المحادثة
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="cb-mr-brownie-header__btn rounded-full p-2"
                  aria-label={embedded ? "طي المحادثة" : "إغلاق المحادثة"}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div
              ref={scrollRef}
              className={cn(
                "cb-mr-brownie-messages flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5",
                embedded && "cb-mr-brownie-messages--embedded max-h-[220px]",
              )}
            >
              {historyLoading ? (
                <div className="space-y-3 px-0.5" aria-busy="true" aria-label="جاري تحميل السجل">
                  <p className="text-center text-xs font-medium text-cb-text-muted">
                    جاري تحميل السجل…
                  </p>
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-12 animate-pulse rounded-2xl bg-cb-surface-2/90",
                        i % 2 === 0 ? "ms-auto w-4/5" : "me-auto w-3/4",
                      )}
                    />
                  ))}
                </div>
              ) : (
                <>
                  {messages.length === 0 ? (
                    <p className="me-auto max-w-[92%] rounded-2xl border border-[#6b3a1f]/15 bg-white/80 px-3.5 py-2.5 text-sm leading-relaxed text-[#2a1505] shadow-sm">
                      مرحباً — أنا Mr. Brownie. اسأل عن النكهات، الهدايا، التوصيل، أو صندوق الهدايا.
                    </p>
                  ) : null}
                  {messages.map((m, i) => (
                    <MessageBubble
                      key={`${m.role}-${m.createdAt ?? i}`}
                      role={m.role}
                      content={m.content}
                      isStreaming={loading && streamingIndex === i && m.role === "assistant"}
                      imageUrls={m.imageUrls}
                      variant="mr-brownie"
                    />
                  ))}
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
                </>
              )}
            </div>

            <div className="cb-mr-brownie-composer relative z-[2] shrink-0 p-3 sm:p-4">
              <ChatImagePreviewStrip pending={pendingImages} onChange={setPendingImages} />
              <div className="flex gap-2">
                <ChatImageAttachButton
                  context="store"
                  pending={pendingImages}
                  onChange={setPendingImages}
                  disabled={loading || historyLoading}
                  className="min-h-[48px] rounded-2xl"
                />
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
                  disabled={loading || historyLoading}
                  className="min-h-[48px] flex-1 resize-none rounded-2xl border border-cb-border bg-cb-surface px-3 py-2.5 text-sm text-cb-text-strong shadow-inner outline-none transition-shadow focus:border-cb-border-strong focus:ring-2 focus:ring-cb-focus/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (loading && streamAbortRef.current) {
                      streamAbortRef.current.abort();
                      return;
                    }
                    send();
                  }}
                  disabled={
                    historyLoading ||
                    hasUploadingAttachments(pendingImages) ||
                    (!loading &&
                      !input.trim() &&
                      readyAttachments(pendingImages).length === 0)
                  }
                  className={cn(
                    buttonClassName("primary", "shrink-0 self-end px-4 py-3"),
                    "min-h-[48px] rounded-2xl shadow-[var(--shadow-card)]",
                  )}
                  aria-label={loading ? "إيقاف التوليد" : "إرسال"}
                >
                  {loading ? (
                    <Square className="h-4 w-4 fill-current" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
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
                    disabled={loading || historyLoading}
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
                Google Gemini · {assistantSubtitleAr(sessionRole, Boolean(isSignedIn))}
              </p>
            </div>
    </aside>
  );

  if (embedded) {
    return (
      <div data-mr-brownie className="cb-mr-brownie cb-mr-brownie--embedded gb-assistant">
        {!open ? (
          <button
            type="button"
            className="gb-assistant__teaser"
            onClick={() => setOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={MR_BROWNIE_MASCOT_SRC}
              alt=""
              width={44}
              height={44}
              decoding="async"
              draggable={false}
              className="gb-assistant__teaser-icon"
            />
            <span className="gb-assistant__teaser-copy">
              <strong>Mr. Brownie</strong>
              <span>اسأل عن الهدايا، المنتجات، أو التوصيل</span>
            </span>
          </button>
        ) : (
          chatPanel
        )}
      </div>
    );
  }

  const allowSmoothRoamMove = !embedded && dragPx == null && !open && !reduceMotion;
  const dockedToEdge = !embedded && !open && !dragPx && !edgePeek;
  const idleFab = !embedded && dragPx == null && !open;

  return (
    <div data-mr-brownie className="cb-mr-brownie">
      <button
        ref={fabRef}
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={cn(
          "cb-mr-brownie-fab relative flex max-sm:h-[78px] max-sm:w-[78px] sm:h-[92px] sm:w-[92px] cursor-grab select-none items-center justify-center overflow-visible rounded-full bg-transparent p-0 shadow-none ring-0",
          allowSmoothRoamMove &&
            "motion-safe:transform-gpu motion-safe:transition-[left,top,right,bottom,transform,filter,opacity] motion-safe:duration-[1000ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
          !allowSmoothRoamMove &&
            !dragPx &&
            "transition-[transform,filter,opacity] duration-200 ease-out",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cb-focus",
          "touch-none active:cursor-grabbing",
          dragPx && "!transition-none scale-[1.06] ring-2 ring-cb-focus/50 ring-offset-0",
          idleFab && !reduceMotion && "motion-safe:transform-gpu",
          open && "pointer-events-none opacity-0",
        )}
        aria-label="Mr. Brownie — اضغط للدردشة أو اسحب للتحريك على الشاشة"
      >
        <span
          className={cn(
            "relative inline-flex items-center justify-center",
            allowSmoothRoamMove &&
              "motion-safe:transition-transform motion-safe:duration-[1000ms] motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)]",
            dragPx && "!transition-none",
            dockedToEdge &&
              fabPos.side === "left" &&
              "-translate-x-[56%] max-sm:-translate-x-[58%]",
            dockedToEdge &&
              fabPos.side === "right" &&
              "translate-x-[56%] max-sm:translate-x-[58%]",
          )}
        >
          {showNotifDot && !open ? (
            <span
              className="absolute -end-0.5 -top-0.5 z-[3] h-3.5 w-3.5 rounded-full border-2 border-white bg-rose-500 motion-safe:[animation:ping_2s_ease-in-out_infinite]"
              aria-hidden
            />
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
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="cb-mr-brownie-scrim"
            aria-label="إغلاق المحادثة"
            onClick={() => setOpen(false)}
          />
          {chatPanel}
        </>
      ) : null}
    </div>
  );
}
