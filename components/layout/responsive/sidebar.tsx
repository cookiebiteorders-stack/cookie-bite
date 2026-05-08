"use client";

import { usePathname } from "next/navigation";
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLayout } from "@/context/layout-context";
import { SidebarItem } from "@/components/layout/responsive/sidebar-item";

const NAV_LINKS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Analytics", href: "/blog", icon: BarChart2 },
  { label: "Projects", href: "/shop", icon: FolderKanban },
  { label: "Team", href: "/our-story", icon: Users },
  { label: "Settings", href: "/account", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isMdSidebarOpen,
    closeMdSidebar,
  } = useLayout();

  return (
    <>
      <aside
        className={`hidden border-r border-cb-border bg-cb-surface transition-[width] duration-300 lg:block ${
          isSidebarCollapsed ? "w-16" : "w-60"
        }`}
      >
        <nav className="flex h-full flex-col p-2" aria-label="Sidebar navigation">
          <div className="space-y-1">
            {NAV_LINKS.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                collapsed={isSidebarCollapsed}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="mt-auto inline-flex h-10 items-center justify-center rounded-lg border border-cb-border text-cb-text-strong hover:bg-cb-surface-elevated"
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </nav>
      </aside>

      <AnimatePresence>
        {isMdSidebarOpen ? (
          <motion.div
            className="fixed inset-0 z-[75] hidden md:block lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close sidebar overlay"
              className="absolute inset-0 bg-cb-scrim-soft"
              onClick={closeMdSidebar}
            />
            <motion.aside
              className="absolute left-0 top-0 h-full w-64 border-r border-cb-border bg-cb-surface p-3"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <nav className="space-y-1" aria-label="Tablet sidebar navigation">
                {NAV_LINKS.map((item) => (
                  <SidebarItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                    collapsed={false}
                  />
                ))}
              </nav>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

