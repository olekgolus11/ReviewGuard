"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cookiebotAnalyticsConsent } from "../_consent/cookiebot-consent";
import {
  acquisitionContext,
  currentPageMilestone,
  isDeviceOptedOut,
} from "./browser-analytics";
import { connectProductAnalyticsRuntime } from "./analytics-runtime";
import { createPostHogTransport } from "./posthog-transport";
import {
  type AnalyticsLocale,
  type ProductAnalyticsDependencies,
  POSTHOG_EU_INGESTION_HOST,
} from "./product-analytics";

function safeBrowserSessionStorage(): ProductAnalyticsDependencies["storage"] {
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
  const runtimeRef = useRef<ReturnType<typeof connectProductAnalyticsRuntime> | undefined>(
    undefined,
  );

  useEffect(() => {
    const runtime = connectProductAnalyticsRuntime({
      transport: createPostHogTransport(),
      consent: cookiebotAnalyticsConsent,
      storage: safeBrowserSessionStorage(),
      clock: { now: () => Date.now() },
      session: { createId: () => crypto.randomUUID() },
      environment: {
        deployment,
        hostname: window.location.hostname,
        deviceOptOut: { current: deviceOptOut },
        configuration: apiKey
          ? { apiKey, host: POSTHOG_EU_INGESTION_HOST }
          : undefined,
      },
      currentPage: () => currentBrowserPage(locale),
    });
    runtimeRef.current = runtime;

    return () => {
      runtime.unsubscribeConsent();
      runtimeRef.current = undefined;
    };
  }, [apiKey, deployment, locale]);

  useEffect(() => {
    runtimeRef.current?.synchronizePage();
  }, [locale, pathname]);

  return null;
}
