interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}

const TONE: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  default: "bg-cb-surface-2 text-cb-text-strong",
  success:
    "bg-[color-mix(in_oklab,var(--cb-success)_14%,transparent)] text-[var(--cb-success)]",
  warning:
    "bg-[color-mix(in_oklab,var(--cb-warning)_16%,transparent)] text-[var(--cb-warning)]",
  danger:
    "bg-[color-mix(in_oklab,var(--cb-danger)_14%,transparent)] text-[var(--cb-danger)]",
  info: "bg-[color-mix(in_oklab,var(--cb-info)_14%,transparent)] text-[var(--cb-info)]",
};

export function KpiCard({ label, value, hint, tone = "default" }: KpiCardProps) {
  return (
    <article className="rounded-2xl border border-cb-border bg-cb-surface-elevated p-4 shadow-[var(--shadow-card)] cb-shadow-editorial">
      <p className="text-xs font-semibold uppercase tracking-wide text-cb-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-cb-text-strong">{value}</p>
      {hint ? (
        <span
          className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[tone]}`}
        >
          {hint}
        </span>
      ) : null}
    </article>
  );
}
