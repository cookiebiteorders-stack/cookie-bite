/**
 * Cloudinary delivery transforms for quality enhancement only.
 * Does not change composition or subject identity — URL params only.
 */

export type EnhanceOperation = "upscale" | "sharpen" | "denoise" | "color_correct";

const OP_CHAIN: Record<EnhanceOperation, string> = {
  upscale: "c_limit,w_2400,q_auto:best",
  sharpen: "e_sharpen:80",
  denoise: "e_noise_reduction:40",
  color_correct: "e_improve:outdoor",
};

export function parseCloudinaryPublicId(url: string): { cloudName: string; publicId: string } | null {
  try {
    const u = new URL(url);
    if (u.hostname !== "res.cloudinary.com") return null;
    const parts = u.pathname.split("/").filter(Boolean); // ["<cloud>", "image"|"video", "upload", "v123", ...rest]
    if (parts.length < 4) return null;
    const rest = parts.slice(3);
    let start = 0;
    if (/^v\d+$/.test(rest[0] ?? "")) start = 1;
    const publicId = rest.slice(start).map(decodeURIComponent).join("/");
    return { cloudName: u.host, publicId };
  } catch {
    return null;
  }
}

/** Build enhanced delivery URL (no re-upload). */
export function buildEnhancedDeliveryUrl(
  imageUrl: string,
  operations: EnhanceOperation[] = ["sharpen", "color_correct"],
): { enhanced_url: string; operations_applied: string[]; note: string } | { error: string } {
  const parsed = parseCloudinaryPublicId(imageUrl);
  if (!parsed) {
    return {
      error:
        "Only Cloudinary URLs can be enhanced in-place. Upload to Cloudinary first or use /admin/media.",
    };
  }

  const ops = operations.length ? operations : (["sharpen", "color_correct"] as EnhanceOperation[]);
  const chain = [...new Set(ops.map((o) => OP_CHAIN[o]).filter(Boolean))].join("/");
  const enhanced_url = `https://res.cloudinary.com/${parsed.cloudName}/image/upload/${chain}/${parsed.publicId}`;

  return {
    enhanced_url,
    operations_applied: ops,
    note:
      "Preview URL only — identity preserved (no generative edit). To persist, replace product image URL or re-upload via media library.",
  };
}
