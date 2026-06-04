"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { BRAND } from "@/lib/brand";
import { siteConfig } from "@/lib/site-config";
import "./gift-box-builder.css";
import type { BuilderProduct } from "@/lib/gift-box-builder/data";
import { builderFilterCategories, loadBuilderProducts } from "@/lib/gift-box-builder/load-products";
import { loadStoredGiftBoxState, persistGiftBoxState, pruneItemsToCatalog } from "@/lib/gift-box-builder/state";
import { DEFAULT_GIFT_BOX_STATE, GIFT_BOX_STORAGE_KEY, type GiftBoxBuilderState } from "@/lib/gift-box-builder/types";
import { formatBuilderPrice, getBoxCapacity, getItemsTotal, getTotalItems, trimItemsToCapacity } from "@/lib/gift-box-builder/utils";
import { DEFAULT_GIFT_BOX_SIZES, type GiftBoxSizeConfig } from "@/lib/gift-box-builder/sizes";
import { Box3DPreview } from "@/components/gift-box-builder/box-3d-preview";
import { ShareGiftBoxButton } from "@/components/gift-box/share-gift-box-button";
import { OccasionTemplatesBar } from "@/components/gift-box-builder/occasion-templates-bar";
import { applyOccasionTemplateToState } from "@/lib/occasion-templates/apply";
import type { OccasionTemplate } from "@/lib/occasion-templates/types";

const GiftBoxAssistant = dynamic(
  () => import("@/components/mr-brownie/mr-brownie-chat").then((m) => {
    function EmbeddedAssistant() {
      return <m.MrBrownieChat embedded />;
    }
    return EmbeddedAssistant;
  }),
  { ssr: false },
);

export function GiftBoxBuilder() {
  const { lang, t } = useLanguage();
  const { addGiftBoxItem, openDrawer } = useCart();
  const [state, setState] = useState<GiftBoxBuilderState>(loadStoredGiftBoxState);
  const [products, setProducts] = useState<BuilderProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boxSizes, setBoxSizes] = useState<GiftBoxSizeConfig[]>(DEFAULT_GIFT_BOX_SIZES);
  const [videoFailed, setVideoFailed] = useState(false);
  const [preferReducedMotion, setPreferReducedMotion] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  const boxLabel = useCallback(
    (code: string, fallback: string) => {
      const key = `pages.giftBoxBuilder.boxSizes.${code}`;
      const label = t(key);
      return label === key ? fallback : label;
    },
    [t],
  );

  const updateState = useCallback((updater: (prev: GiftBoxBuilderState) => GiftBoxBuilderState) => {
    setState((prev) => {
      const next = updater(prev);
      persistGiftBoxState(next);
      return next;
    });
  }, []);

  const patch = useCallback((partial: Partial<GiftBoxBuilderState>) => {
    updateState((prev) => ({ ...prev, ...partial }));
  }, [updateState]);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(false);
    const rows = await loadBuilderProducts(lang);
    setProducts(rows);
    setProductsLoading(false);
    if (rows.length === 0) {
      setProductsError(true);
      return;
    }
    const valid = new Set(rows.map((p) => p.id));
    setState((prev) => {
      const items = pruneItemsToCatalog(prev.items, valid);
      if (Object.keys(items).length === Object.keys(prev.items).length) return prev;
      const next = { ...prev, items };
      persistGiftBoxState(next);
      return next;
    });
  }, [lang]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/gift-box/sizes", { signal: controller.signal })
      .then(async (r) => (await r.json()) as { sizes?: GiftBoxSizeConfig[] })
      .then((res) => {
        if (Array.isArray(res.sizes) && res.sizes.length > 0) {
          setBoxSizes(res.sizes);
        }
      })
      .catch(() => {
        setBoxSizes(DEFAULT_GIFT_BOX_SIZES);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPreferReducedMotion(mediaQuery.matches);
    };
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  const cap = getBoxCapacity(state.box, boxSizes);
  const totalItems = getTotalItems(state.items);
  const itemsSubtotal = getItemsTotal(state.items, products);
  const filterCategories = useMemo(() => builderFilterCategories(products), [products]);

  const filteredProducts = useMemo(() => {
    if (state.activeFilter === "All" || !filterCategories.includes(state.activeFilter)) return products;
    return products.filter((p) => p.category === state.activeFilter);
  }, [products, state.activeFilter, filterCategories]);

  const validateStep = (step: number) => {
    if (step === 1 && !state.box) return false;
    if (step === 2 && products.length === 0) return false;
    if ((step === 2 || step === 4) && totalItems === 0) return false;
    return true;
  };

  const goToStep = (n: number) => {
    if (n > state.currentStep + 1) return;
    if (n > state.currentStep && !validateStep(state.currentStep)) return;
    setError(null);
    patch({ currentStep: n });
  };

  const prevStep = () => {
    if (state.currentStep <= 1) return;
    patch({ currentStep: state.currentStep - 1 });
  };

  const applyTemplate = useCallback(
    (template: OccasionTemplate) => {
      if (!products.length) {
        setError(t("pages.giftBoxBuilder.errWaitProducts"));
        return;
      }
      const partial = applyOccasionTemplateToState(template, products, boxSizes, lang);
      updateState((prev) => ({ ...prev, ...partial }));
      setError(null);
    },
    [products, boxSizes, lang, updateState, t],
  );

  const selectBox = (id: string) => {
    const box = boxSizes.find((b) => b.code === id);
    if (!box) return;
    const total = getTotalItems(state.items);
    if (total > box.max_items) {
      patch({ box: id, items: trimItemsToCapacity(state.items, box.max_items) });
      return;
    }
    patch({ box: id });
  };

  const changeQty = (productId: string, delta: number) => {
    if (!state.box || cap <= 0) {
      setError(t("pages.giftBoxBuilder.errBox"));
      return;
    }
    updateState((prev) => {
      const current = prev.items[productId] || 0;
      const total = getTotalItems(prev.items);
      const boxCap = getBoxCapacity(prev.box, boxSizes);
      const product = products.find((p) => p.id === productId);
      const stock = product?.availableQuantity ?? null;

      if (delta > 0 && total >= boxCap) {
        setError(t("pages.giftBoxBuilder.errBoxLimit"));
        return prev;
      }
      if (delta > 0 && stock != null && current >= stock) {
        setError(t("pages.giftBoxBuilder.errNoStock"));
        return prev;
      }

      const newQty = Math.max(0, current + delta);
      const items = { ...prev.items };
      if (newQty === 0) delete items[productId];
      else items[productId] = newQty;
      setError(null);
      return { ...prev, items };
    });
  };

  const addToCart = () => {
    if (!state.box) {
      setError(t("pages.giftBoxBuilder.errBox"));
      return;
    }
    if (totalItems === 0) {
      setError(t("pages.giftBoxBuilder.errEmptyContinue"));
      return;
    }
    const selectedProducts = Object.entries(state.items)
      .map(([id, quantity]) => {
        const p = products.find((x) => x.id === id);
        if (!p || quantity < 1) return null;
        return {
          product_id: p.productUuid,
          quantity,
          price_snapshot: p.price,
          name: p.name,
          image: p.imageUrl,
        };
      })
      .filter(Boolean) as { product_id: string; quantity: number; price_snapshot: number }[];

    addGiftBoxItem({
      id: crypto.randomUUID(),
      name: t("pages.giftBoxBuilder.customBoxName"),
      image: "/brand/gift-box/box-closed-ref.png",
      boxSize: state.box,
      selectedProducts,
      message: state.msgText.trim() || null,
      totalPrice: itemsSubtotal,
      builder: {
        box: state.box,
        occasion: state.occasion,
        items: { ...state.items },
        msgTo: state.msgTo,
        msgFrom: state.msgFrom,
        msgText: state.msgText,
        cardDesign: state.cardDesign,
        ribbonColor: state.ribbonColor,
        wrapStyle: state.wrapStyle,
        delivery: state.delivery,
        surprise: state.surprise,
      },
    });
    localStorage.removeItem(GIFT_BOX_STORAGE_KEY);
    setState({ ...DEFAULT_GIFT_BOX_STATE });
    setError(null);
    openDrawer();
  };

  const nextStep = () => {
    if (!validateStep(state.currentStep)) {
      if (state.currentStep === 1) setError(t("pages.giftBoxBuilder.errBox"));
      if (state.currentStep === 2) setError(t("pages.giftBoxBuilder.errItems"));
      return;
    }
    if (state.currentStep === 4) {
      addToCart();
      return;
    }
    setError(null);
    patch({ currentStep: state.currentStep + 1 });
  };

  const stepLabels = [
    t("pages.giftBoxBuilder.stepTabSize"),
    t("pages.giftBoxBuilder.stepTabProducts"),
    t("pages.giftBoxBuilder.stepTabMessage"),
    t("pages.giftBoxBuilder.stepTabReview"),
  ];

  const capPct = cap ? Math.min(100, (totalItems / cap) * 100) : 0;
  const previewVideo = "/media/gift-box-preview.mp4";
  const showVideoPreview = !preferReducedMotion && !videoFailed;
  const whatsappHref = `https://wa.me/${siteConfig.whatsappNumber || BRAND.whatsappE164}`;

  const handleVideoMeta = () => {
    const node = previewVideoRef.current;
    if (!node) return;
    const { duration } = node;
    if (duration > 2.2) {
      node.currentTime = 1.8;
    }
  };

  return (
    <div className="gift-box-builder">
      <nav className="gb-progress-bar" aria-label={t("pages.giftBoxBuilder.progressAria")}>
        {stepLabels.map((label, i) => {
          const n = i + 1;
          const cls = ["gb-step-tab", n === state.currentStep ? "active" : "", n < state.currentStep ? "done" : ""].filter(Boolean).join(" ");
          return (
            <button key={n} type="button" className={cls} onClick={() => goToStep(n)} aria-current={n === state.currentStep ? "step" : undefined}>
              <span className="gb-step-num">{n}</span>
              <span className="gb-step-label">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="gb-layout">
        <main className="gb-main">
          {state.currentStep === 1 ? (
            <div className="gb-step-panel active">
              <OccasionTemplatesBar
                onSelect={applyTemplate}
                disabled={productsLoading || products.length === 0}
              />
              <h2 className="gb-step-title">{t("pages.giftBoxBuilder.s1Heading")}</h2>
              <p className="gb-step-sub">{t("pages.giftBoxBuilder.s1SubNoPrice")}</p>
              <div className="gb-box-grid">
                {boxSizes.map((b) => (
                  <button key={b.id} type="button" className={`gb-box-card ${state.box === b.code ? "selected" : ""}`} onClick={() => selectBox(b.code)}>
                    <div className="gb-box-icon">🎁</div>
                    <div className="gb-box-name">{boxLabel(b.code, b.name)}</div>
                    <div className="gb-box-free">{t("pages.giftBoxBuilder.noFixedPrice")}</div>
                    <div style={{ fontSize: 12, color: "var(--gb-text-muted)" }}>{t("pages.giftBoxBuilder.maxItems", { n: b.max_items })}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {state.currentStep === 2 ? (
            <div className="gb-step-panel active">
              <h2 className="gb-step-title">{t("pages.giftBoxBuilder.s2Heading")}</h2>
              <p className="gb-step-sub">{t("pages.giftBoxBuilder.s2SubLive")}</p>

              {productsLoading ? (
                <div className="gb-product-grid gb-product-grid--loading" aria-busy>
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="gb-prod-card gb-prod-card--skeleton" />)}
                </div>
              ) : productsError ? (
                <div className="gb-catalog-empty">
                  <p className="gb-catalog-hint">{t("pages.giftBoxBuilder.errCatalog")}</p>
                  <button type="button" className="gb-btn-back" onClick={() => void fetchProducts()}>{t("pages.giftBoxBuilder.retryCatalog")}</button>
                </div>
              ) : (
                <>
                  <div className="gb-filter-row">
                    {filterCategories.map((c) => (
                      <button key={c} type="button" className={`gb-filter-btn ${state.activeFilter === c ? "active" : ""}`} onClick={() => patch({ activeFilter: c })}>{c}</button>
                    ))}
                  </div>

                  <div className="gb-capacity-bar-wrap">
                    <span>{t("pages.giftBoxBuilder.boxFill")}</span>
                    <div className="gb-cap-track"><div className={`gb-cap-fill ${capPct >= 80 ? "warn" : ""}`} style={{ width: `${capPct}%` }} /></div>
                    <strong>{totalItems} / {cap}</strong>
                  </div>

                  <div className="gb-product-grid">
                    {filteredProducts.map((p) => {
                      const qty = state.items[p.id] || 0;
                      const atCapacity = totalItems >= cap;
                      const canAdd = Boolean(state.box) && !atCapacity && (p.availableQuantity == null || qty < p.availableQuantity);
                      return (
                        <div key={p.id} className={`gb-prod-card ${qty > 0 ? "in-box" : ""}`}>
                          <div className="gb-prod-img">
                            <Image src={p.imageUrl} alt={p.name} width={160} height={100} className="gb-prod-img__photo" sizes="160px" />
                          </div>
                          <div style={{ padding: "10px 12px" }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
                            <div style={{ color: "var(--gb-gold)", fontWeight: 700, fontSize: 13 }}>{formatBuilderPrice(p.price, lang)}</div>
                            <div style={{ fontSize: 11, color: "var(--gb-text-muted)" }}>{t("pages.giftBoxBuilder.available")}: {p.availableQuantity ?? t("pages.checkout.dash")}</div>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                              <button type="button" className="gb-qty-btn" onClick={() => changeQty(p.id, -1)} aria-label="-">−</button>
                              <span>{qty}</span>
                              <button type="button" className="gb-qty-btn" onClick={() => changeQty(p.id, 1)} aria-label="+" disabled={!canAdd && qty === 0}>+</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {state.currentStep === 3 ? (
            <div className="gb-step-panel active">
              <h2 className="gb-step-title">{t("pages.giftBoxBuilder.s3Heading")}</h2>
              <div className="gb-section-block">
                <textarea
                  className="gb-input"
                  rows={4}
                  maxLength={250}
                  placeholder={t("pages.giftBoxBuilder.message")}
                  value={state.msgText}
                  onChange={(e) => patch({ msgText: e.target.value })}
                />
                <div className="text-end text-xs text-[var(--gb-text-muted)]">{state.msgText.length} / 250</div>
              </div>
            </div>
          ) : null}

          {state.currentStep === 4 ? (
            <div className="gb-step-panel active">
              <h2 className="gb-step-title">{t("pages.giftBoxBuilder.s4HeadingFinal")}</h2>
              <ul style={{ listStyle: "none", marginBottom: 24 }}>
                {Object.entries(state.items).map(([id, qty]) => {
                  const p = products.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <li key={id} className="gb-review-line">
                      <Image src={p.imageUrl} alt="" width={40} height={40} className="gb-review-line__img" />
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span>×{qty}</span>
                      <strong style={{ color: "var(--gb-gold)" }}>{formatBuilderPrice(p.price * qty, lang)}</strong>
                    </li>
                  );
                })}
              </ul>
              <div className="gb-checkout-totals">
                <div className="gb-checkout-row"><span>{t("pages.giftBoxBuilder.reviewBoxSize")}</span><strong>{state.box ? boxLabel(state.box, state.box) : t("pages.checkout.dash")}</strong></div>
                <div className="gb-checkout-row"><span>{t("pages.giftBoxBuilder.reviewItemCount")}</span><strong>{totalItems}</strong></div>
                <div className="gb-checkout-row gb-checkout-row--grand"><span>{t("pages.giftBoxBuilder.total")}</span><strong>{formatBuilderPrice(itemsSubtotal, lang)}</strong></div>
              </div>
              <ShareGiftBoxButton
                state={state}
                products={products}
                disabled={!state.box || totalItems < 1}
                className="gb-share-wrap"
              />
            </div>
          ) : null}

          {error ? <p className="gb-order-error" role="alert">{error}</p> : null}
        </main>

        <aside className="gb-sidebar">
          <h2 className="gb-sidebar-title">{t("pages.giftBoxBuilder.sidebarCurrent")}</h2>
          <div className="gb-mini-scene">
            <div className="gb-preview-layer is-visible" aria-hidden={false}>
              {showVideoPreview ? (
                <video
                  ref={previewVideoRef}
                  className="gb-preview-video"
                  src={previewVideo}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  poster="/brand/gift-box/box-closed-ref.png"
                  controls={false}
                  onLoadedMetadata={handleVideoMeta}
                  onError={() => setVideoFailed(true)}
                />
              ) : (
                <Box3DPreview
                  size={200}
                  items={state.items}
                  products={products}
                  totalItems={totalItems}
                  capacity={cap || 1}
                  className="gb-mini-box3d"
                  emptyLabel={t("pages.giftBoxBuilder.boxAddProducts")}
                  closingLabel={t("pages.giftBoxBuilder.boxClosing")}
                />
              )}
            </div>
          </div>
          {preferReducedMotion ? (
            <p className="gb-preview-note">{t("pages.giftBoxBuilder.previewReducedMotion")}</p>
          ) : null}
          <div className="gb-sidebar-total">
            <div className="gb-sidebar-total__row">
              <span>{t("pages.giftBoxBuilder.total")}</span>
              <strong>{formatBuilderPrice(itemsSubtotal, lang)}</strong>
            </div>
          </div>

          <GiftBoxAssistant />

          <div className="gb-help-links">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="gb-help-link"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
              {t("pages.giftBoxBuilder.whatsappHelp")}
            </a>
          </div>
        </aside>
      </div>

      <div className="gb-bottom-nav">
        <button type="button" className="gb-btn-back" style={{ visibility: state.currentStep <= 1 ? "hidden" : "visible" }} onClick={prevStep}>
          {lang === "ar" ? "→" : "←"} {t("pages.giftBoxBuilder.back")}
        </button>
        <span style={{ fontSize: 13, color: "var(--gb-text-muted)" }}>
          {state.box
            ? `${totalItems} ${t("pages.giftBoxBuilder.itemUnit")} · ${formatBuilderPrice(itemsSubtotal, lang)}`
            : ""}
        </span>
        <button type="button" className="gb-btn-next" disabled={state.currentStep === 2 && productsLoading} onClick={nextStep}>
          {state.currentStep === 4
            ? t("pages.giftBoxBuilder.addToCartBtn")
            : lang === "ar"
              ? `← ${t("pages.giftBoxBuilder.continueNext")}`
              : `${t("pages.giftBoxBuilder.continueNext")} →`}
        </button>
      </div>
    </div>
  );
}
