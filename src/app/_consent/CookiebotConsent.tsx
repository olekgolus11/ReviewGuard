"use client";

import { useEffect } from "react";
import {
  connectCookiebotConsent,
  cookiebotAnalyticsConsent,
  reopenCookieSettings,
  type CookiebotHost,
} from "./cookiebot-consent";

function browserHost() {
  return window as unknown as CookiebotHost;
}

export function CookiebotConsentBridge() {
  useEffect(() => (
    connectCookiebotConsent(browserHost(), cookiebotAnalyticsConsent.synchronize)
  ), []);

  return null;
}

export function CookieSettingsButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      className={className}
      onClick={() => reopenCookieSettings(browserHost().Cookiebot)}
      type="button"
    >
      {children}
    </button>
  );
}
