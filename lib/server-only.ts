/** Throws when this module is bundled for the browser (Next.js server-only pattern). */
if (typeof window !== "undefined") {
  throw new Error("Server-only module was imported on the client.");
}
