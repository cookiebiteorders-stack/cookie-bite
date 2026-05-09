import { Instagram, Facebook, MessageCircle, Heart } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { SITE } from "@/lib/data";

export function MobileFooter() {
  const wa = BRAND.whatsappE164;

  return (
    <footer className="mobile-footer">
      {/* Social row */}
      <div className="mobile-footer__social">
        <a
          href={BRAND.social.instagram}
          target="_blank"
          rel="noreferrer"
          className="mobile-footer__social-btn"
          aria-label="Instagram"
        >
          <Instagram className="h-5 w-5" />
        </a>
        <a
          href={BRAND.social.facebook}
          target="_blank"
          rel="noreferrer"
          className="mobile-footer__social-btn"
          aria-label="Facebook"
        >
          <Facebook className="h-5 w-5" />
        </a>
        <a
          href={BRAND.social.tiktok}
          target="_blank"
          rel="noreferrer"
          className="mobile-footer__social-btn"
          aria-label="TikTok"
        >
          <span className="text-xs font-bold">TT</span>
        </a>
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noreferrer"
          className="mobile-footer__social-btn"
          aria-label="WhatsApp"
        >
          <MessageCircle className="h-5 w-5" />
        </a>
      </div>

      {/* Copyright */}
      <div className="mobile-footer__copyright">
        <span>© {new Date().getFullYear()} {SITE.name}</span>
        <span className="mobile-footer__heart-row">
          Made with <Heart className="h-3 w-3 text-cb-terracotta-dark" aria-hidden /> in Cairo
        </span>
      </div>
    </footer>
  );
}
