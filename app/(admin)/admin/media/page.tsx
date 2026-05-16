import Link from "next/link";

export default function AdminMediaPage() {
  return (
    <section className="space-y-4 rounded-2xl border border-cb-border bg-cb-surface-elevated p-6">
      <h1 className="font-serif text-2xl font-bold text-cb-text-strong">Media library</h1>
      <p className="text-sm text-cb-text-muted">
        مركز وسائط موحّد قيد التوسعة — استخدم{" "}
        <Link href="/admin/products" className="font-semibold text-cb-terracotta-dark underline">
          المنتجات
        </Link>{" "}
        لرفع صور الكتالوج حالياً، أو Cloudinary من إعدادات المحتوى.
      </p>
    </section>
  );
}
