import type { LegalDocumentMeta } from "@/lib/legal/types";

export const termsEn: LegalDocumentMeta = {
  lastUpdated: "4 June 2026",
  sections: [
    {
      id: "acceptance",
      heading: "1. Acceptance of these terms",
      paragraphs: [
        "These Terms & Conditions («Terms») govern your use of the Cookie Bite website at cookie-bite.com, our ordering flows, and any related services we provide (together, the «Service»).",
        "By browsing the site, creating an account, or placing an order, you confirm that you have read these Terms and agree to be bound by them. If you do not agree, please do not use the Service.",
      ],
    },
    {
      id: "about",
      heading: "2. Who we are",
      paragraphs: [
        "Cookie Bite is a bakery brand operating in Egypt, specialising in fresh cookies, gift boxes, and corporate gifting. Our primary delivery focus is New Cairo and surrounding areas, as shown at checkout.",
        "For order and legal enquiries you may reach us at cookie-bite@cookie-bite.com or via WhatsApp on 011 401 65995.",
      ],
    },
    {
      id: "eligibility",
      heading: "3. Accounts & eligibility",
      paragraphs: [
        "You must provide accurate contact and delivery information. You are responsible for keeping your account credentials secure and for all activity under your account.",
        "Guests may checkout without an account; we still require a valid phone number and delivery address within our service zones.",
      ],
      list: [
        "You must be at least 18 years old to place an order, or have permission from a parent or guardian.",
        "We may suspend or refuse service if we detect fraud, abuse of promotions, or repeated failed deliveries due to incorrect details.",
      ],
    },
    {
      id: "orders",
      heading: "4. Orders, pricing & availability",
      paragraphs: [
        "All prices are displayed in Egyptian pounds (EGP) unless stated otherwise. The total at checkout is the price you agree to pay, including applicable delivery fees and discounts.",
        "We bake in small batches. If an item becomes unavailable after you order, we will contact you promptly to offer a substitute, credit, or cancellation of the affected line.",
        "Product images are representative; slight variation in decoration or packaging may occur while maintaining the same weight and flavour profile.",
      ],
    },
    {
      id: "payment",
      heading: "5. Payment methods",
      paragraphs: [
        "We accept card and mobile-wallet payments through Paymob, and cash on delivery (COD) where offered at checkout.",
        "Online payments are processed by our payment partner; we do not store full card numbers on our servers. A payment is confirmed only when our system or Paymob reports success.",
      ],
      list: [
        "COD orders may require phone confirmation before dispatch.",
        "Failed or reversed online payments will cancel or hold the order until resolved.",
      ],
    },
    {
      id: "delivery",
      heading: "6. Delivery & scheduling",
      paragraphs: [
        "Delivery zones, fees, and estimated time windows are calculated at checkout based on your address. Free delivery may apply above the threshold shown on the site (currently {threshold} EGP where configured).",
        "You must ensure someone is available to receive perishable goods. We are not responsible for deterioration caused by incorrect addresses, refused delivery, or prolonged unavailability after arrival.",
        "Scheduled delivery slots are estimates, not guarantees. We will notify you if a significant delay is likely.",
      ],
    },
    {
      id: "freshness",
      heading: "7. Freshness guarantee, refunds & cancellations",
      paragraphs: [
        "We stand behind the quality of what we bake. If your order arrives damaged, incorrect, or not fresh, contact us within 14 days of delivery with your order number and photos where possible.",
      ],
      list: [
        "We may offer replacement, partial refund, or store credit depending on the issue — our team will propose a fair resolution.",
        "Change-of-mind cancellations before baking starts are handled case-by-case; once production begins, cancellation may not be possible.",
        "Promotional codes are single-use unless stated otherwise and cannot be stacked unless explicitly allowed.",
      ],
      highlight: true,
    },
    {
      id: "gifting",
      heading: "8. Gifts, corporate & custom orders",
      paragraphs: [
        "Gift messages, branded packaging, and corporate volumes may require additional lead time. Minimum quantities and design fees for corporate branding are quoted separately.",
        "You are responsible for ensuring gift recipient details and delivery instructions are correct.",
      ],
    },
    {
      id: "ip",
      heading: "9. Intellectual property",
      paragraphs: [
        "All content on the Service — including logos, photography, copy, and recipes presented as marketing — is owned by Cookie Bite or our licensors. You may not copy, scrape, or resell our content without written permission.",
      ],
    },
    {
      id: "conduct",
      heading: "10. Acceptable use",
      paragraphs: ["You agree not to:"],
      list: [
        "Misuse promotions, referral codes, or recovery links.",
        "Attempt to disrupt the site, access admin areas, or extract data without authorisation.",
        "Use the Service for unlawful purposes or to harass our staff.",
      ],
    },
    {
      id: "liability",
      heading: "11. Liability",
      paragraphs: [
        "To the fullest extent permitted by Egyptian law, Cookie Bite is not liable for indirect or consequential losses (including lost profits) arising from use of the Service.",
        "Our total liability for any qualifying claim relating to a specific order is limited to the amount you paid for that order, except where law requires otherwise.",
      ],
    },
    {
      id: "force-majeure",
      heading: "12. Force majeure",
      paragraphs: [
        "We are not responsible for delays or failures caused by events outside our reasonable control, including severe weather, supply disruption, power outages, or government restrictions.",
      ],
    },
    {
      id: "law",
      heading: "13. Governing law & disputes",
      paragraphs: [
        "These Terms are governed by the laws of the Arab Republic of Egypt. Courts in Cairo shall have jurisdiction unless mandatory consumer protection rules require otherwise.",
        "We encourage you to contact us first so we can resolve concerns informally.",
      ],
    },
    {
      id: "changes",
      heading: "14. Changes to these Terms",
      paragraphs: [
        "We may update these Terms from time to time. The «Last updated» date at the top reflects the latest version. Continued use of the Service after changes constitutes acceptance.",
      ],
    },
    {
      id: "contact",
      heading: "15. Contact",
      paragraphs: [
        "Questions about these Terms? Email cookie-bite@cookie-bite.com, visit our Help Center, or message us on WhatsApp. We aim to respond within two business days.",
      ],
      highlight: true,
    },
  ],
};
