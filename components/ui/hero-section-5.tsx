import { HeroLcpBackground } from "@/components/ui/hero-lcp-background";
import { HeroLcpPreload } from "@/components/ui/hero-lcp-preload";
import { HeroSection5Client } from "@/components/ui/hero-section-5-client";

/** هيرو الصفحة الرئيسية — خلفية LCP من الخادم + محتوى تفاعلي من العميل. */
export function HeroSection5() {
  return (
    <div className="relative min-h-[100svh] w-full overflow-x-hidden sm:min-h-[85svh]">
      <HeroLcpPreload />
      <HeroLcpBackground />
      <div className="relative z-[1]">
        <HeroSection5Client />
      </div>
    </div>
  );
}
