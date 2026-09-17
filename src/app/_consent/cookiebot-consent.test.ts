import assert from "node:assert/strict";
import test from "node:test";
import type { AnalyticsConsent, AnalyticsLocale } from "../_analytics/product-analytics.ts";
import {
  connectCookiebotConsent,
  cookiebotCulture,
  createCookiebotAnalyticsConsentSource,
  reopenCookieSettings,
  type CookiebotHost,
} from "./cookiebot-consent.ts";

function createHost(): CookiebotHost & {
  dispatch(type: string): void;
} {
  const listeners = new Map<string, Set<() => void>>();
  return {
    addEventListener(type, listener) {
      const eventListeners = listeners.get(type) ?? new Set();
      eventListeners.add(listener);
      listeners.set(type, eventListeners);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type) {
      for (const listener of listeners.get(type) ?? []) listener();
    },
  };
}

for (const locale of ["pl", "en"] satisfies AnalyticsLocale[]) {
  test(`${locale} consent integration exposes grant, rejection, and withdrawal`, () => {
    const host = createHost();
    const states: AnalyticsConsent[] = [];
    const disconnect = connectCookiebotConsent(host, (state) => states.push(state));

    assert.equal(cookiebotCulture(locale), locale.toUpperCase());
    assert.deepEqual(states, ["unknown"]);

    host.Cookiebot = {
      consent: { statistics: true, method: "explicit" },
      hasResponse: true,
    };
    host.dispatch("CookiebotOnConsentReady");

    host.Cookiebot = {
      consent: { statistics: false, method: "explicit" },
      declined: true,
      hasResponse: true,
    };
    host.dispatch("CookiebotOnDecline");

    host.Cookiebot = {
      consent: { statistics: true, method: "explicit" },
      hasResponse: true,
    };
    host.dispatch("CookiebotOnAccept");

    assert.deepEqual(states, ["unknown", "granted", "denied", "granted"]);

    disconnect();
    host.dispatch("CookiebotOnDecline");
    assert.deepEqual(states, ["unknown", "granted", "denied", "granted"]);
  });
}

test("settings can be reopened without depending on Cookiebot internals", () => {
  let renewals = 0;
  assert.equal(reopenCookieSettings({ renew: () => { renewals += 1; } }), true);
  assert.equal(renewals, 1);
});

test("blocked or failed Cookiebot leaves the settings action harmless", () => {
  assert.equal(reopenCookieSettings(undefined), false);
  assert.equal(reopenCookieSettings({ renew: () => { throw new Error("blocked"); } }), false);
});

test("the consent source gives the analytics gateway current state and change notifications", () => {
  const source = createCookiebotAnalyticsConsentSource();
  const changes: AnalyticsConsent[] = [];
  const unsubscribe = source.subscribe((consent) => changes.push(consent));

  assert.equal(source.current(), "unknown");
  source.synchronize("granted");
  source.synchronize("granted");
  source.synchronize("denied");

  assert.equal(source.current(), "denied");
  assert.deepEqual(changes, ["granted", "denied"]);

  unsubscribe();
  source.synchronize("unknown");
  assert.deepEqual(changes, ["granted", "denied"]);
});
