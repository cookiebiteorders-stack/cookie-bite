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
        "grid grid-cols-3 gap-2 rounded-2xl border border-cb-border/80 bg-cb-cream-2/60 px-2 py-2.5 dark:border-cb-border dark:bg-stone-900/50",
        className,
      )}
      aria-label="Account benefits"
    >
      {TRUST_ITEMS.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex flex-col items-center gap-1 text-center"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cb-peach/50 text-cb-terracotta-dark dark:bg-amber-950/50 dark:text-amber-300">
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
