import Script from "next/script";
import { AnalyticsRuntime } from "../_analytics/AnalyticsRuntime";
import { analyticsDeployment } from "../_analytics/browser-analytics";
import type { AnalyticsLocale } from "../_analytics/product-analytics";
import { CookiebotConsentBridge } from "./CookiebotConsent";
import { cookiebotCulture } from "./cookiebot-consent";

export function CookiebotScript({ locale }: { locale: AnalyticsLocale }) {
  const domainGroupId = process.env.NEXT_PUBLIC_COOKIEBOT_DOMAIN_GROUP_ID?.trim();
  const posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  const deployment = analyticsDeployment(process.env.NODE_ENV, process.env.VERCEL_ENV);

  return (
    <>
      {domainGroupId ? (
        <Script
          data-cbid={domainGroupId}
          data-consentmode="disabled"
          data-culture={cookiebotCulture(locale)}
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          strategy="afterInteractive"
        />
      ) : null}
      <CookiebotConsentBridge />
      <AnalyticsRuntime apiKey={posthogApiKey} deployment={deployment} locale={locale} />
    </>
  );
}
