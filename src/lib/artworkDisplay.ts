/**
 * Returns a display-optimized artwork URL when a verified WebP sibling exists.
 *
 * Keep the original URL for downloads and release-delivery workflows. This map
 * is deliberately allow-listed: don't guess that a WebP sibling exists for every
 * Storage object, because that would introduce failed requests for unconverted
 * artwork.
 */
const VERIFIED_PUBLIC_WEBP_SIBLINGS: Record<string, string> = {
  "/storage/v1/object/public/release_artwork/28cc0ca4-ad0f-40d4-be9c-a6918d81e188/1780078112066_cover.jpeg":
    "/storage/v1/object/public/release_artwork/28cc0ca4-ad0f-40d4-be9c-a6918d81e188/1780078112066_cover.webp",
};

export function getArtworkDisplayUrl(source?: string | null): string | undefined {
  if (!source) return undefined;

  try {
    const url = new URL(source);
    const optimizedPath = VERIFIED_PUBLIC_WEBP_SIBLINGS[url.pathname];
    if (!optimizedPath) return source;

    url.pathname = optimizedPath;
    return url.toString();
  } catch {
    // Leave relative, malformed, or non-URL values unchanged.
    return source;
  }
}
