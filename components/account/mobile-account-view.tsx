"use client";

import Image from "next/image";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { AccountSectionLink } from "@/components/account/account-section-link";
import { ChevronRight, Package, MapPin, Heart, Star, User, MessageSquare, Bell, LogOut, LayoutDashboard, CreditCard, HelpCircle } from "lucide-react";

type MobileAccountViewProps = {
  fullName: string;
  email: string | null;
  imageUrl: string | null;
  roleLabel: string;
  loyaltyPoints: number;
  tierLabel: string;
  orderCount: number;
  isAdmin: boolean;
};

export function MobileAccountView({
  fullName,
  email,
  imageUrl,
  roleLabel,
  loyaltyPoints,
  tierLabel,
  orderCount,
  isAdmin,
}: MobileAccountViewProps) {
  const initial = (fullName || email || "?").trim().slice(0, 1).toUpperCase();

  const navItems = [
    { label: "My Orders", href: "/account/orders", icon: Package },
    { label: "My Addresses", href: "/account/addresses", icon: MapPin },
    { label: "Payment Methods", href: "/account/payment-methods", icon: CreditCard },
    { label: "Wishlist", href: "/account#wish", icon: Heart },
    { label: "Rewards & Points", href: "/account#rewards", icon: Star },
    { label: "Profile & Security", href: "/account/settings", icon: User },
    { label: "My Comments", href: "/account#feedback", icon: MessageSquare },
    { label: "Notifications", href: "/account#notifications", icon: Bell },
    { label: "Help & Support", href: "/contact", icon: HelpCircle },
  ];

  return (
    <div className="md:hidden bg-[#F9F7F5] min-h-screen">
      {/* Header Profile Section */}
      <div className="mobile-account-header">
        <div className="mobile-account-header__row">
          <div className="relative mobile-account-header__avatar">
            {imageUrl ? (
              <Image src={imageUrl} alt={fullName} fill unoptimized className="object-cover rounded-full" sizes="64px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-cb-peach rounded-full text-cb-terracotta-dark font-bold text-xl">
                {initial}
              </div>
            )}
          </div>
          <div>
            <h1 className="mobile-account-header__name">{fullName}</h1>
            {email && <p className="mobile-account-header__email">{email}</p>}
            <span className="mobile-account-header__badge">
              <Star className="w-3 h-3 fill-current" />
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mobile-account-stats">
          <div className="mobile-account-stats__item">
            <p className="mobile-account-stats__num">{loyaltyPoints}</p>
            <p className="mobile-account-stats__label">Points</p>
          </div>
          <div className="mobile-account-stats__item">
            <p className="mobile-account-stats__num">{tierLabel}</p>
            <p className="mobile-account-stats__label">Current Tier</p>
          </div>
          <div className="mobile-account-stats__item">
            <p className="mobile-account-stats__num">{orderCount}</p>
            <p className="mobile-account-stats__label">Orders</p>
          </div>
        </div>
      </div>

      {/* Admin Quick Action */}
      {isAdmin && (
        <div className="px-4 mt-4">
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 w-full h-12 bg-slate-900 text-white rounded-xl font-medium"
          >
            <LayoutDashboard className="w-5 h-5" />
            Admin Dashboard
          </Link>
        </div>
      )}

      {/* Navigation List */}
      <nav className="mobile-account-nav">
        {navItems.map((item) => {
          const NavLink = item.href.includes("#") ? AccountSectionLink : Link;
          return (
            <NavLink key={item.label} href={item.href} className="mobile-account-nav__item">
              <item.icon className="mobile-account-nav__icon" />
              {item.label}
              <ChevronRight className="mobile-account-nav__chevron" />
            </NavLink>
          );
        })}
        
        {/* Logout */}
        <div className="mobile-account-nav__item mobile-account-nav__item--danger cursor-pointer">
          <LogOut className="mobile-account-nav__icon text-[#C0392B]" />
          <SignOutButton>
            <span className="flex-1 w-full text-left">Sign Out</span>
          </SignOutButton>
          <ChevronRight className="mobile-account-nav__chevron" />
        </div>
      </nav>

      <div className="mobile-spacer-lg" />
    </div>
  );
}
