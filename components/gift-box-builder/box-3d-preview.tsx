"use client";

import Image from "next/image";
import { useMemo } from "react";
import type { BuilderProduct } from "@/lib/gift-box-builder/data";
import { getBoxCloseProgress } from "@/lib/gift-box-builder/box-close";

const LID_TEXTURE = "/brand/gift-box/box-closed-ref.png";

type Box3DPreviewProps = {
  size: number;
  items: Record<string, number>;
  products: BuilderProduct[];
  totalItems: number;
  capacity: number;
  rotX?: number;
  rotY?: number;
  className?: string;
  emptyLabel?: string;
  closingLabel?: string;
};

function collectProductEmojis(
  items: Record<string, number>,
  products: BuilderProduct[],
  max: number,
): string[] {
  const emojis: string[] = [];
  for (const [id, qty] of Object.entries(items)) {
    const p = products.find((x) => x.id === id);
    if (!p) continue;
    for (let i = 0; i < qty; i++) emojis.push(p.emoji);
  }
  return emojis.slice(0, max);
}

export function Box3DPreview({
  size,
  items,
  products,
  totalItems,
  capacity,
  rotX = -22,
  rotY = 32,
  className = "gb-box3d",
  emptyLabel = "Add treats inside",
  closingLabel = "Closing your Cookie Bite box…",
}: Box3DPreviewProps) {
  const close = getBoxCloseProgress(totalItems, capacity);
  const emojis = useMemo(
    () => collectProductEmojis(items, products, 24),
    [items, products],
  );

  const w = Math.round(size * 0.88);
  const d = Math.round(size * 0.88);
  const h = Math.round(size * 0.38);
  const lidAngle = -92 + close * 92;
  const frontFlapAngle = -72 + close * 72;
  const earTuck = close * 1;

  const style = {
    "--cb-w": `${w}px`,
    "--cb-d": `${d}px`,
    "--cb-h": `${h}px`,
    "--cb-lid": `${lidAngle}deg`,
    "--cb-flap": `${frontFlapAngle}deg`,
    "--cb-close": String(close),
    "--cb-ear": String(earTuck),
    width: `${w}px`,
    height: `${h + w * 0.55}px`,
    transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
  } as React.CSSProperties;

  const hasItems = totalItems > 0;
  const isClosed = close >= 0.98;

  return (
    <div
      className={`${className} cb-mailer-scene${isClosed ? " cb-mailer-scene--closed" : ""}${hasItems ? " cb-mailer-scene--has-items" : ""}`}
      style={style}
      aria-hidden
    >
      <div className="cb-mailer">
        {/* Base walls */}
        <div className="cb-mailer__wall cb-mailer__wall--bottom" />
        <div className="cb-mailer__wall cb-mailer__wall--front">
          <div className="cb-mailer__front-brand">
            <span className="cb-mailer__mono">CB</span>
            <span className="cb-mailer__word">Cookie Bite</span>
          </div>
          <div className="cb-mailer__qr cb-mailer__qr--ig" title="Instagram">
            <span>IG</span>
          </div>
          <div className="cb-mailer__qr cb-mailer__qr--tt" title="TikTok">
            <span>TT</span>
          </div>
        </div>
        <div className="cb-mailer__wall cb-mailer__wall--back" />
        <div className="cb-mailer__wall cb-mailer__wall--left">
          <span className="cb-mailer__side-logo">CB</span>
        </div>
        <div className="cb-mailer__wall cb-mailer__wall--right">
          <span className="cb-mailer__side-logo">CB</span>
        </div>

        {/* Interior + products (visible when open) */}
        <div className="cb-mailer__interior">
          <div className="cb-mailer__products">
            {emojis.length === 0 ? (
              <span className="cb-mailer__empty-hint">{emptyLabel}</span>
            ) : (
              emojis.map((e, i) => (
                <span key={`${e}-${i}`} className="cb-mailer__prod-emoji">
                  {e}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Hinged lid */}
        <div className="cb-mailer__lid-wrap">
          <div className="cb-mailer__lid">
            <div className="cb-mailer__lid-top">
              <Image
                src={LID_TEXTURE}
                alt=""
                width={400}
                height={400}
                className="cb-mailer__lid-img"
                draggable={false}
                priority={size > 200}
              />
              <div className="cb-mailer__lid-overlay">
                <span className="cb-mailer__lid-ar">هتعدّل مزاج يومك</span>
                <span className="cb-mailer__lid-mono">CB</span>
                <span className="cb-mailer__lid-word">Cookie Bite</span>
              </div>
            </div>
            <div className="cb-mailer__lid-inner">
              <span className="cb-mailer__lid-inner-tag">Bite into Happiness</span>
              <span className="cb-mailer__lid-inner-bear">🧸</span>
            </div>
            <div className="cb-mailer__lid-ear cb-mailer__lid-ear--l" />
            <div className="cb-mailer__lid-ear cb-mailer__lid-ear--r" />
            <div className="cb-mailer__lid-flap" />
          </div>
        </div>
      </div>

      {close > 0.08 && close < 0.95 && (
        <span className="cb-mailer__status">{closingLabel}</span>
      )}
    </div>
  );
}

/** @deprecated — kept for any legacy imports */
export function buildBoxFacesHtml() {
  /* replaced by Cookie Bite mailer box */
}
