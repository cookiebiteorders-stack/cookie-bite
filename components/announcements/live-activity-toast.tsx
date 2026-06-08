"use client";

import { motion, AnimatePresence } from "motion/react";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

type Activity = {
  id: string;
  city: string;
  minutesAgo: number;
};

export function LiveActivityToast() {
  const { t } = useLanguage();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/announcements/activity")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { activities?: Activity[] } | null) => {
        const items = data?.activities ?? [];
        if (items.length) {
          setActivities(items);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activities.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % activities.length);
    }, 12_000);
    return () => window.clearInterval(timer);
  }, [activities.length]);

  const current = activities[index];
  if (!current || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          "pointer-events-none fixed z-[40] max-w-[18rem]",
          "bottom-[calc(5.5rem+env(safe-area-inset-bottom))] start-4",
          "md:bottom-6 md:start-6",
        )}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-2 rounded-2xl border border-cb-border/50 bg-cb-surface/95 px-3 py-2.5 text-xs shadow-lg backdrop-blur-sm">
          <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0 text-cb-terracotta-dark" aria-hidden />
          <p className="text-cb-text">
            {t("announcements.liveActivity", {
              city: current.city,
              minutes: current.minutesAgo,
            })}
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
