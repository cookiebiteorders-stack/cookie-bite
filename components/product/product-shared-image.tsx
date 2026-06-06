"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { sharedLayoutTransition } from "@/lib/motion/presets";
import { useSharedLayoutId } from "@/lib/motion/hooks";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** false على شبكات المتجر — يتجنّب motion لكل بطاقة */
  sharedLayout?: boolean;
  className?: string;
  imgClassName?: string;
};

/** صورة منتج مع `layoutId` ثابت للانتقال المشترك إلى صفحة المنتج. */
export function ProductSharedImage({
  productId,
  src,
  alt,
  sizes,
  priority,
  sharedLayout = true,
  className,
  imgClassName,
}: Props) {
  const layoutIdRaw = useSharedLayoutId(`product-photo-${productId}`);
  const layoutId = sharedLayout ? layoutIdRaw : null;
  const inner = (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      fetchPriority={priority ? "high" : undefined}
      loading={priority ? undefined : "lazy"}
      decoding="async"
      className={cn("object-cover", imgClassName)}
    />
  );

  if (!layoutId) {
    return (
      <div className={cn("relative h-full w-full rounded-2xl", className)}>
        {inner}
      </div>
    );
  }

  return (
    <motion.div
      layoutId={layoutId}
      transition={sharedLayoutTransition}
      className={cn("relative h-full w-full rounded-2xl", className)}
    >
      {inner}
    </motion.div>
  );
}
