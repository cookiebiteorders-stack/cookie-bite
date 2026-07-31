import Link from "next/link";
import { Search, ShoppingBag, Gift } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-cb-cream px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 inline-flex rounded-full bg-cb-peach/30 p-6">
          <Search className="h-16 w-16 text-cb-terracotta-dark" />
        </div>
        <h1 className="font-serif text-4xl font-semibold text-cb-text-strong sm:text-5xl">
          404
        </h1>
        <h2 className="mt-4 font-serif text-2xl font-semibold text-cb-text-strong">
          {t("notFound.title") || "Page Not Found"}
        </h2>
        <p className="mt-3 text-cb-text-muted">
          {t("notFound.description") || "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className={buttonClassName("primary", "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3")}
          >
            <ShoppingBag className="h-4 w-4" />
            {t("notFound.goHome") || "Go Home"}
          </Link>
          <Link
            href="/shop"
            className={buttonClassName("outline", "inline-flex items-center justify-center gap-2 rounded-full px-8 py-3")}
          >
            <Gift className="h-4 w-4" />
            {t("notFound.shopCookies") || "Shop Cookies"}
          </Link>
        </div>
      </div>
    </div>
  );
}
