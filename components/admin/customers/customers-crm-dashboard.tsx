"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scheduleEffectTask } from "@/lib/react/schedule-effect-task";
import { motion, useReducedMotion } from "motion/react";
import {
  Bell,
  ChevronDown,
  Download,
  Mail,
  RefreshCw,
  Sparkles,
  Upload,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import type { AdminCustomerRow } from "@/lib/admin/crm-types";
import { useCustomersCrmStore } from "@/stores/customers-crm-store";
import { cn } from "@/lib/utils";
import { parseCsv } from "@/lib/csv/parse-csv";
import { fetchJson } from "@/lib/http/fetch-json";
import { CrmHeroStats } from "@/components/admin/customers/crm-hero-stats";
import { CrmAnalyticsStrip } from "@/components/admin/customers/crm-analytics-strip";
import { CrmMainWorkspace } from "@/components/admin/customers/crm-main-workspace";
import { CustomerProfileDrawer } from "@/components/admin/customers/customer-profile-drawer";
import { CrmCommandPalette } from "@/components/admin/customers/crm-command-palette";
import { CrmToasts } from "@/components/admin/customers/crm-toasts";

function exportCustomersCsv(rows: AdminCustomerRow[]) {
  const headers = ["id", "email", "full_name", "points", "tier", "orders", "spent", "last_order", "created_at"];
  const lines = [
    headers.join(","),
    ...rows.map((c) =>
      [
        c.id,
        `"${c.email.replace(/"/g, '""')}"`,
        `"${(c.full_name ?? "").replace(/"/g, '""')}"`,
        c.points,
        c.loyalty_tier,
        c.total_orders,
        c.total_spent_egp,
        c.last_order_at ?? "",
        c.created_at,
      ].join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-page-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CustomersCrmDashboard() {
  const reduceMotion = useReducedMotion();
  const searchRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
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
  const [quickOpen, setQuickOpen] = useState(false);

  const canWrite = Boolean(meta?.can_write);

  const openProfile = useCallback((id: string) => {
    setProfileId(id);
    setProfileOpen(true);
  }, []);

  const exportPage = useCallback(() => {
    exportCustomersCsv(customers);
    pushToast("تم تصدير الصفحة الحالية إلى CSV.", "success");
  }, [customers, pushToast]);

  const importNewsletterCsv = useCallback(
    async (file: File) => {
      const text = await file.text();
      const grid = parseCsv(text);
      if (!grid.length) {
        pushToast("ملف فارغ.", "error");
        return;
      }
      const header = grid[0]!.map((h) => h.trim().toLowerCase());
      const emailIdx = header.findIndex((h) => h === "email" || h === "e-mail");
      if (emailIdx < 0) {
        pushToast("CSV يحتاج عمود email", "error");
        return;
      }
      const emails: string[] = [];
      for (let r = 1; r < grid.length; r++) {
        const cell = grid[r]![emailIdx]?.trim();
        if (cell && cell.includes("@")) emails.push(cell);
      }
      if (!emails.length) {
        pushToast("لا توجد عناوين بريد.", "error");
        return;
      }
      try {
        await fetchJson("/api/admin/customers/import-newsletter", {
          method: "POST",
          jsonBody: { emails },
        });
        pushToast(`تم استيراد ${emails.length} بريد للحملات (اشتراك).`, "success");
      } catch (e) {
        pushToast(e instanceof Error ? e.message : "فشل الاستيراد", "error");
      }
    },
    [pushToast],
  );

  const aiBatchInsight = useCallback(() => {
    const atRisk = stats.at_risk_proxy;
    const vip = stats.vip_gold_plus;
    pushToast(
      `رؤى سريعة: ~${atRisk} عميل بحاجة تدخل احتفاظ، و${vip} عميل VIP/ذهبي — رتّب حملة ولاء هذا الأسبوع.`,
      "info",
    );
  }, [pushToast, stats.at_risk_proxy, stats.vip_gold_plus]);

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
        pushToast("إضافة عميل — اربط بنموذج التسجيل أو استيراد CSV لاحقاً.", "info");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileOpen, cmdkOpen, pushToast]);

  return (
    <section className="relative space-y-6 pb-20" aria-labelledby="crm-dashboard-title">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "admin-panel-surface relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 shadow-sm",
        )}
      >
        <div className="admin-panel-scrim" aria-hidden />
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">CRM</p>
          <h1 id="crm-dashboard-title" className="mt-1 font-serif text-xl font-bold text-stone-950 sm:text-2xl">
            Customer Management &amp; CRM
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-700">
            إدارة ملفات العملاء، الولاء، التجزئة، تحليلات الاحتفاظ، التفاعل، وأتمتة دورة حياة العميل —{" "}
            <kbd className="rounded border border-cb-border bg-white/80 px-1 font-mono text-[10px] text-stone-800">⌘K</kbd> أو{" "}
            <kbd className="rounded border border-cb-border bg-white/80 px-1 font-mono text-[10px] text-stone-800">Ctrl+K</kbd> للأوامر،{" "}
            <kbd className="rounded border border-cb-border bg-white/80 px-1 font-mono text-[10px] text-stone-800">/</kbd> للبحث،{" "}
            <kbd className="rounded border border-cb-border bg-white/80 px-1 font-mono text-[10px] text-stone-800">N</kbd> لإضافة عميل. تحديث
            تلقائي كل 90 ثانية.
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
            {online ? "مزامنة البيانات" : "تحقق من الاتصال"}
          </div>
        </div>
        <div className="relative z-[1] w-full overflow-x-auto">
          <div className="flex min-w-max flex-nowrap items-center gap-2 pb-1">
            <button
              type="button"
              onClick={() => pushToast("إضافة عميل — استخدم لوحة المستخدمين أو الاستيراد.", "info")}
              className="admin-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
            >
              <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
              إضافة عميل
            </button>
            <button
              type="button"
              disabled={!canWrite}
              title={canWrite ? "استيراد عمود email إلى قائمة النشرة للحملات" : "صلاحية الكتابة مطلوبة"}
              onClick={() => importRef.current?.click()}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              <Upload className="h-4 w-4 shrink-0" aria-hidden />
              استيراد
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void importNewsletterCsv(f);
              }}
            />
            <button
              type="button"
              onClick={exportPage}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              تصدير CSV
            </button>
            <button
              type="button"
              onClick={() => pushToast("إرسال حملة — اربط بـ Resend/Sinch لاحقاً.", "info")}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
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
              onClick={() => void loadCustomers()}
              className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
            >
              <Zap className="h-4 w-4 shrink-0" aria-hidden />
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setQuickOpen((o) => !o)}
                className="admin-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold"
                aria-expanded={quickOpen}
                aria-haspopup="true"
              >
                <Bell className="h-4 w-4 shrink-0" aria-hidden />
                إجراءات سريعة
                <ChevronDown className={cn("h-3.5 w-3.5 transition", quickOpen && "rotate-180")} aria-hidden />
              </button>
              {quickOpen ? (
                <ul
                  className="absolute end-0 z-30 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-cb-border bg-cb-surface-elevated py-1 text-start shadow-xl"
                  onMouseLeave={() => setQuickOpen(false)}
                  role="menu"
                >
                  {(
                    [
                      "بريد جماعي",
                      "SMS جماعي",
                      "تعيين وسوم",
                      "تحديث المستوى",
                      "تصدير تقارير",
                      "توليد رؤى",
                    ] as const
                  ).map((label) => (
                    <li key={label}>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex w-full px-3 py-2 text-xs font-semibold text-stone-800 hover:bg-amber-50"
                        onClick={() => {
                          setQuickOpen(false);
                          if (label === "تصدير تقارير") exportPage();
                          else if (label === "تعيين وسوم") {
                            setAdvancedFiltersOpen(true);
                            pushToast("استخدم الفلاتر المتقدمة ثم صدّر CSV لتجميع الشريحة.", "info");
                          } else if (label === "توليد رؤى") void aiBatchInsight();
                          else
                            pushToast(
                              `${label}: يتطلب ربط مزوّد رسائل — استخدم الحملة أو البريد لاحقاً.`,
                              "info",
                            );
                        }}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
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
        onExport={exportPage}
        onAiInsight={aiBatchInsight}
      />

      <CrmToasts />
    </section>
  );
}
