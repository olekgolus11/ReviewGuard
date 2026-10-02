import type { Location, Review } from "./types";

function isGoogleMapsUrl(raw: string | null): raw is string {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    return host === "maps.app.goo.gl" ||
      (/(?:^|\.)google\.(?:com|[a-z]{2,3}|[a-z]{2}\.[a-z]{2})$/.test(host) && url.pathname.startsWith("/maps/reviews/data="));
  } catch {
    return false;
  }
}

function decodeGoogleReviewToken(reviewId: string): string | null {
  if (reviewId.length > 4096 || !/^[A-Za-z0-9+/_=-]+$/.test(reviewId) || reviewId.startsWith("google-")) return null;
  try {
    const base64 = reviewId.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    const bytes = Array.from(decoded, (character) => character.charCodeAt(0));
    let offset = 0;
    const readVarint = (): number | null => {
      let value = 0;
      let shift = 0;
      while (offset < bytes.length && shift < 35) {
        const byte = bytes[offset++];
        value += (byte & 0x7f) * 2 ** shift;
        if ((byte & 0x80) === 0) return value;
        shift += 7;
      }
      return null;
    };

    if (readVarint() !== 0x0a) return null; // Field 1, length-delimited.
    const length = readVarint();
    if (length === null || length < 1 || offset + length > bytes.length) return null;
    const tokenBytes = bytes.slice(offset, offset + length);
    offset += length;
    if (bytes[offset++] !== 0x10 || bytes[offset++] !== 0x01 || offset !== bytes.length) return null;
    const token = String.fromCharCode(...tokenBytes);
    return /^[A-Za-z0-9+/_=-]+$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

/** Build the review URL shape returned by Google Maps Share, using its embedded review token. */
export function createGoogleReviewPermalink(reviewId: string, locationId: string): string | null {
  const token = decodeGoogleReviewToken(reviewId);
  const cid = locationId.match(/:0x([a-f\d]+)$/i)?.[1];
  if (!token || !cid) return null;
  return `https://www.google.com/maps/reviews/data=!4m8!14m7!1m6!2m5!1s${encodeURIComponent(reviewId)}!2m1!1s0x0:0x${cid}!3m1!1s2@1:${encodeURIComponent(token)}%7C%7C`;
}

/** Return a stored or derived review-specific link, otherwise the location link. */
export function getReviewSourceUrl(review: Review, location: Location): string {
  if (isGoogleMapsUrl(review.sourceUrl) && review.sourceUrl !== location.sourceUrl) return review.sourceUrl;
  return createGoogleReviewPermalink(review.id, location.id) ?? location.sourceUrl;
}
