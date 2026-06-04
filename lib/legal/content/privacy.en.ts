import type { LegalDocumentMeta } from "@/lib/legal/types";

export const privacyEn: LegalDocumentMeta = {
  lastUpdated: "4 June 2026",
  sections: [
    {
      id: "intro",
      heading: "1. Introduction",
      paragraphs: [
        "This Privacy Policy explains how Cookie Bite («we», «us») collects, uses, stores, and protects personal information when you use cookie-bite.com, place orders, or communicate with us.",
        "We write this in plain language because you should understand your choices — not wade through hidden clauses.",
      ],
    },
    {
      id: "controller",
      heading: "2. Data controller",
      paragraphs: [
        "Cookie Bite operates from Fifth Settlement, New Cairo, Egypt. For privacy requests contact privacy@cookie-bite.com or cookie-bite@cookie-bite.com.",
        "Where we use processors (hosting, email, payments), they handle data only on our instructions and under appropriate safeguards.",
      ],
    },
    {
      id: "collect",
      heading: "3. Information we collect",
      paragraphs: ["Depending on how you use the Service, we may process:"],
      list: [
        "Identity & contact: name, phone, email, delivery address.",
        "Order data: items, notes, gift messages, payment status (not full card numbers).",
        "Account data: sign-in via Clerk when you create an account.",
        "Communications: WhatsApp, email, or support tickets.",
        "Technical data: IP address, browser type, device, pages visited, cart contents (cookies/local storage).",
        "Marketing preferences if you opt in to newsletters or abandoned-cart reminders.",
      ],
    },
    {
      id: "use",
      heading: "4. How we use your information",
      paragraphs: ["We use personal data to:"],
      list: [
        "Take, bake, deliver, and support your orders.",
        "Process payments and prevent fraud.",
        "Send transactional messages (confirmations, delivery updates, invoices).",
        "Improve the website, products, and delivery zones.",
        "Comply with law, tax, and accounting obligations.",
        "Send marketing only where you have agreed or where permitted and you can opt out.",
      ],
    },
    {
      id: "legal-basis",
      heading: "5. Legal bases",
      paragraphs: [
        "We rely on: (a) performance of a contract when fulfilling your order; (b) legitimate interests for security, analytics, and service improvement balanced against your rights; (c) consent for optional marketing and non-essential cookies where required; (d) legal obligation when retaining records.",
      ],
    },
    {
      id: "sharing",
      heading: "6. Sharing with third parties",
      paragraphs: [
        "We do not sell your personal data. We share it only when necessary to run the Service:",
      ],
      list: [
        "Supabase — database hosting for orders and accounts.",
        "Clerk — authentication when you sign in.",
        "Paymob — card and wallet payment processing.",
        "Resend (or configured email providers) — transactional and marketing email delivery.",
        "Cloudinary — image hosting for product media.",
        "WhatsApp / Meta — if you contact us or we send template messages you requested.",
        "Analytics and infrastructure partners under confidentiality terms.",
      ],
    },
    {
      id: "cookies",
      heading: "7. Cookies & similar technologies",
      paragraphs: [
        "We use essential cookies to keep you signed in, remember your cart, and secure the site. Analytics cookies help us understand traffic patterns.",
        "You can control cookies in your browser settings. Blocking essential cookies may prevent checkout or account features from working.",
      ],
    },
    {
      id: "retention",
      heading: "8. How long we keep data",
      paragraphs: [
        "Order and invoice records are kept for the period required by Egyptian commercial and tax practice, typically several years unless a shorter period is mandated.",
        "Marketing lists are retained until you unsubscribe or ask for deletion. Abandoned-cart reminders stop once you complete checkout or ask us to stop.",
      ],
    },
    {
      id: "security",
      heading: "9. Security",
      paragraphs: [
        "We use HTTPS, access controls, and service-role isolation for backend data. No method of transmission over the internet is 100% secure; we work to reduce risk proportionate to the sensitivity of order and payment data.",
      ],
    },
    {
      id: "rights",
      heading: "10. Your rights",
      paragraphs: [
        "Subject to applicable law, you may request access, correction, deletion, or restriction of certain processing. You may object to marketing at any time via unsubscribe links or by emailing us.",
        "We will verify your identity before fulfilling sensitive requests. We respond within a reasonable timeframe, usually within 30 days.",
      ],
      highlight: true,
    },
    {
      id: "children",
      heading: "11. Children",
      paragraphs: [
        "The Service is not directed at children under 13. We do not knowingly collect their data. Contact us if you believe a child has provided information and we will delete it.",
      ],
    },
    {
      id: "transfers",
      heading: "12. International transfers",
      paragraphs: [
        "Some providers may process data outside Egypt (for example EU or US hosting). Where this occurs, we rely on contractual protections and provider compliance programmes appropriate to the service.",
      ],
    },
    {
      id: "changes",
      heading: "13. Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy. Material changes will be reflected in the «Last updated» date. We encourage you to review this page periodically.",
      ],
    },
    {
      id: "contact",
      heading: "14. Contact & complaints",
      paragraphs: [
        "Privacy questions: privacy@cookie-bite.com. General support: cookie-bite@cookie-bite.com or WhatsApp 011 401 65995.",
        "If you are not satisfied with our response, you may escalate to the relevant data protection authority in Egypt when applicable.",
      ],
      highlight: true,
    },
  ],
};
