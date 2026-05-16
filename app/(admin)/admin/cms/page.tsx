import Link from "next/link";

export default function AdminCmsPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-cb-border bg-cb-surface-elevated p-6">
      <h1 className="font-serif text-2xl font-bold text-cb-text-strong">CMS &amp; Sanity</h1>
      <p className="text-sm text-cb-text-muted">
        المحتوى التحريري يُدار عبر Sanity Studio — الصفحة العامة للمدونة:{" "}
        <Link href="/blog" className="font-semibold text-cb-terracotta-dark underline">
          /blog
        </Link>
        .
      </p>
    </section>
  );
}
