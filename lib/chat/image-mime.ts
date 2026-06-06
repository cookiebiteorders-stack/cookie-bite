const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/** بعض المتصفحات تترك `file.type` فارغاً — نستنتجه من الامتداد. */
export function inferImageMimeType(file: File): string {
  const type = file.type?.split(";")[0]?.trim().toLowerCase();
  if (type && type.startsWith("image/")) return type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_MIME[ext] ?? "image/jpeg";
}
