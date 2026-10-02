import type { Location, Review } from "./types";

function isGoogleMapsUrl(raw: string | null): raw is string {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return host === "maps.app.goo.gl" ||
      (/(?:^|\.)google\.(?:com|[a-z]{2,3}|[a-z]{2}\.[a-z]{2})$/.test(host) && /\/maps(?:\/|$)/.test(url.pathname) && !/\/maps\/contrib(?:\/|$)/.test(url.pathname));
  } catch {
    return false;
  }
}

/** Return a stored review-specific Google link when present, otherwise the place link. */
export function getReviewSourceUrl(review: Review, location: Location): string {
  return isGoogleMapsUrl(review.sourceUrl) && review.sourceUrl !== location.sourceUrl
    ? review.sourceUrl
    : location.sourceUrl;
}
