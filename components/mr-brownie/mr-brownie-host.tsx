"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const MrBrownieChat = dynamic(
  () => import("@/components/mr-brownie/mr-brownie-chat").then((m) => m.MrBrownieChat),
  { ssr: false },
);

/** مسارات فيها Mr. Brownie مضمّن في الصفحة — لا نعرض الـ FAB العائم فوقها */
const HIDE_FLOATING_PATHS = ["/gift-box/build"];

/**
 * يحمّل Mr. Brownie بعد idle — FAB والشات من مكوّن واحد لتجنّب اختفاء الزر عند الضغط.
 */
export function MrBrownieHost() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const hide = HIDE_FLOATING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    if (hide) return;
    void import("@/components/mr-brownie/mr-brownie-chat");
    const enable = () => setReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(enable, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(enable, 800);
    return () => window.clearTimeout(timer);
  }, [hide]);

  if (hide || !ready) return null;

  return <MrBrownieChat />;
}
