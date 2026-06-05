import { TestimonialSlider } from "@/components/sections/testimonial-slider";
import { listApprovedCustomerTestimonials } from "@/lib/db/customer-testimonials";
import { getLangFromCookies } from "@/lib/seo/server";

/** آراء حقيقية من العملاء — تُعرض بعد الموافقة أو الإرسال المباشر. */
export async function HomeTestimonials() {
  const lang = await getLangFromCookies();
  const items = await listApprovedCustomerTestimonials(lang);
  return <TestimonialSlider items={items} />;
}
