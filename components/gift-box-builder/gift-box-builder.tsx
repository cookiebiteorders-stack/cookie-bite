"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/components/providers/language-provider";
import { Box3DPreview } from "@/components/gift-box-builder/box-3d-preview";
import "./gift-box-builder.css";
import {
  GIFT_BOX_BUILDER_DATA,
  boxIdToApiSize,
  type BuilderProduct,
} from "@/lib/gift-box-builder/data";
import { loadBuilderProducts } from "@/lib/gift-box-builder/load-products";
import {
  DEFAULT_GIFT_BOX_STATE,
  GIFT_BOX_STORAGE_KEY,
  type GiftBoxBuilderState,
} from "@/lib/gift-box-builder/types";
import {
  buildGiftMessagePayload,
  findNextLargerBox,
  formatBuilderPrice,
  getBoxCapacity,
  getGrandTotal,
  getItemsTotal,
  getTotalItems,
  trimItemsToCapacity,
} from "@/lib/gift-box-builder/utils";

function loadStoredState(): GiftBoxBuilderState {
  if (typeof window === "undefined") return { ...DEFAULT_GIFT_BOX_STATE };
  try {
    const saved = localStorage.getItem(GIFT_BOX_STORAGE_KEY);
    if (saved) return { ...DEFAULT_GIFT_BOX_STATE, ...JSON.parse(saved) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_GIFT_BOX_STATE };
}

export function GiftBoxBuilder() {
  const { t } = useLanguage();
  const [state, setState] = useState<GiftBoxBuilderState>(loadStoredState);
  const [products, setProducts] = useState<BuilderProduct[]>([
    ...GIFT_BOX_BUILDER_DATA.products,
  ]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [boxRotX, setBoxRotX] = useState(-20);
  const [boxRotY, setBoxRotY] = useState(30);
  const [dragging, setDragging] = useState(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBuilderProducts().then(setProducts);
  }, []);

  const saveState = useCallback((next: GiftBoxBuilderState) => {
    setState(next);
    try {
      localStorage.setItem(GIFT_BOX_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const patch = useCallback(
    (partial: Partial<GiftBoxBuilderState>) => {
      saveState({ ...state, ...partial });
    },
    [state, saveState],
  );

  const cap = getBoxCapacity(state.box);
  const totalItems = getTotalItems(state.items);
  const grandTotal = getGrandTotal(state, products);

  const validateStep = (step: number) => {
    if (step === 1 && !state.box) {
      alert(t("pages.giftBoxBuilder.errBox"));
      return false;
    }
    if ((step === 2 || step === 5) && totalItems === 0) {
      alert(t("pages.giftBoxBuilder.errItems"));
      return false;
    }
    return true;
  };

  const goToStep = (n: number) => {
    if (n > state.currentStep + 1) return;
    patch({ currentStep: n });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const nextStep = () => {
    if (!validateStep(state.currentStep)) return;
    if (state.currentStep === 5) {
      void placeOrder();
      return;
    }
    patch({ currentStep: state.currentStep + 1 });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    if (state.currentStep <= 1) return;
    patch({ currentStep: state.currentStep - 1 });
  };

  const selectBox = (id: string) => {
    const newBox = GIFT_BOX_BUILDER_DATA.boxes.find((b) => b.id === id);
    if (!newBox) return;
    const total = getTotalItems(state.items);
    if (total > newBox.capacity) {
      if (
        !confirm(
          t("pages.giftBoxBuilder.trimConfirm")
            .replace("{cap}", String(newBox.capacity))
            .replace("{total}", String(total)),
        )
      ) {
        return;
      }
      patch({ box: id, items: trimItemsToCapacity(state.items, newBox.capacity) });
      return;
    }
    patch({ box: id });
  };

  const changeQty = (productId: string, delta: number) => {
    const current = state.items[productId] || 0;
    const total = getTotalItems(state.items);
    if (delta > 0 && total >= cap) {
      const bigger = findNextLargerBox(state.box);
      if (
        bigger &&
        bigger.id !== state.box &&
        confirm(
          t("pages.giftBoxBuilder.upsellConfirm")
            .replace("{name}", bigger.name)
            .replace("{cap}", String(bigger.capacity))
            .replace("{price}", formatBuilderPrice(bigger.basePrice)),
        )
      ) {
        selectBox(bigger.id);
      }
      return;
    }
    const newQty = Math.max(0, current + delta);
    const items = { ...state.items };
    if (newQty === 0) delete items[productId];
    else items[productId] = newQty;
    patch({ items });
  };

  const launchConfetti = () => {
    const wrap = confettiRef.current;
    if (!wrap) return;
    wrap.classList.add("show");
    wrap.innerHTML = "";
    const colors = ["#C9972A", "#F5D6C2", "#8BAF8B", "#A0633A", "#E8C56A", "#3B1F0E"];
    for (let i = 0; i < 80; i++) {
      const c = document.createElement("div");
      c.style.cssText = `position:absolute;top:-20px;left:${Math.random() * 100}vw;width:${6 + Math.random() * 10}px;height:${6 + Math.random() * 12}px;background:${colors[Math.floor(Math.random() * colors.length)]};border-radius:${Math.random() > 0.5 ? "50%" : "2px"};animation:gbFall ${1.5 + Math.random() * 2}s linear ${Math.random() * 1.2}s forwards`;
      wrap.appendChild(c);
    }
    setTimeout(() => wrap.classList.remove("show"), 4000);
  };

  const placeOrder = async () => {
    if (!validateStep(5)) return;
    setOrdering(true);
    launchConfetti();

    const apiItems = Object.entries(state.items)
      .map(([id, quantity]) => {
        const p = products.find((x) => x.id === id);
        if (!p?.productUuid) return null;
        return { product_id: p.productUuid, quantity };
      })
      .filter(Boolean) as { product_id: string; quantity: number }[];

    if (apiItems.length > 0 && state.box) {
      try {
        const res = await fetch("/api/gift-box", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            box_size: boxIdToApiSize(state.box),
            items: apiItems,
            gift_message: buildGiftMessagePayload(state),
            ribbon_color: state.ribbonColor,
            has_wrapping: state.wrapStyle !== "transparent",
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { gift_box?: { id: string } };
          if (json.gift_box?.id) {
            await fetch(`/api/gift-box/${json.gift_box.id}/add-to-cart`, {
              method: "POST",
            });
          }
        }
      } catch {
        /* demo success still shown */
      }
    }

    setTimeout(() => {
      setOrdering(false);
      setShowSuccess(true);
      patch({ currentStep: 6 });
    }, 800);
  };

  const startOver = () => {
    localStorage.removeItem(GIFT_BOX_STORAGE_KEY);
    setState({ ...DEFAULT_GIFT_BOX_STATE });
    setShowSuccess(false);
    setBoxRotX(-20);
    setBoxRotY(30);
  };

  const filteredProducts = useMemo(() => {
    if (state.activeFilter === "All") return products;
    return products.filter((p) => p.category === state.activeFilter);
  }, [products, state.activeFilter]);

  const capPct = cap ? Math.min(100, (totalItems / cap) * 100) : 0;

  const stepLabels = [
    t("pages.giftBoxBuilder.step1Label"),
    t("pages.giftBoxBuilder.step2Label"),
    t("pages.giftBoxBuilder.step3Label"),
    t("pages.giftBoxBuilder.step4Label"),
    t("pages.giftBoxBuilder.step5Label"),
  ];

  return (
    <div className="gift-box-builder">
      <style>{`@keyframes gbFall { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`}</style>

      <header className="gb-header">
        <Link href="/" className="gb-logo">
          Cookie<span> Bite</span>
        </Link>
        <span className="gb-header-tag">{t("pages.giftBoxBuilder.tag")}</span>
      </header>

      {!showSuccess && (
        <nav className="gb-progress-bar" aria-label={t("pages.giftBoxBuilder.progressAria")}>
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const cls = [
              "gb-step-tab",
              n === state.currentStep ? "active" : "",
              n < state.currentStep ? "done" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={n}
                type="button"
                className={cls}
                onClick={() => goToStep(n)}
                aria-current={n === state.currentStep ? "step" : undefined}
              >
                <span className="gb-step-num">{n}</span>
                <span className="gb-step-label">{label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <div className="gb-layout">
        <main className="gb-main">
          {!showSuccess && state.currentStep === 1 && (
            <div className="gb-step-panel active">
              <h2 className="gb-step-title">{t("pages.giftBoxBuilder.s1Title")}</h2>
              <p className="gb-step-sub">{t("pages.giftBoxBuilder.s1Sub")}</p>
              <div className="gb-box-grid">
                {GIFT_BOX_BUILDER_DATA.boxes.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={`gb-box-card ${state.box === b.id ? "selected" : ""}`}
                    onClick={() => selectBox(b.id)}
                  >
                    <div className="gb-box-icon">{b.icon}</div>
                    <div className="gb-box-name">{b.name}</div>
                    <div className="gb-box-price">{formatBuilderPrice(b.basePrice)}</div>
                    <div style={{ fontSize: 12, color: "var(--gb-text-muted)" }}>
                      {t("pages.giftBoxBuilder.upTo").replace("{n}", String(b.capacity))}
                    </div>
                  </button>
                ))}
              </div>
              <p style={{ fontWeight: 500, marginBottom: 10 }}>{t("pages.giftBoxBuilder.occasion")}</p>
              <div className="gb-chip-row">
                {GIFT_BOX_BUILDER_DATA.occasions.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    className={`gb-chip ${state.occasion === o.id ? "selected" : ""}`}
                    onClick={() =>
                      patch({ occasion: state.occasion === o.id ? null : o.id })
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!showSuccess && state.currentStep === 2 && (
            <div className="gb-step-panel active">
              <h2 className="gb-step-title">{t("pages.giftBoxBuilder.s2Title")}</h2>
              <p className="gb-step-sub">{t("pages.giftBoxBuilder.s2Sub")}</p>
              <div className="gb-filter-row">
                {GIFT_BOX_BUILDER_DATA.categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`gb-filter-btn ${state.activeFilter === c ? "active" : ""}`}
                    onClick={() => patch({ activeFilter: c })}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="gb-capacity-bar-wrap">
                <span>{t("pages.giftBoxBuilder.capacity")}</span>
                <div className="gb-cap-track">
                  <div
                    className={`gb-cap-fill ${capPct >= 80 ? "warn" : ""}`}
                    style={{ width: `${capPct}%` }}
                  />
                </div>
                <strong>
                  {totalItems} / {cap}
                </strong>
              </div>
              <div className="gb-product-grid">
                {filteredProducts.map((p) => {
                  const qty = state.items[p.id] || 0;
                  return (
                    <div key={p.id} className={`gb-prod-card ${qty > 0 ? "in-box" : ""}`}>
                      <div className="gb-prod-img">{p.emoji}</div>
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                        <div style={{ color: "var(--gb-gold)", fontWeight: 600, fontSize: 13 }}>
                          {formatBuilderPrice(p.price)}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                          <button
                            type="button"
                            className="gb-qty-btn"
                            onClick={() => changeQty(p.id, -1)}
                            aria-label="-"
                          >
                            −
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            className="gb-qty-btn"
                            onClick={() => changeQty(p.id, 1)}
                            aria-label="+"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!showSuccess && state.currentStep === 3 && (
            <div className="gb-step-panel active">
              <h2 className="gb-step-title">{t("pages.giftBoxBuilder.s3Title")}</h2>
              <p className="gb-step-sub">{t("pages.giftBoxBuilder.s3Sub")}</p>
              <div className="gb-section-block">
                <input
                  className="gb-input"
                  placeholder={t("pages.giftBoxBuilder.to")}
                  value={state.msgTo}
                  onChange={(e) => patch({ msgTo: e.target.value })}
                />
                <input
                  className="gb-input"
                  style={{ marginTop: 12 }}
                  placeholder={t("pages.giftBoxBuilder.from")}
                  value={state.msgFrom}
                  onChange={(e) => patch({ msgFrom: e.target.value })}
                />
                <textarea
                  className="gb-input"
                  style={{ marginTop: 12 }}
                  rows={3}
                  maxLength={250}
                  placeholder={t("pages.giftBoxBuilder.message")}
                  value={state.msgText}
                  onChange={(e) => patch({ msgText: e.target.value })}
                />
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--gb-text-muted)" }}>
                  {state.msgText.length} / 250
                </div>
              </div>
              <div className="gb-section-block">
                <div className="gb-chip-row">
                  {GIFT_BOX_BUILDER_DATA.cardDesigns.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`gb-chip ${state.cardDesign === d.id ? "selected" : ""}`}
                      onClick={() => patch({ cardDesign: d.id })}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="gb-section-block">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {GIFT_BOX_BUILDER_DATA.ribbonColors.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`gb-swatch ${state.ribbonColor === r.id ? "selected" : ""}`}
                      style={{ background: r.hex }}
                      aria-label={r.label}
                      onClick={() => patch({ ribbonColor: r.id })}
                    />
                  ))}
                </div>
              </div>
              <div className="gb-section-block">
                <div className="gb-chip-row">
                  {GIFT_BOX_BUILDER_DATA.wrapStyles.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      className={`gb-chip ${state.wrapStyle === w.id ? "selected" : ""}`}
                      onClick={() => patch({ wrapStyle: w.id })}
                    >
                      {w.icon} {w.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!showSuccess && state.currentStep === 4 && (
            <div className="gb-step-panel active">
              <h2 className="gb-step-title">{t("pages.giftBoxBuilder.s4Title")}</h2>
              <p className="gb-step-sub">{t("pages.giftBoxBuilder.s4Sub")}</p>
              <div
                className="gb-scene"
                onMouseDown={(e) => {
                  setDragging(true);
                  lastPointer.current = { x: e.clientX, y: e.clientY };
                }}
                onTouchStart={(e) => {
                  setDragging(true);
                  const t0 = e.touches[0];
                  lastPointer.current = { x: t0.clientX, y: t0.clientY };
                }}
                onMouseMove={(e) => {
                  if (!dragging) return;
                  const dx = e.clientX - lastPointer.current.x;
                  const dy = e.clientY - lastPointer.current.y;
                  setBoxRotY((y) => y + dx * 0.4);
                  setBoxRotX((x) => x - dy * 0.4);
                  lastPointer.current = { x: e.clientX, y: e.clientY };
                }}
                onTouchMove={(e) => {
                  if (!dragging) return;
                  const t0 = e.touches[0];
                  const dx = t0.clientX - lastPointer.current.x;
                  const dy = t0.clientY - lastPointer.current.y;
                  setBoxRotY((y) => y + dx * 0.5);
                  setBoxRotX((x) => x - dy * 0.5);
                  lastPointer.current = { x: t0.clientX, y: t0.clientY };
                }}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}
                onTouchEnd={() => setDragging(false)}
              >
                <Box3DPreview
                  size={240}
                  wrapStyleId={state.wrapStyle}
                  ribbonColorId={state.ribbonColor}
                  items={state.items}
                  products={products}
                  rotX={boxRotX}
                  rotY={boxRotY}
                />
              </div>
            </div>
          )}

          {!showSuccess && state.currentStep === 5 && (
            <div className="gb-step-panel active">
              <h2 className="gb-step-title">{t("pages.giftBoxBuilder.s5Title")}</h2>
              <p className="gb-step-sub">{t("pages.giftBoxBuilder.s5Sub")}</p>
              <ul style={{ listStyle: "none", marginBottom: 24 }}>
                {Object.entries(state.items).map(([id, qty]) => {
                  const p = products.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <li
                      key={id}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: "1px dashed var(--gb-cream-dark)",
                      }}
                    >
                      <span>{p.emoji}</span>
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span>×{qty}</span>
                      <strong style={{ color: "var(--gb-gold)" }}>
                        {formatBuilderPrice(p.price * qty)}
                      </strong>
                    </li>
                  );
                })}
              </ul>
              {GIFT_BOX_BUILDER_DATA.deliveryOptions.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`gb-chip ${state.delivery === d.id ? "selected" : ""}`}
                  style={{ display: "block", width: "100%", marginBottom: 8, textAlign: "left" }}
                  onClick={() => patch({ delivery: d.id })}
                >
                  {d.name} —{" "}
                  {d.price > 0 ? `+${formatBuilderPrice(d.price)}` : t("pages.giftBoxBuilder.free")}
                </button>
              ))}
              <button
                type="button"
                className="gb-chip"
                style={{ marginTop: 12 }}
                onClick={() => patch({ surprise: !state.surprise })}
              >
                {state.surprise ? "✓ " : ""}
                {t("pages.giftBoxBuilder.surprise")}
              </button>
              <p style={{ marginTop: 24, fontSize: 20, fontWeight: 700 }}>
                {t("pages.giftBoxBuilder.grandTotal")}: {formatBuilderPrice(grandTotal)}
              </p>
            </div>
          )}

          {showSuccess && (
            <div className="gb-success-screen show">
              <div style={{ fontSize: 72 }}>🎊</div>
              <h2 className="gb-step-title">{t("pages.giftBoxBuilder.successTitle")}</h2>
              <p className="gb-step-sub">{t("pages.giftBoxBuilder.successSub")}</p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" className="gb-btn-back" onClick={startOver}>
                  {t("pages.giftBoxBuilder.buildAnother")}
                </button>
                <Link href="/orders/track" className="gb-btn-next">
                  {t("pages.giftBoxBuilder.track")}
                </Link>
              </div>
            </div>
          )}
        </main>

        {!showSuccess && (
          <aside className="gb-sidebar">
            <h2 style={{ color: "var(--gb-gold-light)", fontFamily: "var(--font-playfair)" }}>
              {t("pages.giftBoxBuilder.yourBox")}
            </h2>
            <div className="gb-mini-scene">
              <Box3DPreview
                size={130}
                wrapStyleId={state.wrapStyle}
                ribbonColorId={state.ribbonColor}
                items={state.items}
                products={products}
                className="gb-mini-box3d"
              />
            </div>
            <div style={{ flex: 1, fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
              {Object.keys(state.items).length === 0 ? (
                <p style={{ opacity: 0.4, textAlign: "center" }}>
                  {t("pages.giftBoxBuilder.emptyBox")}
                </p>
              ) : (
                Object.entries(state.items).map(([id, qty]) => {
                  const p = products.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <div key={id} style={{ display: "flex", gap: 8, padding: "6px 0" }}>
                      <span>{p.emoji}</span>
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span>×{qty}</span>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.6)" }}>
                <span>{t("pages.giftBoxBuilder.total")}</span>
                <strong style={{ color: "var(--gb-gold-light)" }}>
                  {formatBuilderPrice(grandTotal)}
                </strong>
              </div>
            </div>
          </aside>
        )}
      </div>

      {!showSuccess && (
        <div className="gb-bottom-nav">
          <button
            type="button"
            className="gb-btn-back"
            style={{ visibility: state.currentStep <= 1 ? "hidden" : "visible" }}
            onClick={prevStep}
          >
            ← {t("pages.giftBoxBuilder.back")}
          </button>
          <span style={{ fontSize: 13, color: "var(--gb-text-muted)" }}>
            {state.box
              ? `${totalItems} ${t("pages.giftBoxBuilder.items")} · ${formatBuilderPrice(grandTotal)}`
              : ""}
          </span>
          <button
            type="button"
            className="gb-btn-next"
            disabled={ordering}
            onClick={nextStep}
          >
            {state.currentStep === 5
              ? t("pages.giftBoxBuilder.placeOrder")
              : `${t("pages.giftBoxBuilder.continue")} →`}
          </button>
        </div>
      )}

      <div ref={confettiRef} className="gb-confetti-wrap" aria-hidden />
    </div>
  );
}
