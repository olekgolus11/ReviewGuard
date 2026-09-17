import type { ProductAnalyticsEvent } from "./product-analytics";

type BrowserAnalyticsListener = (event: ProductAnalyticsEvent) => void;

const listeners = new Set<BrowserAnalyticsListener>();

export function captureBrowserAnalyticsEvent(event: ProductAnalyticsEvent) {
  for (const listener of listeners) listener(event);
}

export function subscribeBrowserAnalyticsEvents(listener: BrowserAnalyticsListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
