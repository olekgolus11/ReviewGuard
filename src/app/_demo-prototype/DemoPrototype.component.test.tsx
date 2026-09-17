import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("meaningful reply actions", () => {
  test.each([
    ["pl", "Propozycja odpowiedzi"],
    ["en", "Suggested reply"],
  ] as const)("the first divergent reply edit is captured in %s", (locale, replyLabel) => {
    const events = renderTrackedDemo(locale);
    const reply = screen.getAllByRole("textbox", { name: replyLabel })[0];

    fireEvent.change(reply, { target: { value: "Edited reply" } });

    expect(events).toEqual([{
      name: "reply_edited",
      properties: {
        locale,
        page_kind: "demo",
        review_id: "P1",
        rating: 5,
        review_category: "quick",
      },
    }]);
  });

  test("approval and successful copies record each deliberate action without reply content", async () => {
    const events = renderTrackedDemo("en");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });

    fireEvent.click(screen.getAllByRole("button", { name: "Approve reply" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Reply approved/ })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Copy reply" })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getAllByRole("button", { name: /Copied/ })[0]);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(2));

    expect(events.map((event) => event.name)).toEqual([
      "reply_approved",
      "reply_approved",
      "reply_copied",
      "reply_copied",
    ]);
    expect(JSON.stringify(events)).not.toContain("Thank you so much");
  });

  test("a failed copy leaves the demo feedback and analytics unchanged", async () => {
    const events = renderTrackedDemo("en");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("blocked")) },
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Copy reply" })[0]);
    await waitFor(() => expect(events).toEqual([]));

    expect(screen.getAllByRole("button", { name: "Copy reply" })[0].hasAttribute("disabled")).toBe(false);
    expect(screen.queryByRole("button", { name: /Copied/ })).toBeNull();
  });

  test("only changed prepared-reply controls emit their controlled action kind", () => {
    const events = renderTrackedDemo("en");

    fireEvent.click(screen.getAllByRole("button", { name: "Short and direct" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Short and direct" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Short" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /Generate another/ })[0]);

    expect(events.map((event) => (
      event.name === "prepared_reply_variant_selected"
        ? event.properties.action_kind
        : undefined
    ))).toEqual(["style", "length", "variant"]);
  });

  test("manager context entry stays untracked until it is applied to a reply", () => {
    const events = renderTrackedDemo("en");

    fireEvent.click(screen.getAllByRole("button", { name: /Several linked incidents/ })[0]);
    events.length = 0;
    fireEvent.change(screen.getAllByRole("textbox", { name: "" })[0], {
      target: { value: "A private note" },
    });
    expect(events).toEqual([]);

    fireEvent.click(screen.getAllByRole("button", { name: "Prepare reply with context" })[0]);
    expect(events).toEqual([{
      name: "reply_edited",
      properties: {
        locale: "en",
        page_kind: "demo",
        review_id: "C1",
        rating: 1,
        review_category: "caution",
      },
    }]);
    expect(JSON.stringify(events)).not.toContain("A private note");
  });
});
