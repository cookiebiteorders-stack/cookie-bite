"use client";

import { useEffect, useRef } from "react";
import { GIFT_BOX_BUILDER_DATA } from "@/lib/gift-box-builder/data";
import type { BuilderProduct } from "@/lib/gift-box-builder/data";

function darken(hex: string, amt: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return `rgb(${r},${g},${b})`;
}

type Box3DPreviewProps = {
  size: number;
  wrapStyleId: string;
  ribbonColorId: string;
  items: Record<string, number>;
  products: BuilderProduct[];
  rotX?: number;
  rotY?: number;
  className?: string;
  isLid?: boolean;
};

export function buildBoxFacesHtml(
  el: HTMLElement,
  opts: Omit<Box3DPreviewProps, "className" | "rotX" | "rotY">,
) {
  const { size, wrapStyleId, ribbonColorId, items, products, isLid = false } = opts;
  const S = size;
  const H = isLid ? S * 0.25 : S;
  const wrap = GIFT_BOX_BUILDER_DATA.wrapStyles.find((w) => w.id === wrapStyleId);
  const ribbon = GIFT_BOX_BUILDER_DATA.ribbonColors.find((r) => r.id === ribbonColorId);
  const col = wrap?.color ?? "#C8935A";
  const rc = ribbon?.hex ?? "#C9972A";

  const emojis: string[] = [];
  for (const [id, qty] of Object.entries(items)) {
    const p = products.find((x) => x.id === id);
    if (p) for (let i = 0; i < qty; i++) emojis.push(p.emoji);
  }

  const faces = [
    { name: "front", w: S, h: H, t: `translateZ(${S / 2}px)`, bg: col },
    { name: "back", w: S, h: H, t: `rotateY(180deg) translateZ(${S / 2}px)`, bg: darken(col, 20) },
    { name: "left", w: S, h: H, t: `rotateY(-90deg) translateZ(${S / 2}px)`, bg: darken(col, 10) },
    { name: "right", w: S, h: H, t: `rotateY(90deg) translateZ(${S / 2}px)`, bg: darken(col, 10) },
    {
      name: "top",
      w: S,
      h: S,
      t: `rotateX(90deg) translateZ(${H / 2}px)`,
      bg: isLid ? darken(col, 5) : darken(col, 30),
    },
    {
      name: "bottom",
      w: S,
      h: S,
      t: `rotateX(-90deg) translateZ(${isLid ? 0 : H / 2}px)`,
      bg: darken(col, 30),
    },
  ];

  el.innerHTML = faces
    .map((f) => {
      const isTop = f.name === "top";
      const isFront = f.name === "front";
      const inner =
        isTop && !isLid && emojis.length
          ? `<div style="position:absolute;inset:0;display:flex;flex-wrap:wrap;gap:4px;padding:8px;align-content:flex-start;font-size:${S > 200 ? 24 : 14}px">${emojis
              .slice(0, 20)
              .map((e) => `<span>${e}</span>`)
              .join("")}</div>`
          : isFront
            ? `<div style="width:6px;height:100%;background:${rc};position:absolute;left:50%;transform:translateX(-50%)"></div>`
            : "";
      return `<div class="gb-face" style="width:${f.w}px;height:${f.h}px;background:${f.bg};transform:${f.t};left:${(S - f.w) / 2}px;top:${(H - f.h) / 2}px;position:absolute">${inner}</div>`;
    })
    .join("");

  el.insertAdjacentHTML(
    "beforeend",
    `<div style="position:absolute;inset:0;pointer-events:none;z-index:11">
      <div style="position:absolute;width:100%;height:6px;top:50%;transform:translateY(-50%);background:${rc}"></div>
      <div style="position:absolute;width:6px;height:100%;left:50%;transform:translateX(-50%);background:${rc}"></div>
    </div>`,
  );
}

export function Box3DPreview({
  size,
  wrapStyleId,
  ribbonColorId,
  items,
  products,
  rotX = -20,
  rotY = 30,
  className = "gb-box3d",
}: Box3DPreviewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    buildBoxFacesHtml(el, { size, wrapStyleId, ribbonColorId, items, products });
    el.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }, [size, wrapStyleId, ribbonColorId, items, products, rotX, rotY]);

  return <div ref={ref} className={className} style={{ transformStyle: "preserve-3d" }} />;
}
