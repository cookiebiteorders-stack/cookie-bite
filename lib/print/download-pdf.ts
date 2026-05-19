"use client";

/**
 * Downloads a PDF via fetch (cookies included). Avoids <a download> opening JSON as .txt.
 */
export async function downloadPdfFromUrl(
  url: string,
  filename = "document.pdf",
): Promise<void> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    if (contentType.includes("application/json")) {
      try {
        const json = (await res.json()) as {
          error?: { en?: string; ar?: string };
        };
        message = json.error?.en ?? json.error?.ar ?? message;
      } catch {
        /* ignore parse */
      }
    }
    throw new Error(message);
  }

  if (!contentType.includes("application/pdf")) {
    const snippet = (await res.text()).slice(0, 200);
    throw new Error(
      snippet.includes("error")
        ? "Could not generate PDF. Please sign in and try again."
        : "Server did not return a PDF file.",
    );
  }

  const blob = await res.blob();
  if (blob.size < 100) {
    throw new Error("PDF file is empty. Please try again.");
  }

  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = safeName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
}
