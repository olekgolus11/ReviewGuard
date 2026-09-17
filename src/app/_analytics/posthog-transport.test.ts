import assert from "node:assert/strict";
import test from "node:test";
import {
  createPostHogTransport,
  type PostHogClient,
} from "./posthog-transport.ts";

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
