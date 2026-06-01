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

type BoxProductVisual = { imageUrl: string };

function collectProductVisuals(
  items: Record<string, number>,
  products: BuilderProduct[],
  max: number,
): BoxProductVisual[] {
  const visuals: BoxProductVisual[] = [];
  for (const [id, qty] of Object.entries(items)) {
    const p = products.find((x) => x.id === id);
    if (!p) continue;
    for (let i = 0; i < qty; i++) visuals.push({ imageUrl: p.imageUrl });
  }
  return visuals.slice(0, max);
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
  const visuals = useMemo(
    () => collectProductVisuals(items, products, 20),
    [items, products],
  );

  const w = Math.round(size * 0.9);
  const d = Math.round(size * 0.72);
  const h = Math.round(size * 0.42);
  const lidOpenDeg = -88 + close * 88;

  const vars = {
    "--cb-w": `${w}px`,
    "--cb-d": `${d}px`,
    "--cb-h": `${h}px`,
    "--cb-lid": `${lidOpenDeg}deg`,
    "--cb-close": String(close),
  } as React.CSSProperties;

  const sceneStyle = {
    ...vars,
    transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`,
  } as React.CSSProperties;

  return (
    <div
      className={`${className} cb-mailer-scene${close >= 0.98 ? " cb-mailer-scene--closed" : ""}`}
      style={sceneStyle}
      aria-hidden
    >
      <div className="cb-mailer-cube">
        <div className="cb-face cb-face--front">
          <div className="cb-face__brand">
            <span className="cb-face__mono">CB</span>
            <span className="cb-face__word">Cookie Bite</span>
          </div>
          <span className="cb-face__qr">IG</span>
          <span className="cb-face__qr">TT</span>
        </div>
        <div className="cb-face cb-face--back" />
        <div className="cb-face cb-face--left">
          <span className="cb-face__side-mark">CB</span>
        </div>
        <div className="cb-face cb-face--right">
          <span className="cb-face__side-mark">CB</span>
        </div>
        <div className="cb-face cb-face--bottom" />

        <div className="cb-face cb-face--floor">
          <div className="cb-face__floor-inner">
            {visuals.length === 0 ? (
              <span className="cb-face__empty">{emptyLabel}</span>
            ) : (
              visuals.map((v, i) => (
                <span key={`${v.imageUrl}-${i}`} className="cb-face__prod">
                  <Image
                    src={v.imageUrl}
                    alt=""
                    width={28}
                    height={28}
                    className="cb-face__prod-img"
                  />
                </span>
              ))
            )}
          </div>
        </div>

        <div className="cb-lid-hinge">
          <div className="cb-lid">
            <div className="cb-lid__top">
              <Image
                src={LID_TEXTURE}
                alt=""
                width={320}
                height={320}
                className="cb-lid__photo"
                draggable={false}
              />
              <div className="cb-lid__gold">
                <span className="cb-lid__mono">CB</span>
                <span className="cb-lid__word">Cookie Bite</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {close > 0.08 && close < 0.95 && (
        <span className="cb-mailer__status">{closingLabel}</span>
      )}
    </div>
  );
}

/** @deprecated */
export function buildBoxFacesHtml() {
  /* replaced by Cookie Bite mailer box */
}
