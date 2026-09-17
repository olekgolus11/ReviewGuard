import assert from "node:assert/strict";
import test from "node:test";
import {
  createPostHogTransport,
  type PostHogClient,
} from "./posthog-transport.ts";
import type { AnalyticsConfiguration } from "./product-analytics.ts";

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
      transport.initialize({
        apiKey: "phc_test",
        host: "https://us.i.posthog.com",
      } as unknown as AnalyticsConfiguration),
    ),
  );
  await transport.initialize({ apiKey: "phc_test", host: "https://eu.i.posthog.com" });
  await Promise.resolve(transport.shutdown?.());
  assert.equal(shutdowns, 1);
});

test("PostHog forwards review-opened with only stable fictional review facts", async () => {
  let options: Parameters<PostHogClient["init"]>[1] | undefined;
  const captures: Array<{ name: string; properties?: Record<string, unknown> }> = [];
  const client: PostHogClient = {
    init(_apiKey, nextOptions) {
      options = nextOptions;
    },
    capture(name, properties) {
      captures.push({ name, properties });
    },
    shutdown() {},
  };
  const transport = createPostHogTransport(async () => client);
  await transport.initialize({ apiKey: "phc_test", host: "https://eu.i.posthog.com" });

  transport.capture({
    name: "review_opened",
    anonymousSessionId: "session-1",
    properties: {
      locale: "en",
      review_id: "N1",
      rating: 2,
      review_category: "caution",
    },
  });
  const outgoing = options?.before_send({
    uuid: "event-1",
    event: captures[0].name,
    properties: {
      ...captures[0].properties,
      token: "project-token",
      $set: { unsafe: "value" },
    },
  });

  assert.deepEqual(outgoing, {
    uuid: "event-1",
    event: "review_opened",
    properties: {
      locale: "en",
      review_id: "N1",
      rating: 2,
      review_category: "caution",
      token: "project-token",
      distinct_id: "session-1",
    },
    $set: undefined,
    $set_once: undefined,
    $unset: undefined,
  });
});
