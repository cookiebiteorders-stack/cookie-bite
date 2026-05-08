"use client";

import { ArrowUp } from "lucide-react";

function scrollTop() {
  window.scroll({ top: 0, behavior: "smooth" });
}

/** شريط أدوات الفوتر — Master Doc: بدون وضع داكن. */
export function FooterToolbar() {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-1 rounded-full border border-cb-border-strong bg-cb-cream px-1 py-1 shadow-sm">
        <button
          type="button"
          onClick={scrollTop}
          className="rounded-full p-2 text-cb-terracotta-dark transition-colors hover:bg-cb-peach"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}
