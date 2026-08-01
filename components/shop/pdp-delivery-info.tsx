"use client";

import { Truck, Clock, MapPin } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

const DELIVERY_AREAS = [
  "New Cairo",
  "Rehab",
  "Madinaty",
  "Shorouk",
  "Katameya",
  "Maadi",
  "6 October",
  "Zayed",
];

export function PdpDeliveryInfo() {
  const { t } = useLanguage();

  return (
    <section className="mt-12 rounded-2xl border border-cb-border bg-cb-surface p-6">
      <h3 className="flex items-center gap-2 font-serif text-xl font-semibold text-cb-text-strong">
        <Truck className="h-5 w-5 text-cb-terracotta-dark" aria-hidden />
        Delivery Information
      </h3>
      
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-cb-text-strong">Delivery Areas</p>
          <p className="mt-1 text-sm text-cb-text-muted">
            We deliver across: {DELIVERY_AREAS.join(", ")}
          </p>
        </div>
        
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-cb-terracotta-dark" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-cb-text-strong">Estimated Delivery</p>
            <p className="mt-1 text-sm text-cb-text-muted">
              Same-day delivery available for orders placed before 2 PM
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cb-terracotta-dark" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-cb-text-strong">Delivery Fees</p>
            <p className="mt-1 text-sm text-cb-text-muted">
              Free delivery on orders over 150 EGP. Standard delivery fee applies for smaller orders.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
