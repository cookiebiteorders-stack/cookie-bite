"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { sharedLayoutTransition } from "@/lib/motion/presets";
import { useSharedLayoutId } from "@/lib/motion/hooks";

type Props = {
  productId: string;
  src: string;
  alt: string;
  sizes: string;
};

/** بطل صفحة المنتج — يطابق `layoutId` بطاقة المنتج في المتجر. */
export function PdpSharedHero({ productId, src, alt, sizes }: Props) {
  const layoutId = useSharedLayoutId(`product-photo-${productId}`);
  const inner = (
    <Image
      src={src}
      alt={alt}
      fill
      priority
      className="object-cover"
      sizes={sizes}
    />
  );

  if (!layoutId) {
    return (
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-cb-peach/40 shadow-lg ring-1 ring-cb-border lg:aspect-[4/5]">
        {inner}
      </div>
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      transition={sharedLayoutTransition}
      className="relative aspect-square overflow-hidden rounded-2xl bg-cb-peach/40 shadow-lg ring-1 ring-cb-border lg:aspect-[4/5]"
    >
      {inner}
    </motion.div>
  );
}
