import {
  createProductAnalytics,
  type CurrentAnalyticsPage,
  type ProductAnalyticsDependencies,
} from "./product-analytics.ts";

type RuntimeConsentSource = ProductAnalyticsDependencies["consent"] & {
  subscribe(listener: () => void): () => void;
};

export function connectProductAnalyticsRuntime(
  dependencies: Omit<ProductAnalyticsDependencies, "consent"> & {
    consent: RuntimeConsentSource;
    currentPage(): CurrentAnalyticsPage | undefined;
  },
) {
  const { currentPage, ...analyticsDependencies } = dependencies;
  const analytics = createProductAnalytics(analyticsDependencies);
  const synchronize = () => analytics.synchronizeConsent(currentPage());
  const disconnectConsent = dependencies.consent.subscribe(synchronize);
  synchronize();

  return {
    synchronizePage: synchronize,
    unsubscribeConsent: disconnectConsent,
  };
}
