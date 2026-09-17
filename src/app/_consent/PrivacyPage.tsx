import Link from "next/link";
import type { AnalyticsLocale } from "../_analytics/product-analytics";
import { PrivacyControls } from "./PrivacyControls";
import { privacyCopy } from "./privacy-copy";

export function PrivacyPage({ locale }: { locale: AnalyticsLocale }) {
  const copy = privacyCopy[locale];
  const home = locale === "pl" ? "/pl" : "/";

  return (
    <main className="min-h-screen bg-[#f7f2e8] text-[#17211c]">
      <article className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
        <Link className="font-mono text-xs font-semibold uppercase tracking-[0.1em] underline decoration-[#d6f36a] decoration-4 underline-offset-4" href={home}>
          ← {copy.back}
        </Link>
        <header className="mt-10 border-b border-[#17211c]/15 pb-10">
          <p className="inline-flex bg-[#d6f36a] px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em]">
            {copy.reviewNotice}
          </p>
          <h1 className="mt-6 text-5xl font-bold leading-none sm:text-6xl">{copy.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#526157]">{copy.description}</p>
        </header>
        <div className="grid gap-10 py-10">
          {copy.sections.map((section) => (
            <section className="grid gap-4 sm:grid-cols-[0.6fr_1.4fr]" key={section.title}>
              <h2 className="text-2xl font-bold leading-tight">{section.title}</h2>
              <div className="grid gap-4 text-base leading-7 text-[#39483f]">
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </section>
          ))}
        </div>
      </article>
      <PrivacyControls locale={locale} />
    </main>
  );
}
