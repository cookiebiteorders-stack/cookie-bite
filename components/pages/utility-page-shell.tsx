import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { SectionHeading } from "@/components/sections/section-heading";
import { cn } from "@/lib/utils";

type UtilityPageShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  primaryAction?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  className?: string;
};

export function UtilityPageShell({
  eyebrow,
  title,
  subtitle,
  children,
  primaryAction,
  secondaryAction,
  className,
}: UtilityPageShellProps) {
  return (
    <div className={cn("bg-cb-cream pb-24 pt-12 dark:bg-background", className)}>
      <div className="mx-auto max-w-3xl px-4 lg:px-6">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
        />
        <div className="mt-10 space-y-6 text-sm leading-relaxed text-cb-text">{children}</div>
        {primaryAction || secondaryAction ? (
          <div className="mt-10 flex flex-wrap gap-3">
            {primaryAction ? (
              <Link
                href={primaryAction.href}
                className={buttonClassName("primary", "inline-flex rounded-full px-8")}
              >
                {primaryAction.label}
              </Link>
            ) : null}
            {secondaryAction ? (
              <Link
                href={secondaryAction.href}
                className={buttonClassName("outline", "inline-flex rounded-full px-8")}
              >
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
