import type { ProductAnalyticsEvent } from "./product-analytics";

type BrowserAnalyticsListener = (event: ProductAnalyticsEvent) => void;

const listeners = new Set<BrowserAnalyticsListener>();

export function captureBrowserAnalyticsEvent(event: ProductAnalyticsEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Analytics is optional and must never alter product behavior.
    }
  }
}

export function subscribeBrowserAnalyticsEvents(listener: BrowserAnalyticsListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
