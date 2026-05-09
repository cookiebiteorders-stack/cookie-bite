"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import html2canvas from "html2canvas";
import gsap from "gsap";
import { useLanguage } from "@/components/providers/language-provider";
import type { Lang } from "@/lib/i18n/translations";
import { MorphCanvas, type MorphDirection } from "@/components/morph/MorphCanvas";

type Session = {
  dataUrlA: string;
  dataUrlB: string;
  direction: MorphDirection;
  /** 0–1 من viewport (y من الأعلى مثل CSS) */
  originNorm: { x: number; y: number };
};

type MorphTransitionContextValue = {
  morphToLanguage: (target: Lang, originNorm?: { x: number; y: number }) => Promise<void>;
  prefersReducedMotion: boolean;
};

const MorphTransitionContext = createContext<MorphTransitionContextValue | null>(null);

function lockScroll(scrollY: number) {
  document.body.dataset.morphScrollY = String(scrollY);
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockScroll() {
  const raw = document.body.dataset.morphScrollY;
  const y = raw ? Number(raw) : 0;
  delete document.body.dataset.morphScrollY;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, Number.isFinite(y) ? y : 0);
}

const CAPTURE_SCALE = 0.42;

export function MorphTransitionProvider({ children }: { children: React.ReactNode }) {
  const { lang, setLanguage } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const endMorph = useCallback(() => {
    setSession(null);
    setPreviewUrl(null);
    unlockScroll();
    busy.current = false;
  }, []);

  const morphToLanguage = useCallback(
    async (target: Lang, originNorm?: { x: number; y: number }) => {
      if (target === lang || busy.current) return;
      busy.current = true;

      if (reducedMotion) {
        const root = document.documentElement;
        await new Promise<void>((resolve) => {
          gsap.to(root, {
            opacity: 0.88,
            duration: 0.12,
            ease: "power2.inOut",
            onComplete: () => {
              setLanguage(target);
              gsap.to(root, {
                opacity: 1,
                duration: 0.16,
                ease: "power2.out",
                onComplete: () => {
                  gsap.set(root, { clearProps: "opacity" });
                  resolve();
                },
              });
            },
          });
        });
        busy.current = false;
        return;
      }

      const scrollY = window.scrollY;
      lockScroll(scrollY);

      try {
        const canvasA = await html2canvas(document.body, {
          scale: CAPTURE_SCALE,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: null,
          ignoreElements: (el) => el.closest("[data-morph-skip-capture]") !== null,
          width: window.innerWidth,
          height: window.innerHeight,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
        });
        const dataUrlA = canvasA.toDataURL("image/jpeg", 0.82);
        setPreviewUrl(dataUrlA);

        setLanguage(target);

        await new Promise<void>((r) => {
          requestAnimationFrame(() => requestAnimationFrame(() => r()));
        });
        await new Promise<void>((r) => setTimeout(r, 120));

        const canvasB = await html2canvas(document.body, {
          scale: CAPTURE_SCALE,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: null,
          ignoreElements: (el) => el.closest("[data-morph-skip-capture]") !== null,
          width: window.innerWidth,
          height: window.innerHeight,
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
        });
        const dataUrlB = canvasB.toDataURL("image/jpeg", 0.82);

        const direction: MorphDirection = target === "ar" ? 1 : -1;

        const ox = originNorm?.x ?? (lang === "ar" ? 0.9 : 0.1);
        const oy = originNorm?.y ?? 0.08;

        setPreviewUrl(null);
        setSession({ dataUrlA, dataUrlB, direction, originNorm: { x: ox, y: oy } });
      } catch {
        setPreviewUrl(null);
        setSession(null);
        unlockScroll();
        busy.current = false;
      }
    },
    [lang, reducedMotion, setLanguage],
  );

  const value = useMemo<MorphTransitionContextValue>(
    () => ({
      morphToLanguage,
      prefersReducedMotion: reducedMotion,
    }),
    [morphToLanguage, reducedMotion],
  );

  return (
    <MorphTransitionContext.Provider value={value}>
      {children}
      {(previewUrl || session) && (
        <div
          className="fixed inset-0 z-[100000]"
          data-morph-skip-capture
          aria-hidden
        >
          {previewUrl && !session ? (
            <div
              role="presentation"
              className="pointer-events-none absolute inset-0 h-full w-full bg-cover bg-center bg-no-repeat select-none"
              style={{ backgroundImage: `url(${previewUrl})` }}
            />
          ) : null}
          {session ? (
            <>
              <div
                role="presentation"
                className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${session.dataUrlA})` }}
              />
              <MorphCanvas
                dataUrlA={session.dataUrlA}
                dataUrlB={session.dataUrlB}
                direction={session.direction}
                originNorm={session.originNorm}
                onComplete={endMorph}
                playSound
              />
              <div
                className="pointer-events-none absolute inset-0 mix-blend-screen"
                aria-hidden
              >
                {Array.from({ length: 20 }).map((_, i) => (
                  <span
                    key={i}
                    className="absolute size-1 rounded-full bg-cyan-100/80 shadow-[0_0_10px_rgba(168,85,247,0.55)]"
                    style={{
                      left: `${(i * 53) % 100}%`,
                      top: `${(i * 37 + 11) % 100}%`,
                      animation: `morph-dust 1.05s cubic-bezier(0.22, 1, 0.36, 1) ${i * 0.025}s both`,
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </MorphTransitionContext.Provider>
  );
}

export function useMorphTransitionContext() {
  const ctx = useContext(MorphTransitionContext);
  if (!ctx) {
    throw new Error("useMorphTransitionContext must be used inside MorphTransitionProvider.");
  }
  return ctx;
}
