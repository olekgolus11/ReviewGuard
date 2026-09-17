import {
  ANALYTICS_PAGE_MILESTONE_PROPERTY_KEYS,
  POSTHOG_EU_INGESTION_HOST,
  sanitizeProductAnalyticsEvent,
  type AnalyticsConfiguration,
  type AnalyticsTransport,
  type AnalyticsTransportEvent,
} from "./product-analytics.ts";
import type { CaptureResult } from "posthog-js";

export type PostHogInitializationOptions = {
  api_host: string;
  person_profiles: "never";
  autocapture: false;
  rageclick: false;
  capture_pageview: false;
  capture_pageleave: false;
  capture_dead_clicks: false;
  capture_heatmaps: false;
  capture_performance: false;
  capture_exceptions: false;
  disable_session_recording: true;
  disable_persistence: true;
  disable_surveys: true;
  disable_surveys_automatic_display: true;
  disable_product_tours: true;
  disable_conversations: true;
  disable_web_experiments: true;
  disable_external_dependency_loading: true;
  advanced_disable_flags: true;
  advanced_disable_feature_flags: true;
  advanced_disable_feature_flags_on_first_load: true;
  advanced_disable_toolbar_metrics: true;
  opt_in_site_apps: false;
  save_referrer: false;
  save_campaign_params: false;
  disable_scroll_properties: true;
  disableDeviceModel: true;
  request_batching: false;
  before_send(event: CaptureResult | null): CaptureResult | null;
};

export type PostHogClient = {
  init(apiKey: string, options: PostHogInitializationOptions): void;
  capture(name: string, properties?: Record<string, unknown>): unknown;
  shutdown(): void | Promise<void>;
};

const pageMilestoneProperties = new Set<string>(ANALYTICS_PAGE_MILESTONE_PROPERTY_KEYS);

function beforeSend(event: CaptureResult | null) {
  if (!event) return null;

  const candidateProperties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event.properties ?? {})) {
    if (pageMilestoneProperties.has(key)) candidateProperties[key] = value;
  }
  const semanticEvent = sanitizeProductAnalyticsEvent({
    name: event.event,
    properties: candidateProperties,
  });
  if (
    !semanticEvent
    || (semanticEvent.name !== "landing_page_viewed" && semanticEvent.name !== "demo_opened")
  ) return null;

  const properties: Record<string, unknown> = { ...semanticEvent.properties };
  const token = event.properties?.token;
  const distinctId = event.properties?.distinct_id;
  if (typeof token === "string") properties.token = token;
  if (typeof distinctId === "string") properties.distinct_id = distinctId;
  if (event.properties?.$process_person_profile === false) {
    properties.$process_person_profile = false;
  }

  return {
    ...event,
    properties,
    $set: undefined,
    $set_once: undefined,
    $unset: undefined,
  };
}

function initializationOptions(host: string): PostHogInitializationOptions {
  return {
    api_host: host,
    person_profiles: "never",
    autocapture: false,
    rageclick: false,
    capture_pageview: false,
    capture_pageleave: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_performance: false,
    capture_exceptions: false,
    disable_session_recording: true,
    disable_persistence: true,
    disable_surveys: true,
    disable_surveys_automatic_display: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    advanced_disable_toolbar_metrics: true,
    opt_in_site_apps: false,
    save_referrer: false,
    save_campaign_params: false,
    disable_scroll_properties: true,
    disableDeviceModel: true,
    request_batching: false,
    before_send: beforeSend,
  };
}

async function loadPostHogClient(): Promise<PostHogClient> {
  const { PostHog } = await import("posthog-js/dist/module.no-external");
  const instance = new PostHog();
  return {
    init(apiKey, options) {
      instance.init(apiKey, options);
    },
    capture(name, properties) {
      return instance.capture(name, properties);
    },
    shutdown() {
      return instance.shutdown();
    },
  };
}

export function createPostHogTransport(
  loadClient: () => Promise<PostHogClient> = loadPostHogClient,
): AnalyticsTransport {
  let client: PostHogClient | undefined;

  return {
    async initialize(configuration: AnalyticsConfiguration) {
      if (configuration.host !== POSTHOG_EU_INGESTION_HOST) {
        throw new Error("PostHog analytics is restricted to the EU ingestion host");
      }
      const nextClient = await loadClient();
      nextClient.init(configuration.apiKey, initializationOptions(configuration.host));
      client = nextClient;
    },
    capture(event: AnalyticsTransportEvent) {
      if (!client) return;
      const { name, properties, anonymousSessionId } = event;
      client.capture(name, { ...properties, distinct_id: anonymousSessionId });
    },
    async shutdown() {
      const currentClient = client;
      client = undefined;
      await currentClient?.shutdown();
    },
  };
}
