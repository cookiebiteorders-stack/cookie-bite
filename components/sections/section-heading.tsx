import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionAlign = "center" | "start" | "left";

type Props = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  /** @deprecated Use `"start"` — `"left"` is kept for backwards compatibility. */
  align?: SectionAlign;
  /** قاعدة ملوّنة + تباعد غير متماثل — إحساس تحريري */
  variant?: "default" | "editorial";
  className?: string;
};

function isStartAlign(align: SectionAlign): boolean {
  return align === "start" || align === "left";
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  variant = "default",
  className,
}: Props) {
  const editorial = variant === "editorial";
  const start = isStartAlign(align);
  const center = align === "center";

  return (
    <div
      className={cn(
        "mb-8 max-w-3xl space-y-4 md:mb-12",
        start ? "ms-0 me-auto" : "mx-auto",
        center && !editorial && "text-center",
        editorial && center && "max-w-4xl text-center",
        className,
        start && "text-start",
      )}
    >
      {eyebrow ? (
        <p
          className={cn(
            "text-xs font-bold uppercase tracking-[0.22em]",
            editorial ? "text-cb-terracotta" : "text-cb-terracotta-dark",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <div
        className={cn(
          "relative",
          editorial && center && "mx-auto max-w-2xl",
        )}
      >
        {editorial && start ? (
          <span
            className="absolute -start-1 top-2 hidden h-[0.65em] w-1 rounded-full bg-cb-mint md:block md:-start-4"
            aria-hidden
          />
        ) : null}
        <h2
          className={cn(
            "font-serif font-semibold text-cb-text-strong",
            editorial
              ? "text-[length:var(--fluid-heading-2)] leading-[1.12] md:leading-[1.08]"
              : "text-[clamp(1.5rem,2.2vw+1rem,2.25rem)] leading-tight sm:text-4xl",
          )}
        >
          {title}
        </h2>
      </div>
      {subtitle ? (
        <p
          className={cn(
            "max-w-[min(42rem,100%)] text-cb-text-muted",
            center && "mx-auto",
            start && "ms-0 me-auto",
            editorial
              ? "text-[length:var(--fluid-body)] leading-relaxed sm:text-lg"
              : "text-[length:var(--fluid-body)] sm:text-lg",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
