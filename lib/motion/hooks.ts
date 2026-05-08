"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  duration,
  easeSpringy,
  motionTokens,
  sharedLayoutTransition,
} from "@/lib/motion/presets";

export { motionTokens, sharedLayoutTransition };

export type AdaptiveMotion = {
  /** تفضيل المستخدم أو الجهاز — تقليل الحركة والـ blur */
  prefersReduced: boolean;
  /** شاشة ضيقة أو إدخال لمس فقط — حركة أخف */
  lowPower: boolean;
  /** انتقالات سينمائية كاملة (blur خفيف مسموح) */
  cinematic: boolean;
  /** قوة blur لانتقال الصفحة (px) — 0 على الأجهزة الضعيفة */
  pageBlurPx: number;
};

/**
 * يجمع prefers-reduced-motion مع إشارات بيئية خفيفة (عرض، ذاكرة جهاز إن وُجدت).
 */
export function useAdaptiveMotion(): AdaptiveMotion {
  const reducedPref = useReducedMotion();
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const narrow = window.matchMedia("(max-width: 639px)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const memory = (
      navigator as Navigator & { deviceMemory?: number }
    ).deviceMemory;

    function sync() {
      let low = narrow.matches || coarse.matches;
      if (typeof memory === "number" && memory <= 4) low = true;
      setLowPower(low);
    }

    sync();
    narrow.addEventListener("change", sync);
    coarse.addEventListener("change", sync);
    return () => {
      narrow.removeEventListener("change", sync);
      coarse.removeEventListener("change", sync);
    };
  }, []);

  const prefersReduced = reducedPref === true;

  return useMemo(() => {
    const cinematic = !prefersReduced && !lowPower;
    return {
      prefersReduced,
      lowPower,
      cinematic,
      pageBlurPx: cinematic ? 8 : 0,
    };
  }, [prefersReduced, lowPower]);
}

export type PageTransitionMotion =
  | { reduced: true }
  | {
      reduced: false;
      initial: {
        opacity: number;
        y: number;
        scale: number;
        filter: string;
      };
      animate: {
        opacity: number;
        y: number;
        scale: number;
        filter: string;
      };
      exit: {
        opacity: number;
        y: number;
        scale: number;
        filter: string;
      };
      transition: { duration: number; ease: readonly [number, number, number, number] };
    };

/** خصائص انتقال الصفحة حسب `useAdaptiveMotion` */
export function usePageTransitionMotion(): PageTransitionMotion {
  const { prefersReduced, cinematic, pageBlurPx } = useAdaptiveMotion();

  if (prefersReduced) {
    return { reduced: true };
  }

  const blurIn = pageBlurPx > 0 ? `${pageBlurPx}px` : "0px";
  const blurOut =
    pageBlurPx > 0 ? `${Math.round(pageBlurPx * 0.65)}px` : "0px";
  return {
    reduced: false,
    initial: {
      opacity: 0,
      y: 12,
      scale: 0.994,
      filter: `blur(${blurIn})`,
    },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: {
      opacity: 0,
      y: -8,
      scale: 0.997,
      filter: `blur(${blurOut})`,
    },
    transition: {
      duration: cinematic ? duration.page : duration.short,
      ease: easeSpringy,
    },
  };
}

/** لمشاركة layoutId — عطّل عند تقليل الحركة */
export function useSharedLayoutId(baseId: string) {
  const { prefersReduced } = useAdaptiveMotion();
  return prefersReduced ? undefined : baseId;
}

/** اسم بديل مطابق لطلب واجهة الحركة الموحّدة */
export const usePageTransition = usePageTransitionMotion;
