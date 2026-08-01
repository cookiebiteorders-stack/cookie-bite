import { BRAND } from "@/lib/brand";
import { ENV_FREE_SHIPPING_THRESHOLD_EGP } from "@/lib/store/commerce-settings-shared";

export const NEW_CAIRO_DELIVERY_FAQ = [
  {
    q: "Do you deliver across New Cairo?",
    a: `Yes — we deliver from our kitchen in ${BRAND.location} across most New Cairo compounds and nearby neighborhoods.`,
  },
  {
    q: "What is the free delivery threshold?",
    a: `Orders over ${ENV_FREE_SHIPPING_THRESHOLD_EGP} EGP (before discounts) qualify for free delivery where the zone allows it. Check the site header or product pages for the current threshold.`,
  },
  {
    q: "How fast is cookie delivery in New Cairo?",
    a: "Most orders are scheduled within 1–2 days depending on bake capacity and your area. Contact us on WhatsApp for urgent dates.",
  },
  {
    q: "Can I order cookie gift boxes for same-day delivery?",
    a: "Same-day may be available on select days — message us before checkout with your compound name and preferred time window.",
  },
] as const;

export const DELIVERY_AREAS = [
  "Fifth Settlement",
  "Mivida",
  "Mountain View",
  "Hyde Park",
  "Katameya Heights",
  "Madinaty",
  "Rehab City",
  "New Capital (select zones)",
  "Sheraton & Heliopolis (selected days)",
] as const;

export const DELIVERY_AREAS_FAQ = [
  {
    q: "Is my compound covered?",
    a: `Message us on WhatsApp at ${BRAND.phoneDisplay} with your compound name — we confirm timing and fees before you checkout.`,
  },
  {
    q: "Do you deliver outside New Cairo?",
    a: "Selected Heliopolis and Sheraton routes may be available on certain days. Coverage expands seasonally — ask our team.",
  },
  {
    q: "Are delivery fees shown at checkout?",
    a: "Yes. Enter your address during checkout to see the fee and eligible payment methods for your zone.",
  },
] as const;

export const CORPORATE_GIFTING_FAQ = [
  {
    q: "What is the minimum order for corporate gifting?",
    a: "Minimums depend on packaging and branding. Share your headcount and event date — we reply with options within one business day.",
  },
  {
    q: "Can you add our company logo?",
    a: "Yes — branded sleeves, sticker seals, and note cards are available for qualifying bulk orders.",
  },
  {
    q: "How far in advance should we book?",
    a: "We recommend 5–10 business days for branded corporate orders. Rush windows may be available off-peak.",
  },
  {
    q: "Do you provide invoices for companies?",
    a: "Yes — we can issue documentation suitable for corporate procurement. Mention your requirements in the contact form.",
  },
] as const;

export function getDistrictFaq(districtName: string) {
  return [
    {
      q: `Do you deliver cookies to ${districtName}?`,
      a: `Yes! We deliver our freshly baked cookies directly to ${districtName}. Order online and we'll bring them to your door.`,
    },
    {
      q: `What is the delivery fee for ${districtName}?`,
      a: `Delivery fees for ${districtName} are calculated at checkout based on your exact address. Enjoy free delivery on qualifying orders above ${ENV_FREE_SHIPPING_THRESHOLD_EGP} EGP.`,
    },
    {
      q: "Are the cookies baked fresh?",
      a: "Always. Our cookies are baked from scratch using premium ingredients like Belgian chocolate and New Zealand butter.",
    },
    {
      q: "Can I order a custom gift box?",
      a: "Yes, you can build your own custom cookie box by selecting your favorite flavors. Perfect for gifting in " + districtName + ".",
    },
  ];
}
