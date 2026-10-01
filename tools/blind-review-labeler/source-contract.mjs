const LABELER_FALLBACKS = { reviewer: "Anonimowy klient", location: "Lokalizacja niepodana" };

function firstString(...values) {
  return values.find(value => typeof value === "string" && value.trim() !== "") ?? "";
}

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && value !== "") ?? "";
}

function nestedName(value) {
  return typeof value === "string" ? value : firstString(value?.name, value?.title, value?.address);
}

export function extractReviews(source) {
  if (Array.isArray(source?.reviews)) return { reviews: source.reviews, defaultLocation: "", defaultLocationId: "", defaultLocationAddress: "" };
  const snapshot = source?.workspace?.snapshot;
  if (Array.isArray(snapshot?.reviews)) return { reviews: snapshot.reviews, defaultLocation: nestedName(snapshot.location), defaultLocationId: firstString(snapshot.location?.id), defaultLocationAddress: firstString(snapshot.location?.address) };
  throw new Error("Nie znaleziono tablicy reviews ani workspace.snapshot.reviews.");
}

export function normalizeReview(raw, index, defaultLocation = "", defaultLocationId = "", defaultLocationAddress = "") {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Element ${index + 1} nie jest obiektem opinii.`);
  const id = firstValue(raw.reviewId, raw.id, raw.googleReviewId);
  if (typeof id !== "string" && typeof id !== "number") throw new Error(`Opinia ${index + 1} nie ma stabilnego pola id lub reviewId.`);
  const ownerReply = raw.ownerReply;
  const reviewer = firstString(raw.reviewerName, raw.authorName, nestedName(raw.reviewer), nestedName(raw.author), raw.reviewer, raw.author, LABELER_FALLBACKS.reviewer);
  const locationObject = raw.location && typeof raw.location === "object" ? raw.location : null;
  const location = firstString(nestedName(raw.location), raw.locationName, defaultLocation, LABELER_FALLBACKS.location);
  const title = firstString(raw.title, raw.reviewTitle);
  const dateValue = firstValue(raw.publishedAtLabel, raw.date, raw.createdAt, raw.publishedAt, raw.updateTime);
  const mediaInput = Array.isArray(raw.media) ? raw.media : Array.isArray(raw.attachments) ? raw.attachments : [];
  const media = mediaInput.map(item => ({
    caption: firstString(item?.caption, item?.description, item?.altText, item?.name),
    reference: firstString(item?.url, item?.sourceUrl, item?.reference),
    type: firstString(item?.type, item?.mimeType),
  })).filter(item => item.caption || item.reference || item.type);
  return {
    id: String(id), reviewer, rating: firstValue(raw.rating, raw.stars),
    text: firstString(raw.text, raw.reviewText, raw.comment, raw.body),
    ownerResponse: firstString(raw.ownerResponse, raw.response, raw.reply, nestedName(ownerReply), ownerReply?.text),
    location,
    locationId: firstString(locationObject?.id, raw.locationId, defaultLocationId),
    locationAddress: firstString(locationObject?.address, raw.locationAddress, defaultLocationAddress),
    title, media,
    date: typeof dateValue === "string" ? dateValue : dateValue ? String(dateValue) : "",
  };
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export async function sha256Canonical(value) {
  if (!globalThis.crypto?.subtle) throw new Error("SHA-256 niedostępne; uruchom narzędzie przez localhost.");
  const bytes = new TextEncoder().encode(canonical(value));
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function prepareSource(source) {
  const extracted = extractReviews(source);
  const reviews = extracted.reviews.map((raw, index) => normalizeReview(raw, index, extracted.defaultLocation, extracted.defaultLocationId, extracted.defaultLocationAddress));
  if (!reviews.length) throw new Error("Plik nie zawiera opinii.");
  const seen = new Set();
  for (const review of reviews) {
    if (seen.has(review.id)) throw new Error(`Powtórzone ID opinii: ${review.id}. Każda opinia musi mieć unikalne ID.`);
    seen.add(review.id);
    review.sourceFingerprint = await sha256Canonical({ id: review.id, reviewer: review.reviewer, rating: review.rating, text: review.text, ownerResponse: review.ownerResponse, location: review.location, locationId: review.locationId, locationAddress: review.locationAddress, title: review.title, media: review.media, date: review.date });
  }
  const datasetHash = await sha256Canonical(reviews.map(({ id, sourceFingerprint }) => ({ id, fingerprint: sourceFingerprint })));
  return { reviews, datasetHash };
}

export { LABELER_FALLBACKS };
