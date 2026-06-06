"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { scrollToAccountSection } from "@/lib/account/scroll-to-section";

type Props = ComponentProps<typeof Link>;

function resolveAccountHash(href: Props["href"]): string | null {
  if (typeof href === "string") {
    const hashIndex = href.indexOf("#");
    if (hashIndex === -1) return null;
    const path = href.slice(0, hashIndex) || "/account";
    if (path !== "/account") return null;
    return href.slice(hashIndex);
  }
  if (href && typeof href === "object") {
    const path = href.pathname ?? "/account";
    if (path !== "/account") return null;
    if (!href.hash) return null;
    return href.hash.startsWith("#") ? href.hash : `#${href.hash}`;
  }
  return null;
}

/** Hash-aware link for `/account#…` — scrolls in-page; cross-route links use normal navigation. */
export function AccountSectionLink({ href, onClick, ...rest }: Props) {
  const pathname = usePathname();

  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;

        const hash = resolveAccountHash(href);
        if (!hash) return;
        if (pathname !== "/account") return;

        e.preventDefault();
        scrollToAccountSection(hash);
      }}
      {...rest}
    />
  );
}
