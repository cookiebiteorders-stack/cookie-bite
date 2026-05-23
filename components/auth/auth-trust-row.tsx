import { Gift, ShieldCheck, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Encrypted sign-in" },
  { icon: Truck, label: "Track every order" },
  { icon: Gift, label: "Saved addresses" },
] as const;

export function AuthTrustRow({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        "grid grid-cols-3 gap-2 rounded-2xl border border-cb-border/90 bg-cb-brand-50/70 px-2 py-2.5 dark:border-cb-border dark:bg-cb-surface-2/90",
        className,
      )}
      aria-label="Account benefits"
    >
      {TRUST_ITEMS.map(({ icon: Icon, label }) => (
        <li key={label} className="flex flex-col items-center gap-1 text-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cb-brand-100 text-cb-brand-700 dark:bg-cb-brand-900/50 dark:text-cb-brand-200">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-[10px] font-semibold leading-tight text-cb-text-muted sm:text-[11px]">
            {label}
          </span>
        </li>
      ))}
    </ul>
  );
}
