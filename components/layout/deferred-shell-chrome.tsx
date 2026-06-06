"use client";

import type { ReactNode } from "react";
import { useDeferredReady } from "@/lib/hooks/use-deferred-ready";

/** يؤجّل FAB والدرج والبوت حتى التفاعل أو idle — لا يحجب TTI. */
export function DeferredShellChrome({ children }: { children: ReactNode }) {
  const ready = useDeferredReady();
  if (!ready) return null;
  return children;
}
