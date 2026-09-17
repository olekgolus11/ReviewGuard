"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cookiebotAnalyticsConsent } from "../_consent/cookiebot-consent";
import {
  acquisitionContext,
  currentPageMilestone,
  isDeviceOptedOut,
} from "./browser-analytics";
import { createPostHogTransport } from "./posthog-transport";
import {
  createProductAnalytics,
  type AnalyticsLocale,
  type ProductAnalyticsDependencies,
} from "./product-analytics";

const POSTHOG_EU_INGESTION_HOST = "https://eu.i.posthog.com";

function browserSessionStorage(): ProductAnalyticsDependencies["storage"] {
  return {
    getItem(key) {
      return window.sessionStorage.getItem(key);
    },
    setItem(key, value) {
      window.sessionStorage.setItem(key, value);
    },
    removeItem(key) {
      window.sessionStorage.removeItem(key);
    },
  };
}

function deviceOptOut() {
  try {
    return isDeviceOptedOut(window.localStorage);
  } catch {
    return true;
  }
}

function currentBrowserPage(locale: AnalyticsLocale) {
  return currentPageMilestone(
    window.location.pathname,
    locale,
    acquisitionContext({
      search: window.location.search,
      referrer: document.referrer,
      hostname: window.location.hostname,
      viewportWidth: window.innerWidth,
    }),
  );
}

export function AnalyticsRuntime({
  apiKey,
  deployment,
  locale,
}: {
  apiKey?: string;
  deployment: ProductAnalyticsDependencies["environment"]["deployment"];
  locale: AnalyticsLocale;
}) {
  const pathname = usePathname();
  const analyticsRef = useRef<ReturnType<typeof createProductAnalytics> | undefined>(undefined);

  useEffect(() => {
    const analytics = createProductAnalytics({
      transport: createPostHogTransport(),
      consent: cookiebotAnalyticsConsent,
      storage: browserSessionStorage(),
      clock: { now: () => Date.now() },
      session: { createId: () => crypto.randomUUID() },
      environment: {
        deployment,
        hostname: window.location.hostname,
        deviceOptOut: deviceOptOut(),
        configuration: apiKey
          ? { apiKey, host: POSTHOG_EU_INGESTION_HOST }
          : undefined,
      },
    });
    analyticsRef.current = analytics;
    const unsubscribe = cookiebotAnalyticsConsent.subscribe(() => {
      analytics.synchronizeConsent(currentBrowserPage(locale));
    });
    analytics.synchronizeConsent(currentBrowserPage(locale));

    return () => {
      unsubscribe();
      analyticsRef.current = undefined;
    };
  }, [apiKey, deployment, locale]);

  useEffect(() => {
    analyticsRef.current?.synchronizeConsent(currentBrowserPage(locale));
  }, [locale, pathname]);

  return null;
}
