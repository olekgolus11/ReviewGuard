import assert from "node:assert/strict";
import test from "node:test";
import { createCookiebotAnalyticsConsentSource } from "../_consent/cookiebot-consent.ts";
import { connectProductAnalyticsRuntime } from "./analytics-runtime.ts";
import { createPostHogTransport, type PostHogClient } from "./posthog-transport.ts";
import {
  POSTHOG_EU_INGESTION_HOST,
  type CurrentAnalyticsPage,
} from "./product-analytics.ts";

test("consent and navigation produce only current, sanitized, once-per-session page milestones", async () => {
  const requests: Array<{ event: string; properties: Record<string, unknown> }> = [];
  let sdkLoads = 0;
  const transport = createPostHogTransport(async () => {
    sdkLoads += 1;
    let apiKey = "";
    let sanitize: Parameters<PostHogClient["init"]>[1]["before_send"];
    return {
      init(nextApiKey, options) {
        apiKey = nextApiKey;
        sanitize = options.before_send;
      },
      capture(event, properties) {
        const sanitized = sanitize({
          uuid: "00000000-0000-0000-0000-000000000000",
          event,
          properties: {
            token: apiKey,
            $process_person_profile: false,
            $current_url: "https://reviewguard.pl/private?lead=secret",
            $referrer: "https://private.example/customer/42",
            $browser: "Example Browser",
            ...properties,
          },
        });
        if (sanitized) requests.push({
          event: sanitized.event,
          properties: sanitized.properties,
        });
      },
      async shutdown() {},
    } satisfies PostHogClient;
  });
  const consent = createCookiebotAnalyticsConsentSource();
  const stored = new Map<string, string>();
  let currentPage: CurrentAnalyticsPage = {
    name: "landing_page_viewed",
    properties: {
      locale: "en",
      page_kind: "landing",
      utm_source: "newsletter",
      referrer_domain: "search.example.com",
      device_class: "mobile",
    },
  };
  const runtime = connectProductAnalyticsRuntime({
    transport,
    consent,
    storage: {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
      removeItem: (key) => stored.delete(key),
    },
    clock: { now: () => Date.UTC(2026, 0, 1) },
    session: { createId: () => "session-1" },
    environment: {
      deployment: "production",
      hostname: "reviewguard.pl",
      deviceOptOut: false,
      configuration: { apiKey: "phc_test", host: POSTHOG_EU_INGESTION_HOST },
    },
    currentPage: () => currentPage,
  });

  currentPage = {
    name: "demo_opened",
    properties: { locale: "en", page_kind: "demo", device_class: "mobile" },
  };
  runtime.synchronizePage();
  assert.equal(sdkLoads, 0);
  assert.deepEqual(requests, []);

  consent.synchronize("granted");
  await new Promise((resolve) => setTimeout(resolve, 0));
  runtime.synchronizePage();
  currentPage = {
    name: "landing_page_viewed",
    properties: { locale: "en", page_kind: "landing" },
  };
  runtime.synchronizePage();
  runtime.synchronizePage();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(sdkLoads, 1);
  assert.deepEqual(requests, [
    {
      event: "demo_opened",
      properties: {
        token: "phc_test",
        $process_person_profile: false,
        locale: "en",
        page_kind: "demo",
        device_class: "mobile",
        distinct_id: "session-1",
      },
    },
    {
      event: "landing_page_viewed",
      properties: {
        token: "phc_test",
        $process_person_profile: false,
        locale: "en",
        page_kind: "landing",
        device_class: "mobile",
        distinct_id: "session-1",
      },
    },
  ]);
  runtime.disconnect();
});
