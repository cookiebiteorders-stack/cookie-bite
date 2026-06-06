"use client";

import dynamic from "next/dynamic";
import { LayoutGroup } from "motion/react";

const PageTransition = dynamic(
  () => import("@/components/motion/page-transition").then((m) => m.PageTransition),
  { ssr: true },
);

export function StorefrontMotionShellInner({ children }: { children: React.ReactNode }) {
  return (
    <LayoutGroup id="storefront-shared">
      <PageTransition>{children}</PageTransition>
    </LayoutGroup>
  );
}
