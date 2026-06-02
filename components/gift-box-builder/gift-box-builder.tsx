"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/providers/cart-provider";
import { useLanguage } from "@/components/providers/language-provider";
import { Box3DPreview } from "@/components/gift-box-builder/box-3d-preview";
import "./gift-box-builder.css";
import type { BuilderProduct } from "@/lib/gift-box-builder/data";
import { builderFilterCategories, loadBuilderProducts } from "@/lib/gift-box-builder/load-products";
import { loadStoredGiftBoxState, persistGiftBoxState, pruneItemsToCatalog } from "@/lib/gift-box-builder/state";
import { DEFAULT_GIFT_BOX_STATE, GIFT_BOX_STORAGE_KEY, type GiftBoxBuilderState } from "@/lib/gift-box-builder/types";
import { formatBuilderPrice, getBoxCapacity, getItemsTotal, getTotalItems, trimItemsToCapacity } from "@/lib/gift-box-builder/utils";
import { DEFAULT_GIFT_BOX_SIZES, type GiftBoxSizeConfig } from "@/lib/gift-box-builder/sizes";

export function GiftBoxBuilder() {
  const { lang } = useLanguage();
  const { addGiftBoxItem, openDrawer } = useCart();
  const [state, setState] = useState<GiftBoxBuilderState>(loadStoredGiftBoxState);
  const [products, setProducts] = useState<BuilderProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [boxSizes, setBoxSizes] = useState<GiftBoxSizeConfig[]>(DEFAULT_GIFT_BOX_SIZES);
  const [previewMode, setPreviewMode] = useState<"design" | "video">("design");
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [allowVideoPreview, setAllowVideoPreview] = useState(true);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

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
    void fetch("/api/gift-box/sizes", { cache: "no-store" })
      .then(async (r) => (await r.json()) as { sizes?: GiftBoxSizeConfig[] })
      .then((res) => {
        if (Array.isArray(res.sizes) && res.sizes.length > 0) {
          setBoxSizes(res.sizes);
        }
      })
      .catch(() => {
        setBoxSizes(DEFAULT_GIFT_BOX_SIZES);
      });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const updatePreference = () => {
      const reducedMotion = mediaQuery.matches;
      const saveData = Boolean(connection?.saveData);
      setAllowVideoPreview(!(reducedMotion || saveData));
    };
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    const node = previewRef.current;
    if (!node || shouldLoadVideo) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoadVideo]);

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
      setError(lang === "ar" ? "اختر حجم الصندوق أولاً." : "Choose box size first.");
      return;
    }
    updateState((prev) => {
      const current = prev.items[productId] || 0;
      const total = getTotalItems(prev.items);
      const boxCap = getBoxCapacity(prev.box, boxSizes);
      const product = products.find((p) => p.id === productId);
      const stock = product?.availableQuantity ?? null;

      if (delta > 0 && total >= boxCap) {
        setError(lang === "ar" ? "تم الوصول للحد الأقصى لهذا الحجم." : "Box limit reached.");
        return prev;
      }
      if (delta > 0 && stock != null && current >= stock) {
        setError(lang === "ar" ? "الكمية المتاحة انتهت لهذا المنتج." : "No more stock for this product.");
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
      setError(lang === "ar" ? "اختر حجم الصندوق أولاً." : "Choose box size first.");
      return;
    }
    if (totalItems === 0) {
      setError(lang === "ar" ? "لا يمكن المتابعة بصندوق فارغ." : "Cannot continue with empty box.");
      return;
    }
    const selectedProducts = Object.entries(state.items)
      .map(([id, quantity]) => {
        const p = products.find((x) => x.id === id);
        if (!p || quantity < 1) return null;
        return { product_id: p.productUuid, quantity, price_snapshot: p.price };
      })
      .filter(Boolean) as { product_id: string; quantity: number; price_snapshot: number }[];

    addGiftBoxItem({
      id: crypto.randomUUID(),
      name: lang === "ar" ? "صندوق هدية مخصص" : "Custom Gift Box",
      image: "/brand/gift-box/box-closed-ref.png",
      boxSize: state.box,
      selectedProducts,
      message: state.msgText.trim() || null,
      totalPrice: itemsSubtotal,
    });
    localStorage.removeItem(GIFT_BOX_STORAGE_KEY);
    setState({ ...DEFAULT_GIFT_BOX_STATE });
    setError(null);
    openDrawer();
  };

  const nextStep = () => {
    if (!validateStep(state.currentStep)) {
      if (state.currentStep === 1) setError(lang === "ar" ? "اختر حجم الصندوق أولاً." : "Choose box size first.");
      if (state.currentStep === 2) setError(lang === "ar" ? "أضف منتجًا واحدًا على الأقل." : "Add at least one product.");
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
    lang === "ar" ? "اختيار الحجم" : "Choose Size",
    lang === "ar" ? "إضافة المنتجات" : "Add Products",
    lang === "ar" ? "رسالة الهدية" : "Gift Message",
    lang === "ar" ? "المراجعة" : "Review",
  ];

  const capPct = cap ? Math.min(100, (totalItems / cap) * 100) : 0;
  const activePreviewMode = previewMode === "video" && allowVideoPreview && !videoFailed ? "video" : "design";
  const previewVideoBase = "/media/gift-box-preview.mp4";
  const previewVideo = `${previewVideoBase}#t=1.8`;

  const handleVideoMeta = () => {
    const node = previewVideoRef.current;
    if (!node) return;
    const { videoWidth, videoHeight, duration } = node;
    if (!videoWidth || !videoHeight) {
      setVideoFailed(true);
      setPreviewMode("design");
      return;
    }
    const ratio = videoWidth / videoHeight;
    const hasValidRatio = ratio >= 0.8 && ratio <= 1.7;
    const hasValidDuration = Number.isFinite(duration) && duration >= 2;
    if (!hasValidRatio || !hasValidDuration) {
      setVideoFailed(true);
      setPreviewMode("design");
      return;
    }
    if (duration > 2.2) {
      node.currentTime = 1.8;
    }
    setVideoReady(true);
  };

  return (
    <div className="gift-box-builder">
      <header className="gb-header">
        <Link href="/" className="gb-logo">Cookie<span> Bite</span></Link>
        <span className="gb-header-tag">{lang === "ar" ? "صندوق هدية مخصص" : "Custom Gift Box"}</span>
      </header>

      <nav className="gb-progress-bar" aria-label="Gift box steps">
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
              <h2 className="gb-step-title">{lang === "ar" ? "اختر حجم الصندوق" : "Choose Box Size"}</h2>
              <p className="gb-step-sub">{lang === "ar" ? "لا يوجد سعر ثابت للصندوق، السعر = محتوى الصندوق فقط." : "Box has no fixed price. Total = contents only."}</p>
              <div className="gb-box-grid">
                {boxSizes.map((b) => (
                  <button key={b.id} type="button" className={`gb-box-card ${state.box === b.code ? "selected" : ""}`} onClick={() => selectBox(b.code)}>
                    <div className="gb-box-icon">🎁</div>
                    <div className="gb-box-name">{b.name}</div>
                    <div className="gb-box-free">{lang === "ar" ? "بدون سعر ثابت" : "No fixed price"}</div>
                    <div style={{ fontSize: 12, color: "var(--gb-text-muted)" }}>{lang === "ar" ? `حد أقصى ${b.max_items} عناصر` : `Max ${b.max_items} items`}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {state.currentStep === 2 ? (
            <div className="gb-step-panel active">
              <h2 className="gb-step-title">{lang === "ar" ? "أضف المنتجات داخل الصندوق" : "Add Products To Box"}</h2>
              <p className="gb-step-sub">{lang === "ar" ? "المنتجات من قاعدة بيانات المتجر مباشرة (بدون بيانات وهمية)." : "Products are fetched directly from live shop database."}</p>

              {productsLoading ? (
                <div className="gb-product-grid gb-product-grid--loading" aria-busy>
                  {Array.from({ length: 8 }).map((_, i) => <div key={i} className="gb-prod-card gb-prod-card--skeleton" />)}
                </div>
              ) : productsError ? (
                <div className="gb-catalog-empty">
                  <p className="gb-catalog-hint">{lang === "ar" ? "تعذر تحميل المنتجات." : "Could not load products."}</p>
                  <button type="button" className="gb-btn-back" onClick={() => void fetchProducts()}>{lang === "ar" ? "إعادة المحاولة" : "Retry"}</button>
                </div>
              ) : (
                <>
                  <div className="gb-filter-row">
                    {filterCategories.map((c) => (
                      <button key={c} type="button" className={`gb-filter-btn ${state.activeFilter === c ? "active" : ""}`} onClick={() => patch({ activeFilter: c })}>{c}</button>
                    ))}
                  </div>

                  <div className="gb-capacity-bar-wrap">
                    <span>{lang === "ar" ? "محتوى الصندوق" : "Box Fill"}</span>
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
                            <div style={{ fontSize: 11, color: "var(--gb-text-muted)" }}>ID: {p.id}</div>
                            <div style={{ color: "var(--gb-gold)", fontWeight: 700, fontSize: 13 }}>{formatBuilderPrice(p.price)}</div>
                            <div style={{ fontSize: 11, color: "var(--gb-text-muted)" }}>{lang === "ar" ? "المتاح:" : "Available:"} {p.availableQuantity ?? "—"}</div>
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
              <h2 className="gb-step-title">{lang === "ar" ? "رسالة الهدية (اختيارية)" : "Gift Message (Optional)"}</h2>
              <div className="gb-section-block">
                <textarea
                  className="gb-input"
                  rows={4}
                  maxLength={250}
                  placeholder={lang === "ar" ? "اكتب رسالة الهدية..." : "Write your gift message..."}
                  value={state.msgText}
                  onChange={(e) => patch({ msgText: e.target.value })}
                />
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--gb-text-muted)" }}>{state.msgText.length} / 250</div>
              </div>
            </div>
          ) : null}

          {state.currentStep === 4 ? (
            <div className="gb-step-panel active">
              <h2 className="gb-step-title">{lang === "ar" ? "مراجعة نهائية" : "Final Review"}</h2>
              <ul style={{ listStyle: "none", marginBottom: 24 }}>
                {Object.entries(state.items).map(([id, qty]) => {
                  const p = products.find((x) => x.id === id);
                  if (!p) return null;
                  return (
                    <li key={id} className="gb-review-line">
                      <Image src={p.imageUrl} alt="" width={40} height={40} className="gb-review-line__img" />
                      <span style={{ flex: 1 }}>{p.name}</span>
                      <span>×{qty}</span>
                      <strong style={{ color: "var(--gb-gold)" }}>{formatBuilderPrice(p.price * qty)}</strong>
                    </li>
                  );
                })}
              </ul>
              <div className="gb-checkout-totals">
                <div className="gb-checkout-row"><span>{lang === "ar" ? "حجم الصندوق" : "Box Size"}</span><strong>{state.box}</strong></div>
                <div className="gb-checkout-row"><span>{lang === "ar" ? "إجمالي العناصر" : "Total Items"}</span><strong>{totalItems}</strong></div>
                <div className="gb-checkout-row gb-checkout-row--grand"><span>{lang === "ar" ? "الإجمالي" : "Total"}</span><strong>{formatBuilderPrice(itemsSubtotal)}</strong></div>
              </div>
            </div>
          ) : null}

          {error ? <p className="gb-order-error" role="alert">{error}</p> : null}
        </main>

        <aside className="gb-sidebar">
          <h2 style={{ color: "var(--gb-gold-light)", fontFamily: "var(--font-playfair)" }}>{lang === "ar" ? "الصندوق الحالي" : "Current Box"}</h2>
          <div className="gb-preview-controls" role="tablist" aria-label={lang === "ar" ? "وضع المعاينة" : "Preview mode"}>
            <button
              type="button"
              className={`gb-preview-toggle ${activePreviewMode === "design" ? "active" : ""}`}
              onClick={() => setPreviewMode("design")}
              role="tab"
              aria-selected={activePreviewMode === "design"}
            >
              {lang === "ar" ? "معاينة التصميم" : "Preview Design"}
            </button>
            <button
              type="button"
              className={`gb-preview-toggle ${activePreviewMode === "video" ? "active" : ""}`}
              onClick={() => {
                setVideoReady(false);
                setPreviewMode("video");
              }}
              role="tab"
              aria-selected={activePreviewMode === "video"}
              disabled={!allowVideoPreview || videoFailed}
              title={!allowVideoPreview ? (lang === "ar" ? "تم إيقاف الفيديو لتوفير الأداء" : "Video disabled for performance") : undefined}
            >
              {lang === "ar" ? "معاينة الفيديو" : "Preview Video"}
            </button>
          </div>
          <div className="gb-mini-scene" ref={previewRef}>
            <div className={`gb-preview-layer ${activePreviewMode === "video" ? "is-visible" : ""}`} aria-hidden={activePreviewMode !== "video"}>
              {shouldLoadVideo && allowVideoPreview && !videoFailed ? (
                <video
                  ref={previewVideoRef}
                  className="gb-preview-video"
                  src={previewVideo}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="none"
                  controls={false}
                  onLoadedMetadata={handleVideoMeta}
                  onError={() => {
                    setVideoFailed(true);
                    setPreviewMode("design");
                  }}
                />
              ) : null}
            </div>
            <div
              className={`gb-preview-layer ${activePreviewMode === "design" || (activePreviewMode === "video" && !videoReady) ? "is-visible" : ""}`}
              aria-hidden={activePreviewMode === "video" && videoReady}
            >
              <Box3DPreview size={130} items={state.items} products={products} totalItems={totalItems} capacity={cap} className="gb-mini-box3d" emptyLabel={lang === "ar" ? "أضف منتجات" : "Add products"} closingLabel={lang === "ar" ? "جاري الإغلاق" : "Closing"} />
            </div>
          </div>
          {videoFailed ? <p className="gb-preview-note">{lang === "ar" ? "تعذر تحميل الفيديو، تم عرض معاينة التصميم تلقائيًا." : "Video failed to load, switched to design preview."}</p> : null}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.6)" }}>
              <span>{lang === "ar" ? "الإجمالي" : "Total"}</span>
              <strong style={{ color: "var(--gb-gold-light)" }}>{formatBuilderPrice(itemsSubtotal)}</strong>
            </div>
          </div>
        </aside>
      </div>

      <div className="gb-bottom-nav">
        <button type="button" className="gb-btn-back" style={{ visibility: state.currentStep <= 1 ? "hidden" : "visible" }} onClick={prevStep}>← {lang === "ar" ? "رجوع" : "Back"}</button>
        <span style={{ fontSize: 13, color: "var(--gb-text-muted)" }}>{state.box ? `${totalItems} ${lang === "ar" ? "عنصر" : "items"} · ${formatBuilderPrice(itemsSubtotal)}` : ""}</span>
        <button type="button" className="gb-btn-next" disabled={state.currentStep === 2 && productsLoading} onClick={nextStep}>
          {state.currentStep === 4 ? (lang === "ar" ? "إضافة إلى السلة" : "Add to Cart") : `${lang === "ar" ? "التالي" : "Continue"} →`}
        </button>
      </div>
    </div>
  );
}
