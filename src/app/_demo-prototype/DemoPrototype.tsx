"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  demoReviews,
  type DemoLocale,
  type DemoReview,
  type ReplyLength,
  type ReplyStyle,
  type ReviewCategory,
  type ReviewStatus,
} from "./demo-data";
import {
  invalidateApproval,
  matchesReviewFilter,
  nextReplyStatus,
  preparedReply,
  sessionSummary,
  type ReviewFilter,
} from "./demo-session";
import styles from "./prototype.module.css";
import { PrivacyControls } from "../_consent/PrivacyControls";

// The validated review workspace: control desk on desktop, focus mode on mobile.

type SessionState = {
  selectedId: string;
  statuses: Record<string, ReviewStatus>;
  replyStyles: Record<string, ReplyStyle>;
  replyVersions: Record<string, number>;
  lengths: Record<string, ReplyLength>;
  drafts: Record<DemoLocale, Record<string, string>>;
  managerNotes: Record<DemoLocale, Record<string, string>>;
  viewed: string[];
  edited: string[];
  copied: string[];
};

const STORAGE_KEY = "reviewguard-demo-prototype-v1";
const ui = {
  pl: {
    product: "ReviewGuard",
    restaurant: "Pizzeria Sąsiedzka",
    demo: "Interaktywne demo",
    queue: "Kolejka opinii",
    all: "Wszystkie",
    quick: "Szybkie",
    personalize: "Personalizacja",
    caution: "Ostrożność",
    new: "Nowa",
    context: "Wymaga kontekstu",
    ready: "Gotowa do zatwierdzenia",
    approved: "Zatwierdzona",
    noViolations: "Możliwe naruszenia: 0",
    noViolationsHelp: "Krytyczna opinia nie jest automatycznie naruszeniem zasad Google.",
    emptyFilter: "Brak opinii w tym filtrze.",
    guest: "Gość Google",
    source: "Adaptacja publicznej opinii · dane zanonimizowane",
    reply: "Propozycja odpowiedzi",
    style: "Styl",
    length: "Długość",
    warm: "Ciepły i profesjonalny",
    concise: "Krótki i rzeczowy",
    casual: "Swobodny i gościnny",
    short: "Krótka",
    standard: "Standardowa",
    regenerate: "Wygeneruj ponownie",
    approve: "Zatwierdź odpowiedź",
    approvedAction: "Odpowiedź zatwierdzona",
    copy: "Kopiuj odpowiedź",
    copied: "Skopiowano",
    publish: "Opublikuj w Google",
    future: "Dostępne po integracji z Google",
    managerTitle: "Kontekst od managera",
    managerHint: "Dodaj tylko potwierdzone fakty. Bez notatki odpowiedź pozostanie neutralna.",
    managerPlaceholder: "Co faktycznie wydarzyło się podczas realizacji zamówienia?",
    exampleNote: "Wstaw przykładową notatkę",
    useContext: "Przygotuj odpowiedź z kontekstem",
    summary: "Ta sesja",
    opened: "Przejrzane",
    edited: "Edytowane",
    approvedCount: "Zatwierdzone",
    copiedCount: "Skopiowane",
    saved: "Szacowany czas",
    minutes: "min oszczędzone",
    estimate: "Szacunek demo: 6 min pisania − 1 min akceptacji.",
    reset: "Zresetuj demo",
    cta: "Chcę takie odpowiedzi dla mojego lokalu",
    ctaTitle: "Pilotaż ReviewGuard",
    ctaBody: "80 zł · 30 dni · 1 lokal · do 20 przetworzonych opinii",
    ctaNote: "Wyślij link do wizytówki Google. Najpierw potwierdzimy zakres i dostępność pilotażu — dopiero potem prześlemy płatność.",
    ctaForm: "Przejdź do formularza",
    close: "Wróć do demo",
    desktopLayout: "Dyspozytornia",
    mobileLayout: "Tryb skupienia",
    today: "Dzisiaj do odpowiedzi",
    previous: "Poprzednia opinia",
    next: "Następna opinia",
    workflow: "Droga opinii do odpowiedzi",
    language: "EN",
    prototype: "PROTOTYP — dane nie opuszczają przeglądarki",
  },
  en: {
    product: "ReviewGuard",
    restaurant: "Neighbourhood Pizza",
    demo: "Interactive demo",
    queue: "Review queue",
    all: "All",
    quick: "Quick wins",
    personalize: "Personalise",
    caution: "Handle with care",
    new: "New",
    context: "Needs context",
    ready: "Ready to approve",
    approved: "Approved",
    noViolations: "Possible violations: 0",
    noViolationsHelp: "A critical review is not automatically a violation of Google policy.",
    emptyFilter: "There are no reviews in this filter.",
    guest: "Google guest",
    source: "Adapted public review · details anonymised",
    reply: "Suggested reply",
    style: "Style",
    length: "Length",
    warm: "Warm and professional",
    concise: "Short and direct",
    casual: "Relaxed and welcoming",
    short: "Short",
    standard: "Standard",
    regenerate: "Generate another",
    approve: "Approve reply",
    approvedAction: "Reply approved",
    copy: "Copy reply",
    copied: "Copied",
    publish: "Publish to Google",
    future: "Available after Google integration",
    managerTitle: "Manager context",
    managerHint: "Add confirmed facts only. Without a note, the reply stays neutral.",
    managerPlaceholder: "What actually happened while the order was being handled?",
    exampleNote: "Insert example note",
    useContext: "Prepare reply with context",
    summary: "This session",
    opened: "Opened",
    edited: "Edited",
    approvedCount: "Approved",
    copiedCount: "Copied",
    saved: "Estimated time",
    minutes: "min saved",
    estimate: "Demo estimate: 6 min writing − 1 min approval.",
    reset: "Reset demo",
    cta: "I want replies like these for my location",
    ctaTitle: "ReviewGuard pilot",
    ctaBody: "30 days · 1 location · up to 20 processed reviews",
    ctaNote: "Send us your Google Business Profile link. We will confirm the scope, market-specific price and pilot availability before requesting payment.",
    ctaForm: "Open the enquiry form",
    close: "Back to demo",
    desktopLayout: "Control desk",
    mobileLayout: "Focus mode",
    today: "Reviews to handle today",
    previous: "Previous review",
    next: "Next review",
    workflow: "From review to response",
    language: "PL",
    prototype: "PROTOTYPE — data stays in this browser",
  },
} as const;

function createInitialState(): SessionState {
  return {
    selectedId: demoReviews[0].id,
    statuses: Object.fromEntries(demoReviews.map((review) => [review.id, review.initialStatus])),
    replyStyles: Object.fromEntries(demoReviews.map((review) => [review.id, "warm"])),
    replyVersions: Object.fromEntries(demoReviews.map((review) => [review.id, 0])),
    lengths: Object.fromEntries(demoReviews.map((review) => [review.id, "standard"])),
    drafts: { pl: {}, en: {} },
    managerNotes: { pl: {}, en: {} },
    viewed: [],
    edited: [],
    copied: [],
  };
}

function unique(items: string[], next: string) {
  return items.includes(next) ? items : [...items, next];
}

function withoutKey(record: Record<string, string>, key: string) {
  const next = { ...record };
  delete next[key];
  return next;
}

function stars(rating: number) {
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

function statusLabel(locale: DemoLocale, status: ReviewStatus) {
  return ui[locale][status];
}

function categoryLabel(locale: DemoLocale, category: ReviewCategory) {
  return ui[locale][category];
}

type WorkspaceProps = {
  locale: DemoLocale;
  state: SessionState;
  selected: DemoReview;
  filtered: DemoReview[];
  filter: ReviewFilter;
  setFilter: (filter: ReviewFilter) => void;
  selectReview: (id: string) => void;
  setState: React.Dispatch<React.SetStateAction<SessionState>>;
  openCta: () => void;
};

function ReviewCard({
  review,
  locale,
  status,
  active,
  onClick,
}: {
  review: DemoReview;
  locale: DemoLocale;
  status: ReviewStatus;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`${styles.reviewCard} ${active ? styles.reviewCardActive : ""}`}
      onClick={onClick}
      type="button"
    >
      <span className={styles.reviewCardTop}>
        <span className={styles.stars} aria-label={`${review.rating}/5`}>{stars(review.rating)}</span>
        <span className={styles.age}>{review.age[locale]}</span>
      </span>
      <strong>{review.detail[locale]}</strong>
      <span className={styles.reviewExcerpt}>{review.review[locale]}</span>
      <span className={styles.reviewMeta}>
        <span data-category={review.category}>{categoryLabel(locale, review.category)}</span>
        <span data-status={status}>{statusLabel(locale, status)}</span>
      </span>
    </button>
  );
}

function FilterBar({ locale, filter, setFilter }: Pick<WorkspaceProps, "locale" | "filter" | "setFilter">) {
  const c = ui[locale];
  const filters: { value: ReviewFilter; label: string }[] = [
    { value: "all", label: c.all },
    { value: "quick", label: c.quick },
    { value: "personalize", label: c.personalize },
    { value: "caution", label: c.caution },
    { value: "violations", label: c.noViolations },
  ];
  return (
    <div className={styles.filters} aria-label={c.queue}>
      {filters.map((item) => (
        <button
          aria-pressed={filter === item.value}
          className={filter === item.value ? styles.filterActive : ""}
          key={item.value}
          onClick={() => setFilter(item.value)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ReviewDetail({ review, locale, status }: { review: DemoReview; locale: DemoLocale; status: ReviewStatus }) {
  const c = ui[locale];
  return (
    <article className={styles.reviewDetail}>
      <div className={styles.detailHeader}>
        <div className={styles.avatar} aria-hidden="true">G</div>
        <div>
          <strong>{c.guest}</strong>
          <div className={styles.stars} aria-label={`${review.rating}/5`}>{stars(review.rating)}</div>
        </div>
        <span className={styles.statusPill} data-status={status}>{statusLabel(locale, status)}</span>
      </div>
      <blockquote>“{review.review[locale]}”</blockquote>
      <p className={styles.sourceNote}>{c.source}</p>
      <div className={styles.policyNote}>
        <strong>{c.noViolations}</strong>
        <span>{c.noViolationsHelp}</span>
      </div>
    </article>
  );
}

function ReplyEditor({ locale, review, state, setState }: Pick<WorkspaceProps, "locale" | "state" | "setState"> & { review: DemoReview }) {
  const c = ui[locale];
  const selectedStyle = state.replyStyles[review.id] ?? "warm";
  const length = state.lengths[review.id] ?? "standard";
  const savedDraft = state.drafts[locale][review.id];
  const replyVersion = state.replyVersions?.[review.id] ?? 0;
  const note = state.managerNotes[locale][review.id] || "";
  const hasManagerContext = Boolean(note.trim());
  const reply = savedDraft || preparedReply(review, {
    locale,
    style: selectedStyle,
    version: replyVersion,
    length,
    managerNote: note,
  });
  const status = state.statuses[review.id];

  function prepare(mutator: (current: SessionState) => SessionState) {
    setState((current) => mutator(current));
  }

  function changeStyle(nextStyle: ReplyStyle) {
    prepare((current) => invalidateApproval({
      ...current,
      replyStyles: { ...current.replyStyles, [review.id]: nextStyle },
      replyVersions: { ...current.replyVersions, [review.id]: 0 },
      drafts: { ...current.drafts, [locale]: withoutKey(current.drafts[locale], review.id) },
    }, review.id, nextReplyStatus(review, note)));
  }

  function regenerate() {
    prepare((current) => invalidateApproval({
      ...current,
      replyVersions: {
        ...current.replyVersions,
        [review.id]: ((current.replyVersions?.[review.id] ?? 0) + 1) % 2,
      },
      drafts: { ...current.drafts, [locale]: withoutKey(current.drafts[locale], review.id) },
    }, review.id, nextReplyStatus(review, note)));
  }

  async function copyReply() {
    try {
      await navigator.clipboard.writeText(reply);
    } catch {
      // The visual prototype still records the intent when clipboard access is unavailable.
    }
    prepare((current) => ({ ...current, copied: unique(current.copied, review.id) }));
  }

  return (
    <section className={styles.replyEditor}>
      <div className={styles.sectionHeading}>
        <div>
          <span>{c.reply}</span>
          <strong>{c[selectedStyle]}</strong>
        </div>
        <button className={styles.textButton} onClick={regenerate} type="button">↻ {c.regenerate}</button>
      </div>

      <div className={styles.controlGroup}>
        <span>{c.style}</span>
        <div className={styles.segmented}>
          {(["warm", "concise", "casual"] as ReplyStyle[]).map((item) => (
            <button
              aria-pressed={selectedStyle === item}
              key={item}
              onClick={() => changeStyle(item)}
              type="button"
            >
              {c[item]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.controlGroup}>
        <span>{c.length}</span>
        <div className={styles.segmented}>
          {(["short", "standard"] as ReplyLength[]).map((item) => (
            <button
              aria-pressed={length === item}
              key={item}
              onClick={() => prepare((current) => invalidateApproval({
                ...current,
                lengths: { ...current.lengths, [review.id]: item },
                drafts: { ...current.drafts, [locale]: withoutKey(current.drafts[locale], review.id) },
              }, review.id, nextReplyStatus(review, note)))}
              type="button"
            >
              {c[item]}
            </button>
          ))}
        </div>
      </div>

      {review.managerContext ? (
        <div className={styles.managerBox}>
          <strong>{c.managerTitle}</strong>
          <p>{c.managerHint}</p>
          <textarea
            onChange={(event) => prepare((current) => invalidateApproval({
              ...current,
              managerNotes: {
                ...current.managerNotes,
                [locale]: { ...current.managerNotes[locale], [review.id]: event.target.value },
              },
              drafts: { ...current.drafts, [locale]: withoutKey(current.drafts[locale], review.id) },
            }, review.id, "context"))}
            placeholder={c.managerPlaceholder}
            value={note}
          />
          <div className={styles.managerActions}>
            <button
              className={styles.secondaryButton}
              onClick={() => prepare((current) => invalidateApproval({
                ...current,
                managerNotes: {
                  ...current.managerNotes,
                  [locale]: { ...current.managerNotes[locale], [review.id]: review.managerContext?.example[locale] ?? "" },
                },
                drafts: { ...current.drafts, [locale]: withoutKey(current.drafts[locale], review.id) },
              }, review.id, "context"))}
              type="button"
            >
              {c.exampleNote}
            </button>
            <button
              className={styles.darkButton}
              disabled={!hasManagerContext}
              onClick={() => prepare((current) => invalidateApproval({
                ...current,
                drafts: {
                  ...current.drafts,
                  [locale]: { ...current.drafts[locale], [review.id]: reply },
                },
                edited: unique(current.edited, review.id),
              }, review.id, "ready"))}
              type="button"
            >
              {c.useContext}
            </button>
          </div>
        </div>
      ) : null}

      <textarea
        aria-label={c.reply}
        className={styles.replyTextarea}
        onChange={(event) => prepare((current) => invalidateApproval({
          ...current,
          drafts: {
            ...current.drafts,
            [locale]: { ...current.drafts[locale], [review.id]: event.target.value },
          },
          edited: unique(current.edited, review.id),
        }, review.id, "ready"))}
        value={reply}
      />

      <div className={styles.primaryActions}>
        <button
          className={styles.approveButton}
          disabled={status === "context"}
          onClick={() => prepare((current) => ({
            ...current,
            statuses: { ...current.statuses, [review.id]: "approved" },
          }))}
          type="button"
        >
          {status === "approved" ? `✓ ${c.approvedAction}` : c.approve}
        </button>
        <button className={styles.secondaryButton} onClick={copyReply} type="button">
          {state.copied.includes(review.id) ? `✓ ${c.copied}` : c.copy}
        </button>
      </div>
      <button className={styles.publishButton} disabled type="button">{c.publish}<span>{c.future}</span></button>
    </section>
  );
}

function SessionSummary({ locale, state, reset, openCta }: { locale: DemoLocale; state: SessionState; reset: () => void; openCta: () => void }) {
  const c = ui[locale];
  const approval = sessionSummary(state);
  const stats = [
    [c.opened, state.viewed.length],
    [c.edited, state.edited.length],
    [c.approvedCount, approval.approved],
    [c.copiedCount, state.copied.length],
  ] as const;
  return (
    <aside className={styles.sessionSummary}>
      <div className={styles.sectionHeading}>
        <strong>{c.summary}</strong>
        <button className={styles.textButton} onClick={reset} type="button">{c.reset}</button>
      </div>
      <dl>
        {stats.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      <div className={styles.timeSaved}>
        <span>{c.saved}</span>
        <strong>{approval.savedMinutes} {c.minutes}</strong>
        <small>{c.estimate}</small>
      </div>
      <button className={styles.ctaButton} onClick={openCta} type="button">{c.cta}</button>
    </aside>
  );
}

function ReviewStepper({
  locale,
  reviews,
  selectedId,
  selectReview,
  dark = false,
}: {
  locale: DemoLocale;
  reviews: DemoReview[];
  selectedId: string;
  selectReview: (id: string) => void;
  dark?: boolean;
}) {
  const c = ui[locale];
  const currentIndex = Math.max(0, reviews.findIndex((review) => review.id === selectedId));
  const previous = reviews[currentIndex - 1];
  const next = reviews[currentIndex + 1];

  return (
    <nav
      aria-label={locale === "pl" ? "Nawigacja między opiniami" : "Review navigation"}
      className={`${styles.reviewStepper} ${dark ? styles.reviewStepperDark : ""}`}
    >
      <button disabled={!previous} onClick={() => previous && selectReview(previous.id)} type="button">
        <span aria-hidden="true">←</span> {c.previous}
      </button>
      <span aria-live="polite">{reviews.length ? currentIndex + 1 : 0} / {reviews.length}</span>
      <button disabled={!next} onClick={() => next && selectReview(next.id)} type="button">
        {c.next} <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}

function DesktopWorkspace(props: WorkspaceProps) {
  const c = ui[props.locale];
  const pendingCount = demoReviews.filter((review) => props.state.statuses[review.id] !== "approved").length;
  return (
    <main className={`${styles.workspace} ${styles.desktopWorkspace}`}>
      <header className={styles.appHeader}>
        <Brand layout="desktop" locale={props.locale} />
        <div aria-live="polite" className={styles.headerSignal}><span>{pendingCount}</span>{c.today}</div>
      </header>
      <div className={styles.aToolbar}>
        <FilterBar locale={props.locale} filter={props.filter} setFilter={props.setFilter} />
        <span className={styles.policyChip}>{c.noViolations}</span>
      </div>
      <div className={styles.aGrid}>
        <aside className={styles.queuePanel}>
          <h1>{c.queue}</h1>
          <div className={styles.reviewList}>
            {!props.filtered.length ? (
              <p className={styles.emptyState}>{c.emptyFilter}</p>
            ) : null}
            {props.filtered.map((review) => (
              <ReviewCard
                active={review.id === props.selected.id}
                key={review.id}
                locale={props.locale}
                onClick={() => props.selectReview(review.id)}
                review={review}
                status={props.state.statuses[review.id]}
              />
            ))}
          </div>
        </aside>
        <section className={styles.detailPanel}>
          {props.filtered.length ? (
            <>
              <div className={styles.detailNavigation}>
                <p className={styles.eyebrow}>{c.workflow}</p>
                <ReviewStepper
                  locale={props.locale}
                  reviews={props.filtered}
                  selectedId={props.selected.id}
                  selectReview={props.selectReview}
                />
              </div>
              <ReviewDetail locale={props.locale} review={props.selected} status={props.state.statuses[props.selected.id]} />
            </>
          ) : (
            <div className={styles.emptyState}>
              <strong>{c.noViolations}</strong>
              <p>{c.noViolationsHelp}</p>
            </div>
          )}
          <SessionSummary locale={props.locale} openCta={props.openCta} reset={() => props.setState(createInitialState())} state={props.state} />
        </section>
        {props.filtered.length ? (
          <ReplyEditor locale={props.locale} review={props.selected} setState={props.setState} state={props.state} />
        ) : null}
      </div>
    </main>
  );
}

function MobileWorkspace(props: WorkspaceProps) {
  const c = ui[props.locale];
  const currentIndex = Math.max(0, props.filtered.findIndex((review) => review.id === props.selected.id));
  return (
    <main className={`${styles.workspace} ${styles.mobileWorkspace}`}>
      <header className={styles.focusHeader}>
        <Brand layout="mobile" locale={props.locale} />
        <FilterBar locale={props.locale} filter={props.filter} setFilter={props.setFilter} />
      </header>
      <section className={styles.focusStage}>
        {props.filtered.length ? (
          <>
            <div className={styles.progressLine}>
              <span style={{ width: `${Math.max(9, ((currentIndex + 1) / Math.max(1, props.filtered.length)) * 100)}%` }} />
            </div>
            <div className={styles.focusKicker}>
              <strong>{props.selected.detail[props.locale]}</strong>
              <ReviewStepper
                dark
                locale={props.locale}
                reviews={props.filtered}
                selectedId={props.selected.id}
                selectReview={props.selectReview}
              />
            </div>
            <div className={styles.focusGrid}>
              <ReviewDetail locale={props.locale} review={props.selected} status={props.state.statuses[props.selected.id]} />
              <ReplyEditor locale={props.locale} review={props.selected} setState={props.setState} state={props.state} />
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <strong>{c.noViolations}</strong>
            <p>{c.noViolationsHelp}</p>
          </div>
        )}
      </section>
      <div className={styles.focusFooter}>
        <div className={styles.miniQueue}>
          {props.filtered.map((review) => (
            <button
              aria-label={`${review.id}: ${review.detail[props.locale]}`}
              className={review.id === props.selected.id ? styles.miniActive : ""}
              key={review.id}
              onClick={() => props.selectReview(review.id)}
              type="button"
            >
              <span>{review.id}</span><strong>{review.rating}★</strong>
            </button>
          ))}
        </div>
        <SessionSummary locale={props.locale} openCta={props.openCta} reset={() => props.setState(createInitialState())} state={props.state} />
      </div>
    </main>
  );
}

function Brand({ locale, layout }: { locale: DemoLocale; layout: "desktop" | "mobile" }) {
  const c = ui[locale];
  const layoutName = layout === "desktop" ? c.desktopLayout : c.mobileLayout;
  const homePath = locale === "pl" ? "/pl#top" : "/#top";
  return (
    <Link aria-label={locale === "pl" ? "Wróć na stronę główną ReviewGuard" : "Back to the ReviewGuard homepage"} className={styles.brand} href={homePath}>
      <span className={styles.mark}>RG</span>
      <div><strong>{c.product}</strong><small>{c.demo} · {layoutName}</small></div>
    </Link>
  );
}

export function DemoPrototype({
  locale,
}: {
  locale: DemoLocale;
}) {
  const c = ui[locale];
  const languagePath = locale === "pl" ? "/demo-prototype" : "/pl/demo-prototype";
  const [state, setState] = useState<SessionState>(createInitialState);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [ctaOpen, setCtaOpen] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("variant")) return;
    url.searchParams.delete("variant");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setState({ ...createInitialState(), ...JSON.parse(stored) });
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        hydrated.current = true;
      }
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const filtered = useMemo(
    () => demoReviews.filter((review) => matchesReviewFilter(review, filter)),
    [filter],
  );

  const selected = demoReviews.find((review) => review.id === state.selectedId) ?? demoReviews[0];

  function selectReview(id: string) {
    setState((current) => ({ ...current, selectedId: id, viewed: unique(current.viewed, id) }));
  }

  function changeFilter(nextFilter: ReviewFilter) {
    setFilter(nextFilter);
    setState((current) => {
      const matches = demoReviews.filter((review) => (
        matchesReviewFilter(review, nextFilter)
      ));
      if (matches.some((review) => review.id === current.selectedId) || !matches[0]) return current;
      return {
        ...current,
        selectedId: matches[0].id,
        viewed: unique(current.viewed, matches[0].id),
      };
    });
  }

  const props: WorkspaceProps = {
    locale,
    state,
    selected,
    filtered,
    filter,
    setFilter: changeFilter,
    selectReview,
    setState,
    openCta: () => setCtaOpen(true),
  };

  return (
    <div className={styles.prototypeRoot}>
      <div className={styles.prototypeNotice}>
        <span>{c.prototype}</span>
        <a href={languagePath}>{c.language}</a>
      </div>
      <div className={styles.desktopWinner}><DesktopWorkspace {...props} /></div>
      <div className={styles.mobileWinner}><MobileWorkspace {...props} /></div>
      <PrivacyControls locale={locale} tone="dark" />
      {ctaOpen ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={() => setCtaOpen(false)}>
          <section aria-labelledby="pilot-title" aria-modal="true" className={styles.modal} onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <span className={styles.modalMark}>RG / PILOT</span>
            <h2 id="pilot-title">{c.ctaTitle}</h2>
            <strong>{c.ctaBody}</strong>
            <p>{c.ctaNote}</p>
            <div className={styles.modalActions}>
              <Link className={styles.darkButton} href={`${locale === "pl" ? "/pl" : "/"}#pilot`}>{c.ctaForm}</Link>
              <button className={styles.secondaryButton} onClick={() => setCtaOpen(false)} type="button">{c.close}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
