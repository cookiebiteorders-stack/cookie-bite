"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    question: "What are your delivery areas?",
    answer: "We deliver across New Cairo, Rehab, Madinaty, Shorouk, Katameya, Maadi, 6 October, and Zayed. Same-day delivery is available for orders placed before 2 PM.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept credit/debit cards, mobile wallets (Vodafone Cash, Etisalat Cash, Orange Cash), and cash on delivery.",
  },
  {
    question: "How fresh are your cookies?",
    answer: "All our cookies are freshly baked for every order. We never sell pre-made or stale cookies.",
  },
  {
    question: "What ingredients do you use?",
    answer: "We use premium Belgian chocolate, high-quality flour, fresh butter, and other premium ingredients. No preservatives or artificial flavors.",
  },
  {
    question: "Can I customize my order?",
    answer: "Yes! You can add various toppings and extras to customize your cookies. Options include extra chocolate chips, nuts, and more.",
  },
  {
    question: "Do you offer gift packaging?",
    answer: "Yes, all our cookies come in beautiful gift-ready packaging. Perfect for birthdays, holidays, or any special occasion.",
  },
  {
    question: "How do I track my order?",
    answer: "Once your order is confirmed, you'll receive tracking updates via SMS. You can also check your order status in your account.",
  },
  {
    question: "What is your return policy?",
    answer: "If you're not satisfied with your order, please contact us within 24 hours. We'll do our best to make it right.",
  },
];

type Props = {
  title?: string;
  subtitle?: string;
};

export function FaqSection({ title = "Frequently Asked Questions", subtitle = "Find answers to common questions about our cookies, delivery, and orders." }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="cb-pl-faq relative py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-10 text-center">
          <h2 className="font-serif text-3xl font-semibold text-cb-text-strong sm:text-4xl">
            {title}
          </h2>
          <p className="mt-3 text-lg text-cb-text-muted">
            {subtitle}
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-cb-border bg-cb-surface"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-cb-surface-2"
                aria-expanded={openIndex === index}
              >
                <span className="font-semibold text-cb-text-strong">{item.question}</span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform duration-200 text-cb-terracotta-dark",
                    openIndex === index && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-5 pt-0">
                  <p className="text-cb-text-muted">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
