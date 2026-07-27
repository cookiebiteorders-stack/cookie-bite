import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/supabase-auth";
import { Heart, MapPin, Package, Star } from "lucide-react";

import { AccountHashScroll } from "@/components/account/account-hash-scroll";
import { AccountOrdersList } from "@/components/account/account-orders-list";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { AccountTestimonialForm } from "@/components/account/account-testimonial-form";
import { LoyaltyDashboard } from "@/components/account/loyalty-dashboard";
import { buttonClassName } from "@/components/ui/button";
import { getAccessibleAdminConsoleNav } from "@/lib/admin/admin-console-nav";
import { resolveStaffRole } from "@/lib/admin/auth-role";
import { getRoleLabel, type UserRole } from "@/lib/admin/rbac";
import {
  ACCOUNT_ROLE_DASHBOARD_COPY,
} from "@/lib/account/account-role-dashboard";
import { tryCreateSupabaseAdminClient } from "@/lib/supabase/admin";
import { mapOrderRowToAccountOrder } from "@/lib/account/map-order-row";
import { formatPaymentMethodSummary } from "@/lib/account/payment-method-display";
import { countAddressesForUser } from "@/lib/db/addresses";
import {
  countPaymentMethodsForUser,
  listPaymentMethodsForUser,
  type SavedPaymentMethodRow,
} from "@/lib/db/payment-methods";
import { countOrdersForUser, listRecentOrdersForUser } from "@/lib/db/orders";
import { requireCustomerProfileComplete } from "@/lib/account/require-complete-profile";
import { trySendWelcomeEmailOnce } from "@/lib/email/welcome-onboarding";
import { getUserBySupabaseId } from "@/lib/db/users";
import { cn } from "@/lib/utils";
import { buildPageMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";
import { getServerT } from "@/lib/i18n/server-translate";

export const metadata: Metadata = buildPageMetadata({
  title: "My Account Dashboard",
  description:
    "Manage your Cookie Bite account, orders, wishlist, addresses, and loyalty rewards from one personalized dashboard.",
  path: "/account",
  keywords: ["cookie bite account", "order history", "loyalty points dashboard"],
  noIndex: true,
});

function resolveAccountRole(
  dbUser: { role: UserRole } | null,
  email: string | null,
  supabaseUserId: string,
): Promise<UserRole> {
  if (
    dbUser &&
    (dbUser.role === "owner" ||
      dbUser.role === "admin" ||
      dbUser.role === "staff" ||
      dbUser.role === "customer")
  ) {
    return Promise.resolve(dbUser.role);
  }
  return resolveStaffRole({ email, supabaseUserId: supabaseUserId });
}

type ProductImageItem = { url?: string | null };
type WishlistProduct = {
  id?: string;
  slug?: string | null;
  name?: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  price_egp?: number | null;
  image_url?: string | null;
  images?: ProductImageItem[] | null;
  is_active?: boolean;
};
type WishlistItem = { id: string; product?: WishlistProduct | null };
type AddressItem = {
  id: string;
  label?: string | null;
  recipient?: string | null;
  phone?: string | null;
  city?: string | null;
  governorate?: string | null;
  street?: string | null;
  is_default?: boolean | null;
};
type NotificationItem = {
  id: string;
  title?: string | null;
  body?: string | null;
  href?: string | null;
  created_at?: string | null;
};
type TestimonialItem = {
  id: string;
  rating?: number | null;
  comment?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export default async function AccountPage() {
  const lang = await getLangFromCookies();
  const t = getServerT(lang);
  const { userId, user } = await auth();
  if (!userId || !user) {
    redirect("/sign-in?redirect_url=/account");
  }

  const email = user.email ?? null;
  const fullName = user.user_metadata?.full_name ?? email ?? t("accountDashboard.defaultFriend");

  let dbUser = await requireCustomerProfileComplete(userId, {
    email,
    fullName,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
  });
  const createdDbUserThisVisit = false;

  if (dbUser && email && !dbUser.welcome_email_sent_at) {
    try {
      await trySendWelcomeEmailOnce({
        userId: dbUser.id,
        to: email,
        name: fullName ?? undefined,
        force: createdDbUserThisVisit,
        createdAt: dbUser.created_at,
      });
    } catch (err) {
      console.error("AccountPage welcome email failed:", err);
    }
  }

  const accountRole = await resolveAccountRole(dbUser, email, userId);
  const adminSidebarLinks =
    accountRole !== "customer" ? getAccessibleAdminConsoleNav(accountRole) : [];
  const roleCopy = ACCOUNT_ROLE_DASHBOARD_COPY[accountRole];

  const [orders, orderCount, addressCount, paymentMethodCount, paymentMethodsItems] =
    await Promise.all([
      dbUser ? listRecentOrdersForUser(dbUser.id, 3) : [],
      dbUser ? countOrdersForUser(dbUser.id) : 0,
      dbUser ? countAddressesForUser(dbUser.id) : 0,
      dbUser ? countPaymentMethodsForUser(dbUser.id) : 0,
      dbUser ? listPaymentMethodsForUser(dbUser.id) : [],
    ]);

  const supabase = dbUser ? tryCreateSupabaseAdminClient() : null;
  const [loyaltyAccount, wishlistItems, addressesItems, notificationsItems, testimonialItems] =
    await Promise.all([
      !supabase
        ? Promise.resolve(null)
        : (async () => {
          const { data } = await supabase
            .from("loyalty_accounts")
            .select("*")
            .eq("user_id", dbUser!.id)
            .maybeSingle();

          if (data) return data;

          const { data: inserted } = await supabase
            .from("loyalty_accounts")
            .upsert(
              {
                user_id: dbUser!.id,
                total_points: 0,
                lifetime_points: 0,
                tier: "cookie_lover",
              },
              { onConflict: "user_id" },
            )
            .select("*")
            .single();

          return inserted ?? null;
        })(),
      !supabase
        ? Promise.resolve([])
        : supabase
          .from("wishlists")
          .select(
            "id, created_at, product:products(id,slug,name,title_en,title_ar,price_egp,image_url,images,is_active)",
          )
          .eq("user_id", dbUser!.id)
          .order("created_at", { ascending: false })
          .limit(6)
          .then((r) => r.data ?? []),
      !supabase
        ? Promise.resolve([])
        : supabase
          .from("addresses")
          .select(
            "id, label, recipient, full_name, phone, city, area, governorate, street, is_default",
          )
          .eq("user_id", dbUser!.id)
          .order("created_at", { ascending: false })
          .limit(3)
          .then((r) =>
            (r.data ?? []).map((row) => ({
              ...row,
              recipient: row.recipient ?? row.full_name ?? null,
              city: row.city ?? row.area ?? null,
            })),
          ),
      !supabase
        ? Promise.resolve([])
        : supabase
          .from("notifications_log")
          .select("id, title, body, href, created_at")
          .eq("recipient_user_id", dbUser!.id)
          .order("created_at", { ascending: false })
          .limit(3)
          .then((r) => r.data ?? []),
      !supabase
        ? Promise.resolve([])
        : supabase
          .from("customer_testimonials")
          .select("id, rating, comment, status, created_at")
          .eq("user_id", dbUser!.id)
          .order("created_at", { ascending: false })
          .limit(8)
          .then((r) => r.data ?? []),
    ]);

  const loyaltyPoints = Number(loyaltyAccount?.total_points ?? dbUser?.points ?? 0);
  const loyaltyTier: string = loyaltyAccount?.tier ?? "cookie_lover";
  const nextTierPoints =
    loyaltyTier === "cookie_monster"
      ? 0
      : loyaltyTier === "cruncher"
        ? Math.max(0, 1000 - loyaltyPoints)
        : Math.max(0, 500 - loyaltyPoints);
  const loyaltyThreshold =
    loyaltyTier === "cookie_monster" ? 1 : loyaltyTier === "cruncher" ? 1000 : 500;
  const loyaltyProgressPercent =
    loyaltyTier === "cookie_monster"
      ? 100
      : Math.min(100, (loyaltyPoints / loyaltyThreshold) * 100);

  const getProductImage = (p?: WishlistProduct | null): string | null => {
    if (typeof p?.image_url === "string" && p.image_url) return p.image_url;
    if (Array.isArray(p?.images) && p.images.length > 0 && p.images[0]?.url) {
      return String(p.images[0].url);
    }
    return null;
  };

  const tierLabel =
    loyaltyTier === "cookie_monster"
      ? t("accountDashboard.tierCookieMonster")
      : loyaltyTier === "cruncher"
        ? t("accountDashboard.tierCruncher")
        : t("accountDashboard.tierCookieLover");

  return (
    <div className="bg-cb-cream pb-20 pt-8">
      <AccountHashScroll />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 cb-gutter lg:flex-row">
        <AccountSidebar
          userName={fullName}
          userEmail={email}
          avatarUrl={user?.user_metadata?.avatar_url ?? null}
          roleLabel={
            accountRole === "customer" ? t("accountDashboard.member") : getRoleLabel(accountRole)
          }
          showAdminLinks={adminSidebarLinks.length > 0}
          adminConsoleLinks={adminSidebarLinks}
        />

        <div className="min-w-0 flex-1 space-y-8">
          <section
            className={cn(
              "rounded-3xl border border-cb-peach-deep/50 bg-gradient-to-br from-cb-surface via-cb-cream to-cb-peach/30 p-6 shadow-sm ring-1 ring-cb-border/50",
              "dark:from-cb-surface-elevated dark:via-cb-surface dark:to-cb-peach-deep/20",
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cb-terracotta-dark">
                  {accountRole === "customer" ? t("accountDashboard.member") : getRoleLabel(accountRole)}
                </p>
                <h2 className="mt-1 font-serif text-xl font-semibold text-cb-text-strong sm:text-2xl">
                  {lang === "ar" ? roleCopy.titleAr : roleCopy.titleEn}
                  {lang === "en" ? (
                    <span className="mt-1 block text-base font-normal text-cb-text-muted sm:text-lg">
                      {roleCopy.titleAr}
                    </span>
                  ) : null}
                </h2>
              </div>
              {accountRole !== "customer" ? (
                <Link
                  href="/admin"
                  className={buttonClassName(
                    "primary",
                    "shrink-0 self-start rounded-full px-6 py-3 text-sm",
                  )}
                >
                  {t("accountDashboard.adminConsole")}
                </Link>
              ) : null}
            </div>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {(lang === "ar" ? roleCopy.perksAr : roleCopy.perksEn).map((perk, i) => (
                <li
                  key={perk}
                  className="rounded-2xl bg-cb-surface/90 p-4 ring-1 ring-cb-border/50 dark:bg-cb-surface-2/80"
                >
                  <p className="text-sm font-medium text-cb-text-strong">{perk}</p>
                  {lang === "en" ? (
                    <p className="mt-1 text-xs leading-relaxed text-cb-text-muted">
                      {roleCopy.perksAr[i] ?? ""}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="overflow-hidden rounded-3xl bg-cb-surface-elevated shadow-sm ring-1 ring-cb-border">
            <div className="grid gap-6 p-6 lg:grid-cols-2 lg:items-center">
              <div>
                <h1 className="font-serif text-3xl font-semibold text-cb-text-strong">
                  {t("accountDashboard.welcome", { name: fullName.split(' ')[0] ?? fullName })}
                </h1>
                <p className="mt-2 text-cb-text-muted">
                  {accountRole !== "customer"
                    ? t("accountDashboard.welcomeSubStaff")
                    : t("accountDashboard.welcomeSubCustomer")}
                </p>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: t("accountDashboard.statOrders"), value: String(orderCount), icon: Package },
                    { label: t("accountDashboard.statPoints"), value: String(loyaltyPoints), icon: Star },
                    { label: t("accountDashboard.statAddresses"), value: String(addressCount), icon: MapPin },
                    { label: t("accountDashboard.statWishlist"), value: String(wishlistItems.length), icon: Heart },
                  ].map(({ label, value, icon: Icon }) => (
                    <div
                      key={label}
                      className="rounded-2xl bg-cb-cream px-3 py-4 text-center ring-1 ring-cb-border/40"
                    >
                      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-cb-surface shadow-sm ring-1 ring-cb-border/60">
                        <Icon className="h-4 w-4 text-cb-terracotta-dark" aria-hidden />
                      </div>
                      <p className="mt-3 text-2xl font-bold text-cb-terracotta-dark">
                        {value}
                      </p>
                      <p className="text-xs text-cb-text-muted">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative aspect-video overflow-hidden rounded-2xl bg-cb-peach/40">
                <Image
                  src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80"
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width:1024px) 100vw, (max-width:1280px) 50vw, 40vw"
                />
              </div>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section
              id="orders"
              className="scroll-mt-28 rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-cb-text-strong">{t("accountDashboard.recentOrders")}</h2>
                  <p className="mt-1 text-xs text-cb-text-muted">
                    {orders.length
                      ? t("accountDashboard.ordersShowing", { count: orders.length })
                      : t("accountDashboard.ordersEmpty")}
                  </p>
                </div>
                {orderCount > 0 ? (
                  <Link
                    href="/account/orders"
                    className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
                  >
                    {t("accountDashboard.viewAllOrders")}
                  </Link>
                ) : (
                  <Link
                    href="/shop"
                    className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
                  >
                    {t("accountDashboard.explore")}
                  </Link>
                )}
              </div>

              <AccountOrdersList
                orders={orders.map(mapOrderRowToAccountOrder)}
              />
            </section>

            <section
              id="rewards"
              className="scroll-mt-28 rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
            >
              <LoyaltyDashboard
                initialPoints={loyaltyPoints}
                initialTier={loyaltyTier}
                tierLabel={tierLabel}
                progressPercent={loyaltyProgressPercent}
                nextTierPoints={nextTierPoints}
                isTopTier={loyaltyTier === "cookie_monster"}
              />
            </section>
          </div>

          <section
            id="addresses"
            className="scroll-mt-28 rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-cb-text-strong">
                  {t("accountDashboard.addressesTitle")}
                </h2>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {addressesItems.length
                    ? t("accountDashboard.addressesSaved", { count: addressesItems.length })
                    : t("accountDashboard.addressesEmpty")}
                </p>
              </div>
              <Link
                href="/account/addresses"
                className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
              >
                {addressCount > 0
                  ? t("accountDashboard.manageAddresses")
                  : t("accountDashboard.addAddress")}
              </Link>
            </div>

            {addressesItems.length ? (
              <div className="space-y-3">
                {(addressesItems as AddressItem[]).map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-cb-border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-cb-text-strong">
                        {a.label ?? a.recipient ?? t("accountDashboard.addressFallback")}
                      </p>
                      {a.is_default ? (
                        <span className="rounded-full bg-cb-peach px-2 py-0.5 text-[10px] font-bold text-cb-terracotta-dark">
                          {t("accountDashboard.addressDefault")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-cb-text-muted">
                      {a.recipient} · {a.phone}
                    </p>
                    <p className="mt-1 text-xs text-cb-text-muted">
                      {a.street}, {a.city ?? a.governorate}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-cb-cream p-6 text-center">
                <p className="text-sm font-semibold text-cb-text-strong">
                  {t("accountDashboard.addressesReadyTitle")}
                </p>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {t("accountDashboard.addressesReadyBody")}
                </p>
              </div>
            )}
          </section>

          <section
            id="pay"
            className="scroll-mt-28 rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-cb-text-strong">
                  {t("accountDashboard.paymentTitle")}
                </h2>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {paymentMethodsItems.length
                    ? t("accountDashboard.paymentMethodsSaved", {
                        count: paymentMethodsItems.length,
                      })
                    : t("accountDashboard.paymentMethodsEmpty")}
                </p>
              </div>
              <Link
                href="/account/payment-methods"
                className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
              >
                {paymentMethodCount > 0
                  ? t("accountDashboard.managePaymentMethods")
                  : t("accountDashboard.addPaymentMethod")}
              </Link>
            </div>

            {paymentMethodsItems.length ? (
              <div className="space-y-3">
                {(paymentMethodsItems as SavedPaymentMethodRow[]).map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-cb-border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-cb-text-strong">
                        {formatPaymentMethodSummary(m, t)}
                      </p>
                      {m.is_default ? (
                        <span className="rounded-full bg-cb-peach px-2 py-0.5 text-[10px] font-bold text-cb-terracotta-dark">
                          {t("accountPaymentMethods.defaultBadge")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-cb-cream p-6 text-center">
                <p className="text-sm font-semibold text-cb-text-strong">
                  {t("accountDashboard.paymentMethodsReadyTitle")}
                </p>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {t("accountDashboard.paymentMethodsReadyBody")}
                </p>
              </div>
            )}
          </section>

          <section
            id="notifications"
            className="scroll-mt-28 rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-cb-text-strong">
                  {t("accountDashboard.notificationsTitle")}
                </h2>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {notificationsItems.length
                    ? t("accountDashboard.notificationsRecent", {
                        count: notificationsItems.length,
                      })
                    : t("accountDashboard.notificationsEmpty")}
                </p>
              </div>
              <Link
                href="/contact"
                className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
              >
                {t("accountDashboard.support")}
              </Link>
            </div>

            {notificationsItems.length ? (
              <ul className="space-y-3">
                {(notificationsItems as NotificationItem[]).map((n) => (
                  <li
                    key={n.id}
                    className="rounded-2xl border border-cb-border p-4"
                  >
                    <p className="text-sm font-semibold text-cb-text-strong">
                      {n.title ?? t("accountDashboard.updateFallback")}
                    </p>
                    <p className="mt-1 text-xs text-cb-text-muted">
                      {n.body ?? ""}
                    </p>
                    <p className="mt-2 text-[11px] text-cb-text-muted">
                      {n.created_at
                        ? new Date(n.created_at).toLocaleString()
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl bg-cb-cream p-6 text-center">
                <p className="text-sm font-semibold text-cb-text-strong">
                  {t("accountDashboard.notificationsQuietTitle")}
                </p>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {t("accountDashboard.notificationsQuietBody")}
                </p>
              </div>
            )}
          </section>


          <AccountTestimonialForm
            enabled={Boolean(dbUser)}
            initialItems={(testimonialItems as TestimonialItem[]).map((t) => ({
              id: t.id,
              rating: Number(t.rating ?? 5),
              comment: t.comment ?? "",
              status: t.status ?? "pending",
              created_at: t.created_at ?? null,
            }))}
          />

          <section
            id="wish"
            className="scroll-mt-28 rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-cb-text-strong">{t("accountDashboard.wishlistTitle")}</h2>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {wishlistItems.length
                    ? t("accountDashboard.wishlistSaved", { count: wishlistItems.length })
                    : t("accountDashboard.wishlistEmptyShort")}
                </p>
              </div>
              <Link
                href="/shop"
                className="text-xs font-semibold text-cb-terracotta-dark hover:underline"
              >
                {t("accountDashboard.browse")}
              </Link>
            </div>

            {wishlistItems.length ? (
              <div className="grid gap-4 sm:grid-cols-3">
                {(wishlistItems as WishlistItem[]).map((w) => {
                  const p = w.product;
                  const img = getProductImage(p);
                  const title =
                    p?.title_ar ?? p?.title_en ?? p?.name ?? p?.slug ?? "Product";
                  const slug = p?.slug;
                  return (
                    <Link
                      key={w.id}
                      href={slug ? `/shop/${slug}` : "/shop"}
                      className="group rounded-2xl border border-cb-border p-3 transition hover:-translate-y-0.5"
                    >
                      <div className="flex items-center gap-3">
                        {img ? (
                          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-cb-peach/40">
                            <Image
                              src={img}
                              alt={title}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-cb-peach/40 text-xs font-bold text-cb-terracotta-dark">
                            CB
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-cb-text-strong">
                            {title}
                          </p>
                          <p className="mt-1 text-xs font-bold text-cb-terracotta-dark">
                            {p?.price_egp != null ? `${p.price_egp} EGP` : ""}
                          </p>
                        </div>
                        <Heart className="h-4 w-4 shrink-0 text-cb-terracotta-dark" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-cb-cream p-6 text-center">
                <p className="text-sm font-semibold text-cb-text-strong">
                  Save your favorites
                </p>
                <p className="mt-1 text-xs text-cb-text-muted">
                  Tap the heart on products to keep them here.
                </p>
                <Link
                  href="/shop"
                  className={buttonClassName("primary", "mt-4 inline-flex")}
                >
                  Explore products
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
