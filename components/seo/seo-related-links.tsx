import Link from "next/link";

export type SeoRelatedLink = { href: string; label: string };

type Props = {
  ariaLabel: string;
  links: SeoRelatedLink[];
  className?: string;
};

/** Descriptive internal links for SEO and navigation (Google: write good anchor text). */
export function SeoRelatedLinks({ ariaLabel, links, className }: Props) {
  if (!links.length) return null;
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-cb-terracotta-dark underline-offset-2 hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
