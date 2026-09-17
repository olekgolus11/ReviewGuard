import Link from "next/link";
import type { AnalyticsLocale } from "../_analytics/product-analytics";
import { CookieSettingsButton } from "./CookiebotConsent";

const copy = {
  pl: {
    aria: "Prywatność i ustawienia analityki",
    privacy: "Prywatność i pliki cookie",
    settings: "Ustawienia analityki",
  },
  en: {
    aria: "Privacy and analytics settings",
    privacy: "Privacy and cookies",
    settings: "Analytics settings",
  },
} as const;

export function PrivacyControls({
  locale,
  tone = "light",
}: {
  locale: AnalyticsLocale;
  tone?: "light" | "dark";
}) {
  const labels = copy[locale];
  const link = locale === "pl" ? "/pl/privacy" : "/privacy";
  const colors = tone === "dark"
    ? "border-white/20 bg-[#17211c] text-[#f7f2e8]"
    : "border-[#17211c]/15 bg-[#fffdf7] text-[#17211c]";
  const action = tone === "dark"
    ? "decoration-[#d6f36a] hover:decoration-[#f7f2e8] focus-visible:outline-[#d6f36a]"
    : "decoration-[#d6f36a] hover:decoration-[#17211c] focus-visible:outline-[#17211c]";

  return (
    <footer aria-label={labels.aria} className={`border-t px-5 py-5 sm:px-8 lg:px-10 ${colors}`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 font-mono text-xs font-semibold uppercase tracking-[0.08em]">
        <span>© {new Date().getUTCFullYear()} ReviewGuard</span>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Link className={`underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 ${action}`} href={link}>
            {labels.privacy}
          </Link>
          <CookieSettingsButton className={`cursor-pointer border-0 bg-transparent p-0 font:inherit uppercase tracking-[0.08em] underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 ${action}`}>
            {labels.settings}
          </CookieSettingsButton>
        </div>
      </div>
    </footer>
  );
}
