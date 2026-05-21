"use client";

import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Download,
  Globe,
  Lock,
  Mail,
  MapPin,
  Shield,
  Smartphone,
} from "lucide-react";
import { AccountSidebar } from "@/components/account/account-sidebar";
import { LanguageToggle } from "@/components/layout/language-toggle";
import { clerkAuthAppearance } from "@/components/auth/clerk-auth-appearance";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const NOTIFICATION_PREFS_KEY = "cb-account-notification-prefs";

type NotificationPrefs = {
  orderUpdates: boolean;
  promotions: boolean;
  loyalty: boolean;
};

const defaultNotificationPrefs: NotificationPrefs = {
  orderUpdates: true,
  promotions: false,
  loyalty: true,
};

type AccountSettingsClientProps = {
  userName: string;
  userEmail: string | null;
  avatarUrl: string | null;
  roleLabel: string;
  showAdminLinks: boolean;
};

function SettingsSection({
  id,
  title,
  description,
  children,
  icon: Icon,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-3xl bg-cb-surface-elevated p-6 shadow-sm ring-1 ring-cb-border"
    >
      <div className="mb-5 flex items-start gap-3">
        {Icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cb-peach/50 text-cb-terracotta-dark ring-1 ring-cb-border/60">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        ) : null}
        <div>
          <h2 className="font-serif text-xl font-semibold text-cb-text-strong">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-cb-text-muted">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function AccountSettingsClient({
  userName,
  userEmail,
  avatarUrl,
  roleLabel,
  showAdminLinks,
}: AccountSettingsClientProps) {
  const { t } = useLanguage();
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultNotificationPrefs);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (raw) setPrefs({ ...defaultNotificationPrefs, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const savePrefs = useCallback((next: NotificationPrefs) => {
    setPrefs(next);
    try {
      localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const togglePref = useCallback(
    (key: keyof NotificationPrefs) => {
      savePrefs({ ...prefs, [key]: !prefs[key] });
    },
    [prefs, savePrefs],
  );

  const onExportData = useCallback(async () => {
    setExporting(true);
    setExportMessage(null);
    try {
      const res = await fetch("/api/account/data-export", { cache: "no-store" });
      if (!res.ok) throw new Error("export failed");
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cookie-bite-account-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage(t("accountSettings.exportSuccess"));
    } catch {
      setExportMessage(t("accountSettings.exportError"));
    } finally {
      setExporting(false);
    }
  }, [t]);

  const profileAppearance = {
    ...clerkAuthAppearance,
    elements: {
      ...clerkAuthAppearance.elements,
      rootBox: "mx-auto w-full max-w-full",
      card: [
        "shadow-none w-full max-w-full rounded-2xl",
        "bg-cb-surface ring-1 ring-cb-border",
        "overflow-x-hidden",
      ].join(" "),
      navbar: "rounded-xl bg-cb-cream/80 dark:bg-cb-surface-2/80",
      navbarButton:
        "text-cb-text-strong text-sm font-semibold data-[active=true]:bg-cb-terracotta-dark data-[active=true]:text-white rounded-lg",
      pageScrollBox: "max-h-none",
      profileSectionTitle: "font-serif text-lg font-semibold text-cb-text-strong",
      formFieldLabel: "text-xs font-bold uppercase tracking-wide text-cb-text-strong",
    },
  };

  return (
    <div className="bg-cb-cream pb-24 pt-8 dark:bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 cb-gutter lg:flex-row">
        <AccountSidebar
          userName={userName}
          userEmail={userEmail}
          avatarUrl={avatarUrl}
          roleLabel={roleLabel}
          showAdminLinks={showAdminLinks}
        />

        <div className="min-w-0 flex-1 space-y-6">
          <header className="rounded-3xl border border-cb-peach-deep/40 bg-gradient-to-br from-cb-surface via-cb-cream to-cb-peach/25 p-6 shadow-sm ring-1 ring-cb-border/50">
            <p className="text-xs font-bold uppercase tracking-wider text-cb-terracotta-dark">
              {t("accountSettings.eyebrow")}
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-cb-text-strong md:text-4xl">
              {t("accountSettings.title")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cb-text-muted">
              {t("accountSettings.subtitle")}
            </p>
          </header>

          <SettingsSection
            id="preferences"
            title={t("accountSettings.preferencesTitle")}
            description={t("accountSettings.preferencesDesc")}
            icon={Globe}
          >
            <div className="max-w-md">
              <div className="rounded-2xl border border-cb-border bg-cb-cream/50 p-4 dark:bg-cb-surface-2/50">
                <p className="text-sm font-semibold text-cb-text-strong">
                  {t("accountSettings.languageLabel")}
                </p>
                <p className="mt-1 text-xs text-cb-text-muted">
                  {t("accountSettings.languageHint")}
                </p>
                <div className="mt-3">
                  <LanguageToggle />
                </div>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            id="notifications"
            title={t("accountSettings.notificationsTitle")}
            description={t("accountSettings.notificationsDesc")}
            icon={Bell}
          >
            <ul className="space-y-3">
              {(
                [
                  { key: "orderUpdates" as const, icon: Mail },
                  { key: "loyalty" as const, icon: Smartphone },
                  { key: "promotions" as const, icon: Bell },
                ] as const
              ).map(({ key, icon: Icon }) => (
                <li
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-cb-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-cb-terracotta-dark" aria-hidden />
                    <div>
                      <p className="text-sm font-semibold text-cb-text-strong">
                        {t(`accountSettings.notif.${key}.title`)}
                      </p>
                      <p className="text-xs text-cb-text-muted">
                        {t(`accountSettings.notif.${key}.desc`)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[key]}
                    onClick={() => togglePref(key)}
                    className={cn(
                      "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                      prefs[key] ? "bg-cb-terracotta-dark" : "bg-cb-border",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                        prefs[key] ? "start-5" : "start-0.5",
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-cb-text-muted">{t("accountSettings.notifLocalHint")}</p>
          </SettingsSection>

          <SettingsSection
            id="security"
            title={t("accountSettings.securityTitle")}
            description={t("accountSettings.securityDesc")}
            icon={Lock}
          >
            <div className="min-h-[28rem] w-full overflow-hidden rounded-2xl border border-cb-border bg-cb-surface">
              <UserProfile routing="path" path="/account/settings" appearance={profileAppearance} />
            </div>
          </SettingsSection>

          <SettingsSection
            id="shortcuts"
            title={t("accountSettings.shortcutsTitle")}
            description={t("accountSettings.shortcutsDesc")}
            icon={MapPin}
          >
            <div className="flex flex-wrap gap-3">
              <Link
                href="/account#addresses"
                className="rounded-xl border border-cb-border bg-cb-cream px-4 py-2.5 text-sm font-semibold text-cb-text-strong hover:bg-cb-peach/50"
              >
                {t("accountNav.addresses")}
              </Link>
              <Link
                href="/account#orders"
                className="rounded-xl border border-cb-border bg-cb-cream px-4 py-2.5 text-sm font-semibold text-cb-text-strong hover:bg-cb-peach/50"
              >
                {t("accountNav.orders")}
              </Link>
              <Link
                href="/account#pay"
                className="rounded-xl border border-cb-border bg-cb-cream px-4 py-2.5 text-sm font-semibold text-cb-text-strong hover:bg-cb-peach/50"
              >
                {t("accountNav.payment")}
              </Link>
            </div>
          </SettingsSection>

          <SettingsSection
            id="privacy"
            title={t("accountSettings.privacyTitle")}
            description={t("accountSettings.privacyDesc")}
            icon={Shield}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => void onExportData()}
                disabled={exporting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cb-terracotta-dark px-5 py-2.5 text-sm font-bold text-white hover:bg-cb-brand-logo disabled:opacity-60"
              >
                <Download className="h-4 w-4" aria-hidden />
                {exporting ? t("accountSettings.exporting") : t("accountSettings.exportCta")}
              </button>
              <Link
                href="/privacy"
                className="inline-flex items-center justify-center rounded-xl border border-cb-border px-5 py-2.5 text-sm font-semibold text-cb-text-strong hover:bg-cb-peach/40"
              >
                {t("footer.privacyPolicy")}
              </Link>
            </div>
            {exportMessage ? (
              <p className="mt-3 text-sm font-medium text-cb-terracotta-dark">{exportMessage}</p>
            ) : null}
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
