import { cn } from "@/lib/utils";

/** ألوان شارات الإدارة — تباين عالٍ على خلفية فاتحة (لا تعتمد على dark: التلقائي). */
export type AdminBadgeTone =
  | "success"
  | "info"
  | "warning"
  | "neutral"
  | "danger"
  | "brand"
  | "code";

const toneClass: Record<AdminBadgeTone, string> = {
  success:
    "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/90 dark:!bg-emerald-50 dark:!text-emerald-900",
  info: "bg-sky-50 text-sky-950 ring-1 ring-sky-200/90 dark:!bg-sky-50 dark:!text-sky-950",
  warning:
    "bg-amber-50 text-amber-950 ring-1 ring-amber-200/90 dark:!bg-amber-50 dark:!text-amber-950",
  neutral:
    "bg-cb-cream text-stone-800 ring-1 ring-cb-border dark:!bg-cb-cream dark:!text-stone-800",
  danger:
    "bg-rose-50 text-rose-950 ring-1 ring-rose-200/90 dark:!bg-rose-50 dark:!text-rose-950",
  brand:
    "bg-cb-peach/70 text-cb-terracotta-dark ring-1 ring-cb-border dark:!bg-cb-peach/70 dark:!text-cb-terracotta-dark",
  code: "bg-white text-stone-900 ring-1 ring-cb-border font-mono dark:!bg-white dark:!text-stone-900",
};

type AdminBadgeProps = {
  tone?: AdminBadgeTone;
  children: React.ReactNode;
  className?: string;
  as?: "span" | "p";
};

export function AdminBadge({
  tone = "neutral",
  children,
  className,
  as: Tag = "span",
}: AdminBadgeProps) {
  return (
    <Tag
      data-admin-badge={tone}
      className={cn(
        "inline-flex max-w-full items-center rounded-lg px-2.5 py-1 text-[11px] font-bold leading-snug",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** زر شارة للمتغيرات القابلة للنقر */
export function AdminBadgeButton({
  tone = "code",
  children,
  className,
  ...props
}: AdminBadgeProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      data-admin-badge={tone}
      className={cn(
        "inline-flex items-center rounded-lg px-2 py-0.5 font-mono text-[10px] font-bold leading-snug transition",
        "hover:ring-2 hover:ring-cb-terracotta/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cb-terracotta",
        toneClass[tone],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** تبويب قناة / لغة */
export function adminTabClass(active: boolean) {
  return cn(
    "w-full rounded-xl border px-3 py-2 text-left text-sm font-bold transition",
    active
      ? "border-cb-terracotta bg-cb-terracotta-dark text-white shadow-sm dark:!border-cb-terracotta dark:!bg-cb-terracotta-dark dark:!text-white"
      : "border-cb-border bg-white text-stone-800 hover:bg-cb-cream dark:!border-cb-border dark:!bg-white dark:!text-stone-800",
  );
}

export function adminPillClass(active: boolean) {
  return cn(
    "rounded-full px-3 py-1 text-xs font-bold transition",
    active
      ? "bg-cb-terracotta-dark text-white dark:!bg-cb-terracotta-dark dark:!text-white"
      : "border border-cb-border bg-white text-stone-800 hover:bg-cb-cream dark:!border-cb-border dark:!bg-white dark:!text-stone-800",
  );
}
