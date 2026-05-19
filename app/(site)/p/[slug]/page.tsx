import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Short product links from emails (/p/slug) → full product page. */
export default async function ProductShortLinkPage({ params }: Props) {
  const { slug } = await params;
  const safe = decodeURIComponent(slug ?? "").trim();
  if (!safe) {
    redirect("/shop");
  }
  redirect(`/shop/${encodeURIComponent(safe)}`);
}
