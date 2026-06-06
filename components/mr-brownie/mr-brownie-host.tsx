"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MrBrownieChat = dynamic(
  () => import("@/components/mr-brownie/mr-brownie-chat").then((m) => m.MrBrownieChat),
  { ssr: false },
);

const MR_BROWNIE_MASCOT_SRC = "/brand/mr-brownie-mascot.png";

/** مسارات فيها Mr. Brownie مضمّن في الصفحة — لا نعرض الـ FAB العائم فوقها */
const HIDE_FLOATING_PATHS = ["/gift-box/build"];

function LaunchFab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      data-mr-brownie-launch
      aria-label="Open Mr. Brownie assistant"
      onClick={onClick}
      className={cn(
        "cb-mr-brownie-fab fixed z-[90] flex h-[68px] w-[68px] cursor-pointer items-center justify-center rounded-full bg-transparent p-0 shadow-lg sm:h-[92px] sm:w-[92px]",
        "end-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] sm:end-6 sm:bottom-8",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cb-focus",
      )}
    >
      <Image
        src={MR_BROWNIE_MASCOT_SRC}
        alt=""
        width={92}
        height={92}
        className="h-full w-full object-contain"
        priority={false}
        loading="lazy"
      />
    </button>
  );
}

export function MrBrownieHost() {
  const pathname = usePathname();
  const [activated, setActivated] = useState(false);
  const [initialOpen, setInitialOpen] = useState(false);
  const [fabReady, setFabReady] = useState(false);

  const hide = HIDE_FLOATING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  useEffect(() => {
    const enable = () => setFabReady(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(enable, { timeout: 12_000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(enable, 5000);
    return () => window.clearTimeout(timer);
  }, []);

  const handleLaunch = useCallback(() => {
    setInitialOpen(true);
    setActivated(true);
  }, []);

  if (hide) return null;

  return (
    <>
      {!activated && fabReady ? <LaunchFab onClick={handleLaunch} /> : null}
      {activated && (
        <MrBrownieChat initialOpen={initialOpen} />
      )}
    </>
  );
}
