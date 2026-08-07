"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Cookie,
  CreditCard,
  Gift,
  Mail,
  MessageCircle,
  Package,
  Phone,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { SectionHeading } from "@/components/sections/section-heading";
import { useLanguage } from "@/components/providers/language-provider";
import { useBusinessHours } from "@/components/providers/store-business-settings-provider";
import { BRAND } from "@/lib/brand";
import { helpArticlePathForKey, type HelpCenterArticleKey } from "@/lib/content/help-center";
import { cn } from "@/lib/utils";

type CategoryId =
  | "orders"
  | "returns"
  | "account"
  | "payment"
  | "products"
  | "gifting";

type ArticleKey = HelpCenterArticleKey;

type Article = {
  key: ArticleKey;
  category: CategoryId;
  href: string;
  /** keywords used for fuzzy search (lowercase, both english + arabic) */
  keywords: string;
};

const ARTICLES: Article[] = [
  { key: "trackOrder", category: "orders", href: helpArticlePathForKey("trackOrder"), keywords: "track order shipment تتبع شحنة طلب" },
  { key: "deliveryZones", category: "orders", href: helpArticlePathForKey("deliveryZones"), keywords: "delivery zone area cairo توصيل منطقة قاهرة" },
  { key: "freeShipping", category: "orders", href: helpArticlePathForKey("freeShipping"), keywords: "free delivery threshold مجاني شحن حد" },
  { key: "deliveryTime", category: "orders", href: helpArticlePathForKey("deliveryTime"), keywords: "delivery time how long توصيل وقت مدة" },
  { key: "changeAddress", category: "orders", href: helpArticlePathForKey("changeAddress"), keywords: "change address edit عنوان تعديل" },
  { key: "cancelOrder", category: "orders", href: helpArticlePathForKey("cancelOrder"), keywords: "cancel order إلغاء طلب" },
  { key: "damagedOrder", category: "returns", href: helpArticlePathForKey("damagedOrder"), keywords: "damaged broken تالف كسر" },
  { key: "wrongItem", category: "returns", href: helpArticlePathForKey("wrongItem"), keywords: "wrong item missing خاطئ ناقص" },
  { key: "refundTime", category: "returns", href: helpArticlePathForKey("refundTime"), keywords: "refund time money استرداد مبلغ وقت" },
  { key: "returnsPolicy", category: "returns", href: helpArticlePathForKey("returnsPolicy"), keywords: "returns policy سياسة استرجاع" },
  { key: "createAccount", category: "account", href: helpArticlePathForKey("createAccount"), keywords: "create account sign up login حساب تسجيل إنشاء دخول" },
  { key: "resetPassword", category: "account", href: helpArticlePathForKey("resetPassword"), keywords: "password reset forgot كلمة سر نسيت" },
  { key: "socialLogin", category: "account", href: helpArticlePathForKey("socialLogin"), keywords: "google apple social oauth جوجل آبل" },
  { key: "updateProfile", category: "account", href: helpArticlePathForKey("updateProfile"), keywords: "profile update edit ملف تحديث" },
  { key: "deleteAccount", category: "account", href: helpArticlePathForKey("deleteAccount"), keywords: "delete account remove حذف حساب" },
  { key: "paymentMethods", category: "payment", href: helpArticlePathForKey("paymentMethods"), keywords: "payment cards visa mastercard دفع بطاقة فيزا" },
  { key: "codAvailable", category: "payment", href: helpArticlePathForKey("codAvailable"), keywords: "cash delivery cod نقدي عند استلام" },
  { key: "cardDeclined", category: "payment", href: helpArticlePathForKey("cardDeclined"), keywords: "card declined failed بطاقة رفض فشل" },
  { key: "downloadInvoice", category: "payment", href: helpArticlePathForKey("downloadInvoice"), keywords: "invoice receipt download فاتورة إيصال تنزيل" },
  { key: "promoCode", category: "payment", href: helpArticlePathForKey("promoCode"), keywords: "promo discount coupon code خصم كوبون" },
  { key: "ingredients", category: "products", href: helpArticlePathForKey("ingredients"), keywords: "ingredients butter chocolate مكونات زبدة شوكولاتة" },
  { key: "allergens", category: "products", href: helpArticlePathForKey("allergens"), keywords: "allergen nut gluten حساسية مكسرات جلوتين" },
  { key: "storage", category: "products", href: helpArticlePathForKey("storage"), keywords: "storage store keep تخزين حفظ" },
  { key: "shelfLife", category: "products", href: helpArticlePathForKey("shelfLife"), keywords: "fresh shelf life طزاج صلاحية" },
  { key: "giftNotes", category: "gifting", href: helpArticlePathForKey("giftNotes"), keywords: "gift note handwritten ملاحظة هدية خط يد" },
  { key: "giftBoxes", category: "gifting", href: helpArticlePathForKey("giftBoxes"), keywords: "gift box set صندوق هدية تغليف" },
  { key: "corporate", category: "gifting", href: helpArticlePathForKey("corporate"), keywords: "corporate bulk شركات كميات" },
  { key: "customCookies", category: "gifting", href: helpArticlePathForKey("customCookies"), keywords: "custom design تصميم مخصص" },
];

const POPULAR_KEYS: ArticleKey[] = [
  "trackOrder",
  "deliveryZones",
  "freeShipping",
  "damagedOrder",
  "paymentMethods",
  "giftNotes",
];

const CATEGORY_META: Record<
  CategoryId,
  { Icon: typeof Package; tone: string; iconBg: string; iconColor: string }
> = {
  orders: {
    Icon: Package,
    tone: "from-cb-peach/40 to-cb-cream",
    iconBg: "bg-cb-terracotta/10",
    iconColor: "text-cb-terracotta-dark",
  },
  returns: {
    Icon: RotateCcw,
    tone: "from-cb-mint/30 to-cb-cream",
    iconBg: "bg-cb-mint/30",
    iconColor: "text-cb-text-strong",
  },
  account: {
    Icon: UserRound,
    tone: "from-cb-peach/30 to-cb-cream",
    iconBg: "bg-cb-terracotta/10",
    iconColor: "text-cb-terracotta-dark",
  },
  payment: {
    Icon: CreditCard,
    tone: "from-cb-mint/25 to-cb-cream",
    iconBg: "bg-cb-mint/30",
    iconColor: "text-cb-text-strong",
  },
  products: {
    Icon: Cookie,
    tone: "from-cb-peach/40 to-cb-cream",
    iconBg: "bg-cb-terracotta/10",
    iconColor: "text-cb-terracotta-dark",
  },
  gifting: {
    Icon: Gift,
    tone: "from-cb-peach/30 to-cb-cream",
    iconBg: "bg-cb-terracotta/10",
    iconColor: "text-cb-terracotta-dark",
  },
};

const CATEGORY_ORDER: CategoryId[] = [
  "orders",
  "returns",
  "account",
  "payment",
  "products",
  "gifting",
];

export function HelpCenterBody() {
  const { t, lang } = useLanguage();
  const businessHours = useBusinessHours();
  const [query, setQuery] = useState("");

  const articleLabels = useMemo(
    () =>
      ARTICLES.map((article) => ({
        ...article,
        label: t(`pages.help.articles.${article.key}.title`),
        categoryLabel: t(`pages.help.categories.${article.category}.title`),
      })),
    [t],
  );

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmedQuery) return [];
    return articleLabels.filter((article) => {
      const haystack = `${article.label} ${article.categoryLabel} ${article.keywords}`.toLowerCase();
      return haystack.includes(trimmedQuery);
    });
  }, [articleLabels, trimmedQuery]);

  const articleCountByCategory = useMemo(() => {
    return ARTICLES.reduce<Record<CategoryId, number>>(
      (acc, article) => {
        acc[article.category] = (acc[article.category] ?? 0) + 1;
        return acc;
      },
      { orders: 0, returns: 0, account: 0, payment: 0, products: 0, gifting: 0 },
    );
  }, []);

  const popularArticles = useMemo(
    () =>
      POPULAR_KEYS.map((key) => articleLabels.find((article) => article.key === key)).filter(
        (article): article is (typeof articleLabels)[number] => Boolean(article),
      ),
    [articleLabels],
  );

  const phoneTel = `+${BRAND.whatsappE164}`;
  const whatsappHref = `https://wa.me/${BRAND.whatsappE164}`;
  const isRtl = lang === "ar";

  return (
    <div className="bg-cb-cream pb-24">
      {/* Hero with search */}
      <section className="relative overflow-hidden bg-gradient-to-b from-cb-peach/40 via-cb-cream to-cb-cream pt-14 pb-16 md:pt-20 md:pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 start-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-cb-terracotta/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center lg:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-cb-terracotta-dark">
            {t("pages.help.eyebrow")}
          </p>
          <h1 className="mt-3 font-serif text-[clamp(1.85rem,3vw+1rem,2.75rem)] font-semibold leading-tight text-cb-text-strong">
            {t("pages.help.title")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-cb-text-muted sm:text-lg">
            {t("pages.help.subtitle")}
          </p>

          <form
            role="search"
            onSubmit={(event) => event.preventDefault()}
            className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-full border border-cb-border bg-cb-surface p-2 shadow-sm focus-within:border-cb-terracotta-dark focus-within:shadow-md"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cb-cream text-cb-terracotta-dark",
                isRtl ? "ms-1" : "ms-1",
              )}
              aria-hidden
            >
              <Search className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("pages.help.searchPlaceholder")}
              aria-label={t("pages.help.searchPlaceholder")}
              className="flex-1 bg-transparent px-1 text-sm text-cb-text-strong placeholder:text-cb-text-muted focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="me-1 inline-flex items-center gap-1 rounded-full bg-cb-cream px-3 py-1.5 text-xs font-semibold text-cb-text-muted transition hover:bg-cb-peach/40 hover:text-cb-text-strong"
              >
                <X className="h-3 w-3" />
                {t("pages.help.searchClear")}
              </button>
            ) : null}
          </form>

          {trimmedQuery ? (
            <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-cb-border bg-cb-surface p-4 text-start shadow-sm">
              {filtered.length === 0 ? (
                <p className="px-2 py-3 text-sm text-cb-text-muted">
                  {t("pages.help.searchEmpty", { query })}
                </p>
              ) : (
                <>
                  <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cb-text-muted">
                    {t("pages.help.searchResults", { count: filtered.length })}
                  </p>
                  <ul className="divide-y divide-cb-border">
                    {filtered.map((article) => (
                      <li key={article.key}>
                        <Link
                          href={article.href}
                          className="group flex items-center justify-between gap-3 rounded-xl px-2 py-3 transition hover:bg-cb-cream"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cb-terracotta-dark">
                              {article.categoryLabel}
                            </p>
                            <p className="mt-1 truncate text-sm font-medium text-cb-text-strong">
                              {article.label}
                            </p>
                          </div>
                          <ArrowUpRight
                            className={cn(
                              "h-4 w-4 shrink-0 text-cb-text-muted transition group-hover:text-cb-terracotta-dark",
                              isRtl && "rotate-90",
                            )}
                            aria-hidden
                          />
                          <span className="sr-only">{t("pages.help.searchOpen")}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto mt-4 max-w-6xl px-4 lg:px-6">
        <SectionHeading
          align="center"
          className="text-center"
          eyebrow={t("pages.help.categoriesEyebrow")}
          title={t("pages.help.categoriesTitle")}
        />
        <ul className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_ORDER.map((id) => {
            const meta = CATEGORY_META[id];
            const sectionAnchor = `#cat-${id}`;
            return (
              <li key={id}>
                <a
                  href={sectionAnchor}
                  className={cn(
                    "group block h-full rounded-3xl border border-cb-border bg-gradient-to-br p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md",
                    meta.tone,
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                        meta.iconBg,
                      )}
                    >
                      <meta.Icon className={cn("h-6 w-6", meta.iconColor)} aria-hidden />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cb-text-muted">
                      {t("pages.help.articleCount", {
                        count: articleCountByCategory[id],
                      })}
                    </span>
                  </div>
                  <h3 className="mt-5 font-serif text-lg font-semibold text-cb-text-strong">
                    {t(`pages.help.categories.${id}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-cb-text">
                    {t(`pages.help.categories.${id}.description`)}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cb-terracotta-dark">
                    {t("pages.help.searchOpen")}
                    <ArrowRight
                      className={cn("h-4 w-4 transition group-hover:translate-x-1", isRtl && "rotate-180")}
                      aria-hidden
                    />
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Per-category article lists */}
      <section className="mx-auto mt-16 max-w-6xl px-4 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {CATEGORY_ORDER.map((id) => {
            const meta = CATEGORY_META[id];
            const items = articleLabels.filter((article) => article.category === id);
            return (
              <div
                key={id}
                id={`cat-${id}`}
                className="scroll-mt-24 rounded-3xl border border-cb-border bg-cb-surface p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex h-10 w-10 items-center justify-center rounded-2xl",
                      meta.iconBg,
                    )}
                  >
                    <meta.Icon className={cn("h-5 w-5", meta.iconColor)} aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-serif text-lg font-semibold text-cb-text-strong">
                      {t(`pages.help.categories.${id}.title`)}
                    </h2>
                    <p className="text-xs text-cb-text-muted">
                      {t(`pages.help.categories.${id}.description`)}
                    </p>
                  </div>
                </div>
                <ul className="mt-5 divide-y divide-cb-border">
                  {items.map((article) => (
                    <li key={article.key}>
                      <Link
                        href={article.href}
                        className="group flex items-center justify-between gap-3 py-3 text-sm font-medium text-cb-text-strong transition hover:text-cb-terracotta-dark"
                      >
                        <span className="truncate">{article.label}</span>
                        <ArrowUpRight
                          className={cn(
                            "h-4 w-4 shrink-0 text-cb-text-muted transition group-hover:text-cb-terracotta-dark",
                            isRtl && "rotate-90",
                          )}
                          aria-hidden
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular questions */}
      <section className="mx-auto mt-16 max-w-6xl px-4 lg:px-6">
        <SectionHeading
          align="start"
          eyebrow={t("pages.help.popularEyebrow")}
          title={t("pages.help.popularTitle")}
        />
        <ul className="mt-2 grid gap-3 sm:grid-cols-2">
          {popularArticles.map((article) => (
            <li key={article.key}>
              <Link
                href={article.href}
                className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-cb-border bg-cb-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cb-terracotta-dark">
                    {article.categoryLabel}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-cb-text-strong">
                    {article.label}
                  </p>
                </div>
                <Sparkles className="h-4 w-4 shrink-0 text-cb-mint transition group-hover:scale-110" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-center">
          <Link
            href="/help/faq"
            className="inline-flex items-center gap-2 rounded-full border border-cb-border bg-cb-surface px-5 py-2 text-sm font-semibold text-cb-text-strong transition hover:border-cb-terracotta-dark hover:text-cb-terracotta-dark"
          >
            {t("pages.help.popularViewAll")}
            <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} aria-hidden />
          </Link>
        </div>
      </section>

      {/* Self-service quick actions */}
      <section className="mx-auto mt-16 max-w-6xl px-4 lg:px-6">
        <SectionHeading
          align="start"
          eyebrow={t("pages.help.selfServiceEyebrow")}
          title={t("pages.help.selfServiceTitle")}
        />
        <ul className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { id: "account", href: "/account", Icon: UserRound },
            { id: "checkout", href: "/checkout", Icon: ShoppingCart },
            { id: "shop", href: "/shop", Icon: ShoppingBag },
            { id: "giftBoxes", href: "/gift-box", Icon: Gift },
          ].map((action) => (
            <li key={action.id}>
              <Link
                href={action.href}
                className="group flex h-full flex-col rounded-3xl border border-cb-border bg-cb-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cb-terracotta/10 text-cb-terracotta-dark">
                  <action.Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-serif text-base font-semibold text-cb-text-strong">
                  {t(`pages.help.selfService.${action.id}.title`)}
                </h3>
                <p className="mt-1 text-sm text-cb-text-muted">
                  {t(`pages.help.selfService.${action.id}.description`)}
                </p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cb-terracotta-dark">
                  {t("pages.help.searchOpen")}
                  <ArrowRight
                    className={cn("h-4 w-4 transition group-hover:translate-x-1", isRtl && "rotate-180")}
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Contact strip */}
      <section className="mx-auto mt-20 max-w-6xl px-4 lg:px-6">
        <div className="overflow-hidden rounded-3xl border border-cb-border bg-gradient-to-br from-cb-terracotta-dark to-cb-terracotta px-6 py-10 text-cb-cream shadow-md md:px-10 md:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cb-cream/80">
                {t("pages.help.contactEyebrow")}
              </p>
              <h2 className="mt-3 font-serif text-2xl font-semibold sm:text-3xl">
                {t("pages.help.contactTitle")}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-cb-cream/85 sm:text-base">
                {t("pages.help.contactSubtitle")}
              </p>
              <div className="mt-6">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full bg-cb-cream px-5 py-2.5 text-sm font-semibold text-cb-terracotta-dark transition hover:bg-white"
                >
                  {t("pages.help.contactForm")}
                  <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} aria-hidden />
                </Link>
              </div>
            </div>
            <ul className="grid gap-3 sm:grid-cols-1">
              <li>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-2xl bg-cb-cream/10 p-4 backdrop-blur transition hover:bg-cb-cream/15"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cb-cream/20 text-cb-cream">
                    <MessageCircle className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-cb-cream">{t("pages.help.contactWhatsapp")}</p>
                    <p className="text-xs text-cb-cream/75">{t("pages.help.contactWhatsappSub")}</p>
                  </div>
                  <ArrowUpRight
                    className={cn(
                      "h-4 w-4 text-cb-cream/80 transition group-hover:text-cb-cream",
                      isRtl && "rotate-90",
                    )}
                    aria-hidden
                  />
                </a>
              </li>
              <li>
                <a
                  href={`tel:${phoneTel}`}
                  className="group flex items-center gap-4 rounded-2xl bg-cb-cream/10 p-4 backdrop-blur transition hover:bg-cb-cream/15"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cb-cream/20 text-cb-cream">
                    <Phone className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-cb-cream">{t("pages.help.contactPhone")}</p>
                    <p className="text-xs text-cb-cream/75">{businessHours}</p>
                  </div>
                  <ArrowUpRight
                    className={cn(
                      "h-4 w-4 text-cb-cream/80 transition group-hover:text-cb-cream",
                      isRtl && "rotate-90",
                    )}
                    aria-hidden
                  />
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${BRAND.ordersEmail}`}
                  className="group flex items-center gap-4 rounded-2xl bg-cb-cream/10 p-4 backdrop-blur transition hover:bg-cb-cream/15"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cb-cream/20 text-cb-cream">
                    <Mail className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-cb-cream">{t("pages.help.contactEmail")}</p>
                    <p className="text-xs text-cb-cream/75">{t("pages.help.contactEmailSub")}</p>
                  </div>
                  <ArrowUpRight
                    className={cn(
                      "h-4 w-4 text-cb-cream/80 transition group-hover:text-cb-cream",
                      isRtl && "rotate-90",
                    )}
                    aria-hidden
                  />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
