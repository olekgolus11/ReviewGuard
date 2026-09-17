import type { Metadata } from "next";
import { PrivacyPage } from "../../../_consent/PrivacyPage";

export const metadata: Metadata = {
  title: "Prywatność i analityka — ReviewGuard",
  description: "Jak ReviewGuard używa Cookiebot i analityki PostHog po uzyskaniu zgody.",
};

export default function PolishPrivacyPage() {
  return <PrivacyPage locale="pl" />;
}
