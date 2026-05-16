import type { Metadata } from "next";
import { OrderTrackForm } from "@/components/orders/order-track-form";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Track Order",
  description: "Track your Cookie Bite order status.",
  path: "/track",
  noIndex: true,
});

type Props = {
  searchParams: Promise<{ order?: string; email?: string }>;
};

export default async function TrackOrderPage({ searchParams }: Props) {
  const { order, email } = await searchParams;

  return (
    <div className="bg-cb-cream px-4 py-16">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-serif text-3xl font-semibold text-cb-text-strong">تتبّع الطلب</h1>
        <p className="mt-2 text-sm text-cb-text" dir="rtl">
          أدخل رقم الطلب والبريد المستخدم عند الشراء.
        </p>
      </div>
      <div className="mt-8">
        <OrderTrackForm initialOrder={order} initialEmail={email} />
      </div>
    </div>
  );
}
