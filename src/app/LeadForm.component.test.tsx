import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LeadForm } from "./LeadForm";
import { landingCopy } from "./landing-copy";
import { subscribeBrowserAnalyticsEvents } from "./_analytics/browser-event-gateway";
import {
  createProductAnalytics,
  POSTHOG_EU_INGESTION_HOST,
  type AnalyticsConsent,
  type ProductAnalyticsEvent,
} from "./_analytics/product-analytics";

const unsubscribe: Array<() => void> = [];

function renderTrackedForm() {
  const events: ProductAnalyticsEvent[] = [];
  unsubscribe.push(subscribeBrowserAnalyticsEvents((event) => events.push(event)));
  render(<LeadForm copy={landingCopy.en.form} locale="en" />);
  return events;
}

function connectConsentGatedGateway() {
  const captured: ProductAnalyticsEvent[] = [];
  const storage = new Map<string, string>();
  const consent: AnalyticsConsent = "granted";
  const analytics = createProductAnalytics({
    transport: {
      initialize() {},
      capture(event) { captured.push(event); },
    },
    consent: { current: () => consent },
    storage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    clock: { now: () => Date.UTC(2026, 0, 1) },
    session: { createId: () => "session-1" },
    environment: {
      deployment: "production",
      hostname: "reviewguard.pl",
      deviceOptOut: false,
      configuration: { apiKey: "phc_test", host: POSTHOG_EU_INGESTION_HOST },
    },
  });
  analytics.synchronizeConsent();
  unsubscribe.push(subscribeBrowserAnalyticsEvents(analytics.capture));
  return captured;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  while (unsubscribe.length) unsubscribe.pop()?.();
});

test("records a form view once when the form receives focus", () => {
  const events = renderTrackedForm();
  const email = screen.getByRole("textbox", { name: "Email" });

  fireEvent.focus(email);
  fireEvent.focus(screen.getByRole("textbox", { name: "Restaurant name" }));

  expect(events).toEqual([{
    name: "lead_form_viewed",
    properties: { locale: "en", page_kind: "landing" },
  }]);
});

test("records a form view when at least half of the form becomes visible", () => {
  let callback: IntersectionObserverCallback | undefined;
  vi.stubGlobal("IntersectionObserver", class {
    constructor(next: IntersectionObserverCallback) {
      callback = next;
    }
    disconnect() {}
    observe() {}
    root = null;
    rootMargin = "";
    thresholds = [0.5];
    takeRecords() { return []; }
    unobserve() {}
  });
  const events = renderTrackedForm();

  callback?.([{ isIntersecting: true, intersectionRatio: 0.5 } as IntersectionObserverEntry], {} as IntersectionObserver);

  expect(events).toEqual([{
    name: "lead_form_viewed",
    properties: { locale: "en", page_kind: "landing" },
  }]);
});

describe("genuine lead conversion", () => {
  test.each([
    [{ outcome: "malformed" }, 400],
    [{ outcome: "honeypot" }, 200],
    [{ outcome: "delivery_failed" }, 502],
  ])("does not emit conversion for %o", async (body, status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      json: async () => body,
    }));
    const events = renderTrackedForm();

    fireEvent.submit(screen.getByRole("button", { name: "Send enquiry" }).closest("form")!);

    await waitFor(() => expect(screen.getByText("We could not send your request. Please try again in a moment.")).toBeTruthy());
    expect(events.filter((event) => event.name === "lead_submitted")).toEqual([]);
  });

  test("emits an anonymous conversion only after accepted delivery", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ outcome: "accepted" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const events = renderTrackedForm();

    fireEvent.submit(screen.getByRole("button", { name: "Send enquiry" }).closest("form")!);

    await waitFor(() => expect(screen.getByText("Your enquiry has been sent. Thank you — we will be in touch by email.")).toBeTruthy());
    expect(events).toContainEqual({
      name: "lead_submitted",
      properties: { locale: "en", page_kind: "landing", meaningful_demo_action: false },
    });
    expect(JSON.stringify(fetchMock.mock.calls[0])).not.toContain("analytics");
  });

  test("keeps the accepted success state when analytics capture fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ outcome: "accepted" }),
    }));
    unsubscribe.push(subscribeBrowserAnalyticsEvents(() => {
      throw new Error("analytics unavailable");
    }));
    render(<LeadForm copy={landingCopy.en.form} locale="en" />);

    fireEvent.submit(screen.getByRole("button", { name: "Send enquiry" }).closest("form")!);

    await waitFor(() => expect(screen.getByText("Your enquiry has been sent. Thank you — we will be in touch by email.")).toBeTruthy());
  });

  test("only an accepted delivery passes through the consent-gated gateway as a conversion", async () => {
    const captured = connectConsentGatedGateway();
    for (const [body, ok] of [
      [{ outcome: "malformed" }, false],
      [{ outcome: "honeypot" }, true],
      [{ outcome: "delivery_failed" }, false],
    ] as const) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok, json: async () => body }));
      render(<LeadForm copy={landingCopy.en.form} locale="en" />);
      fireEvent.submit(screen.getByRole("button", { name: "Send enquiry" }).closest("form")!);
      await waitFor(() => expect(screen.getByText("We could not send your request. Please try again in a moment.")).toBeTruthy());
      cleanup();
    }

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ outcome: "accepted" }),
    }));
    render(<LeadForm copy={landingCopy.en.form} locale="en" />);
    fireEvent.submit(screen.getByRole("button", { name: "Send enquiry" }).closest("form")!);
    await waitFor(() => expect(captured.filter((event) => event.name === "lead_submitted")).toEqual([{
      name: "lead_submitted",
      anonymousSessionId: "session-1",
      properties: { locale: "en", page_kind: "landing", meaningful_demo_action: false },
    }]));
  });
});
