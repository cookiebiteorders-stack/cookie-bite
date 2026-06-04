"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Gift, Share2, Sparkles } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { buttonClassName } from "@/components/ui/button";
import { RedeemPointsCard } from "@/components/account/redeem-points-card";
import { fetchJson } from "@/lib/http/fetch-json";

type LoyaltyAccount = {
  total_points: number;
  tier: string;
  referral_code: string | null;
  referred_by: string | null;
};

type LoyaltyTxn = {
  id: string;
  type: string;
  points: number;
  description_en: string | null;
  description_ar: string | null;
  created_at: string;
};

type Props = {
  initialPoints: number;
  initialTier: string;
  tierLabel: string;
  progressPercent: number;
  nextTierPoints: number;
  isTopTier: boolean;
};

export function LoyaltyDashboard({
  initialPoints,
  initialTier,
  tierLabel,
  progressPercent,
  nextTierPoints,
  isTopTier,
}: Props) {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const [points, setPoints] = useState(initialPoints);
  const [_tier, setTier] = useState(initialTier);
  const [account, setAccount] = useState<LoyaltyAccount | null>(null);
  const [transactions, setTransactions] = useState<LoyaltyTxn[]>([]);
  const [referralInput, setReferralInput] = useState("");
  const [referralBusy, setReferralBusy] = useState(false);
  const [referralMsg, setReferralMsg] = useState<null | { ok: boolean; text: string }>(null);
  const [copied, setCopied] = useState(false);

  const loadLoyalty = useCallback(async () => {
    const data = await fetchJson<{
      account?: LoyaltyAccount;
      transactions?: LoyaltyTxn[];
      next_tier_points?: number;
    }>("/api/loyalty").catch(() => null);
    if (!data?.account) return;
    setAccount(data.account);
    setPoints(Number(data.account.total_points));
    setTier(data.account.tier);
    setTransactions(data.transactions ?? []);
  }, []);

  useEffect(() => {
    void loadLoyalty();
  }, [loadLoyalty]);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref && ref.length >= 4) setReferralInput(ref.toUpperCase());
  }, [searchParams]);

  const referralCode = account?.referral_code ?? "";
  const shareUrl =
    typeof window !== "undefined" && referralCode
      ? `${window.location.origin}/account?ref=${encodeURIComponent(referralCode)}`
      : "";

  async function applyReferral() {
    if (!referralInput.trim() || referralBusy) return;
    setReferralBusy(true);
    setReferralMsg(null);
    try {
      const res = await fetch("/api/loyalty/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralInput.trim() }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        bonus_points?: number;
        error?: { ar?: string; en?: string };
      } | null;
      if (!res.ok) {
        const msg =
          lang === "ar"
            ? data?.error?.ar ?? "تعذر تطبيق الكود"
            : data?.error?.en ?? "Could not apply code";
        setReferralMsg({ ok: false, text: msg });
        return;
      }
      setReferralMsg({
        ok: true,
        text: t("accountLoyalty.referralSuccess", {
          points: String(data?.bonus_points ?? 50),
        }),
      });
      setReferralInput("");
      await loadLoyalty();
    } catch {
      setReferralMsg({ ok: false, text: t("accountLoyalty.referralError") });
    } finally {
      setReferralBusy(false);
    }
  }

  async function copyCode() {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const txnLabel = (txn: LoyaltyTxn) => {
    const custom =
      lang === "ar"
        ? txn.description_ar ?? txn.description_en
        : txn.description_en ?? txn.description_ar;
    if (custom) return custom;
    if (txn.type === "earned") return t("accountLoyalty.txnEarned");
    if (txn.type === "redeemed") return t("accountLoyalty.txnRedeemed");
    if (txn.type === "bonus") return t("accountLoyalty.txnBonus");
    return txn.type;
  };

  const alreadyReferred = Boolean(account?.referred_by);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-cb-text-strong">
            {t("accountDashboard.rewardsTitle")}
          </h2>
          <p className="mt-1 text-xs text-cb-text-muted">
            {t("accountDashboard.tierLabel")}:{" "}
            <span className="font-semibold text-cb-terracotta-dark">{tierLabel}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-cb-cream px-3 py-2 ring-1 ring-cb-border/40">
          <p className="text-sm font-semibold text-cb-text-muted">
            {t("accountDashboard.totalLabel")}
          </p>
          <p className="text-lg font-bold text-cb-terracotta-dark">
            {points} {t("accountDashboard.pointsUnit")}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">
        <div className="flex gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{t("accountLoyalty.giftBoxDoubleHint")}</p>
        </div>
      </div>

      <div>
        <progress
          className="h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-cb-peach [&::-webkit-progress-value]:bg-cb-terracotta-dark [&::-moz-progress-bar]:bg-cb-terracotta-dark"
          value={Math.round(progressPercent)}
          max={100}
        />
      </div>
      <p className="text-xs text-cb-text-muted">
        {isTopTier
          ? t("accountDashboard.topTier")
          : t("accountDashboard.nextTier", { points: nextTierPoints })}
      </p>

      <RedeemPointsCard points={points} />

      <div className="rounded-2xl border border-cb-border bg-cb-cream/50 p-4">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-cb-terracotta-dark" aria-hidden />
          <h3 className="text-sm font-semibold text-cb-text-strong">
            {t("accountLoyalty.referralTitle")}
          </h3>
        </div>
        <p className="mt-1 text-xs text-cb-text-muted">{t("accountLoyalty.referralDesc")}</p>

        {referralCode ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-cb-surface px-3 py-2 font-mono text-sm font-bold tracking-wider text-cb-terracotta-dark ring-1 ring-cb-border">
              {referralCode}
            </code>
            <button
              type="button"
              onClick={() => void copyCode()}
              className={buttonClassName("outline", "inline-flex items-center gap-1 text-xs")}
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? t("accountLoyalty.copied") : t("accountLoyalty.copyCode")}
            </button>
          </div>
        ) : null}

        {!alreadyReferred ? (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
              placeholder={t("accountLoyalty.referralPlaceholder")}
              className="flex-1 rounded-xl border border-cb-border bg-cb-surface px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={referralBusy || referralInput.length < 4}
              onClick={() => void applyReferral()}
              className={buttonClassName("primary", "text-sm disabled:opacity-60")}
            >
              {referralBusy ? "…" : t("accountLoyalty.applyReferral")}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {t("accountLoyalty.referralApplied")}
          </p>
        )}
        {referralMsg ? (
          <p
            className={
              referralMsg.ok
                ? "mt-2 text-xs text-emerald-700"
                : "mt-2 text-xs text-red-700"
            }
            role="status"
          >
            {referralMsg.text}
          </p>
        ) : null}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Gift className="h-4 w-4 text-cb-terracotta-dark" aria-hidden />
          <h3 className="text-sm font-semibold text-cb-text-strong">
            {t("accountLoyalty.historyTitle")}
          </h3>
        </div>
        {transactions.length === 0 ? (
          <p className="text-xs text-cb-text-muted">{t("accountLoyalty.historyEmpty")}</p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {transactions.map((txn) => (
              <li
                key={txn.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-cb-border/60 bg-cb-surface px-3 py-2 text-xs"
              >
                <span className="text-cb-text">{txnLabel(txn)}</span>
                <span
                  className={
                    txn.points >= 0
                      ? "font-bold text-emerald-700"
                      : "font-bold text-cb-terracotta-dark"
                  }
                >
                  {txn.points >= 0 ? "+" : ""}
                  {txn.points}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
