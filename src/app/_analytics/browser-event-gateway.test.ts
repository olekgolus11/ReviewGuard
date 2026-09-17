import assert from "node:assert/strict";
import test from "node:test";
import {
  captureBrowserAnalyticsEvent,
  subscribeBrowserAnalyticsEvents,
} from "./browser-event-gateway.ts";

test("browser interactions reach the connected product-analytics gateway only while subscribed", () => {
  const events: unknown[] = [];
  const event = {
    name: "review_opened" as const,
    properties: {
      locale: "pl" as const,
      review_id: "P1" as const,
      rating: 5 as const,
      review_category: "quick" as const,
    },
  };

  captureBrowserAnalyticsEvent(event);
  const unsubscribe = subscribeBrowserAnalyticsEvents((captured) => events.push(captured));
  captureBrowserAnalyticsEvent(event);
  captureBrowserAnalyticsEvent(event);
  unsubscribe();
  captureBrowserAnalyticsEvent(event);

  assert.deepEqual(events, [event, event]);
});
