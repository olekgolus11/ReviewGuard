import assert from "node:assert/strict";
import test from "node:test";
import {
  createPostHogTransport,
  type PostHogClient,
  type PostHogInitializationOptions,
} from "./posthog-transport.ts";

test("PostHog transport initializes EU collection in manual anonymous-only mode", async () => {
  let apiKey: string | undefined;
  let options: PostHogInitializationOptions | undefined;
  const client: PostHogClient = {
    init(nextApiKey, nextOptions) {
      apiKey = nextApiKey;
      options = nextOptions;
    },
    capture() {},
    async shutdown() {},
  };
  const transport = createPostHogTransport(async () => client);

  await transport.initialize({ apiKey: "phc_test", host: "https://eu.i.posthog.com" });

  assert.equal(apiKey, "phc_test");
  assert.equal(options?.api_host, "https://eu.i.posthog.com");
  assert.equal(options?.person_profiles, "never");
  assert.equal(options?.autocapture, false);
  assert.equal(options?.capture_pageview, false);
  assert.equal(options?.capture_pageleave, false);
  assert.equal(options?.capture_dead_clicks, false);
  assert.equal(options?.capture_heatmaps, false);
  assert.equal(options?.capture_performance, false);
  assert.equal(options?.capture_exceptions, false);
  assert.equal(options?.disable_session_recording, true);
  assert.equal(options?.disable_surveys, true);
  assert.equal(options?.disable_product_tours, true);
  assert.equal(options?.advanced_disable_flags, true);
  assert.equal(options?.disable_persistence, true);
  assert.equal(options?.save_referrer, false);
  assert.equal(options?.save_campaign_params, false);
});

test("PostHog transport sends a session identity and only allowlisted semantic properties", async () => {
  const captures: Array<{ name: string; properties?: Record<string, unknown> }> = [];
  let options: PostHogInitializationOptions | undefined;
  const client: PostHogClient = {
    init(_apiKey, nextOptions) {
      options = nextOptions;
    },
    capture(name, properties) {
      captures.push({ name, properties });
    },
    async shutdown() {},
  };
  const transport = createPostHogTransport(async () => client);
  await transport.initialize({ apiKey: "phc_test", host: "https://eu.i.posthog.com" });
  await transport.capture({
    name: "landing_page_viewed",
    anonymousSessionId: "session-1",
    properties: {
      locale: "en",
      page_kind: "landing",
      utm_source: "newsletter",
      referrer_domain: "example.com",
      device_class: "desktop",
    },
  });

  assert.deepEqual(captures, [{
    name: "landing_page_viewed",
    properties: {
      locale: "en",
      page_kind: "landing",
      utm_source: "newsletter",
      referrer_domain: "example.com",
      device_class: "desktop",
      distinct_id: "session-1",
    },
  }]);

  const sanitized = options?.before_send?.({
    uuid: "00000000-0000-0000-0000-000000000000",
    event: "landing_page_viewed",
    properties: {
      token: "phc_test",
      distinct_id: "session-1",
      $process_person_profile: false,
      $current_url: "https://reviewguard.pl/?private=yes",
      $referrer: "https://private.example/path",
      $browser: "Chrome",
      locale: "en",
      page_kind: "landing",
      utm_source: "newsletter",
    },
  });
  assert.deepEqual(sanitized?.properties, {
    token: "phc_test",
    distinct_id: "session-1",
    $process_person_profile: false,
    locale: "en",
    page_kind: "landing",
    utm_source: "newsletter",
  });
  assert.equal(options?.before_send?.({
    uuid: "00000000-0000-0000-0000-000000000000",
    event: "$pageview",
    properties: {},
  }), null);
});

test("PostHog transport rejects other hosts and shuts down without product impact", async () => {
  let shutdowns = 0;
  const client: PostHogClient = {
    init() {},
    capture() {},
    async shutdown() {
      shutdowns += 1;
    },
  };
  const transport = createPostHogTransport(async () => client);

  await assert.rejects(
    Promise.resolve(
      transport.initialize({ apiKey: "phc_test", host: "https://us.i.posthog.com" }),
    ),
  );
  await transport.initialize({ apiKey: "phc_test", host: "https://eu.i.posthog.com" });
  await Promise.resolve(transport.shutdown?.());
  assert.equal(shutdowns, 1);
});
