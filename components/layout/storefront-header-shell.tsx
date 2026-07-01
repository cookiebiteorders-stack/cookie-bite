import { LogoMark } from "@/components/brand/logo-mark";

/** Placeholder ثابت — يظهر فوراً قبل تحميل JS/chunk الهيدر الحقيقي */
export function StorefrontHeaderShell() {
  return (
    <>
      <header
        className="mobile-header mobile-header--solid md:hidden"
        aria-hidden
      >
        <div className="mobile-header__left w-10" />
        <div className="mobile-header__center flex justify-center">
          <LogoMark className="h-8 w-8 text-cb-brand-logo" title="Cookie Bite" />
        </div>
        <div className="mobile-header__right w-[7.75rem]" />
      </header>
      <div className="cb-header-spacer cb-header-spacer--mobile" aria-hidden />
      <div className="desktop-header hidden md:block">
        <header className="cb-header-shell cb-pl-navbar" aria-hidden>
          <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 cb-gutter py-2">
            <LogoMark className="h-9 w-9 text-cb-brand-logo sm:h-10 sm:w-10" title="Cookie Bite" />
            <div className="hidden flex-1 lg:block" />
            <div className="flex gap-2">
              <span className="h-11 w-11 rounded-xl bg-black/[0.04]" />
              <span className="h-11 w-11 rounded-xl bg-black/[0.04]" />
            </div>
          </div>
        </header>
        <div className="cb-header-spacer cb-header-spacer--desktop" aria-hidden />
      </div>
    </>
  );
}
