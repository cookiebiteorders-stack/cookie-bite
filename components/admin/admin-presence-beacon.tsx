"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const HEARTBEAT_MS = 30_000;

async function sendPresence(path: string) {
  try {
    await fetch("/api/admin/presence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    });
  } catch {
    // best-effort heartbeat
  }
}

/** Keeps owner/admin/staff presence fresh while the admin console is open. */
export function AdminPresenceBeacon() {
  const pathname = usePathname() ?? "/admin";
  const lastPath = useRef(pathname);

  useEffect(() => {
    lastPath.current = pathname;
    void sendPresence(pathname);
  }, [pathname]);

  useEffect(() => {
    const tick = () => {
      void sendPresence(lastPath.current);
    };
    const id = setInterval(tick, HEARTBEAT_MS);
    const onHide = () => {
      if (document.visibilityState === "hidden") tick();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  return null;
}
