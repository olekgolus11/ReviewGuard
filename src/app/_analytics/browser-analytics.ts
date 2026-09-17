import {
  isAnalyticsCampaignValue,
  isAnalyticsReferrerDomain,
  type AcquisitionProperties,
  type AnalyticsLocale,
  type CurrentAnalyticsPage,
  type ProductAnalyticsDependencies,
} from "./product-analytics.ts";

export const DEVICE_ANALYTICS_OPT_OUT_KEY = "reviewguard.analytics.team-opt-out";

const campaignParameters = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export function acquisitionContext(input: {
  search: string;
  referrer: string;
  hostname: string;
  viewportWidth: number;
}): AcquisitionProperties {
  const properties: AcquisitionProperties = {};
  const search = new URLSearchParams(input.search);

  for (const parameter of campaignParameters) {
    const value = search.get(parameter);
    if (isAnalyticsCampaignValue(value)) properties[parameter] = value;
  }

  try {
    const referrer = new URL(input.referrer);
    const domain = referrer.hostname.toLowerCase();
    if (
      (referrer.protocol === "https:" || referrer.protocol === "http:")
      && domain !== input.hostname.toLowerCase()
      && isAnalyticsReferrerDomain(domain)
    ) {
      properties.referrer_domain = domain;
    }
  } catch {
    // A missing, malformed, or non-web referrer carries no acquisition context.
  }

  properties.device_class = input.viewportWidth < 768
    ? "mobile"
    : input.viewportWidth < 1024
      ? "tablet"
      : "desktop";
  return properties;
}

export function currentPageMilestone(
  pathname: string,
  locale: AnalyticsLocale,
  acquisition: AcquisitionProperties,
): CurrentAnalyticsPage | undefined {
  if (pathname === "/" || pathname === "/pl") {
    return {
      name: "landing_page_viewed",
      properties: { locale, page_kind: "landing", ...acquisition },
    };
  }
  if (pathname === "/demo-prototype" || pathname === "/pl/demo-prototype") {
    return {
      name: "demo_opened",
      properties: { locale, page_kind: "demo", ...acquisition },
    };
  }
  return undefined;
}

export function analyticsDeployment(
  nodeEnvironment: string | undefined,
  vercelEnvironment: string | undefined,
): ProductAnalyticsDependencies["environment"]["deployment"] {
  if (nodeEnvironment !== "production") return "development";
  if (vercelEnvironment === "preview") return "preview";
  if (vercelEnvironment && vercelEnvironment !== "production") return "test";
  return "production";
}

export function isDeviceOptedOut(storage: Pick<Storage, "getItem">) {
  try {
    return storage.getItem(DEVICE_ANALYTICS_OPT_OUT_KEY) === "true";
  } catch {
    return true;
  }
}
