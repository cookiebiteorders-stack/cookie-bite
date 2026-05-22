import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { buttonClassName } from "@/components/ui/button";
import {
  buildBreadcrumbJsonLd,
  buildCollectionMetadata,
  type CollectionSeoKey,
} from "@/lib/seo";
import { isValidCollectionSlug, listProductsForCollection } from "@/lib/storefront/collection-products";

type Props = { params: Promise<{ slug: string }> };

const COLLECTION_COPY: Record<
  CollectionSeoKey,
  { subtitle: string; intro: string }
> = {
  classic: {
    subtitle: "Timeless flavors baked in small batches",
    intro:
      "Buttery classics and crowd-pleasing chocolate chip cookies — perfect for everyday treats and mixed gift boxes.",
  },
  seasonal: {
    subtitle: "Limited batches and rotating drops",
    intro:
      "Seasonal flavors celebrate the moment — from holiday spices to summer-inspired bakes. Grab them while they last.",
  },
  stuffed: {
    subtitle: "Gooey centers and premium fillings",
    intro:
      "Stuffed cookies with molten centers — Nutella, caramel, and more for indulgent gifting.",
  },
  gifts: {
    subtitle: "Boxes built for celebrations",
    intro:
      "Curated gift assortments and premium packaging for birthdays, thank-yous, and corporate moments.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidCollectionSlug(slug)) return { title: "Collection | Cookie Bite" };
  return buildCollectionMetadata(slug);
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  if (!isValidCollectionSlug(slug)) notFound();

  const products = await listProductsForCollection(slug);
  const copy = COLLECTION_COPY[slug];

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: slug.charAt(0).toUpperCase() + slug.slice(1), path: `/collections/${slug}` },
  ]);

  return (
    <div className="bg-cb-cream pb-24 pt-12">
      <JsonLdScript id={`collection-${slug}-breadcrumb`} json={breadcrumbJsonLd} />
      <div className="mx-auto max-w-7xl cb-gutter">
        <SectionHeading
          align="left"
          className="text-left"
          eyebrow="Collection"
          title={slug.charAt(0).toUpperCase() + slug.slice(1)}
          subtitle={copy.subtitle}
        />
        <p className="mt-4 max-w-2xl text-cb-text">{copy.intro}</p>

        {products.length ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-cb-text-muted">
            New flavors coming soon — browse the full{" "}
            <Link href="/shop" className="font-bold text-cb-terracotta-dark underline">
              shop
            </Link>
            .
          </p>
        )}

        <div className="mt-12 flex flex-wrap gap-4">
          <Link href="/shop" className={buttonClassName("primary", "rounded-full px-8")}>
            View all cookies
          </Link>
          {slug === "gifts" ? (
            <Link href="/gift-box" className={buttonClassName("outline", "rounded-full px-8")}>
              Gift boxes
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
