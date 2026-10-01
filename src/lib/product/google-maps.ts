import { createHash, randomUUID } from "node:crypto";
import { chromium, type Browser, type Locator, type Page, type Route } from "playwright";
import type { ImportSnapshot, Review, ReviewMedia } from "./types";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const NAVIGATION_TIMEOUT_MS = 45_000;
const REVIEW_WAIT_MS = 12_000;
const MAX_SCROLL_ROUNDS = 30;

type PlaceDetails = { name: string | null; address: string | null; totalReviewCount: number | null };

function isGoogleDomain(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return host === "google.com" || host.endsWith(".google.com") ||
    /^google\.(?:[a-z]{2,3}|[a-z]{2}\.[a-z]{2})$/.test(host) ||
    /^maps\.google\.(?:[a-z]{2,3}|[a-z]{2}\.[a-z]{2})$/.test(host) ||
    /^consent\.google\.(?:[a-z]{2,3}|[a-z]{2}\.[a-z]{2})$/.test(host);
}

function isAllowedMapsUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    return url.hostname.toLowerCase() === "maps.app.goo.gl" ||
      (isGoogleDomain(url.hostname) && (/\/maps(?:\/|$)/.test(url.pathname) || url.hostname.startsWith("consent.")));
  } catch {
    return false;
  }
}

function isAllowedNavigation(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (url.hostname.toLowerCase() === "maps.app.goo.gl") return true;
    if (!isGoogleDomain(url.hostname)) return false;
    if (/\/maps(?:\/|$)/.test(url.pathname)) return true;
    if (url.hostname.startsWith("consent.google.")) {
      // Google submits the consent choice to this fixed endpoint before redirecting to Maps.
      if (url.pathname === "/save") return true;
      const continuation = url.searchParams.get("continue");
      return Boolean(continuation && isAllowedMapsUrl(continuation));
    }
    return false;
  } catch {
    return false;
  }
}

function boundedLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  if (!Number.isFinite(limit)) throw new TypeError("Review limit must be a finite number.");
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit)));
}

function stableId(value: string): string {
  return `google-${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
}

function textContent(locator: Locator): Promise<string | null> {
  return locator.first().innerText({ timeout: 1_000 }).then((text) => text.trim() || null).catch(() => null);
}

function normalizedText(value: string | null): string | null {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function parseReviewCount(value: string | null): number | null {
  if (!value) return null;
  const match = value.replace(/\u00a0/g, " ").match(/([\d.,\s]+)\s*(?:reviews?|opin(?:ie|ii)|recenz(?:ji|ja)|avis|bewertungen|reseñas|reseñas?)/i);
  if (!match) return null;
  const digits = match[1].replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function parseRating(label: string | null): number | null {
  if (!label) return null;
  const match = label.match(/(?:^|\s)([1-5](?:[.,]\d+)?)\s*(?:out of 5|stars?|gwiazdek?|na 5|\/\s*5)?/i);
  if (!match) return null;
  const rating = Number(match[1].replace(",", "."));
  return rating >= 1 && rating <= 5 ? rating : null;
}

function dateToIso(label: string | null): string | null {
  if (!label || !/\b\d{4}\b/.test(label)) return null;
  const parsed = Date.parse(label);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

async function answerConsent(page: Page): Promise<boolean> {
  for (const pattern of [/Reject all/i, /Odrzuć wszystko/i, /Reject all cookies/i]) {
    const button = page.getByRole("button", { name: pattern }).first();
    await button.waitFor({ state: "visible", timeout: 2_000 }).catch(() => undefined);
    if (await button.isVisible().catch(() => false)) {
      await button.click({ timeout: 3_000 }).catch(() => undefined);
      await page.waitForLoadState("domcontentloaded", { timeout: 8_000 }).catch(() => undefined);
      return true;
    }
  }
  return false;
}

async function getPlaceDetails(page: Page): Promise<PlaceDetails> {
  const name = normalizedText(await page.locator("h1").first().innerText().catch(() => null));
  const addressLabel = await page.locator('button[aria-label^="Address:"], button[aria-label^="Adres:"]').first().getAttribute("aria-label").catch(() => null);
  const address = addressLabel?.replace(/^(Address|Adres):\s*/i, "").trim() || null;
  const body = await page.locator("body").innerText().catch(() => "");
  let totalReviewCount = parseReviewCount(body);
  if (totalReviewCount === null) {
    const labels = await page.locator("[aria-label]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? ""));
    for (const label of labels) {
      totalReviewCount = parseReviewCount(label);
      if (totalReviewCount !== null) break;
    }
  }
  return { name, address, totalReviewCount };
}

async function openReviews(page: Page): Promise<boolean> {
  const candidates = page.locator('button[aria-label], [role="button"][aria-label]');
  const labels = await candidates.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? ""));
  for (const label of labels) {
    if (!/(?:\d[\d,.]*\s*)?(?:reviews?|opinie|opinii|recenzje|avis|bewertungen|reseñas)/i.test(label) || /learn more|dowiedz się więcej|publicly available|publicznie dostępnych/i.test(label)) continue;
    const target = page.locator(`[aria-label=${JSON.stringify(label)}]`).first();
    if (await target.isVisible().catch(() => false)) {
      await target.click({ timeout: 3_000 }).catch(() => undefined);
      await page.waitForTimeout(1_200);
      return true;
    }
  }
  // In Maps, the compact rating row often opens the review pane and has a stable localized label.
  const rating = page.locator('[role="img"][aria-label*="star"], [role="img"][aria-label*="gwiazdk"]').first();
  if (await rating.isVisible().catch(() => false)) {
    await rating.click({ timeout: 3_000 }).catch(() => undefined);
    await page.waitForTimeout(1_200);
    return true;
  }
  return false;
}

async function setNewestSort(page: Page): Promise<boolean> {
  const buttons = page.locator('button[aria-label], [role="button"][aria-label]');
  const labels = await buttons.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? ""));
  const sort = labels.find((label) => /sort|sortuj|najnowsze|most relevant|most recent/i.test(label));
  if (sort) {
    await page.locator(`[aria-label=${JSON.stringify(sort)}]`).first().click({ timeout: 3_000 }).catch(() => undefined);
    await page.waitForTimeout(200);
    const options = page.locator('[role="menuitem"], [role="option"], [role="menu"] button');
    const optionLabels = await options.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? "").trim()));
    const newestIndex = optionLabels.findIndex((label) => /newest|most recent|najnowsze|najnowszych/i.test(label));
    if (newestIndex >= 0) {
      await options.nth(newestIndex).click().catch(() => undefined);
      await page.waitForTimeout(700);
      return true;
    }
  }
  // Current Maps review panes expose a sort control as a button named “Sort by”.
  const sortButton = page.getByRole("button", { name: /sort by|sortuj według/i }).first();
  if (await sortButton.isVisible().catch(() => false)) {
    await sortButton.click().catch(() => undefined);
    const newest = page.getByText(/newest|most recent|najnowsze/i).last();
    if (await newest.isVisible().catch(() => false)) {
      await newest.click().catch(() => undefined);
      await page.waitForTimeout(700);
      return true;
    }
  }
  return false;
}

async function firstText(card: Locator, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const result = normalizedText(await textContent(card.locator(selector)));
    if (result) return result;
  }
  return null;
}

async function scrapeCard(card: Locator): Promise<Review | null> {
  const cardId = await card.getAttribute("data-review-id").catch(() => null) ??
    await card.getAttribute("data-sort-id").catch(() => null);
  const author = await firstText(card, [".d4r55", '[class*="author-name"]']);
  const ratingLabel = await card.locator('[role="img"][aria-label], [aria-label*="star"], [aria-label*="gwiazdek"]').first().getAttribute("aria-label").catch(() => null);
  const fallbackRating = await textContent(card.locator(".kvMYJc")) ?? await card.locator('[aria-label*="star"], [aria-label*="gwiazdk"]').first().getAttribute("aria-label").catch(() => null);
  const rating = parseRating(ratingLabel) ?? parseRating(fallbackRating);
  const reviewText = card.locator(".MyEned .wiI7pd, .wiI7pd").first();
  let text = normalizedText(await textContent(reviewText)) ?? "";
  if (!text) text = normalizedText(await firstText(card, [".MyEned", '[data-expandable-section]'])) ?? "";
  const dateLabel = await firstText(card, [".rsqaWe", '[class*="date"]']);
  const languageLabel = await card.locator('[lang]').first().getAttribute("lang").catch(() => null);
  const sourceUrlRaw = await card.locator('a[href*="reviews"]').first().getAttribute("href").catch(() => null);
  let sourceUrl: string | null = null;
  if (sourceUrlRaw) {
    try {
      const candidate = new URL(sourceUrlRaw, "https://www.google.com");
      if (isAllowedMapsUrl(candidate.toString())) sourceUrl = candidate.toString();
    } catch { /* Ignore non-Google review links. */ }
  }
  const media: ReviewMedia[] = await card.locator('[class*="photo"] img, button[aria-label*="photo"] img, [class*="ReviewPhoto"] img, [style*="background-image"]').evaluateAll((images) => images.flatMap((image) => {
    const src = image.getAttribute("src") ?? image.getAttribute("data-src") ?? image.getAttribute("style")?.match(/url\(["']?(.*?)["']?\)/)?.[1];
    if (!src || !/googleusercontent\.com|gstatic\.com/i.test(src)) return [];
    const alt = image.getAttribute("alt")?.trim();
    return [{ url: src, type: "image" as const, ...(alt ? { caption: alt } : {}) }];
  })).catch(() => []);
  const reply = await firstText(card, [".CDe7pd .wiI7pd", '[class*="owner-response"] .wiI7pd', '[class*="response"] .wiI7pd']);
  const replyDate = reply ? await firstText(card, ['[class*="response"] .rsqaWe', ".CDe7pd .rsqaWe"]) : null;
  const title = await firstText(card, [".review-title", '[class*="review-title"]']);
  if (!text && !cardId && !author) return null;
  if (!rating) return null;
  return {
    id: cardId || sourceUrl || stableId(JSON.stringify([author, rating, text, dateLabel])),
    sourceUrl,
    author,
    rating: typeof rating === "number" && rating > 0 ? rating : 0,
    text,
    title,
    publishedAt: dateToIso(dateLabel),
    publishedAtLabel: dateLabel,
    language: languageLabel,
    media,
    ownerReply: reply ? { text: reply, publishedAt: dateToIso(replyDate) } : null,
  };
}

async function expandVisibleReviews(cards: Locator, limit: number): Promise<void> {
  const count = Math.min(await cards.count().catch(() => 0), limit);
  for (let index = 0; index < count; index += 1) {
    const expand = cards.nth(index).getByRole("button", { name: /more|read more|więcej|czytaj więcej/i }).first();
    await expand.click({ timeout: 800 }).catch(() => undefined);
  }
}

async function collectReviews(page: Page, limit: number, sortedNewest: boolean): Promise<{ reviews: Review[]; stopReason: string }> {
  const cards = page.locator(".jftiEf[data-review-id], .jftiEf[data-sort-id], [data-review-id].jftiEf");
  const started = Date.now();
  let rounds = 0;
  let previousCount = -1;
  let quietRounds = 0;
  while (Date.now() - started < REVIEW_WAIT_MS && rounds < MAX_SCROLL_ROUNDS) {
    const count = await cards.count().catch(() => 0);
    if (count >= limit || (count > 0 && count === previousCount && quietRounds >= 2)) break;
    if (count === previousCount) quietRounds += 1; else quietRounds = 0;
    previousCount = count;
    const scrollable = page.locator('div[role="feed"]').first();
    if (await scrollable.count().catch(() => 0)) {
      await scrollable.evaluate((node) => { node.scrollTop = node.scrollHeight; }).catch(() => undefined);
    } else if (count) {
      await cards.nth(count - 1).scrollIntoViewIfNeeded().catch(() => undefined);
    }
    await page.waitForTimeout(Math.min(1_000 + rounds * 100, 1_800));
    rounds += 1;
  }
  await expandVisibleReviews(cards, limit);
  const count = await cards.count().catch(() => 0);
  const reviews: Review[] = [];
  for (let index = 0; index < Math.min(count, limit); index += 1) {
    const review = await scrapeCard(cards.nth(index));
    if (review) reviews.push(review);
  }
  const stopReason = reviews.length === 0
    ? "Google Maps loaded the place but exposed no review cards (limited view, unavailable reviews, or blocked access)."
    : reviews.length >= limit
      ? `Requested newest ${limit} reviews; stopped at the requested limit.`
      : `Google Maps exposed ${reviews.length} review cards before loading stopped.`;
  return { reviews, stopReason: sortedNewest ? stopReason : `${stopReason} Google’s newest sort control was unavailable; ordering is unverified.` };
}

async function routeGuard(route: Route): Promise<void> {
  const request = route.request();
  if (!request.isNavigationRequest()) {
    await route.continue();
    return;
  }
  const frame = request.frame();
  if (frame.parentFrame()) {
    await route.continue();
    return;
  }
  if (!isAllowedNavigation(request.url())) await route.abort("blockedbyclient");
  else await route.continue();
}

export async function importGoogleMapsLocation(url: string, limit?: number): Promise<ImportSnapshot> {
  if (!isAllowedMapsUrl(url)) throw new TypeError("Use an HTTPS Google Maps place link or maps.app.goo.gl shortlink.");
  const requestedLimit = boundedLimit(limit);
  let browser: Browser | null = null;
  let page: Page | null = null;
  let location: ImportSnapshot["location"] = {
    id: stableId(new URL(url).pathname + new URL(url).searchParams.get("q")), name: "Google Maps location", address: null, sourceUrl: url, totalReviewCount: null,
  };
  let reviews: Review[] = [];
  let sort = "newest";
  let stopReason = "Google Maps did not expose review data.";
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
    const context = await browser.newContext({ locale: "en-US", serviceWorkers: "block" });
    await context.route("**/*", routeGuard);
    page = await context.newPage();
    page.setDefaultTimeout(5_000);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAVIGATION_TIMEOUT_MS });
    await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => undefined);
    await page.waitForTimeout(2_000);
    if (new URL(page.url()).hostname.startsWith("consent.google.")) {
      await answerConsent(page);
      await page.waitForTimeout(1_500);
    }
    if (!isAllowedMapsUrl(page.url()) || !new URL(page.url()).pathname.match(/\/maps(?:\/|$)/)) {
      stopReason = `Google Maps shortlink did not resolve to an allowed Maps location page (current page: ${page.url()}).`;
    } else {
      const details = await getPlaceDetails(page);
      const resolvedUrl = page.url();
      let placeId = new URL(resolvedUrl).pathname.match(/!1s([^!/?]+)/)?.[1] ?? new URL(resolvedUrl).pathname.match(/!16s([^!/?]+)/)?.[1] ?? null;
      placeId = placeId ? decodeURIComponent(placeId) : null;
      location = {
        id: placeId || `google-${randomUUID()}`,
        name: details.name ?? "Google Maps location",
        address: details.address,
        sourceUrl: resolvedUrl,
        totalReviewCount: details.totalReviewCount,
      };
      const opened = await openReviews(page);
      if (opened) {
        await page.waitForSelector(".jftiEf, [data-review-id].jftiEf", { timeout: REVIEW_WAIT_MS }).catch(() => undefined);
        const orderedNewest = await setNewestSort(page);
        sort = orderedNewest ? "newest" : "unknown (Google sort control unavailable)";
        const result = await collectReviews(page, requestedLimit, orderedNewest);
        reviews = result.reviews;
        stopReason = result.stopReason;
      } else {
        stopReason = "Google Maps loaded the place details but did not expose an accessible review entry point.";
      }
    }
  } catch (error) {
    stopReason = error instanceof Error ? `Google Maps import stopped: ${error.message}` : "Google Maps import stopped unexpectedly.";
  } finally {
    await browser?.close().catch(() => undefined);
  }
  if (reviews.length === 0) throw new Error(`${stopReason}${page ? ` Resolved page: ${page.url()}` : ""}`);
  return {
    id: randomUUID(),
    importedAt: new Date().toISOString(),
    location,
    reviews,
    coverage: {
      requestedLimit,
      importedCount: reviews.length,
      totalReviewCount: location.totalReviewCount,
      sort,
      complete: reviews.length >= requestedLimit || (location.totalReviewCount !== null && reviews.length >= location.totalReviewCount),
      stopReason,
    },
  };
}
