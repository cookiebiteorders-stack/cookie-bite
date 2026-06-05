import "server-only";

export type InstagramOEmbed = {
  permalink: string;
  thumbnailUrl: string;
  title?: string;
};

/** جلب صورة مصغّرة لمنشور إنستغرام عام عبر oEmbed. */
export async function fetchInstagramOEmbed(postUrl: string): Promise<InstagramOEmbed | null> {
  const trimmed = postUrl.trim();
  if (!/^https:\/\/(www\.)?instagram\.com\/(p|reel)\//i.test(trimmed)) {
    return null;
  }

  const endpoint = `https://api.instagram.com/oembed?url=${encodeURIComponent(trimmed)}&omitscript=true&maxwidth=640`;

  try {
    const res = await fetch(endpoint, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      thumbnail_url?: string;
      author_url?: string;
      title?: string;
    };
    const thumbnailUrl = data.thumbnail_url?.trim();
    if (!thumbnailUrl) return null;
    return {
      permalink: trimmed.split("?")[0] ?? trimmed,
      thumbnailUrl,
      title: data.title,
    };
  } catch {
    return null;
  }
}
