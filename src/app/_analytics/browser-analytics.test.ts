import assert from "node:assert/strict";
import test from "node:test";
import {
  DEVICE_ANALYTICS_OPT_OUT_KEY,
  acquisitionContext,
  analyticsDeployment,
  currentPageMilestone,
  isDeviceOptedOut,
} from "./browser-analytics.ts";

test("browser acquisition context keeps only safe named fields", () => {
  assert.deepEqual(
    acquisitionContext({
      search:
        "?utm_source=newsletter&utm_medium=email&utm_campaign=pilot-launch"
        + "&utm_content=primary-cta&utm_term=review-management"
        + "&email=owner%40example.com&redirect=https%3A%2F%2Fprivate.example%2Faccount",
      referrer: "https://Search.Example.com/results?q=private+query#result",
      hostname: "reviewguard.pl",
      viewportWidth: 740,
    }),
    {
      utm_source: "newsletter",
      utm_medium: "email",
      utm_campaign: "pilot-launch",
      utm_content: "primary-cta",
      utm_term: "review-management",
      referrer_domain: "search.example.com",
      device_class: "mobile",
    },
  );
});

test("unsafe campaign values and internal or non-web referrers are discarded", () => {
  assert.deepEqual(
    acquisitionContext({
      search: "?utm_source=https%3A%2F%2Fexample.com%2Fprivate&utm_medium=contact+me",
      referrer: "https://reviewguard.pl/private?secret=yes",
      hostname: "reviewguard.pl",
      viewportWidth: 900,
    }),
    { device_class: "tablet" },
  );
  assert.deepEqual(
    acquisitionContext({
      search: "?arbitrary=retained-never",
      referrer: "file:///Users/example/private.txt",
      hostname: "reviewguard.pl",
      viewportWidth: 1440,
    }),
    { device_class: "desktop" },
  );
});

test("only landing and public demo paths produce controlled page milestones", () => {
  const acquisition = { utm_source: "newsletter" } as const;

  assert.deepEqual(currentPageMilestone("/", "en", acquisition), {
    name: "landing_page_viewed",
    properties: { locale: "en", page_kind: "landing", ...acquisition },
  });
  assert.deepEqual(currentPageMilestone("/pl/demo-prototype", "pl", acquisition), {
    name: "demo_opened",
    properties: { locale: "pl", page_kind: "demo", ...acquisition },
  });
  assert.equal(currentPageMilestone("/privacy", "en", acquisition), undefined);
  assert.equal(currentPageMilestone("/pl/privacy", "pl", acquisition), undefined);
  assert.equal(currentPageMilestone("/unknown", "en", acquisition), undefined);
});

test("deployment and device opt-out fail closed", () => {
  assert.equal(analyticsDeployment("development", undefined), "development");
  assert.equal(analyticsDeployment("production", "preview"), "preview");
  assert.equal(analyticsDeployment("production", "production"), "production");
  assert.equal(analyticsDeployment("production", undefined), "production");

  assert.equal(
    isDeviceOptedOut({ getItem: (key) => key === DEVICE_ANALYTICS_OPT_OUT_KEY ? "true" : null }),
    true,
  );
  assert.equal(isDeviceOptedOut({ getItem: () => "false" }), false);
  assert.equal(isDeviceOptedOut({ getItem: () => { throw new Error("blocked"); } }), true);
});
