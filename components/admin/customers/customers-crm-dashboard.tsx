"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { motion, useReducedMotion } from "motion/react";
import { Loader2, Mail, RefreshCw, Sparkles, UserPlus, Users, Zap } from "lucide-react";
import { useCustomersCrmStore } from "@/stores/customers-crm-store";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";
import { fetchJson } from "@/lib/http/fetch-json";
import { CrmHeroStats } from "@/components/admin/customers/crm-hero-stats";
import { CrmAnalyticsStrip } from "@/components/admin/customers/crm-analytics-strip";
import { CrmMainWorkspace } from "@/components/admin/customers/crm-main-workspace";
import { CustomerProfileDrawer } from "@/components/admin/customers/customer-profile-drawer";
import { CrmCommandPalette } from "@/components/admin/customers/crm-command-palette";
import { CrmToasts } from "@/components/admin/customers/crm-toasts";
import { ImportExportToolbar } from "@/components/admin/import-export/import-export-toolbar";
import { ExportModal } from "@/components/admin/import-export/export-modal";
import { CrmCampaignModal } from "@/components/admin/customers/crm-campaign-modal";
import {
  CrmQuickActionsMenu,
  type QuickActionId,
} from "@/components/admin/customers/crm-quick-actions-menu";

export function CustomersCrmDashboard() {
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const searchRef = useRef<HTMLInputElement>(null);
  const loadCustomers = useCustomersCrmStore((s) => s.loadCustomers);
  const customers = useCustomersCrmStore((s) => s.customers);
  const stats = useCustomersCrmStore((s) => s.stats);
  const online = useCustomersCrmStore((s) => s.online);
  const pushToast = useCustomersCrmStore((s) => s.pushToast);
  const setAdvancedFiltersOpen = useCustomersCrmStore((s) => s.setAdvancedFiltersOpen);
  const page = useCustomersCrmStore((s) => s.page);
  const search = useCustomersCrmStore((s) => s.search);
  const tierFilter = useCustomersCrmStore((s) => s.tierFilter);
  const segmentFilter = useCustomersCrmStore((s) => s.segmentFilter);
  const pointsMin = useCustomersCrmStore((s) => s.pointsMin);
  const pointsMax = useCustomersCrmStore((s) => s.pointsMax);
  const limit = useCustomersCrmStore((s) => s.limit);
  const meta = useCustomersCrmStore((s) => s.meta);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const canWrite = Boolean(meta?.can_write);

  const openProfile = useCallback((id: string) => {
    setProfileId(id);
    setProfileOpen(true);
  }, []);

  const recipientEmails = customers.map((c) => c.email);

  const runSync = useCallback(async () => {
    if (!canWrite) {
      pushToast("صلاحية الكتابة مطلوبة للمزامنة.", "error");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetchJson<{
        message?: { ar?: string };
        customers: number;
        resendSynced: number;
      }>("/api/admin/customers/sync", { method: "POST" });
      await loadCustomers();
      pushToast(res.message?.ar ?? `تمت مزامنة ${res.customers} عميل.`, "success");
    } catch (e) {
      pushToast(e instanceof Error ? e.message : "فشلت المزامنة", "error");
    } finally {
      setSyncing(false);
    }
  }, [canWrite, loadCustomers, pushToast]);

  const aiBatchInsight = useCallback(() => {
    const atRisk = stats.at_risk_proxy;
    const vip = stats.vip_gold_plus;
    pushToast(
      `رؤى سريعة: ~${atRisk} عميل بحاجة تدخل احتفاظ، و${vip} عميل VIP/ذهبي — رتّب حملة ولاء هذا الأسبوع.`,
      "info",
    );
  }, [pushToast, stats.at_risk_proxy, stats.vip_gold_plus]);

  const handleQuickAction = useCallback(
    (id: QuickActionId) => {
      switch (id) {
        case "bulk_email":
          setCampaignOpen(true);
          break;
        case "bulk_sms":
          pushToast("SMS: فعّل مزوّد Sinch من الإعدادات لإرسال رسائل جماعية.", "info");
          break;
        case "tags":
          setAdvancedFiltersOpen(true);
          pushToast("استخدم الفلاتر المتقدمة لتجميع الشريحة ثم صدّر أو أرسل حملة.", "info");
          break;
        case "tier":
          if (customers[0]) openProfile(customers[0].id);
          else pushToast("لا يوجد عملاء في القائمة — عدّل الفلاتر.", "info");
          break;
        case "export":
          setExportModalOpen(true);
          break;
        case "insights":
          aiBatchInsight();
          break;
        default:
          break;
      }
    },
    [aiBatchInsight, customers, openProfile, pushToast, setAdvancedFiltersOpen],
  );

  useEffect(() => {
    if (searchParams.get("created")) {
      pushToast("تم إنشاء العميل بنجاح.", "success");
      router.replace("/admin/customers");
    }
  }, [searchParams, pushToast, router]);

  useEffect(() => {
    const cancel = scheduleEffectTask(() => {
      void loadCustomers();
    });
    return cancel;
  }, [loadCustomers, page, search, tierFilter, segmentFilter, pointsMin, pointsMax, limit]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadCustomers();
    }, 90_000);
    return () => window.clearInterval(id);
  }, [loadCustomers]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdkOpen((v) => !v);
      }
      if (e.key === "/" && !typing && !profileOpen && !cmdkOpen) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.key === "n" || e.key === "N") && !typing && !profileOpen && !cmdkOpen) {
        e.preventDefault();
        router.push("/admin/customers/new");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileOpen, cmdkOpen, pushToast, router]);

  return (
    <section className="relative space-y-6 pb-20" aria-labelledby="crm-dashboard-title">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "admin-panel-surface relative flex flex-col gap-4 overflow-visible rounded-2xl p-5 shadow-sm",
        )}
      >
        <div className="admin-panel-scrim" aria-hidden />
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">{t("adminHero.customers.eyebrow")}</p>
          <h1 id="crm-dashboard-title" className="mt-1 font-serif text-xl font-bold text-stone-950 sm:text-2xl">
            {t("adminHero.customers.title")}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-700">
            {t("adminHero.customers.subtitle")}
          </p>
          </div>
          <div
            className={cn(
              "inline-flex shrink-0 items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
              online
                ? "border-emerald-300/80 bg-emerald-50/90 text-emerald-900"
                : "border-amber-300/80 bg-amber-50/90 text-amber-950",
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", online ? "animate-pulse bg-emerald-500" : "bg-amber-500")} />
            {online ? t("adminStatus.dataSync") : t("adminStatus.offline")}
          </div>
        </div>
        <div className="relative z-[1] w-full overflow-x-auto">
          <div className="flex min-w-max flex-nowrap items-center gap-2 pb-1">
            <Link
              href="/admin/customers/new"
              className="admin-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
            >
              <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
              إضافة عميل
            </Link>
            <ImportExportToolbar
              module="customers"
              canWrite={canWrite}
              showHistory={false}
              buttonClassName="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
              onImportSuccess={() => void loadCustomers()}
            />
            <button
              type="button"
              disabled={!canWrite}
              onClick={() => setCampaignOpen(true)}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              حملة
            </button>
            <button
              type="button"
              onClick={() => {
                setAdvancedFiltersOpen(true);
                pushToast("أنشئ شريحة من الفلاتر المتقدمة ثم احفظ القاعدة في الـ backend.", "info");
              }}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              شريحة
            </button>
            <button
              type="button"
              disabled={syncing || !canWrite}
              onClick={() => void runSync()}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Zap className="h-4 w-4 shrink-0" aria-hidden />
              )}
              مزامنة
            </button>
            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
              تحديث
            </button>
            <CrmQuickActionsMenu onAction={handleQuickAction} />
            <button
              type="button"
              onClick={() => aiBatchInsight()}
              className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-950"
            >
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
              رؤى AI
            </button>
          </div>
        </div>
      </motion.div>

      <CrmHeroStats stats={stats} />
      <CrmAnalyticsStrip customers={customers} stats={stats} />
      <CrmMainWorkspace searchInputRef={searchRef} onOpenProfile={openProfile} />

      <CustomerProfileDrawer
        open={profileOpen}
        onOpenChange={(v) => {
          setProfileOpen(v);
          if (!v) setProfileId(null);
        }}
        customerId={profileId}
        canWrite={canWrite}
      />

      <CrmCommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        onFocusSearch={() => searchRef.current?.focus()}
        onRefresh={() => void loadCustomers()}
        onOpenAdvanced={() => setAdvancedFiltersOpen(true)}
        onExport={() => setExportModalOpen(true)}
        onAddCustomer={() => router.push("/admin/customers/new")}
        onCampaign={() => setCampaignOpen(true)}
        onAiInsight={aiBatchInsight}
      />

      <CrmCampaignModal
        open={campaignOpen}
        onClose={() => setCampaignOpen(false)}
        recipientEmails={recipientEmails}
        canWrite={canWrite}
        onSent={() => pushToast("انتهت الحملة — راجع سجل التدقيق للتفاصيل.", "success")}
      />

      <ExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        module="customers"
      />

      <CrmToasts />
    </section>
  );
}
