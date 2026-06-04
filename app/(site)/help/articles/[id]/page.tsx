import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpCatalogArticleBody } from "@/components/pages/help-catalog-article-body";
import { JsonLdScript } from "@/components/seo/json-ld-script";
import { getHelpArticleById, getAllHelpArticleIds } from "@/lib/content/help-center";
import { buildBreadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";
import { getLangFromCookies } from "@/lib/seo/server";

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  return getAllHelpArticleIds().map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const lang = await getLangFromCookies();
  const article = getHelpArticleById(id);
  if (!article) return { title: "Help | Cookie Bite" };
  return buildPageMetadata({
    title: article.title[lang],
    description: article.description[lang],
    path: `/help/articles/${id}`,
    keywords: [article.title.en, article.title.ar, "cookie bite help"],
  });
}

export default async function HelpCatalogArticlePage({ params }: Props) {
  const { id } = await params;
  const lang = await getLangFromCookies();
  const article = getHelpArticleById(id);
  if (!article) notFound();

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Help center", path: "/help" },
    { name: article.title[lang], path: `/help/articles/${id}` },
  ]);

  return (
    <>
      <JsonLdScript id={`help-article-${id}-breadcrumb`} json={breadcrumbJsonLd} />
      <HelpCatalogArticleBody article={article} />
    </>
  );
}
