import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DemoPrototype } from "./DemoPrototype";
import { subscribeBrowserAnalyticsEvents } from "../_analytics/browser-event-gateway";
import type { ProductAnalyticsEvent } from "../_analytics/product-analytics";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : ""} {...props}>{children}</a>
  ),
}));

const unsubscribe: Array<() => void> = [];

function renderTrackedDemo(locale: "pl" | "en") {
  const events: ProductAnalyticsEvent[] = [];
  unsubscribe.push(subscribeBrowserAnalyticsEvents((event) => events.push(event)));
  render(<DemoPrototype locale={locale} />);
  return events;
}

afterEach(() => {
  cleanup();
  while (unsubscribe.length) unsubscribe.pop()?.();
  window.localStorage.clear();
});

describe("deliberate review opening", () => {
  test.each([
    ["pl", "Rodzinna wizyta"],
    ["en", "Family visit"],
  ] as const)("direct selection emits the allowlisted event in %s", (locale, detail) => {
    const events = renderTrackedDemo(locale);

    fireEvent.click(screen.getAllByRole("button", { name: new RegExp(detail) })[0]);

    expect(events).toEqual([{
      name: "review_opened",
      properties: {
        locale,
        review_id: "P2",
        rating: 5,
        review_category: "quick",
      },
    }]);
  });

  test("stepper navigation emits every repeated explicit selection", () => {
    const events = renderTrackedDemo("en");

    fireEvent.click(screen.getAllByRole("button", { name: /Next review/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Previous review/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Next review/ })[0]);

    expect(events.map((event) => (
      event.name === "review_opened" ? event.properties.review_id : undefined
    ))).toEqual(["P2", "P1", "P2"]);
  });

  test("initial rendering, filter-driven selection, and modal closure stay untracked", () => {
    const events = renderTrackedDemo("en");
    expect(events).toEqual([]);

    fireEvent.click(screen.getAllByRole("button", { name: "Handle with care" })[0]);
    expect(events).toEqual([]);

    fireEvent.click(screen.getAllByRole("button", {
      name: "I want replies like these for my location",
    })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Back to demo" }));
    expect(events).toEqual([]);
  });
});
