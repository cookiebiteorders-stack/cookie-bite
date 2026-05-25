"use client";

import { useAuth } from "@clerk/nextjs";
import { Smartphone, Share, X } from "lucide-react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { easeSoft } from "@/lib/motion/presets";
import {
  detectInstallPlatform,
  dismissInstallPrompt,
  markInstallPromptShownThisSession,
  shouldOfferInstallPrompt,
  type InstallPlatform,
} from "@/lib/pwa/install-prompt";
import { useBeforeInstallPrompt } from "@/lib/pwa/use-before-install-prompt";
import { cn } from "@/lib/utils";

export function AddToHomeScreenPrompt() {
  const { isLoaded, isSignedIn } = useAuth();
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform | null>(null);
  const [installing, setInstalling] = useState(false);
  const prevSignedIn = useRef<boolean | null>(null);

  const { canNativeInstall, promptInstall } = useBeforeInstallPrompt(
    open && platform === "android",
  );

  const close = useCallback((dismissPermanent = false) => {
    setOpen(false);
    if (dismissPermanent) dismissInstallPrompt();
  }, []);

  const showPrompt = useCallback(() => {
    const detected = detectInstallPlatform();
    if (!detected || !shouldOfferInstallPrompt()) return;
    setPlatform(detected);
    markInstallPromptShownThisSession();
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (prevSignedIn.current === null) {
      prevSignedIn.current = isSignedIn;
      return;
    }
    if (!prevSignedIn.current && isSignedIn) {
      showPrompt();
    }
    prevSignedIn.current = isSignedIn;
  }, [isLoaded, isSignedIn, showPrompt]);

  const onAddClick = async () => {
    if (platform === "android" && canNativeInstall) {
      setInstalling(true);
      try {
        const accepted = await promptInstall();
        if (accepted) dismissInstallPrompt();
      } finally {
        setInstalling(false);
        setOpen(false);
      }
      return;
    }
    close(true);
  };

  const isRtl = lang === "ar";
  const showManualSteps =
    platform === "ios" || (platform === "android" && !canNativeInstall);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="pwa-install-prompt"
          className="fixed inset-0 z-[65] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: easeSoft }}
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#3D2814]/40 backdrop-blur-[2px]"
            aria-label={t("pwaInstall.close")}
            onClick={() => close(true)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-install-title"
            aria-describedby="pwa-install-desc"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: easeSoft }}
            className={cn(
              "relative z-[1] w-full max-w-md overflow-hidden rounded-3xl border border-cb-peach-deep/50 bg-cb-surface shadow-[var(--shadow-pl-card)]",
              isRtl ? "text-end" : "text-start",
            )}
          >
            <button
              type="button"
              onClick={() => close(true)}
              className="absolute end-3 top-3 rounded-full p-2 text-cb-text-muted transition hover:bg-cb-surface-2"
              aria-label={t("pwaInstall.close")}
            >
              <X className="size-5" aria-hidden />
            </button>

            <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-8">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-cb-surface-2 shadow-inner">
                <Image
                  src="/brand/cookie-bite-icon.png"
                  alt=""
                  width={48}
                  height={48}
                  className="size-12 rounded-xl"
                />
              </div>
              <div className="space-y-2 text-center">
                <h2
                  id="pwa-install-title"
                  className="font-display text-xl font-bold text-cb-text-strong"
                >
                  {t("pwaInstall.title")}
                </h2>
                <p id="pwa-install-desc" className="text-sm leading-relaxed text-cb-text-muted">
                  {t("pwaInstall.description")}
                </p>
              </div>

              {showManualSteps ? (
                <ol
                  className={cn(
                    "w-full space-y-2 rounded-2xl bg-cb-surface-2/80 px-4 py-3 text-sm text-cb-text-strong",
                    "list-inside list-decimal",
                  )}
                >
                  <li className="flex items-start gap-2">
                    <Share className="mt-0.5 size-4 shrink-0 text-cb-terracotta" aria-hidden />
                    <span>
                      {platform === "android"
                        ? t("pwaInstall.androidMenuStep1")
                        : t("pwaInstall.iosStep1")}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Smartphone className="mt-0.5 size-4 shrink-0 text-cb-terracotta" aria-hidden />
                    <span>
                      {platform === "android"
                        ? t("pwaInstall.androidMenuStep2")
                        : t("pwaInstall.iosStep2")}
                    </span>
                  </li>
                </ol>
              ) : null}

              <div className="flex w-full flex-col gap-2 sm:flex-row-reverse sm:justify-center">
                <Button
                  type="button"
                  className="w-full sm:min-w-[10rem]"
                  disabled={installing}
                  onClick={() => void onAddClick()}
                >
                  {installing
                    ? t("pwaInstall.installing")
                    : platform === "android" && canNativeInstall
                      ? t("pwaInstall.addAndroid")
                      : platform === "ios"
                        ? t("pwaInstall.gotIt")
                        : t("pwaInstall.addAndroid")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full sm:min-w-[8rem]"
                  onClick={() => close(true)}
                >
                  {t("pwaInstall.notNow")}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
