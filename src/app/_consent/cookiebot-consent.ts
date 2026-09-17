import type { AnalyticsConsent, AnalyticsLocale } from "../_analytics/product-analytics";

export type CookiebotApi = {
  consent?: {
    statistics?: boolean;
    method?: "explicit" | "implied" | null;
  };
  declined?: boolean;
  hasResponse?: boolean;
  renew?: () => void;
};

export type CookiebotHost = {
  Cookiebot?: CookiebotApi;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

export type CookiebotAnalyticsConsentSource = {
  current(): AnalyticsConsent;
  subscribe(listener: (consent: AnalyticsConsent) => void): () => void;
  synchronize(consent: AnalyticsConsent): void;
};

const consentEvents = [
  "CookiebotOnConsentReady",
  "CookiebotOnAccept",
  "CookiebotOnDecline",
] as const;

export function cookiebotCulture(locale: AnalyticsLocale) {
  return locale.toUpperCase();
}

export function readCookiebotConsent(cookiebot: CookiebotApi | undefined): AnalyticsConsent {
  if (
    cookiebot?.hasResponse === true
    && cookiebot.consent?.statistics === true
    && cookiebot.consent.method === "explicit"
  ) {
    return "granted";
  }
  if (cookiebot?.hasResponse === true || cookiebot?.declined === true) return "denied";
  return "unknown";
}

export function createCookiebotAnalyticsConsentSource(): CookiebotAnalyticsConsentSource {
  let currentConsent: AnalyticsConsent = "unknown";
  const listeners = new Set<(consent: AnalyticsConsent) => void>();

  return {
    current: () => currentConsent,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    synchronize(consent) {
      if (consent === currentConsent) return;
      currentConsent = consent;
      for (const listener of listeners) listener(consent);
    },
  };
}

export const cookiebotAnalyticsConsent = createCookiebotAnalyticsConsentSource();

export function connectCookiebotConsent(
  host: CookiebotHost,
  onConsentChange: (consent: AnalyticsConsent) => void,
) {
  const synchronize = () => onConsentChange(readCookiebotConsent(host.Cookiebot));
  for (const event of consentEvents) host.addEventListener(event, synchronize);
  synchronize();

  return () => {
    for (const event of consentEvents) host.removeEventListener(event, synchronize);
  };
}

export function reopenCookieSettings(cookiebot: Pick<CookiebotApi, "renew"> | undefined) {
  try {
    if (typeof cookiebot?.renew !== "function") return false;
    cookiebot.renew();
    return true;
  } catch {
    return false;
  }
}
