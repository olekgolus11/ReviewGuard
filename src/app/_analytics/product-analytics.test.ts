import assert from "node:assert/strict";
import test from "node:test";
import {
  createProductAnalytics,
  type AnalyticsConsent,
  type AnalyticsTransport,
  type ProductAnalyticsDependencies,
  type ProductAnalyticsEvent,
} from "./product-analytics.ts";

function createHarness(options: {
  values?: Map<string, string>;
  sessionPrefix?: string;
} = {}) {
  const calls: Array<Record<string, unknown>> = [];
  const values = options.values ?? new Map<string, string>();
  let now = Date.UTC(2026, 0, 1);
  let nextSession = 1;
  let consent: AnalyticsConsent = "unknown";

  const transport: AnalyticsTransport = {
    async initialize(configuration) {
      calls.push({ operation: "initialize", configuration });
    },
    async capture(event) {
      calls.push({ operation: "capture", ...event });
    },
    async shutdown() {
      calls.push({ operation: "shutdown" });
    },
  };

  const dependencies: ProductAnalyticsDependencies = {
    transport,
    consent: { current: () => consent },
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    clock: { now: () => now },
    session: {
      createId: () => `${options.sessionPrefix ?? ""}session-${nextSession++}`,
    },
    environment: {
      deployment: "production",
      hostname: "reviewguard.pl",
      deviceOptOut: false,
      configuration: {
        apiKey: "phc_test",
        host: "https://eu.i.posthog.com",
      },
    },
  };

  return {
    calls,
    dependencies,
    values,
    setConsent(nextConsent: AnalyticsConsent) {
      consent = nextConsent;
    },
    advance(milliseconds: number) {
      now += milliseconds;
    },
    async settle() {
      await new Promise((resolve) => setTimeout(resolve, 0));
    },
  };
}

function demoOpened() {
  return {
    name: "demo_opened" as const,
    properties: { locale: "en" as const, page_kind: "demo" as const },
  };
}

function capturedSessionIds(calls: Array<Record<string, unknown>>) {
  return calls
    .filter((call) => call.operation === "capture")
    .map((call) => call.anonymousSessionId);
}

test("analytics discards actions until consent and captures the current page after consent", async () => {
  const harness = createHarness();
  const analytics = createProductAnalytics(harness.dependencies);

  analytics.capture({
    name: "demo_opened",
    properties: { locale: "en", page_kind: "demo" },
  });
  await harness.settle();
  assert.equal(harness.calls.length, 0);

  harness.setConsent("granted");
  analytics.synchronizeConsent({
    name: "landing_page_viewed",
    properties: { locale: "en", page_kind: "landing" },
  });
  await harness.settle();

  assert.equal(harness.calls[0]?.operation, "initialize");
  assert.deepEqual(harness.calls[1], {
    operation: "capture",
    name: "landing_page_viewed",
    anonymousSessionId: "session-1",
    properties: { locale: "en", page_kind: "landing" },
  });
  assert.equal(harness.calls.length, 2);
});

test("rejection and withdrawal prevent capture, and withdrawal clears the tab identity", async () => {
  const harness = createHarness();
  const analytics = createProductAnalytics(harness.dependencies);

  harness.setConsent("denied");
  analytics.synchronizeConsent(demoOpened());
  analytics.capture(demoOpened());
  await harness.settle();
  assert.equal(harness.calls.length, 0);

  harness.setConsent("granted");
  analytics.synchronizeConsent(demoOpened());
  await harness.settle();
  assert.equal(harness.values.size, 1);

  harness.setConsent("denied");
  analytics.synchronizeConsent();
  analytics.capture({
    name: "lead_form_viewed",
    properties: { locale: "en", page_kind: "demo" },
  });
  await harness.settle();

  assert.equal(harness.values.size, 0);
  assert.equal(
    harness.calls.filter((call) => call.operation === "capture").length,
    1,
  );
  assert.equal(harness.calls.at(-1)?.operation, "shutdown");
});

test("withdrawing consent before asynchronous startup prevents transport initialization", async () => {
  const harness = createHarness();
  const analytics = createProductAnalytics(harness.dependencies);

  harness.setConsent("granted");
  analytics.synchronizeConsent(demoOpened());
  harness.setConsent("denied");
  analytics.synchronizeConsent();
  await harness.settle();

  assert.equal(harness.calls.length, 0);
  assert.equal(harness.values.size, 0);
});

test("rapid withdrawal and re-consent serialize transport shutdown before restart", async () => {
  const harness = createHarness();
  const operations: string[] = [];
  let initializeCount = 0;
  let finishFirstInitialization: (() => void) | undefined;
  harness.dependencies.transport = {
    initialize() {
      initializeCount += 1;
      operations.push(`initialize-${initializeCount}`);
      if (initializeCount === 1) {
        return new Promise<void>((resolve) => {
          finishFirstInitialization = resolve;
        });
      }
    },
    capture() {
      operations.push("capture");
    },
    shutdown() {
      operations.push("shutdown");
    },
  };
  const analytics = createProductAnalytics(harness.dependencies);

  harness.setConsent("granted");
  analytics.synchronizeConsent();
  await harness.settle();
  harness.setConsent("denied");
  analytics.synchronizeConsent();
  harness.setConsent("granted");
  analytics.synchronizeConsent();
  await harness.settle();
  finishFirstInitialization?.();
  await harness.settle();
  analytics.capture(demoOpened());
  await harness.settle();

  assert.deepEqual(operations, [
    "initialize-1",
    "shutdown",
    "initialize-2",
    "capture",
  ]);
});

test("a tab keeps one Anonymous analytics session across reloads while tabs stay independent", async () => {
  const tabStorage = new Map<string, string>();
  const firstLoad = createHarness({ values: tabStorage, sessionPrefix: "tab-a-" });
  const firstAnalytics = createProductAnalytics(firstLoad.dependencies);
  firstLoad.setConsent("granted");
  firstAnalytics.synchronizeConsent();
  firstAnalytics.capture(demoOpened());
  await firstLoad.settle();

  const reload = createHarness({ values: tabStorage, sessionPrefix: "replacement-" });
  const reloadAnalytics = createProductAnalytics(reload.dependencies);
  reload.setConsent("granted");
  reloadAnalytics.synchronizeConsent();
  reloadAnalytics.capture({
    name: "lead_form_viewed",
    properties: { locale: "en", page_kind: "demo" },
  });
  await reload.settle();

  const anotherTab = createHarness({ sessionPrefix: "tab-b-" });
  const anotherAnalytics = createProductAnalytics(anotherTab.dependencies);
  anotherTab.setConsent("granted");
  anotherAnalytics.synchronizeConsent();
  anotherAnalytics.capture(demoOpened());
  await anotherTab.settle();

  assert.deepEqual(capturedSessionIds(firstLoad.calls), ["tab-a-session-1"]);
  assert.deepEqual(capturedSessionIds(reload.calls), ["tab-a-session-1"]);
  assert.deepEqual(capturedSessionIds(anotherTab.calls), ["tab-b-session-1"]);
});

test("Anonymous analytics sessions expire after inactivity and after their absolute lifetime", async () => {
  const inactivity = createHarness();
  const first = createProductAnalytics(inactivity.dependencies);
  inactivity.setConsent("granted");
  first.synchronizeConsent();
  first.capture(demoOpened());
  await inactivity.settle();

  inactivity.advance(30 * 60 * 1_000);
  const afterInactivity = createProductAnalytics(inactivity.dependencies);
  inactivity.setConsent("granted");
  afterInactivity.synchronizeConsent();
  afterInactivity.capture({
    name: "lead_form_viewed",
    properties: { locale: "en", page_kind: "demo" },
  });
  await inactivity.settle();

  assert.deepEqual(capturedSessionIds(inactivity.calls), ["session-1", "session-2"]);

  const absolute = createHarness();
  const absoluteFirst = createProductAnalytics(absolute.dependencies);
  absolute.setConsent("granted");
  absoluteFirst.synchronizeConsent();
  absoluteFirst.capture(demoOpened());
  await absolute.settle();
  for (let interval = 0; interval < 49; interval += 1) {
    absolute.advance(29 * 60 * 1_000);
    absoluteFirst.capture({
      name: "reply_approved",
      properties: {
        locale: "en",
        page_kind: "demo",
        review_id: "P1",
        rating: 5,
        review_category: "quick",
      },
    });
  }
  await absolute.settle();
  absolute.advance(19 * 60 * 1_000);
  absoluteFirst.capture({
    name: "lead_submitted",
    properties: { locale: "en", page_kind: "demo" },
  });
  await absolute.settle();

  const absoluteSessionIds = capturedSessionIds(absolute.calls);
  assert.deepEqual(new Set(absoluteSessionIds.slice(0, -1)), new Set(["session-1"]));
  assert.equal(absoluteSessionIds.at(-1), "session-2");
});

test("granting consent again after withdrawal starts a fresh Anonymous analytics session", async () => {
  const harness = createHarness();
  const analytics = createProductAnalytics(harness.dependencies);

  harness.setConsent("granted");
  analytics.synchronizeConsent();
  analytics.capture(demoOpened());
  await harness.settle();
  harness.setConsent("denied");
  analytics.synchronizeConsent();
  await harness.settle();
  harness.setConsent("granted");
  analytics.synchronizeConsent();
  analytics.capture(demoOpened());
  await harness.settle();

  assert.deepEqual(capturedSessionIds(harness.calls), ["session-1", "session-2"]);
});

test("only configured production traffic is eligible for analytics", async () => {
  const ineligibleEnvironments: ProductAnalyticsDependencies["environment"][] = [
    {
      deployment: "development",
      hostname: "reviewguard.pl",
      deviceOptOut: false,
      configuration: { apiKey: "phc_test", host: "https://eu.i.posthog.com" },
    },
    {
      deployment: "preview",
      hostname: "preview.example.vercel.app",
      deviceOptOut: false,
      configuration: { apiKey: "phc_test", host: "https://eu.i.posthog.com" },
    },
    {
      deployment: "production",
      hostname: "localhost",
      deviceOptOut: false,
      configuration: { apiKey: "phc_test", host: "https://eu.i.posthog.com" },
    },
    {
      deployment: "production",
      hostname: "reviewguard.pl",
      deviceOptOut: true,
      configuration: { apiKey: "phc_test", host: "https://eu.i.posthog.com" },
    },
    {
      deployment: "production",
      hostname: "reviewguard.pl",
      deviceOptOut: false,
    },
    {
      deployment: "production",
      hostname: "reviewguard.pl",
      deviceOptOut: false,
      configuration: { apiKey: "", host: "https://eu.i.posthog.com" },
    },
    {
      deployment: "production",
      hostname: "reviewguard.pl",
      deviceOptOut: false,
      configuration: { apiKey: "phc_test", host: "https://us.i.posthog.com" },
    },
  ];

  for (const environment of ineligibleEnvironments) {
    const harness = createHarness();
    harness.dependencies.environment = environment;
    const analytics = createProductAnalytics(harness.dependencies);
    harness.setConsent("granted");
    analytics.synchronizeConsent(demoOpened());
    await harness.settle();
    assert.equal(harness.calls.length, 0);
    assert.equal(harness.values.size, 0);
  }
});

test("storage and transport failures remain invisible to product behavior", async () => {
  const deniedStorage = createHarness();
  deniedStorage.dependencies.storage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  const withoutStorage = createProductAnalytics(deniedStorage.dependencies);
  deniedStorage.setConsent("granted");
  assert.doesNotThrow(() => withoutStorage.synchronizeConsent(demoOpened()));
  assert.doesNotThrow(() => withoutStorage.capture(demoOpened()));
  await deniedStorage.settle();
  assert.equal(deniedStorage.calls.length, 0);

  for (const failure of ["initialize-sync", "initialize-async", "capture", "shutdown"] as const) {
    const harness = createHarness();
    harness.dependencies.transport = {
      initialize() {
        if (failure === "initialize-sync") throw new Error("initialize failed");
        if (failure === "initialize-async") return Promise.reject(new Error("initialize failed"));
      },
      capture() {
        if (failure === "capture") throw new Error("capture failed");
      },
      shutdown() {
        if (failure === "shutdown") throw new Error("shutdown failed");
      },
    };
    const analytics = createProductAnalytics(harness.dependencies);
    harness.setConsent("granted");
    assert.doesNotThrow(() => analytics.synchronizeConsent(demoOpened()));
    assert.doesNotThrow(() => analytics.capture(demoOpened()));
    harness.setConsent("denied");
    assert.doesNotThrow(() => analytics.synchronizeConsent());
    await harness.settle();
  }
});

test("the typed contract forwards every allowed event and property", async () => {
  const harness = createHarness();
  const analytics = createProductAnalytics(harness.dependencies);
  harness.setConsent("granted");
  analytics.synchronizeConsent();

  const page = {
    locale: "pl" as const,
    page_kind: "landing" as const,
    utm_source: "newsletter",
    utm_medium: "email",
    utm_campaign: "pilot-launch",
    utm_content: "primary-cta",
    utm_term: "review-management",
    referrer_domain: "example.com",
    device_class: "mobile" as const,
  };
  const review = {
    locale: "pl" as const,
    page_kind: "demo" as const,
    review_id: "M1" as const,
    rating: 3 as const,
    review_category: "personalize" as const,
  };
  const events = [
    { name: "landing_page_viewed", properties: page },
    {
      name: "demo_opened",
      properties: { locale: "pl", page_kind: "demo" },
    },
    { name: "review_opened", properties: review },
    { name: "reply_edited", properties: review },
    { name: "reply_approved", properties: review },
    { name: "reply_copied", properties: review },
    {
      name: "prepared_reply_variant_selected",
      properties: { ...review, action_kind: "length" },
    },
    {
      name: "lead_form_viewed",
      properties: { locale: "pl", page_kind: "demo" },
    },
    {
      name: "lead_submitted",
      properties: { locale: "pl", page_kind: "demo" },
    },
  ] satisfies ProductAnalyticsEvent[];

  for (const event of events) analytics.capture(event);
  await harness.settle();

  const captures = harness.calls.filter((call) => call.operation === "capture");
  assert.deepEqual(
    captures.map((capture) => capture.name),
    events.map((event) => event.name),
  );
  assert.deepEqual(captures[0]?.properties, page);
  assert.deepEqual(captures[6]?.properties, { ...review, action_kind: "length" });
});

test("unknown events, properties, and uncontrolled values are rejected before transport", async () => {
  const harness = createHarness();
  const analytics = createProductAnalytics(harness.dependencies);
  harness.setConsent("granted");
  analytics.synchronizeConsent();
  const captureUnknown = analytics.capture as (event: unknown) => void;

  const rejected: unknown[] = [
    { name: "modal_closed", properties: { locale: "en", page_kind: "demo" } },
    {
      name: "demo_opened",
      properties: { locale: "en", page_kind: "demo", arbitrary: "value" },
    },
    {
      name: "review_opened",
      properties: {
        locale: "en",
        page_kind: "demo",
        review_id: "customer-supplied-id",
        rating: 5,
        review_category: "quick",
      },
    },
    {
      name: "prepared_reply_variant_selected",
      properties: {
        locale: "en",
        page_kind: "demo",
        review_id: "P1",
        rating: 5,
        review_category: "quick",
        action_kind: "custom-prompt",
      },
    },
    {
      name: "landing_page_viewed",
      properties: {
        locale: "en",
        page_kind: "landing",
        referrer_domain: "https://example.com/private/path",
      },
    },
    {
      name: "landing_page_viewed",
      properties: {
        locale: "en",
        page_kind: "landing",
        utm_source: "https://example.com/full-url",
      },
    },
  ];

  for (const event of rejected) captureUnknown(event);
  await harness.settle();
  assert.equal(
    harness.calls.filter((call) => call.operation === "capture").length,
    0,
  );
});

test("content and lead-form fields never reach the analytics transport", async () => {
  const harness = createHarness();
  const analytics = createProductAnalytics(harness.dependencies);
  harness.setConsent("granted");
  analytics.synchronizeConsent();
  const captureUnknown = analytics.capture as (event: unknown) => void;
  const forbiddenFields = [
    "review_text",
    "reply_text",
    "manager_context_note",
    "clipboard_content",
    "email",
    "location_name",
    "google_business_profile_url",
    "workflow_description",
    "url",
    "referrer",
    "query",
  ];

  for (const field of forbiddenFields) {
    captureUnknown({
      name: "demo_opened",
      properties: {
        locale: "en",
        page_kind: "demo",
        [field]: "sensitive or user-authored content",
      },
    });
  }
  for (const [property, value] of [
    ["utm_source", "The review says the meal was cold"],
    ["utm_medium", "contact alice@example.com"],
    ["utm_campaign", "example.com/private/referrer"],
    ["utm_content", "https%3A%2F%2Fexample.com%2Fprivate"],
    ["utm_term", "copied reply text"],
  ]) {
    captureUnknown({
      name: "landing_page_viewed",
      properties: {
        locale: "en",
        page_kind: "landing",
        [property]: value,
      },
    });
  }
  await harness.settle();

  assert.equal(
    harness.calls.filter((call) => call.operation === "capture").length,
    0,
  );
});
