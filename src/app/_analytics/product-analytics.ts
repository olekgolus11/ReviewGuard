import type { DemoReviewId, ReviewRating } from "../_demo-prototype/demo-data";

export type AnalyticsConsent = "unknown" | "granted" | "denied";
export type AnalyticsLocale = "pl" | "en";
export type AnalyticsPageKind = "landing" | "demo";
export type AnalyticsDeviceClass = "desktop" | "tablet" | "mobile";
export type AnalyticsReviewId = DemoReviewId;
export type AnalyticsReviewCategory = "quick" | "personalize" | "caution";
export type AnalyticsActionKind = "style" | "length" | "variant";

export const POSTHOG_EU_INGESTION_HOST = "https://eu.i.posthog.com";

export type AcquisitionProperties = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer_domain?: string;
  device_class?: AnalyticsDeviceClass;
};

type PageProperties = AcquisitionProperties & {
  locale: AnalyticsLocale;
  page_kind: AnalyticsPageKind;
};

type ReviewFacts = {
  locale: AnalyticsLocale;
  review_id: AnalyticsReviewId;
  rating: ReviewRating;
  review_category: AnalyticsReviewCategory;
};

type ReviewProperties = Omit<PageProperties, "page_kind"> & ReviewFacts & {
  page_kind: "demo";
};

export type ProductAnalyticsEvent =
  | { name: "landing_page_viewed"; properties: PageProperties & { page_kind: "landing" } }
  | { name: "demo_opened"; properties: PageProperties & { page_kind: "demo" } }
  | { name: "review_opened"; properties: ReviewFacts }
  | { name: "reply_edited"; properties: ReviewProperties }
  | { name: "reply_approved"; properties: ReviewProperties }
  | { name: "reply_copied"; properties: ReviewProperties }
  | {
      name: "prepared_reply_variant_selected";
      properties: ReviewProperties & { action_kind: AnalyticsActionKind };
    }
  | { name: "lead_form_viewed"; properties: PageProperties }
  | { name: "lead_submitted"; properties: PageProperties };

export type CurrentAnalyticsPage = Extract<
  ProductAnalyticsEvent,
  { name: "landing_page_viewed" | "demo_opened" }
>;

export type AnalyticsConfiguration = {
  apiKey: string;
  host: typeof POSTHOG_EU_INGESTION_HOST;
};

export type AnalyticsTransportEvent = ProductAnalyticsEvent & {
  anonymousSessionId: string;
};

export type AnalyticsTransport = {
  initialize(configuration: AnalyticsConfiguration): void | Promise<void>;
  capture(event: AnalyticsTransportEvent): void | Promise<void>;
  shutdown?(): void | Promise<void>;
};

export type AnalyticsConsentSource = {
  current(): AnalyticsConsent;
};

export type ProductAnalyticsDependencies = {
  transport: AnalyticsTransport;
  consent: AnalyticsConsentSource;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  clock: { now(): number };
  session: { createId(): string };
  environment: {
    deployment: "production" | "preview" | "development" | "test";
    hostname: string;
    deviceOptOut: boolean | { current(): boolean };
    configuration?: AnalyticsConfiguration;
  };
};

export const ANALYTICS_SESSION_STORAGE_KEY = "reviewguard.analytics.session";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1_000;
const ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1_000;

type StoredAnalyticsSession = {
  id: string;
  startedAt: number;
  lastActivityAt: number;
  acquisition?: AcquisitionProperties;
  pageMilestones?: Array<"landing_page_viewed" | "demo_opened">;
};

function isStoredAnalyticsSession(value: unknown): value is StoredAnalyticsSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredAnalyticsSession>;
  return typeof session.id === "string"
    && /^[A-Za-z0-9_-]{1,100}$/.test(session.id)
    && typeof session.startedAt === "number"
    && Number.isFinite(session.startedAt)
    && typeof session.lastActivityAt === "number"
    && Number.isFinite(session.lastActivityAt)
    && (
      session.acquisition === undefined
      || sanitizeAcquisitionProperties(session.acquisition) !== undefined
    )
    && (
      session.pageMilestones === undefined
      || (
        Array.isArray(session.pageMilestones)
        && session.pageMilestones.every(
          (name) => name === "landing_page_viewed" || name === "demo_opened",
        )
      )
    );
}

function isEligibleEnvironment(
  environment: ProductAnalyticsDependencies["environment"],
): environment is ProductAnalyticsDependencies["environment"] & {
  configuration: AnalyticsConfiguration;
} {
  const configuration = environment.configuration;
  const hostname = environment.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return environment.deployment === "production"
    && hostname !== "localhost"
    && hostname !== "127.0.0.1"
    && hostname !== "::1"
    && !hostname.endsWith(".localhost")
    && !isDeviceOptedOut(environment.deviceOptOut)
    && typeof configuration?.apiKey === "string"
    && configuration.apiKey.trim().length > 0
    && configuration.host === POSTHOG_EU_INGESTION_HOST;
}

function isDeviceOptedOut(
  source: ProductAnalyticsDependencies["environment"]["deviceOptOut"],
) {
  try {
    return typeof source === "boolean" ? source : source.current() === true;
  } catch {
    return true;
  }
}

const acquisitionKeys = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "referrer_domain",
  "device_class",
] as const;

const pageKeys = ["locale", "page_kind", ...acquisitionKeys] as const;
const reviewKeys = [
  ...pageKeys,
  "review_id",
  "rating",
  "review_category",
] as const;
const reviewFactKeys = ["locale", "review_id", "rating", "review_category"] as const;

export const ANALYTICS_PAGE_MILESTONE_PROPERTY_KEYS = pageKeys;
export const ANALYTICS_REVIEW_OPENED_PROPERTY_KEYS = reviewFactKeys;

const reviewFacts: Record<
  AnalyticsReviewId,
  { rating: ReviewProperties["rating"]; review_category: AnalyticsReviewCategory }
> = {
  P1: { rating: 5, review_category: "quick" },
  P2: { rating: 5, review_category: "quick" },
  P3: { rating: 5, review_category: "quick" },
  P4: { rating: 5, review_category: "quick" },
  M1: { rating: 3, review_category: "personalize" },
  M2: { rating: 3, review_category: "personalize" },
  M3: { rating: 2, review_category: "personalize" },
  N1: { rating: 2, review_category: "caution" },
  N2: { rating: 1, review_category: "caution" },
  N3: { rating: 1, review_category: "caution" },
  C1: { rating: 1, review_category: "caution" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export function isAnalyticsCampaignValue(value: unknown): value is string {
  return typeof value === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._~-]{0,99}$/.test(value);
}

export function isAnalyticsReferrerDomain(value: unknown): value is string {
  return typeof value === "string"
    && value.length <= 253
    && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(
      value,
    );
}

function sanitizeAcquisitionProperties(value: unknown): AcquisitionProperties | undefined {
  if (!isRecord(value) || !hasOnlyKeys(value, acquisitionKeys)) return undefined;
  const page = sanitizePageProperties({ locale: "en", page_kind: "landing", ...value });
  if (!page) return undefined;
  return acquisitionFromPage(page);
}

function acquisitionFromPage(properties: PageProperties): AcquisitionProperties {
  const acquisition: AcquisitionProperties = {};
  for (const key of acquisitionKeys) {
    const value = properties[key];
    if (value !== undefined) {
      (acquisition as Record<string, unknown>)[key] = value;
    }
  }
  return acquisition;
}

function sanitizePageProperties(
  value: unknown,
  expectedPageKind?: AnalyticsPageKind,
): PageProperties | undefined {
  if (!isRecord(value) || !hasOnlyKeys(value, pageKeys)) return undefined;
  if (value.locale !== "pl" && value.locale !== "en") return undefined;
  if (value.page_kind !== "landing" && value.page_kind !== "demo") return undefined;
  if (expectedPageKind && value.page_kind !== expectedPageKind) return undefined;

  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ] as const) {
    if (value[key] !== undefined && !isAnalyticsCampaignValue(value[key])) return undefined;
  }
  if (
    value.referrer_domain !== undefined
    && !isAnalyticsReferrerDomain(value.referrer_domain)
  ) return undefined;
  if (
    value.device_class !== undefined
    && value.device_class !== "desktop"
    && value.device_class !== "tablet"
    && value.device_class !== "mobile"
  ) return undefined;

  const properties: PageProperties = {
    locale: value.locale,
    page_kind: value.page_kind,
  };
  for (const key of acquisitionKeys) {
    const property = value[key];
    if (property !== undefined) {
      (properties as Record<string, unknown>)[key] = property;
    }
  }
  return properties;
}

function sanitizeReviewProperties(value: unknown) {
  if (!isRecord(value) || !hasOnlyKeys(value, reviewKeys)) return undefined;
  const page = sanitizePageProperties(
    Object.fromEntries(pageKeys.map((key) => [key, value[key]]).filter(([, item]) => item !== undefined)),
    "demo",
  );
  if (!page || typeof value.review_id !== "string" || !(value.review_id in reviewFacts)) {
    return undefined;
  }
  const reviewId = value.review_id as AnalyticsReviewId;
  const expected = reviewFacts[reviewId];
  if (
    value.rating !== expected.rating
    || value.review_category !== expected.review_category
  ) return undefined;
  return {
    ...page,
    page_kind: "demo",
    review_id: reviewId,
    rating: expected.rating,
    review_category: expected.review_category,
  } satisfies ReviewProperties;
}

function sanitizeReviewFacts(value: unknown): ReviewFacts | undefined {
  if (!isRecord(value) || !hasOnlyKeys(value, reviewFactKeys)) return undefined;
  if (value.locale !== "pl" && value.locale !== "en") return undefined;
  if (typeof value.review_id !== "string" || !(value.review_id in reviewFacts)) {
    return undefined;
  }
  const reviewId = value.review_id as AnalyticsReviewId;
  const expected = reviewFacts[reviewId];
  if (
    value.rating !== expected.rating
    || value.review_category !== expected.review_category
  ) return undefined;
  return {
    locale: value.locale,
    review_id: reviewId,
    rating: expected.rating,
    review_category: expected.review_category,
  };
}

export function sanitizeProductAnalyticsEvent(
  value: unknown,
): ProductAnalyticsEvent | undefined {
  if (
    !isRecord(value)
    || !hasOnlyKeys(value, ["name", "properties"])
    || typeof value.name !== "string"
  ) return undefined;

  switch (value.name) {
    case "landing_page_viewed": {
      const properties = sanitizePageProperties(value.properties, "landing");
      return properties
        ? { name: value.name, properties: { ...properties, page_kind: "landing" } }
        : undefined;
    }
    case "demo_opened": {
      const properties = sanitizePageProperties(value.properties, "demo");
      return properties
        ? { name: value.name, properties: { ...properties, page_kind: "demo" } }
        : undefined;
    }
    case "review_opened": {
      const properties = sanitizeReviewFacts(value.properties);
      return properties ? { name: value.name, properties } : undefined;
    }
    case "reply_edited":
    case "reply_approved":
    case "reply_copied": {
      const properties = sanitizeReviewProperties(value.properties);
      return properties ? { name: value.name, properties } : undefined;
    }
    case "prepared_reply_variant_selected": {
      if (!isRecord(value.properties)) return undefined;
      const { action_kind: actionKind, ...reviewValue } = value.properties;
      if (
        !hasOnlyKeys(value.properties, [...reviewKeys, "action_kind"])
        || (actionKind !== "style" && actionKind !== "length" && actionKind !== "variant")
      ) return undefined;
      const properties = sanitizeReviewProperties(reviewValue);
      return properties
        ? { name: value.name, properties: { ...properties, action_kind: actionKind } }
        : undefined;
    }
    case "lead_form_viewed":
    case "lead_submitted": {
      const properties = sanitizePageProperties(value.properties);
      return properties ? { name: value.name, properties } : undefined;
    }
    default:
      return undefined;
  }
}

export function createProductAnalytics(dependencies: ProductAnalyticsDependencies) {
  let consent: AnalyticsConsent = "unknown";
  let storedSession: StoredAnalyticsSession | undefined;
  let initialization: Promise<boolean> | undefined;
  let consentGeneration = 0;
  let transportActive = false;
  let transportLifecycle: Promise<void> = Promise.resolve();

  function enqueueTransportOperation<T>(operation: () => T | Promise<T>) {
    const result = transportLifecycle.then(operation, operation);
    transportLifecycle = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function stopTransport() {
    if (!transportActive) return;
    try {
      await dependencies.transport.shutdown?.();
    } finally {
      transportActive = false;
    }
  }

  function persistSession(session: StoredAnalyticsSession) {
    try {
      dependencies.storage.setItem(
        ANALYTICS_SESSION_STORAGE_KEY,
        JSON.stringify(session),
      );
      return true;
    } catch {
      return false;
    }
  }

  function removeSession() {
    try {
      dependencies.storage.removeItem(ANALYTICS_SESSION_STORAGE_KEY);
    } catch {
      // Analytics storage is optional and must never affect product behavior.
    }
  }

  function readSession() {
    try {
      const serialized = dependencies.storage.getItem(ANALYTICS_SESSION_STORAGE_KEY);
      if (!serialized) return undefined;
      const parsed: unknown = JSON.parse(serialized);
      if (!isStoredAnalyticsSession(parsed)) {
        removeSession();
        return undefined;
      }
      return parsed;
    } catch {
      return undefined;
    }
  }

  function newSession(now: number) {
    const session: StoredAnalyticsSession = {
      id: dependencies.session.createId(),
      startedAt: now,
      lastActivityAt: now,
      pageMilestones: [],
    };
    if (!persistSession(session)) return undefined;
    return session;
  }

  function sessionForActivity() {
    try {
      const now = dependencies.clock.now();
      const candidate = storedSession ?? readSession();
      const expired = candidate
        && (
          now - candidate.lastActivityAt >= INACTIVITY_TIMEOUT_MS
          || now - candidate.startedAt >= ABSOLUTE_TIMEOUT_MS
        );
      const session = !candidate || expired ? newSession(now) : candidate;
      if (!session) return undefined;

      session.lastActivityAt = now;
      if (!persistSession(session)) return undefined;
      storedSession = session;
      return session;
    } catch {
      return undefined;
    }
  }

  function currentConsent() {
    try {
      const current = dependencies.consent.current();
      return current === "granted" || current === "denied" ? current : "unknown";
    } catch {
      return "unknown";
    }
  }

  function capture(input: ProductAnalyticsEvent) {
    if (currentConsent() !== consent) synchronizeConsent();
    if (
      consent !== "granted"
      || !initialization
      || !isEligibleEnvironment(dependencies.environment)
    ) return;
    let event: ProductAnalyticsEvent | undefined;
    try {
      event = sanitizeProductAnalyticsEvent(input);
    } catch {
      return;
    }
    if (!event) return;
    const session = sessionForActivity();
    if (!session) return;
    const eventAcquisition = event.name === "review_opened"
      ? {}
      : acquisitionFromPage(event.properties);
    if (!session.acquisition && Object.keys(eventAcquisition).length > 0) {
      session.acquisition = eventAcquisition;
    }
    const pageMilestone = event.name === "landing_page_viewed" || event.name === "demo_opened"
      ? event.name
      : undefined;
    const pageMilestones = session.pageMilestones ?? [];
    if (pageMilestone && pageMilestones.includes(pageMilestone)) return;
    if (pageMilestone) pageMilestones.push(pageMilestone);
    session.pageMilestones = pageMilestones;
    if (!persistSession(session)) return;
    if (event.name !== "review_opened") {
      event = {
        ...event,
        properties: { ...event.properties, ...session.acquisition },
      } as ProductAnalyticsEvent;
    }
    const activeConsentGeneration = consentGeneration;
    const transportEvent = {
      ...event,
      anonymousSessionId: session.id,
    } as AnalyticsTransportEvent;
    void initialization
      .then((initialized) => {
        if (
          !initialized
          || consent !== "granted"
          || consentGeneration !== activeConsentGeneration
          || !isEligibleEnvironment(dependencies.environment)
        ) return;
        return dependencies.transport.capture(transportEvent);
      })
      .catch(() => undefined);
  }

  function synchronizeConsent(currentPage?: CurrentAnalyticsPage) {
    const nextConsent = currentConsent();
    const previousConsent = consent;
    consent = nextConsent;
    if (nextConsent !== "granted") {
      if (nextConsent === "denied" || previousConsent === "granted") {
        storedSession = undefined;
        removeSession();
      }
      if (previousConsent === "granted" && initialization) {
        consentGeneration += 1;
        initialization = undefined;
        void enqueueTransportOperation(stopTransport).catch(() => undefined);
      }
      return;
    }

    if (previousConsent === "granted" && initialization) {
      if (currentPage) capture(currentPage);
      return;
    }

    const { environment } = dependencies;
    if (!isEligibleEnvironment(environment)) return;

    if (!sessionForActivity()) return;
    const activeConsentGeneration = ++consentGeneration;
    initialization = enqueueTransportOperation(async () => {
      if (
        consent !== "granted"
        || currentConsent() !== "granted"
        || consentGeneration !== activeConsentGeneration
      ) return false;
      await dependencies.transport.initialize(environment.configuration);
      transportActive = true;
      if (
        consent !== "granted"
        || currentConsent() !== "granted"
        || consentGeneration !== activeConsentGeneration
      ) {
        await stopTransport();
        return false;
      }
      return true;
    });
    void initialization.catch(() => undefined);
    if (currentPage) capture(currentPage);
  }

  synchronizeConsent();

  return { capture, synchronizeConsent };
}
