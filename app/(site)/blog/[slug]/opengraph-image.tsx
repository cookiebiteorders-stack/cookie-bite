import { ImageResponse } from "next/og";
import { getSanityClient } from "@/lib/sanity/client";
import { BLOG_POST_BY_SLUG_QUERY } from "@/lib/sanity/queries";

export const alt = "Cookie Bite blog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function BlogOgImage({ params }: Props) {
  const { slug } = await params;
  let title = "From the kitchen journal";
  const client = getSanityClient();
  if (client) {
    try {
      const doc = await client.fetch<{ title_en?: string } | null>(BLOG_POST_BY_SLUG_QUERY, { slug });
      if (doc?.title_en) title = doc.title_en;
    } catch {
      /* fallback title */
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "linear-gradient(160deg, #F8F5EE 0%, #e8d5c4 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 22, color: "#c1692c", fontWeight: 700 }}>Cookie Bite Blog</div>
        <div
          style={{
            marginTop: 20,
            fontSize: 44,
            fontWeight: 700,
            color: "#3d2914",
            lineHeight: 1.2,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
      </div>
    ),
    { ...size },
  );
}
