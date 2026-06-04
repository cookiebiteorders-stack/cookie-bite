import "server-only";

import { revalidateTag } from "next/cache";
import { invalidateAiWebsiteKnowledgeCache } from "@/lib/ai/website-knowledge";
import { STOREFRONT_CATALOG_TAG } from "@/lib/storefront/cached-catalog";

/** Call after product CRUD / sync so homepage, shop trending, and AI bots refresh catalog context. */
export async function revalidateStorefrontCatalog() {
  revalidateTag(STOREFRONT_CATALOG_TAG, "max");
  invalidateAiWebsiteKnowledgeCache();
  const { invalidateProductsListCache } = await import("@/lib/storefront/products-list-cache");
  await invalidateProductsListCache();
}
