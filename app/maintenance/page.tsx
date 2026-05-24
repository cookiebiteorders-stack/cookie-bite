import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { SITE } from "@/lib/data";

export const metadata = {
  title: "Maintenance",
  robots: { index: false, follow: false },
};

/** Standalone page — outside PageShell so shoppers only see this during maintenance. */
export default function MaintenancePage() {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center bg-cb-cream px-6 py-16 text-center">
      <LogoMark className="mx-auto h-14 w-14 text-cb-brand-logo" title={SITE.name} />
      <h1 className="mt-6 font-serif text-3xl font-semibold text-cb-text-strong">
        We&apos;ll be right back
      </h1>
      <p className="mt-3 max-w-md text-base text-cb-text">
        Cookie Bite is undergoing a quick refresh. Fresh cookies return soon — thank you for your
        patience.
      </p>
      <p className="mt-2 max-w-md text-sm text-cb-text-muted" dir="rtl" lang="ar">
        المتجر في صيانة سريعة. نعود قريباً بكوكيز طازجة — شكراً لصبركم.
      </p>
      <Link
        href="mailto:cookie.bite.orders@gmail.com"
        className="mt-8 rounded-full border border-cb-peach-deep bg-cb-surface px-6 py-2.5 text-sm font-semibold text-cb-text-strong transition hover:bg-cb-peach/40"
      >
        Contact us / تواصل معنا
      </Link>
    </div>
  );
}
