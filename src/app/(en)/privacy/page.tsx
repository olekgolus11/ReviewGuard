import type { Metadata } from "next";
import { PrivacyPage } from "../../_consent/PrivacyPage";

export const metadata: Metadata = {
  title: "Privacy and analytics — ReviewGuard",
  description: "How ReviewGuard uses Cookiebot and consent-gated PostHog analytics.",
};

export default function EnglishPrivacyPage() {
  return <PrivacyPage locale="en" />;
}
