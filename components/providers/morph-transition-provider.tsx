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

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error(`${label} (${ms}ms)`)), ms);
    promise.then(
      (v) => {
        window.clearTimeout(id);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(id);
        reject(e);
      },
    );
  });
}

export function MorphTransitionProvider({ children }: { children: React.ReactNode }) {
  const { lang, setLanguage } = useLanguage();
  const langRef = useRef(lang);
  const [session, setSession] = useState<Session | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

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

  useEffect(() => {
    if (!session) return;
    const id = window.setTimeout(() => {
      endMorph();
    }, 25_000);
    return () => window.clearTimeout(id);
  }, [session, endMorph]);

  const morphToLanguage = useCallback(
    async (target: Lang, originNorm?: { x: number; y: number }) => {
      const fromLang = langRef.current;
      if (target === fromLang || busy.current) return;
      busy.current = true;
      let switchedForMorph = false;

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

      const captureOpts = {
        scale: CAPTURE_SCALE,
        useCORS: true,
        /** مهم: allowTaint يلوّث الـ canvas فيفشل toDataURL في كثير من المتصفحات */
        allowTaint: false,
        logging: false,
        backgroundColor: null,
        ignoreElements: (el: Element) => el.closest("[data-morph-skip-capture]") !== null,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      };

      try {
        const canvasA = await withTimeout(html2canvas(document.body, captureOpts), 15_000, "html2canvas A");
        let dataUrlA: string;
        try {
          dataUrlA = canvasA.toDataURL("image/jpeg", 0.82);
        } catch {
          dataUrlA = canvasA.toDataURL("image/png");
        }
        setPreviewUrl(dataUrlA);

        setLanguage(target);
        switchedForMorph = true;

        await new Promise<void>((r) => {
          requestAnimationFrame(() => requestAnimationFrame(() => r()));
        });
        await new Promise<void>((r) => setTimeout(r, 120));

        const canvasB = await withTimeout(html2canvas(document.body, captureOpts), 15_000, "html2canvas B");
        let dataUrlB: string;
        try {
          dataUrlB = canvasB.toDataURL("image/jpeg", 0.82);
        } catch {
          dataUrlB = canvasB.toDataURL("image/png");
        }

        const direction: MorphDirection = target === "ar" ? 1 : -1;

        const ox = originNorm?.x ?? (fromLang === "ar" ? 0.9 : 0.1);
        const oy = originNorm?.y ?? 0.08;

        setPreviewUrl(null);
        setSession({ dataUrlA, dataUrlB, direction, originNorm: { x: ox, y: oy } });
      } catch (err) {
        console.error("[morph-transition]", err);
        if (!switchedForMorph) setLanguage(target);
        setPreviewUrl(null);
        setSession(null);
        unlockScroll();
        busy.current = false;
      }
    },
    [reducedMotion, setLanguage],
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
