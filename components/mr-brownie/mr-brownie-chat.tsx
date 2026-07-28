"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { ArrowLeft, ArrowRight, History, Send, Square, X } from "lucide-react";
import {
  ChatImageAttachButton,
  ChatImagePreviewStrip,
  clearPendingAttachments,
  hasUploadingAttachments,
  readyAttachments,
  type PendingChatImage,
} from "@/components/chat/chat-image-attachment-input";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import { buttonClassName } from "@/components/ui/button";
import { MrBrownieChatActionStrip } from "@/components/mr-brownie/chat-action-card";
import { MrBrownieChatClientActionStrip } from "@/components/mr-brownie/chat-client-action-strip";
import { MrBrownieChatProductStrip } from "@/components/mr-brownie/chat-product-card";
import { AnswerStyleBar } from "@/components/mr-brownie/answer-style-bar";
import { PersonaBar } from "@/components/mr-brownie/persona-bar";
import type { ChatClientAction } from "@/lib/mr-brownie/chat-client-actions";
import type { Product } from "@/lib/data";
import { VoiceInputButton } from "@/components/mr-brownie/voice-input-button";
import type { ChatActionCard } from "@/lib/mr-brownie/action-cards";
import { trackGa4Event } from "@/lib/analytics/ga4";
import { trackMrBrownieFunnel } from "@/lib/analytics/mr-brownie-funnel";
import { GiftGuideQuiz } from "@/components/mr-brownie/gift-guide-quiz";
import {
  buildGiftGuideReply,
  buildGiftGuideSummary,
  isGiftGuideChip,
  pickGiftGuideProducts,
  type GiftGuideAnswers,
} from "@/lib/mr-brownie/gift-guide";
import {
  fetchAllShopProducts,
  mapApiProductToCatalog,
} from "@/lib/storefront/shop-catalog-client";
import { fetchMrBrownieNonStreamReply, streamMrBrownieChat } from "@/lib/mr-brownie/stream-client";
import {
  loadPersonaPreference,
  PERSONA_CONFIG,
  savePersonaPreference,
  type ChatPersona,
  type ChatProductCard,
  type PersonaPreference,
} from "@/lib/mr-brownie/personas";
import { STOREFRONT_PERSONA } from "@/lib/mr-brownie/storefront-persona";
import {
  loadGuestToneVector,
  saveGuestToneVector,
  shiftToneFromFeedback,
} from "@/lib/mr-brownie/tone-vector";
import { MessageBubble } from "@/components/ai-chat/message-bubble";
import {
  BUBBLE_AUTO_HIDE_MS,
  buildAmbientMessages,
  DRAG_HOLD_MS,
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
import { layoutAmbientBubble } from "@/lib/mr-brownie/bubble-layout";
import {
  loadAnswerStylePreference,
  saveAnswerStylePreference,
  type AnswerStylePreference,
} from "@/lib/mr-brownie/answer-styles";
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

function findPrecedingUserMessage(messages: ChatMessage[], assistantIndex: number): string {
  for (let i = assistantIndex - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") return messages[i].content;
  }
  return "";
}

const DRAG_THRESHOLD_PX = 10;
const DRAG_THRESHOLD_MOBILE_PX = 14;

function dragThresholdPx(): number {
  return isMobileViewport() ? DRAG_THRESHOLD_MOBILE_PX : DRAG_THRESHOLD_PX;
}

function isShopAssistantRole(role: string | null): boolean {
  return !role || role === "guest" || role === "customer";
}

function canPickPersona(role: string | null): boolean {
  return role === "admin" || role === "owner" || role === "staff";
}

function parseProductCards(meta: Record<string, unknown> | undefined): ChatProductCard[] {
  const raw = meta?.product_cards;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: String(item.id ?? ""),
      name: String(item.name ?? ""),
      price_egp: Number(item.price_egp) || 0,
      shop_path: String(item.shop_path ?? "/shop"),
      image_url: typeof item.image_url === "string" ? item.image_url : null,
      in_stock: item.in_stock !== false,
    }))
    .filter((p) => p.id && p.name);
}

function parseFollowUps(meta: Record<string, unknown> | undefined): string[] {
  const raw = meta?.follow_up_options;
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
}

function parseClientActions(meta: Record<string, unknown> | undefined): ChatClientAction[] {
  const raw = meta?.client_actions;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => {
      const type = item.type;
      if (type === "add_to_cart") {
        return {
          type: "add_to_cart" as const,
          id: String(item.id ?? ""),
          product_slug: String(item.product_slug ?? ""),
          product_name: String(item.product_name ?? ""),
          price_egp: Number(item.price_egp) || 0,
          image_url: typeof item.image_url === "string" ? item.image_url : null,
          quantity: Number(item.quantity) || 1,
          label_en: String(item.label_en ?? "Add to cart"),
          label_ar: String(item.label_ar ?? "أضف للسلة"),
        };
      }
      if (type === "apply_promo") {
        return {
          type: "apply_promo" as const,
          code: String(item.code ?? ""),
          discount_egp:
            typeof item.discount_egp === "number" ? item.discount_egp : null,
          label_en: String(item.label_en ?? "Apply promo"),
          label_ar: String(item.label_ar ?? "تطبيق الكود"),
        };
      }
      return null;
    })
    .filter((a): a is ChatClientAction => {
      if (!a) return false;
      if (a.type === "add_to_cart") return Boolean(a.product_slug && a.product_name);
      return Boolean(a.code);
    });
}

function parseActionCards(meta: Record<string, unknown> | undefined): ChatActionCard[] {
  const raw = meta?.action_cards;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: String(item.id ?? ""),
      path: String(item.path ?? "/"),
      label_en: String(item.label_en ?? item.label ?? "Open"),
      label_ar: String(item.label_ar ?? item.label ?? "فتح"),
      icon: (["help", "cart", "gift", "package"] as const).includes(
        item.icon as ChatActionCard["icon"],
      )
        ? (item.icon as ChatActionCard["icon"])
        : "package",
    }))
    .filter((c) => c.id && c.path);
}

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

const ASSISTANT_ROLE_KEYS = ["guest", "customer", "staff", "admin", "owner"] as const;

function assistantSubtitle(
  role: string | null,
  signedIn: boolean,
  t: TranslateFn,
): string {
  if (!signedIn) return t("mrBrownieChat.assistant.guest");
  if (role && ASSISTANT_ROLE_KEYS.includes(role as (typeof ASSISTANT_ROLE_KEYS)[number])) {
    return t(`mrBrownieChat.assistant.${role}`);
  }
  return t("mrBrownieChat.assistant.default");
}

function suggestionsForRole(role: string | null, t: TranslateFn): string[] {
  if (role === "staff") {
    return [
      t("mrBrownieChat.suggestions.staff0"),
      t("mrBrownieChat.suggestions.staff1"),
      t("mrBrownieChat.suggestions.staff2"),
    ];
  }
  if (role === "admin" || role === "owner") {
    return [
      t("mrBrownieChat.suggestions.exec0"),
      t("mrBrownieChat.suggestions.exec1"),
      t("mrBrownieChat.suggestions.exec2"),
    ];
  }
  return [
    t("mrBrownieChat.suggestions.shop0"),
    t("mrBrownieChat.suggestions.shop1"),
    t("mrBrownieChat.suggestions.shop2"),
    t("mrBrownieChat.suggestions.shop3"),
  ];
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 639px)").matches;
}

function clampDragPosition(left: number, top: number, vw: number, vh: number) {
  const mobile = isMobileViewport();
  const inset = fabInsetPx(mobile);
  const size = fabSizePx(mobile);
  return {
    left: Math.max(inset, Math.min(vw - size - inset, left)),
    top: Math.max(72, Math.min(vh - size - (mobile ? 200 : 96), top)),
  };
}

function resolveFabLeftPx(
  roamPx: { left: number; top: number } | null,
  dragPx: { left: number; top: number } | null,
  fabPos: { side: "left" | "right"; bottomPx: number },
): number | null {
  if (typeof window === "undefined") return null;
  const mobile = isMobileViewport();
  const size = fabSizePx(mobile);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (roamPx) return roamPx.left;
  if (dragPx) return dragPx.left;
  return fabTopLeftFromStored(fabPos, vw, vh, mobile).left;
}

function subtotalFromLines(
  lines: { priceEgp: number; quantity: number }[],
): number {
  return lines.reduce((acc, l) => acc + l.priceEgp * l.quantity, 0);
}

type MrBrownieChatProps = {
  /** Renders inside page layout (e.g. gift box sidebar) instead of a floating FAB. */
  embedded?: boolean;
  /** Open chat panel on mount (after user tapped lazy launch FAB). */
  initialOpen?: boolean;
  /** Fired once the floating FAB is mounted (lazy host keeps launch button until then). */
  onFabReady?: () => void;
};

export function MrBrownieChat({
  embedded = false,
  initialOpen = false,
  onFabReady,
}: MrBrownieChatProps) {
  const { lines, addItem, applyPromo, subtotalEgp } = useCart();
  const pathname = usePathname() ?? "/";
  const { lang, t } = useLanguage();
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;
  const { isSignedIn, user } = useSupabaseAuth();
  const supabaseKey = isSignedIn && user?.id ? user.id : null;
  const [open, setOpen] = useState(initialOpen);
  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingChatImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  /** رسائل قبل فتح اللوحة الحالية — تُعرض في «السجل» فقط */
  const [sessionCutoff, setSessionCutoff] = useState(0);
  const [viewMode, setViewMode] = useState<"chat" | "history">("chat");
  const sessionAnchoredRef = useRef(false);
  const skipLsSaveRef = useRef(true);
  const streamAbortRef = useRef<AbortController | null>(null);
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);
  const [clientActionBusyId, setClientActionBusyId] = useState<string | null>(null);
  const pdpDwellRef = useRef(0);
  const CART_ACTIVITY_KEY = "cb-cart-last-activity";

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
  const [fabPressed, setFabPressed] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [showNotifDot, setShowNotifDot] = useState(true);
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [dynamicChips, setDynamicChips] = useState<string[]>([]);
  const [giftGuideOpen, setGiftGuideOpen] = useState(false);
  const [giftGuideLoading, setGiftGuideLoading] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(!embedded);
  const [composerHint, setComposerHint] = useState<string | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, 1 | -1>>({});
  const [answerStylePref, setAnswerStylePref] = useState<AnswerStylePreference>(() =>
    loadAnswerStylePreference(),
  );
  const [personaPref, setPersonaPref] = useState<PersonaPreference>(() =>
    loadPersonaPreference(),
  );
  const fabRef = useRef<HTMLButtonElement>(null);
  const dragSession = useRef<{
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);
  const pointerMoved = useRef(false);
  const capturedPointerIdRef = useRef<number | null>(null);
  const dragFlushRafRef = useRef<number | null>(null);
  const pendingDragRef = useRef<{ left: number; top: number } | null>(null);
  /** بعد السحب اليدوي: تبقى الأيقونة مكانها حتى هذا الوقت (epoch ms) قبل استئناف التجوّل */
  const dragHoldUntilRef = useRef(0);
  const fabInteractingRef = useRef(false);
  const dragPxRef = useRef<{ left: number; top: number } | null>(null);
  const suppressClickRef = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bubbleHideTimerRef = useRef<number | null>(null);
  const lastBubbleIndexRef = useRef(-1);
  const openRef = useRef(initialOpen);
  const openedAtRef = useRef(0);
  const linesRef = useRef(lines);
  const isSignedInRef = useRef(Boolean(isSignedIn));
  const supabaseUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    supabaseUserIdRef.current = user?.id;
  }, [user?.id]);

  const shopAssistant = isShopAssistantRole(sessionRole);
  const personaPicker = canPickPersona(sessionRole);
  const displayPersona: ChatPersona =
    personaPicker && personaPref !== "auto" ? personaPref : STOREFRONT_PERSONA;
  const personaCfg = PERSONA_CONFIG[displayPersona];

  const handleAnswerStyleChange = useCallback((pref: AnswerStylePreference) => {
    setAnswerStylePref(pref);
    saveAnswerStylePreference(pref);
  }, []);

  const handlePersonaChange = useCallback((pref: PersonaPreference) => {
    setPersonaPref(pref);
    savePersonaPreference(pref);
  }, []);
  const chipSuggestions =
    dynamicChips.length > 0 ? dynamicChips : suggestionsForRole(sessionRole, t);

  useEffect(() => {
    dragPxRef.current = dragPx;
  }, [dragPx]);

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

  useEffect(() => {
    if (embedded) return;
    onFabReady?.();
  }, [embedded, onFabReady]);

  useEffect(() => {
    if (initialOpen && openedAtRef.current === 0) {
      openedAtRef.current = Date.now();
    }
  }, [initialOpen]);

  const openChat = useCallback(() => {
    openedAtRef.current = Date.now();
    openRef.current = true;
    setOpen(true);
  }, []);

  const freezeFabPosition = useCallback(() => {
    const el = fabRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const frozen = {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
    };
    setRoamPx(frozen);
    saveRoamingPosition(frozen);
  }, []);

  useEffect(() => {
    pdpDwellRef.current = 0;
    if (!pathname.startsWith("/shop/") || pathname === "/shop") return;
    const tick = window.setInterval(() => {
      pdpDwellRef.current += 5;
    }, 5000);
    return () => window.clearInterval(tick);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined" || lines.length === 0) return;
    sessionStorage.setItem(CART_ACTIVITY_KEY, String(Date.now()));
  }, [lines]);

  const postMrBrownieAmbient = useCallback(async () => {
    const uidAtStart = supabaseUserIdRef.current;
    try {
      const L = linesRef.current;
      const productSlug =
        pathname.startsWith("/shop/") && pathname !== "/shop"
          ? pathname.split("/").filter(Boolean)[1]
          : undefined;
      let cartIdleMinutes: number | undefined;
      if (typeof window !== "undefined" && L.length > 0) {
        const raw = sessionStorage.getItem(CART_ACTIVITY_KEY);
        const ts = raw ? Number(raw) : NaN;
        if (Number.isFinite(ts)) {
          cartIdleMinutes = Math.floor((Date.now() - ts) / 60_000);
        }
      }
      const res = await fetch("/api/mr-brownie/ambient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: L.length,
          cartSubtotalEgp: subtotalFromLines(L),
          locale: lang,
          pdpDwellSeconds: pdpDwellRef.current,
          productSlug,
          cartIdleMinutes,
        }),
      });
      if (!res.ok) return { message: null as string | null, role: null as string | null };
      const data = (await res.json()) as { message?: unknown; meta?: { role?: unknown } };
      const rawRole = data.meta?.role;
      const role =
        typeof rawRole === "string" && rawRole.trim().length > 0 ? rawRole.trim() : null;
      if (role && isSignedInRef.current && supabaseUserIdRef.current === uidAtStart) {
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
  }, [lang, pathname]);

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
      if (openRef.current || dragSession.current || fabInteractingRef.current) return;
      if (dragPxRef.current) return;
      /** لو المستخدم سحبها مؤخراً نتركها مكانها 10 دقائق */
      if (Date.now() < dragHoldUntilRef.current) return;
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
          lang,
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

        const runBubble = () => {
          const fallback = pickRandom();
          showBubble(fallback);
          void fetchDynamicAmbientMessage().then((dynamic) => {
            if (
              !dynamic ||
              document.visibilityState === "hidden" ||
              openRef.current ||
              fabInteractingRef.current
            ) {
              return;
            }
            showBubble(dynamic);
          });
        };

        runBubble();
      }, ROAM_POST_UI_MS);
    };
    const id = window.setInterval(tick, ROAM_INTERVAL_MS);
    tick();
    return () => window.clearInterval(id);
  }, [
    embedded,
    reduceMotion,
    pickRoamingTargetCb,
    showBubble,
    fetchDynamicAmbientMessage,
    lang,
  ]);

  const submitFeedback = useCallback(
    (assistantIndex: number, rating: 1 | -1) => {
      const assistant = messages[assistantIndex];
      if (!assistant || assistant.role !== "assistant" || !assistant.content.trim()) return;

      const msgKey = String(assistant.createdAt ?? assistantIndex);
      if (feedbackByMessage[msgKey]) return;

      const userMessage = findPrecedingUserMessage(messages, assistantIndex);
      if (!userMessage.trim()) return;

      setFeedbackByMessage((prev) => ({ ...prev, [msgKey]: rating }));

      const msgPersona = assistant.persona ?? displayPersona;

      trackMrBrownieFunnel(rating === 1 ? "feedback_up" : "feedback_down", {
        pathname,
        persona: msgPersona,
      });

      const sid = getOrCreateChatSessionId();

      if (!isSignedIn) {
        const nextTone = shiftToneFromFeedback(loadGuestToneVector(), {
          rating,
          activePersona: msgPersona,
        });
        saveGuestToneVector(nextTone);
      }

      void fetch("/api/mr-brownie/feedback", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          userMessage,
          assistantMessage: assistant.content,
          sessionId: sid ?? undefined,
          pathname,
          locale: lang,
          activePersona: msgPersona,
        }),
      }).catch(() => {});
    },
    [messages, feedbackByMessage, pathname, lang, displayPersona, isSignedIn],
  );

  const runClientAddToCart = useCallback(
    (action: Extract<ChatClientAction, { type: "add_to_cart" }>) => {
      setClientActionBusyId(action.id);
      const product: Product = {
        id: action.product_slug,
        name: action.product_name,
        description: "",
        price: action.price_egp,
        image: action.image_url ?? "/placeholder-cookie.png",
        category: "cookies",
      };
      addItem(product, action.quantity);
      trackMrBrownieFunnel("add_to_cart_from_chat", {
        pathname,
        product_slug: action.product_slug,
      });
      setClientActionBusyId(null);
    },
    [addItem, pathname],
  );

  const runClientApplyPromo = useCallback(
    async (action: Extract<ChatClientAction, { type: "apply_promo" }>) => {
      setClientActionBusyId(action.code);
      try {
        const res = await fetch("/api/promo/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: action.code, cart_total: subtotalEgp }),
        });
        const data = (await res.json()) as {
          valid?: boolean;
          discount_amount?: number;
          type?: "percent" | "fixed";
          value?: number;
          code?: string;
        };
        if (data.valid) {
          applyPromo({
            code: data.code ?? action.code,
            discount_amount: data.discount_amount ?? 0,
            type: data.type ?? "percent",
            value: data.value ?? 0,
          });
          trackMrBrownieFunnel("promo_apply_from_chat", {
            pathname,
            promo_code: action.code,
          });
        }
      } finally {
        setClientActionBusyId(null);
      }
    },
    [applyPromo, pathname, subtotalEgp],
  );

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
    const key = mrBrownieChatLsKey(supabaseKey);
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
  }, [supabaseKey, isSignedIn]);

  const clearConversation = useCallback(async () => {
    const key = mrBrownieChatLsKey(supabaseKey);
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
      setSessionCutoff(0);
      setViewMode("chat");
      sessionAnchoredRef.current = false;
    } catch {
      /* ignore */
    }
  }, [supabaseKey, isSignedIn]);

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
    if (!open) {
      sessionAnchoredRef.current = false;
      setViewMode("chat");
      return;
    }
    if (historyLoading || sessionAnchoredRef.current) return;
    setSessionCutoff(messages.length);
    sessionAnchoredRef.current = true;
  }, [open, historyLoading, messages.length]);

  useEffect(() => {
    if (skipLsSaveRef.current) return;
    const key = mrBrownieChatLsKey(supabaseKey);
    const id = window.setTimeout(() => {
      savePersistedMessages(key, messages);
    }, 400);
    return () => window.clearTimeout(id);
  }, [messages, supabaseKey]);

  useLayoutEffect(() => {
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

  const historyMessages = messages.slice(0, sessionCutoff);
  const sessionMessages = messages.slice(sessionCutoff);
  const displayedMessages = viewMode === "history" ? historyMessages : sessionMessages;

  useLayoutEffect(() => {
    if (historyLoading || !open) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [historyLoading, displayedMessages, open, viewMode]);

  useEffect(() => {
    if (embedded || !open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [embedded, open]);

  useEffect(() => {
    if (!open) return;
    trackMrBrownieFunnel("chat_open", { pathname, embedded: embedded ? 1 : 0 });
  }, [open, pathname, embedded]);

  /** إغلاق عند الضغط أو اللمس خارج لوحة الشات */
  useEffect(() => {
    if (embedded || !open) return;

    const closeIfOutside = (e: PointerEvent) => {
      if (Date.now() - openedAtRef.current < 500) return;
      const panel = panelRef.current;
      const fab = fabRef.current;
      if (!panel) return;
      const t = e.target;
      if (t instanceof Node) {
        if (panel.contains(t)) return;
        if (fab?.contains(t)) return;
      }
      openRef.current = false;
      setOpen(false);
    };

    document.addEventListener("pointerdown", closeIfOutside);
    return () => document.removeEventListener("pointerdown", closeIfOutside);
  }, [embedded, open]);

  const submitMessage = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      const attachments = readyAttachments(pendingImages);
      if ((!trimmed && attachments.length === 0) || loading) return;
      if (hasUploadingAttachments(pendingImages)) return;

      trackMrBrownieFunnel("chat_message", { pathname, locale: lang });

      const userContent = trimmed || t("mrBrownieChat.imageFallback");
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
        const productSlug =
          pathname.startsWith("/shop/") && pathname !== "/shop"
            ? pathname.split("/").filter(Boolean)[1]
            : undefined;

        let streamMeta: Record<string, unknown> | undefined;

        const reply = await streamMrBrownieChat({
          messages: nextMessages.map(({ role, content, imageUrls: imgs }) => ({
            role,
            content,
            attachments: imgs?.map((url) => ({ url })),
          })),
          cartLines: lines,
          session: {
            pathname,
            locale: lang,
            productSlug,
          },
          persona: shopAssistant ? "auto" : personaPref,
          answerStyle: answerStylePref,
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
              streamMeta = meta;
              const metaRole = meta?.role;
              if (typeof metaRole === "string" && metaRole.length > 0) {
                setSessionRole(metaRole);
              }
              const followUps = parseFollowUps(meta);
              if (followUps.length > 0) setDynamicChips(followUps);
            },
            onError: (msg) => setError(msg),
          },
        });

        if (!reply.trim()) {
          setError("Empty reply from assistant.");
          setMessages((prev) => prev.slice(0, -1));
          return;
        }

        const productCards = parseProductCards(streamMeta);
        const actionCards = parseActionCards(streamMeta);
        const clientActions = parseClientActions(streamMeta);
        const replyPersona = STOREFRONT_PERSONA;

        trackMrBrownieFunnel("assistant_reply", {
          pathname,
          has_products: productCards.length > 0 ? 1 : 0,
          has_actions: actionCards.length > 0 ? 1 : 0,
          prompt_variant:
            typeof streamMeta?.prompt_variant === "string"
              ? streamMeta.prompt_variant
              : undefined,
        });

        setMessages((prev) => {
          const copy = [...prev];
          if (copy[streamingIdx]) {
            copy[streamingIdx] = {
              ...copy[streamingIdx],
              content: reply,
              productCards: productCards.length ? productCards : undefined,
              actionCards: actionCards.length ? actionCards : undefined,
              clientActions: clientActions.length ? clientActions : undefined,
              persona: replyPersona,
            };
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
          let fallbackReply: string | null = null;
          try {
            const fallback = await fetchMrBrownieNonStreamReply({
              messages: nextMessages.map(({ role, content, imageUrls: imgs }) => ({
                role,
                content,
                attachments: imgs?.map((url) => ({ url })),
              })),
              cartLines: lines,
              session: {
                pathname,
                locale: lang,
                productSlug:
                  pathname.startsWith("/shop/") && pathname !== "/shop"
                    ? pathname.split("/").filter(Boolean)[1]
                    : undefined,
              },
              persona: shopAssistant ? "auto" : personaPref,
              answerStyle: answerStylePref,
            });
            fallbackReply = fallback?.reply ?? null;
          } catch {
            /* keep stream/partial error path */
          }

          let savedAssistant = false;
          let assistantText = "";
          setMessages((prev) => {
            const copy = [...prev];
            const partial = copy[streamingIdx]?.content?.trim() ?? "";
            const text = fallbackReply || partial;
            if (!text) {
              if (copy[streamingIdx] && !partial) return copy.slice(0, -1);
              return copy;
            }
            savedAssistant = true;
            assistantText = text;
            if (copy[streamingIdx]) {
              copy[streamingIdx] = {
                ...copy[streamingIdx],
                content: text,
                persona: STOREFRONT_PERSONA,
              };
            }
            return copy;
          });

          if (savedAssistant && assistantText) {
            enqueueSaveMessage("assistant", assistantText);
            setError(null);
          } else {
            setError(e instanceof Error ? e.message : "Network error.");
          }
        }
      } finally {
        streamAbortRef.current = null;
        setStreamingIndex(null);
        setLoading(false);
      }
    },
    [
      loading,
      messages,
      lines,
      enqueueSaveMessage,
      pendingImages,
      t,
      pathname,
      lang,
      shopAssistant,
      answerStylePref,
      personaPref,
    ],
  );

  const send = useCallback(() => {
    void submitMessage(input);
  }, [input, submitMessage]);

  const completeGiftGuide = useCallback(
    async (answers: GiftGuideAnswers) => {
      setGiftGuideOpen(false);
      setGiftGuideLoading(true);
      setError(null);

      const locale = lang === "ar" ? "ar" : "en";
      const summary = buildGiftGuideSummary(answers, locale);

      trackMrBrownieFunnel("gift_guide_complete", {
        pathname,
        budget: answers.budget,
        occasion: answers.occasion,
        dietary: answers.dietary,
      });
      trackGa4Event("mr_brownie_gift_guide_complete", {
        budget: answers.budget,
        occasion: answers.occasion,
        dietary: answers.dietary,
      });

      const userTs = Date.now();
      setMessages((prev) => [
        ...prev,
        { role: "user", content: summary, createdAt: userTs },
      ]);
      enqueueSaveMessage("user", summary);

      try {
        const rows = await fetchAllShopProducts();
        const catalog = rows.map((row) =>
          mapApiProductToCatalog(row, t("product.fallbackDescription"), lang),
        );
        const productCards = pickGiftGuideProducts(catalog, answers);
        const reply = buildGiftGuideReply(answers, locale, productCards.length);
        const assistantTs = Date.now();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: reply,
            productCards: productCards.length ? productCards : undefined,
            createdAt: assistantTs,
          },
        ]);
        enqueueSaveMessage("assistant", reply);

        trackMrBrownieFunnel("assistant_reply", {
          pathname,
          source: "gift_guide",
          has_products: productCards.length > 0 ? 1 : 0,
        });
      } catch (e) {
        const fallback =
          locale === "ar"
            ? "تعذّر تحميل المنتجات الآن — جرّب مرة أخرى أو اسألني مباشرة."
            : "Couldn't load products right now — try again or ask me directly.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fallback, createdAt: Date.now() },
        ]);
        setError(e instanceof Error ? e.message : fallback);
      } finally {
        setGiftGuideLoading(false);
      }
    },
    [lang, pathname, t, enqueueSaveMessage],
  );

  const releaseFabPointerCapture = useCallback((pointerId?: number) => {
    const el = fabRef.current;
    if (!el) return;
    const id = pointerId ?? capturedPointerIdRef.current;
    if (id == null) return;
    if (el.hasPointerCapture(id)) el.releasePointerCapture(id);
    if (capturedPointerIdRef.current === id) capturedPointerIdRef.current = null;
  }, []);

  const resetFabDrag = useCallback(() => {
    cancelDragRaf();
    dragSession.current = null;
    pointerMoved.current = false;
    fabInteractingRef.current = false;
    setFabPressed(false);
    setDragPx(null);
    releaseFabPointerCapture();
  }, [releaseFabPointerCapture, cancelDragRaf]);

  useEffect(() => {
    resetFabDrag();
  }, [pathname, resetFabDrag]);

  useEffect(() => {
    const onRelease = () => resetFabDrag();
    window.addEventListener("blur", onRelease);
    document.addEventListener("visibilitychange", onRelease);
    return () => {
      window.removeEventListener("blur", onRelease);
      document.removeEventListener("visibilitychange", onRelease);
    };
  }, [resetFabDrag]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (open) return;
    if (e.button !== 0) return;
    const el = fabRef.current;
    if (!el) return;
    fabInteractingRef.current = true;
    setFabPressed(true);
    freezeFabPosition();
    const rect = el.getBoundingClientRect();
    dragSession.current = {
      startX: e.clientX,
      startY: e.clientY,
      originLeft: rect.left,
      originTop: rect.top,
    };
    pointerMoved.current = false;
    suppressClickRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const session = dragSession.current;
    if (!session) return;
    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;
    if (!pointerMoved.current && Math.hypot(dx, dy) < dragThresholdPx()) return;
    const el = fabRef.current;
    if (el && !el.hasPointerCapture(e.pointerId)) {
      el.setPointerCapture(e.pointerId);
      capturedPointerIdRef.current = e.pointerId;
    }
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
    releaseFabPointerCapture(e.pointerId);
    cancelDragRaf();
    fabInteractingRef.current = false;
    setFabPressed(false);

    const session = dragSession.current;
    const didMove = pointerMoved.current;
    dragSession.current = null;
    pointerMoved.current = false;

    if (!didMove) {
      setDragPx(null);
      return;
    }

    suppressClickRef.current = true;

    if (session) {
      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;
      const p = clampDragPosition(
        session.originLeft + dx,
        session.originTop + dy,
        window.innerWidth,
        window.innerHeight,
      );
      dragHoldUntilRef.current = Date.now() + DRAG_HOLD_MS;
      setDragPx(null);
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
    releaseFabPointerCapture(e.pointerId);
    resetFabDrag();
  };

  const handleFabClick = () => {
    if (embedded || openRef.current) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setShowNotifDot(false);
    hideBubble();
    openChat();
  };

  /* موضع الـ FAB عبر DOM API */
  useLayoutEffect(() => {
    if (embedded) return;
    const el = fabRef.current;
    if (!el) return;
    el.style.setProperty("position", "fixed");
    el.style.setProperty("z-index", "102");
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
    const inset = fabInsetPx(isMobileViewport());
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
          ? "cb-mr-brownie-drawer--embedded relative flex min-h-0 w-full overflow-hidden rounded-2xl"
          : cn(
              "cb-mr-brownie-drawer--floating fixed inset-y-0 z-[126]",
              drawerSideClass,
            ),
      )}
    >
            <div
              className={cn(
                "cb-mr-brownie-header flex shrink-0 items-center justify-between gap-2",
                embedded ? "px-2.5 py-2" : "px-3 py-2 sm:px-4",
              )}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={personaCfg.mascotSrc}
                  alt={personaCfg.displayName}
                  width={embedded ? 36 : 40}
                  height={embedded ? 36 : 40}
                  decoding="async"
                  draggable={false}
                  className={cn(
                    "shrink-0 object-contain object-center transition-opacity duration-300",
                    embedded ? "h-9 w-9" : "h-10 w-10",
                  )}
                />
                <div className="min-w-0">
                  <p
                    id="mr-brownie-title"
                    className={cn(
                      "cb-mr-brownie-header__title font-semibold leading-tight",
                      embedded ? "text-sm" : "text-sm sm:text-base",
                    )}
                  >
                    {personaCfg.displayName}
                  </p>
                  <p
                    className={cn(
                      "cb-mr-brownie-header__subtitle leading-snug",
                      embedded ? "text-[11px]" : "text-xs",
                    )}
                  >
                    {shopAssistant
                      ? t("mrBrownieChat.storefrontSubtitle")
                      : assistantSubtitle(sessionRole, Boolean(isSignedIn), t)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {viewMode === "history" ? (
                  <button
                    type="button"
                    onClick={() => setViewMode("chat")}
                    className="cb-mr-brownie-header__btn inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                  >
                    <BackIcon className="h-3.5 w-3.5" aria-hidden />
                    {t("mrBrownieChat.currentChat")}
                  </button>
                ) : historyMessages.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setViewMode("history")}
                    className="cb-mr-brownie-header__btn inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                    aria-label={t("mrBrownieChat.historyAria", {
                      count: historyMessages.length,
                    })}
                  >
                    <History className="h-3.5 w-3.5" aria-hidden />
                    {t("mrBrownieChat.history")}
                    <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] tabular-nums">
                      {historyMessages.length}
                    </span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void clearConversation()}
                  className={cn(
                    "cb-mr-brownie-header__btn rounded-full font-semibold",
                    embedded ? "px-2 py-1 text-[10px]" : "px-2.5 py-1 text-[11px]",
                  )}
                >
                  {t("mrBrownieChat.clearConversation")}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "cb-mr-brownie-header__btn cb-mr-brownie-header__btn--icon rounded-full",
                    embedded ? "p-1.5" : "p-1.5",
                  )}
                  aria-label={embedded ? t("mrBrownieChat.collapseChat") : t("mrBrownieChat.closeChat")}
                >
                  <X className={embedded ? "h-4 w-4" : "h-4 w-4"} />
                </button>
              </div>
            </div>

            {viewMode === "chat" ? (
              <div className="shrink-0 space-y-0">
                {personaPicker ? (
                  <PersonaBar
                    value={personaPref}
                    onChange={handlePersonaChange}
                    compact
                  />
                ) : null}
                <AnswerStyleBar
                  value={answerStylePref}
                  onChange={handleAnswerStyleChange}
                  compact
                />
              </div>
            ) : null}

            <div
              ref={scrollRef}
              className={cn(
                "cb-mr-brownie-messages flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain",
                embedded
                  ? "cb-mr-brownie-messages--embedded gap-2.5 px-2.5 py-2.5"
                  : "gap-3.5 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5",
              )}
            >
              {historyLoading ? (
                <div
                  className="space-y-3 px-0.5"
                  aria-busy="true"
                  aria-label={t("mrBrownieChat.loadingHistoryAria")}
                >
                  <p className="text-center text-xs font-medium text-cb-text-muted">
                    {t("mrBrownieChat.loadingHistory")}
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
                  {viewMode === "history" ? (
                    <p className="text-center text-xs font-medium text-cb-text-muted">
                      {t("mrBrownieChat.historyReadOnly")}
                    </p>
                  ) : displayedMessages.length === 0 ? (
                    <p className="me-auto max-w-[92%] rounded-2xl border border-[#6b3a1f]/15 bg-white/80 px-3.5 py-2.5 text-sm leading-relaxed text-[#2a1505] shadow-sm">
                      {t("mrBrownieChat.welcome")}
                    </p>
                  ) : null}
                  {displayedMessages.length === 0 && viewMode === "history" ? (
                    <p className="text-center text-sm text-cb-text-muted">
                      {t("mrBrownieChat.historyEmpty")}
                    </p>
                  ) : null}
                  {displayedMessages.map((m, vi) => {
                    const i = viewMode === "history" ? vi : sessionCutoff + vi;
                    const msgKey = String(m.createdAt ?? i);
                    const isStreamingMsg =
                      viewMode === "chat" &&
                      loading &&
                      streamingIndex === i &&
                      m.role === "assistant";
                    return (
                      <div
                        key={`${m.role}-${msgKey}`}
                        className={cn(
                          "flex w-full min-w-0 flex-col gap-0",
                          m.role === "user" ? "items-end" : "items-start",
                        )}
                      >
                        <MessageBubble
                          role={m.role}
                          content={m.content}
                          isStreaming={isStreamingMsg}
                          imageUrls={m.imageUrls}
                          variant="mr-brownie"
                          showFeedback={
                            viewMode === "history"
                              ? false
                              : m.role === "assistant" && Boolean(m.content.trim())
                          }
                          feedbackRating={feedbackByMessage[msgKey] ?? null}
                          onFeedback={
                            m.role === "assistant" && viewMode === "chat"
                              ? (rating) => submitFeedback(i, rating)
                              : undefined
                          }
                        />
                        {m.role === "assistant" && m.productCards?.length ? (
                          <MrBrownieChatProductStrip
                            products={m.productCards}
                            locale={lang}
                            viewLabel={t("mrBrownieChat.productCard.view")}
                            outOfStockLabel={t("mrBrownieChat.productCard.outOfStock")}
                            onProductClick={(p) =>
                              trackMrBrownieFunnel("product_card_click", {
                                pathname,
                                product_id: p.id,
                                product_name: p.name.slice(0, 80),
                              })
                            }
                          />
                        ) : null}
                        {m.role === "assistant" && m.clientActions?.length ? (
                          <MrBrownieChatClientActionStrip
                            actions={m.clientActions}
                            locale={lang}
                            busyId={clientActionBusyId}
                            onAddToCart={runClientAddToCart}
                            onApplyPromo={(a) => void runClientApplyPromo(a)}
                          />
                        ) : null}
                        {m.role === "assistant" && m.actionCards?.length ? (
                          <MrBrownieChatActionStrip
                            cards={m.actionCards}
                            locale={lang}
                            onCardClick={(card) =>
                              trackMrBrownieFunnel("action_card_click", {
                                pathname,
                                action_id: card.id,
                              })
                            }
                          />
                        ) : null}
                        {isStreamingMsg && !m.content.trim() ? (
                          <p className="cb-mr-brownie-typing me-auto px-1 text-xs font-medium text-cb-text-muted">
                            {t("mrBrownieChat.typing", {
                              name: personaCfg.displayName,
                            })}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                  {error ? (
                    <div
                      role="alert"
                      className="rounded-2xl border border-red-200/90 bg-red-50/95 px-3.5 py-3 text-sm leading-relaxed text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
                    >
                      <p className="font-semibold">{t("mrBrownieChat.errorTitle")}</p>
                      <p className="mt-1.5 text-[13px] opacity-95">{error}</p>
                      {error.includes("DEEPSEEK") ||
                      error.includes("deepseek") ? (
                        <p className="mt-2 text-xs opacity-90">
                          {t("mrBrownieChat.errorApiKeyHint")}{" "}
                          <a
                            href="https://platform.deepseek.com/api_keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium underline underline-offset-2 hover:opacity-100"
                          >
                            platform.deepseek.com/api_keys
                          </a>
                        </p>
                      ) : error.includes("GEMINI") ||
                        error.includes("Google AI Studio") ||
                        error.includes("aistudio") ? (
                        <p className="mt-2 text-xs opacity-90">
                          {t("mrBrownieChat.errorApiKeyHint")}{" "}
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

            {viewMode === "chat" ? (
            <div
              className={cn(
                "cb-mr-brownie-composer relative z-[2] shrink-0",
                embedded ? "p-2.5" : "p-3.5 sm:p-4",
              )}
            >
              <ChatImagePreviewStrip
                pending={pendingImages}
                onChange={setPendingImages}
                className="mb-1.5"
              />
              {composerHint ? (
                <p className="mb-1.5 text-[11px] font-medium text-amber-800" role="status">
                  {composerHint}
                </p>
              ) : null}
              <div className="flex gap-1.5">
                <VoiceInputButton
                  locale={lang}
                  compact={embedded}
                  disabled={loading || historyLoading}
                  onTranscript={(text) => {
                    setComposerHint(null);
                    setInput((prev) => (prev ? `${prev} ${text}` : text));
                  }}
                  onError={(message) => setComposerHint(message)}
                  labelStart={t("mrBrownieChat.voice.start")}
                  labelStop={t("mrBrownieChat.voice.stop")}
                  unsupportedLabel={t("mrBrownieChat.voice.unsupported")}
                  permissionDeniedLabel={t("mrBrownieChat.voice.permissionDenied")}
                />
                <ChatImageAttachButton
                  context={
                    sessionRole === "admin" || sessionRole === "owner" ? "admin" : "store"
                  }
                  pending={pendingImages}
                  onChange={(next) => {
                    setComposerHint(null);
                    setPendingImages(next);
                  }}
                  disabled={loading || historyLoading}
                  className={cn(
                    "rounded-xl",
                    embedded ? "h-9 w-9 min-h-0" : "h-10 w-10 min-h-0",
                  )}
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
                  rows={embedded ? 1 : 2}
                  placeholder={t("mrBrownieChat.inputPlaceholder")}
                  disabled={loading || historyLoading}
                  className={cn(
                    "flex-1 resize-none rounded-xl border border-cb-border bg-cb-surface text-cb-text-strong shadow-inner outline-none transition-shadow focus:border-cb-border-strong focus:ring-2 focus:ring-cb-focus/20 disabled:cursor-not-allowed disabled:opacity-60",
                    embedded
                      ? "min-h-[36px] px-2.5 py-2 text-[13px]"
                      : "min-h-[40px] px-3 py-2 text-sm",
                  )}
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
                    buttonClassName("primary", "shrink-0 self-end"),
                    embedded
                      ? "min-h-[36px] rounded-xl px-3 py-2"
                      : "min-h-[40px] rounded-xl px-3.5 py-2.5 shadow-[var(--shadow-card)]",
                  )}
                  aria-label={loading ? t("mrBrownieChat.stopGenerating") : t("mrBrownieChat.send")}
                >
                  {loading ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {giftGuideOpen ? (
                <div className="mb-3 mt-3">
                  <GiftGuideQuiz
                    onComplete={(answers) => void completeGiftGuide(answers)}
                    onCancel={() => setGiftGuideOpen(false)}
                  />
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setSuggestionsOpen((v) => !v)}
                className={cn(
                  "mt-2 flex w-full items-center justify-between gap-2 rounded-lg py-1 text-start font-medium text-cb-text-muted transition hover:text-cb-text-strong",
                  embedded ? "text-[11px]" : "text-xs",
                )}
                aria-expanded={suggestionsOpen}
              >
                <span>{t("mrBrownieChat.quickSuggestions")}</span>
                <span className="text-[10px] opacity-70" aria-hidden>
                  {suggestionsOpen ? "−" : "+"}
                </span>
              </button>
              {suggestionsOpen ? (
                <div
                  className={cn(
                    "flex flex-wrap gap-1.5 overflow-y-auto overscroll-contain",
                    embedded ? "max-h-[5.5rem]" : "max-h-[7rem] sm:max-h-[8rem]",
                  )}
                >
                  {chipSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={loading || historyLoading || giftGuideLoading}
                      onClick={() => {
                        trackMrBrownieFunnel("chip_click", {
                          pathname,
                          chip: s.slice(0, 80),
                        });
                        if (isGiftGuideChip(s, t("mrBrownieChat.suggestions.shop0"))) {
                          trackMrBrownieFunnel("gift_guide_start", { pathname });
                          setGiftGuideOpen(true);
                          return;
                        }
                        void submitMessage(s);
                      }}
                      className={cn(
                        "cb-mr-brownie-chip rounded-full border text-left font-medium leading-snug",
                        "cb-mr-brownie-chip--brownie",
                        embedded
                          ? "px-2.5 py-1 text-[11px]"
                          : "px-3 py-1.5 text-xs",
                        "transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-sm",
                        "disabled:pointer-events-none disabled:opacity-50",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
              {!embedded ? (
                <p className="mt-1.5 text-[10px] text-cb-text-muted">
                  {t("mrBrownieChat.footerPowered", {
                    role: assistantSubtitle(sessionRole, Boolean(isSignedIn), t),
                  })}
                </p>
              ) : null}
            </div>
            ) : (
              <div
                className={cn(
                  "shrink-0 border-t border-cb-border/60 bg-cb-cream/90 px-4 py-3 text-center",
                  embedded ? "p-3.5" : "p-4 sm:p-5",
                )}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("chat")}
                  className={cn(
                    buttonClassName("outline", "w-full gap-2"),
                    "rounded-2xl py-2.5 text-sm font-semibold",
                  )}
                >
                  <BackIcon className="h-4 w-4" aria-hidden />
                  {t("mrBrownieChat.backToCurrentChat")}
                </button>
              </div>
            )}
    </aside>
  );

  if (embedded) {
    return (
      <div data-mr-brownie className="cb-mr-brownie cb-mr-brownie--embedded gb-assistant">
        {!open ? (
          <button
            type="button"
            className="gb-assistant__teaser"
            onClick={() => openChat()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PERSONA_CONFIG.mr_brownie.mascotSrc}
              alt=""
              width={44}
              height={44}
              decoding="async"
              draggable={false}
              className="gb-assistant__teaser-icon"
            />
            <span className="gb-assistant__teaser-copy">
              <strong>Mr. Brownie</strong>
              <span>{t("mrBrownieChat.embeddedTeaser")}</span>
            </span>
          </button>
        ) : (
          chatPanel
        )}
      </div>
    );
  }

  const allowSmoothRoamMove =
    !embedded && dragPx == null && !open && !reduceMotion && !fabPressed;
  const idleFab = !embedded && dragPx == null && !open;
  const bubbleAbove =
    !embedded &&
    typeof window !== "undefined" &&
    (() => {
      const vh = window.innerHeight;
      const size = fabSizePx(isMobileViewport());
      const top =
        roamPx?.top ?? dragPx?.top ?? vh - fabPos.bottomPx - size;
      return top > vh * 0.52;
    })();

  const mobileVp = isMobileViewport();
  const fabLeftPx = resolveFabLeftPx(roamPx, dragPx, fabPos);
  const ambientBubble =
    fabLeftPx != null && typeof window !== "undefined"
      ? layoutAmbientBubble(
          fabLeftPx,
          fabSizePx(mobileVp),
          window.innerWidth,
          mobileVp,
        )
      : null;

  return (
    <div data-mr-brownie className="cb-mr-brownie">
      <button
        ref={fabRef}
        type="button"
        onClick={handleFabClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className={cn(
          "cb-mr-brownie-fab relative flex max-sm:h-[68px] max-sm:w-[68px] sm:h-[92px] sm:w-[92px] cursor-pointer select-none items-center justify-center overflow-visible rounded-full bg-transparent p-0 shadow-none ring-0",
          allowSmoothRoamMove && "cb-mr-brownie-fab--roaming motion-safe:transform-gpu",
          fabPressed && "cb-mr-brownie-fab--pressed active:scale-[0.97]",
          !allowSmoothRoamMove &&
            !dragPx &&
            !fabPressed &&
            "transition-[transform,filter,opacity] duration-200 ease-out",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cb-focus",
          "touch-none active:cursor-grabbing",
          dragPx && "!transition-none scale-[1.06] ring-2 ring-cb-focus/50 ring-offset-0",
          idleFab && !reduceMotion && "motion-safe:transform-gpu",
          open && "pointer-events-none invisible opacity-0",
        )}
        aria-label="Mr. Brownie — اضغط للدردشة أو اسحب للتحريك على الشاشة"
        aria-expanded={open}
      >
        <span
          className={cn(
            "relative inline-flex items-center justify-center",
            allowSmoothRoamMove && "motion-safe:transform-gpu",
            dragPx && "!transition-none",
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
            src={PERSONA_CONFIG.mr_brownie.mascotSrc}
            alt=""
            width={92}
            height={92}
            decoding="async"
            draggable={false}
            className="pointer-events-none max-sm:h-[64px] max-sm:w-[64px] sm:h-[87px] sm:w-[87px] object-contain object-center"
          />
          <div
            className={cn(
              "mr-brownie-ambient-bubble pointer-events-none absolute z-[4] rounded-2xl border border-cb-border/70 bg-cb-surface-elevated/95 px-3 py-2 text-xs text-cb-text-strong shadow-[var(--shadow-glow-warm)] backdrop-blur will-change-transform",
              bubbleAbove
                ? "mr-brownie-ambient-bubble--above bottom-full mb-2 origin-bottom"
                : "top-full mt-2 origin-top",
              "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              bubbleVisible
                ? "translate-y-0 scale-100 opacity-100"
                : bubbleAbove
                  ? "pointer-events-none translate-y-1 scale-[0.96] opacity-0"
                  : "pointer-events-none -translate-y-1 scale-[0.96] opacity-0",
            )}
            style={
              ambientBubble
                ? {
                    left: ambientBubble.leftPx,
                    width: ambientBubble.widthPx,
                    maxWidth: "none",
                    ["--mr-brownie-bubble-tail" as string]: `${ambientBubble.tailPercent}%`,
                  }
                : { left: 0, width: "min(16rem, calc(100vw - 2.5rem))", maxWidth: "16rem" }
            }
            role="status"
            aria-live="polite"
          >
            <p className="relative z-[1] break-words text-start leading-relaxed">
              {bubbleText}
            </p>
            <p className="relative z-[1] mt-1 break-words text-start text-[10px] text-cb-text-muted">
              {t("mrBrownieChat.ambientTapHint")}
            </p>
          </div>
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="cb-mr-brownie-scrim"
            aria-label={t("mrBrownieChat.closeChat")}
            onClick={() => setOpen(false)}
          />
          {chatPanel}
        </>
      ) : null}
    </div>
  );
}
