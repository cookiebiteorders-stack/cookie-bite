import { ImageResponse } from "next/og";
import { getActivePdpProduct } from "@/lib/storefront/pdp-data";

export const alt = "Cookie Bite product";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function ProductOgImage({ params }: Props) {
  const { slug } = await params;
  const product = await getActivePdpProduct(slug);
  const name = product?.name ?? "Cookie Bite";
  const price = product?.price ? `${product.price} EGP` : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "#F8F5EE",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 24, color: "#c1692c", fontWeight: 700 }}>Cookie Bite</div>
        <div>
          <div style={{ fontSize: 52, fontWeight: 700, color: "#3d2914", lineHeight: 1.2 }}>{name}</div>
          {price ? (
            <div style={{ marginTop: 16, fontSize: 36, color: "#8b4513", fontWeight: 600 }}>{price}</div>
          ) : null}
          <div style={{ marginTop: 12, fontSize: 22, color: "#5c4033" }}>New Cairo · Order online</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
