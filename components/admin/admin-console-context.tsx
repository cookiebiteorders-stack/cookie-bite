"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { AdminConsoleNavItem } from "@/lib/admin/admin-console-nav";
import type { UserRole } from "@/lib/admin/rbac";

export type AdminConsoleContextValue = {
  role: UserRole;
  navItems: AdminConsoleNavItem[];
  adminNavOpen: boolean;
  setAdminNavOpen: (open: boolean) => void;
};

const AdminConsoleContext = createContext<AdminConsoleContextValue | null>(null);

type ProviderProps = {
  role: UserRole;
  navItems: AdminConsoleNavItem[];
  children: ReactNode;
};

export function AdminConsoleProvider({ role, navItems, children }: ProviderProps) {
  const pathname = usePathname();
  const [adminNavOpen, setAdminNavOpenState] = useState(false);

  const setAdminNavOpen = useCallback((open: boolean) => {
    setAdminNavOpenState(open);
  }, []);

  useEffect(() => {
    queueMicrotask(() => setAdminNavOpenState(false));
  }, [pathname]);

  const value = useMemo(
    () => ({ role, navItems, adminNavOpen, setAdminNavOpen }),
    [role, navItems, adminNavOpen, setAdminNavOpen],
  );

  return <AdminConsoleContext.Provider value={value}>{children}</AdminConsoleContext.Provider>;
}

export function useOptionalAdminConsole() {
  return useContext(AdminConsoleContext);
}
