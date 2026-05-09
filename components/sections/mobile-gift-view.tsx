"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const giftCategories = [
  { icon: "🎂", label: "Birthday", id: "birthday" },
  { icon: "💕", label: "Romantic", id: "romantic" },
  { icon: "🎉", label: "Celebration", id: "celebration" },
  { icon: "💼", label: "Corporate", id: "corporate" },
  { icon: "🌿", label: "Seasonal", id: "seasonal" },
  { icon: "🎁", label: "All", id: "all" },
];

const giftBoxes = [
  {
    id: "classic-6", name: "Classic Joy Box", desc: "A timeless selection of our most-loved cookie flavors.", includes: "6 cookies", price: 250,
    image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80", badge: "Best Seller", cat: "all",
  },
  {
    id: "choco-12", name: "Chocolate Lover's Dream", desc: "Triple chocolate, dark fudge, and white chip bliss.", includes: "12 cookies", price: 450,
    image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80", cat: "romantic",
  },
  {
    id: "celebration-box", name: "Celebration Collection", desc: "The ultimate party box with a mix of everyone's favorites.", includes: "12 cookies", price: 400,
    image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=800&q=80", badge: "Popular", cat: "celebration",
  },
  {
    id: "birthday-surprise", name: "Birthday Surprise Box", desc: "Special birthday-themed packaging with our best seasonal cookies.", includes: "6 cookies", price: 300,
    image: "https://images.unsplash.com/photo-1602351447937-745cb720612f?auto=format&fit=crop&w=800&q=80", cat: "birthday",
  },
];

const buildSteps = [
  "Select cookie flavors",
  "Choose box size",
  "Pick packaging style",
  "Add gift card message",
];

export function MobileGiftView() {
  const [activeCat, setActiveCat] = useState("all");

  const filtered = activeCat === "all"
    ? giftBoxes
    : giftBoxes.filter(b => b.cat === activeCat || b.cat === "all");

  return (
    <div className="md:hidden bg-cb-cream min-h-screen">
      {/* Hero */}
      <section className="mobile-hero min-h-[340px]">
        <Image
          src="https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=1200&q=80"
          alt="Cookie gift boxes"
          fill
          className="object-cover opacity-30"
          sizes="100vw"
          priority
          fetchPriority="high"
        />
        <div className="mobile-hero__content">
          <h1 className="mobile-hero__h1">
            <span className="text-white">Sweet gifts </span>
            <span className="text-[#F0A070]">that say it all</span>
          </h1>
          <div className="mobile-hero__buttons">
            <Link href="#gift-boxes" className="mobile-btn-primary mobile-btn-pill">
              Explore Gift Boxes
            </Link>
            <Link href="#build" className="mobile-btn-outline mobile-btn-pill border-white text-white">
              Build Custom Gift
            </Link>
          </div>
        </div>
      </section>

      <div className="mobile-spacer-lg" />

      {/* Category Grid */}
      <div className="mobile-gift-cat-grid">
        {giftCategories.map(c => (
          <button
            key={c.id}
            type="button"
            className={cn("mobile-gift-cat", activeCat === c.id && "mobile-gift-cat--active")}
            onClick={() => setActiveCat(c.id)}
          >
            <span className="mobile-gift-cat__icon">{c.icon}</span>
            <span className="mobile-gift-cat__label">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="mobile-spacer-lg" />

      {/* Gift Box Cards */}
      <div id="gift-boxes">
        {filtered.map(box => (
          <div key={box.id} className="mobile-gift-card">
            <div className="relative">
              <Image src={box.image} alt={box.name} width={800} height={400} className="mobile-gift-card__img" />
              {box.badge && (
                <span className="mobile-product-card__badge absolute top-3 left-3">
                  {box.badge}
                </span>
              )}
            </div>
            <div className="mobile-gift-card__body">
              <p className="mobile-gift-card__name">{box.name}</p>
              <p className="mobile-gift-card__desc">{box.desc}</p>
              <p className="mobile-gift-card__includes">Includes: {box.includes}</p>
              <p className="mobile-gift-card__price">Starting from {box.price} EGP</p>
              <div className="mobile-gift-card__btns">
                <button type="button" className="mobile-btn-primary h-[44px] rounded-xl text-sm">
                  Add to Cart
                </button>
                <button type="button" className="mobile-btn-outline h-[44px] rounded-xl text-sm">
                  Customize
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mobile-spacer-lg" />

      {/* Build Your Own */}
      <section id="build" className="mobile-build-section">
        <h3 className="text-lg font-bold text-cb-text-strong mb-4">
          Build Your Own Gift Box
        </h3>
        {buildSteps.map((step, i) => (
          <div key={i} className="mobile-build-step">
            <span className="mobile-build-step__num">{i + 1}</span>
            <span className="mobile-build-step__text">{step}</span>
          </div>
        ))}
        <button type="button" className="mobile-btn-primary mobile-btn-full mt-2">
          Start Customizing
        </button>
      </section>

      <div className="mobile-spacer-lg" />

      {/* Personal Touch */}
      <section className="mx-4 bg-white border border-cb-border rounded-2xl p-4">
        <h3 className="text-base font-bold text-cb-text-strong mb-2">
          Add a personal touch
        </h3>
        <textarea
          placeholder="Write a heartfelt message for your gift card..."
          className="w-full h-20 bg-[#FEF6F0] rounded-xl p-3 border-none text-[13px] resize-none italic text-cb-text-muted"
        />
      </section>

      <div className="mobile-spacer-lg" />

      {/* Corporate Section */}
      <section className="mx-4 rounded-2xl h-40 relative overflow-hidden flex items-center">
        <Image
          src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80"
          alt="Corporate gifting"
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/65 p-5 flex flex-col justify-center">
          <h3 className="text-lg font-bold text-white">Corporate & bulk gifting</h3>
          <p className="text-xs text-white/70 mt-1">
            Custom logos, bulk discounts, personalized notes
          </p>
          <Link
            href="/contact"
            className="mobile-btn-outline mobile-btn-pill border-white text-white mt-3 w-fit h-9 text-xs"
          >
            Contact for Corporate Orders
          </Link>
        </div>
      </section>

      <div className="mobile-spacer-lg" />
    </div>
  );
}
