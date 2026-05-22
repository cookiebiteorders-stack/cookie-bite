import { ImageResponse } from "next/og";

export const alt = "Cookie Bite — Fresh cookies & gift boxes in New Cairo";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          background: "linear-gradient(135deg, #F8F5EE 0%, #f3e4d4 50%, #e8782a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "#8b4513",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Cookie Bite
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 56,
            fontWeight: 700,
            color: "#3d2914",
            lineHeight: 1.15,
            maxWidth: 900,
          }}
        >
          Fresh cookies & gift boxes in New Cairo
        </div>
        <div style={{ marginTop: 20, fontSize: 28, color: "#5c4033" }}>
          Handcrafted · Delivered · A bite of happiness
        </div>
      </div>
    ),
    { ...size },
  );
}
