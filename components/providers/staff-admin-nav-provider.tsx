"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@clerk/nextjs";
import type { AdminNavMenuItem } from "@/lib/admin/admin-nav-menu";

type StaffAdminNavContextValue = {
  items: AdminNavMenuItem[];
  ready: boolean;
};

const StaffAdminNavContext = createContext<StaffAdminNavContextValue>({
  items: [],
  ready: false,
});

export function StaffAdminNavProvider({ children }: { children: ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const [items, setItems] = useState<AdminNavMenuItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      queueMicrotask(() => {
        setItems([]);
        setReady(true);
      });
      return;
    }

    const ac = new AbortController();
    queueMicrotask(() => setReady(false));

    const loadNav = () => {
      fetch("/api/account/admin-nav", { signal: ac.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("admin-nav"))))
        .then((data: { items?: AdminNavMenuItem[] }) => {
          const next = Array.isArray(data.items) ? data.items : [];
          const safe = next.filter(
            (x): x is AdminNavMenuItem =>
              Boolean(x) &&
              typeof x.href === "string" &&
              typeof (x as AdminNavMenuItem).module === "string" &&
              typeof (x as AdminNavMenuItem).navKey === "string",
          );
          setItems(safe);
        })
        .catch(() => {
          if (!ac.signal.aborted) setItems([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setReady(true);
        });
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(loadNav, { timeout: 6000 });
      return () => {
        ac.abort();
        window.cancelIdleCallback(idleId);
      };
    }

    const timer = window.setTimeout(loadNav, 1200);
    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [isLoaded, userId]);

  const value = useMemo(() => ({ items, ready }), [items, ready]);

  return (
    <StaffAdminNavContext.Provider value={value}>{children}</StaffAdminNavContext.Provider>
  );
}

export function useStaffAdminNav() {
  return useContext(StaffAdminNavContext);
}
