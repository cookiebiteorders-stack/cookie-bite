"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
};

export function SidebarItem({ href, label, icon: Icon, active, collapsed }: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-[48px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-cb-text transition",
        "before:absolute before:left-0 before:top-1/2 before:h-0 before:w-0.5 before:-translate-y-1/2 before:bg-cb-terracotta-dark before:transition-all group-hover:before:h-6",
        active && "bg-cb-peach/60 text-cb-text-strong before:h-7",
        collapsed && "justify-center px-2",
      )}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  );
}

