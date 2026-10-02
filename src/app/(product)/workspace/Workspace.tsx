"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProductConfiguration, ProductWorkspace, Review, ReviewAction, ReplyStyle, WorkspaceResponse } from "../../../lib/product/types";
import prototypeStyles from "../../_demo-prototype/prototype.module.css";

const actionLabels: Record<ReviewAction, string> = {
  reply: "Przygotuj odpowiedź",
  skip: "Pomiń",
  human_review: "Wymaga uwagi",
  report: "Rozważ zgłoszenie",
};
const actionShort: Record<ReviewAction, string> = { reply: "Odpowiedź", skip: "Pomiń", human_review: "Uwaga", report: "Zgłoszenie" };
const actions: ReviewAction[] = ["reply", "skip", "human_review", "report"];
const styles: { value: ReplyStyle; label: string }[] = [
  { value: "warm", label: "Życzliwy" },
  { value: "concise", label: "Zwięzły" },
  { value: "professional", label: "Profesjonalny" },
];

function asError(body: unknown, fallback: string) {
  return body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : fallback;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(asError(body, `Żądanie nie powiodło się (${response.status}).`));
  return body as T;
}

function stars(rating: number) { return `${"★".repeat(Math.max(0, Math.min(5, rating)))}${"☆".repeat(Math.max(0, 5 - rating))}`; }
function dateLabel(review: Review) {
  if (review.publishedAtLabel) return review.publishedAtLabel;
  if (!review.publishedAt) return "Data niedostępna";
  const date = new Date(review.publishedAt);
  return Number.isNaN(date.getTime()) ? "Data niedostępna" : new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(date);
}

export default function Workspace() {
  const [workspace, setWorkspace] = useState<ProductWorkspace | null>(null);
  const [configuration, setConfiguration] = useState<ProductConfiguration | null>(null);
  const [assessmentSummary, setAssessmentSummary] = useState<WorkspaceResponse["assessmentSummary"]>();
  const [url, setUrl] = useState("");
  const [limit, setLimit] = useState(50);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const photoTrigger = useRef<HTMLElement | null>(null);
  const photoDialog = useRef<HTMLDivElement | null>(null);
  const attemptedPolicyRefresh = useRef(false);
  const [draft, setDraft] = useState<{ reviewId: string; text: string; context: string; style: ReplyStyle }>({ reviewId: "", text: "", context: "", style: "warm" });
  const [backtest, setBacktest] = useState<{ evaluated: number; labelled: number; missingAssessments: number; accuracy: number | null; actions: ReviewAction[]; matrix: number[][]; perAction: { action: ReviewAction; precision: number | null; recall: number | null; support: number }[] } | null>(null);

  const applyResponse = useCallback((data: WorkspaceResponse) => {
    setWorkspace(data.workspace);
    setConfiguration(data.configuration);
    setAssessmentSummary(data.assessmentSummary);
    setSelectedId((current) => current && data.workspace.snapshot?.reviews.some((review) => review.id === current) ? current : data.workspace.snapshot?.reviews[0]?.id ?? "");
  }, []);

  useEffect(() => {
    let active = true;
    request<WorkspaceResponse>("/api/product/workspace").then(async (data) => {
      if (!active) return;
      applyResponse(data);
      if (data.assessmentSummary?.status === "partial" && data.configuration.aiConfigured && data.workspace.snapshot && !attemptedPolicyRefresh.current) {
        attemptedPolicyRefresh.current = true;
        setBusy("assess");
        try {
          const refreshed = await request<WorkspaceResponse>("/api/product/assess", { method: "POST", body: "{}" });
          if (active) applyResponse(refreshed);
        } catch (e) { if (active) setError(e instanceof Error ? e.message : "Nie udało się dokończyć oceny opinii."); }
        finally { if (active) setBusy(""); }
      }
    }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Nie udało się wczytać przestrzeni."); });
    return () => { active = false; };
  }, [applyResponse]);

  const snapshot = workspace?.snapshot ?? null;
  const reviews = useMemo(() => snapshot?.reviews ?? [], [snapshot?.reviews]);
  const selected = reviews.find((review) => review.id === selectedId) ?? null;
  const photos = selected?.media.filter((media) => media.type !== "video") ?? [];
  const assessment = selected ? workspace?.assessments[selected.id] : undefined;
  const suggestion = selected ? workspace?.replies[selected.id] : undefined;
  const replyDraft = draft.reviewId === selectedId ? draft : { reviewId: selectedId, text: suggestion?.text ?? "", context: suggestion?.managerContext ?? "", style: suggestion?.style ?? "warm" as ReplyStyle };
  const labelledCount = Object.keys(workspace?.labels ?? {}).length;
  const assessedCount = Object.keys(workspace?.assessments ?? {}).length;
  const filtered = useMemo(() => reviews.filter((review) => {
    const action = workspace?.assessments[review.id]?.action;
    return (filterAction === "all" || action === filterAction) && (filterRating === "all" || review.rating === Number(filterRating));
  }), [reviews, workspace, filterAction, filterRating]);
  const counts = useMemo(() => actions.reduce((acc, action) => {
    acc[action] = reviews.filter((review) => workspace?.assessments[review.id]?.action === action).length;
    return acc;
  }, {} as Record<ReviewAction, number>), [reviews, workspace]);
  const selectedIndex = filtered.findIndex((review) => review.id === selectedId);
  function changeFilter(action: string, rating: string) {
    setFilterAction(action);
    setFilterRating(rating);
    const matches = reviews.filter((review) => (action === "all" || workspace?.assessments[review.id]?.action === action) && (rating === "all" || review.rating === Number(rating)));
    if (!matches.some((review) => review.id === selectedId)) setSelectedId(matches[0]?.id ?? "");
  }

  useEffect(() => {
    if (photoIndex === null) return;
    photoDialog.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPhotoIndex(null);
      if (event.key === "ArrowLeft") setPhotoIndex((index) => index === null || !photos.length ? null : (index + photos.length - 1) % photos.length);
      if (event.key === "ArrowRight") setPhotoIndex((index) => index === null || !photos.length ? null : (index + 1) % photos.length);
      if (event.key === "Tab" && photoDialog.current) {
        const controls = [...photoDialog.current.querySelectorAll<HTMLButtonElement>("button")];
        if (!controls.length) { event.preventDefault(); photoDialog.current.focus(); }
        else if (event.shiftKey && (document.activeElement === controls[0] || document.activeElement === photoDialog.current)) { event.preventDefault(); controls[controls.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [photoIndex, photos.length]);

  useEffect(() => {
    if (photoIndex !== null) return;
    photoTrigger.current?.focus();
    photoTrigger.current = null;
  }, [photoIndex]);

  async function run(label: string, work: () => Promise<WorkspaceResponse>) {
    setBusy(label); setError(""); setNotice("");
    if (label === "assess" || label === "import") setBacktest(null);
    try {
      applyResponse(await work());
      if (label === "import") setDraft({ reviewId: "", text: "", context: "", style: "warm" });
    }
    catch (e) {
      setError(e instanceof Error ? e.message : "Wystąpił nieoczekiwany błąd.");
      try { applyResponse(await request<WorkspaceResponse>("/api/product/workspace")); } catch { /* Keep the original operation error visible. */ }
    }
    finally { setBusy(""); }
  }
  function fillExample() { setUrl("https://maps.app.goo.gl/iiTFPteqkQf545PH8"); }
  function importReviews(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("import", () => request("/api/product/import", { method: "POST", body: JSON.stringify({ url: url.trim(), limit }) }));
  }
  function assess(reviewId?: string) {
    if (!configuration?.aiConfigured) return;
    void run("assess", () => request("/api/product/assess", { method: "POST", body: JSON.stringify(reviewId ? { reviewId } : {}) }));
  }
  async function generateReply() {
    if (!selected || !configuration?.aiConfigured || !assessment || !["reply", "human_review"].includes(assessment.action) || (assessment.signals.needsContext && !replyDraft.context.trim())) return;
    setBusy("reply"); setError(""); setNotice("");
    try {
      const data = await request<WorkspaceResponse>("/api/product/reply", { method: "POST", body: JSON.stringify({ reviewId: selected.id, managerContext: replyDraft.context, style: replyDraft.style }) });
      applyResponse(data);
      const saved = data.workspace.replies[selected.id];
      setDraft({ reviewId: selected.id, text: saved?.text ?? "", context: saved?.managerContext ?? replyDraft.context, style: saved?.style ?? replyDraft.style });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Wystąpił nieoczekiwany błąd.");
      try { applyResponse(await request<WorkspaceResponse>("/api/product/workspace")); } catch { /* Keep the original operation error visible. */ }
    } finally { setBusy(""); }
  }
  async function saveReview(changes: { replyText?: string; label?: ReviewAction | null }) {
    if (!selected) return;
    setBusy("save"); setError(""); setNotice("");
    if (changes.label !== undefined) setBacktest(null);
    try { applyResponse(await request("/api/product/review", { method: "PATCH", body: JSON.stringify({ reviewId: selected.id, ...changes }) })); setNotice(changes.label !== undefined ? "Zapisano etykietę referencyjną." : "Zapisano odpowiedź."); }
    catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się zapisać zmian.");
      try { applyResponse(await request<WorkspaceResponse>("/api/product/workspace")); } catch { /* Keep the original operation error visible. */ }
    }
    finally { setBusy(""); }
  }
  async function runBacktest() {
    setBusy("backtest"); setError(""); setNotice("");
    try { const result = await request<{ report: NonNullable<typeof backtest> }>("/api/product/backtest", { method: "POST", body: "{}" }); setBacktest(result.report); }
    catch (e) { setError(e instanceof Error ? e.message : "Nie udało się policzyć wyników."); }
    finally { setBusy(""); }
  }

  return <div className={prototypeStyles.prototypeRoot}><main className="desk">
    <header className="topbar">
      <a className="wordmark" href="/pl" aria-label="ReviewGuard — strona główna"><span className="brand-mark">RG</span><span>ReviewGuard</span></a>
      <div className="topbar-right">{snapshot && <div aria-live="polite" className="header-signal"><strong>{counts.reply + counts.human_review}</strong><span>Do odpowiedzi lub uwagi</span></div>}<span className="prototype-tag"><i /> {snapshot ? snapshot.location.name : "PROTOTYP LIVE"}</span><a href="/api/product/export" className="export-link">Eksportuj dane <span aria-hidden="true">↗</span></a></div>
    </header>

    {!snapshot && <section className="intro">
      <div><p className="eyebrow">PRZEGLĄD LOKALIZACJI</p><h1>Twoja kolejka opinii</h1><p className="intro-sub">Importuj publiczne opinie z Google Maps i zdecyduj, które wymagają działania.</p></div>
    </section>}

    {configuration && !configuration.aiConfigured && <aside className="setup-banner"><span className="setup-icon">i</span><div><strong>Analiza i propozycje są wyłączone</strong><p>Skonfiguruj dostęp do AI na serwerze, aby oceniać opinie i tworzyć szkice. Import, etykiety i eksport pozostają dostępne.</p></div><span className="setup-state">BRAK KONFIGURACJI</span></aside>}
    {error && <div className="message error" role="alert"><strong>Nie udało się wykonać tej czynności.</strong><span>{error}</span><button onClick={() => setError("")} aria-label="Zamknij komunikat">×</button></div>}
    {busy === "import" && <p role="status" className="coverage-note">Importujemy opinie i oceniamy…</p>}
    {snapshot && assessmentSummary?.status === "complete" && assessmentSummary.message && <p className="coverage-note" role="alert">Podczas oceny wystąpił problem. Zachowano zapisane oceny. {assessmentSummary.message}</p>}
    {snapshot && assessmentSummary?.status === "partial" && <p className="coverage-note" role="status">Oceniono {assessmentSummary.assessed} z {assessmentSummary.total} opinii. {assessmentSummary.failed ? `${assessmentSummary.failed} nie udało się ocenić.` : ""} {assessmentSummary.message ?? "Możesz ponowić ocenę pozostałych opinii."}</p>}
    {snapshot && assessmentSummary?.status === "unavailable" && <p className="coverage-note" role="status">Opinie zostały zaimportowane. Automatyczna ocena jest obecnie niedostępna{assessmentSummary.message ? `: ${assessmentSummary.message}` : "."}</p>}
    {notice && <div className="message success" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Zamknij komunikat">×</button></div>}

    {!snapshot ? <section className="import-card">
      <div className="import-illustration" aria-hidden="true"><div className="pin">⌖</div><div className="map-line one"/><div className="map-line two"/><div className="map-dot"/></div>
      <div className="import-copy"><p className="eyebrow">ZACZNIJ OD LOKALIZACJI</p><h2>Opinie, które czekają na reakcję.</h2><p>Wklej link do profilu Google Maps. Pobierzemy dostępną próbkę i pokażemy, jakie dane udało się uzyskać.</p>
        <form className="import-form" onSubmit={importReviews}><label htmlFor="place-url">Link do lokalizacji</label><div className="url-row"><input id="place-url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://maps.app.goo.gl/…" /><button className="primary" disabled={!!busy}>{busy === "import" ? <><span className="spinner"/> Importuję…</> : <>Importuj opinie <span aria-hidden="true">→</span></>}</button></div>
          <div className="import-options"><label htmlFor="review-limit">Liczba opinii</label><select id="review-limit" value={limit} onChange={(e) => setLimit(Number(e.target.value))}><option value={50}>50 — domyślnie</option><option value={100}>100</option><option value={200}>200 — maksymalnie</option></select><span>Import preferuje najnowsze opinie; kolejność zapisujemy wraz z próbką.</span></div>
        </form><button type="button" className="text-button" onClick={fillExample}>Wstaw przykładowy link</button><p className="source-note">Import nie weryfikuje własności profilu ani nie publikuje odpowiedzi.</p>
      </div>
    </section> : <>
      <div className="workspace-meta"><span><strong>{snapshot.location.name}</strong> · {snapshot.location.address ?? "Adres niedostępny"}</span><span>Import: {new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.importedAt))} · {assessedCount}/{reviews.length} ocenionych · {labelledCount} etykiet</span><button className="text-button" onClick={() => { setWorkspace(null); setBacktest(null); }}>Nowy import</button></div>
      {!snapshot.coverage.complete && <p className="coverage-note"><strong>Niepełny import.</strong> Pobrano {snapshot.coverage.importedCount} z maksymalnie {snapshot.coverage.requestedLimit} opinii. {snapshot.coverage.stopReason}</p>}

      <section className="queue-section">
        {assessmentSummary?.status === "partial" && <div className="retry-row"><span className="eyebrow">NIEPEŁNA OCENA · {assessedCount}/{reviews.length}</span><button className="text-button assess-all" disabled={!configuration?.aiConfigured || !!busy || assessedCount === reviews.length} onClick={() => assess()}>{busy === "assess" ? "Analizuję…" : "Ponów ocenę pozostałych"}</button></div>}
        <div className="action-summary"><button className={`action-count ${filterAction === "all" ? "active" : ""}`} onClick={() => changeFilter("all", filterRating)}>Wszystkie</button>{actions.map((action) => <button key={action} className={`action-count ${filterAction === action ? "active" : ""} action-${action}`} onClick={() => changeFilter(action, filterRating)}><span>{counts[action]}</span>{actionShort[action]}</button>)}</div>
        <div className="workspace-grid">
          <aside className="review-list" aria-label="Lista opinii">
            <div className="list-toolbar"><span>{filtered.length} OPINII</span><label htmlFor="rating-filter" className="sr-only">Filtruj według oceny</label><select id="rating-filter" value={filterRating} onChange={(e) => changeFilter(filterAction, e.target.value)}><option value="all">Każda ocena</option>{[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} {n === 1 ? "gwiazdka" : "gwiazdki"}</option>)}</select></div>
            {filtered.length ? <ul>{filtered.map((review) => {
              const item = workspace?.assessments[review.id];
              return <li key={review.id}><button className={`review-row ${selectedId === review.id ? "selected" : ""}`} onClick={() => setSelectedId(review.id)} aria-current={selectedId === review.id ? "true" : undefined}><div className="review-row-top"><span className="rating">{stars(review.rating)}</span><time>{dateLabel(review)}</time></div><strong>{review.author ?? "Autor nieznany"}</strong><span className="review-excerpt">{review.text || review.title || "Opinia bez treści"}</span><span className={`action-pill ${item ? `pill-${item.action}` : "pill-new"}`}>{item ? actionShort[item.action] : "Nieoceniona"}{item?.signals.needsContext && <span title="Wymaga kontekstu"> · kontekst</span>}</span></button></li>;
            })}</ul> : <div className="list-empty">Brak opinii spełniających wybrane filtry.</div>}
          </aside>
          <article className="review-detail" aria-label="Szczegóły wybranej opinii">
            {selected ? <>
              <div className="detail-navigation"><button className="outline-button small" disabled={selectedIndex <= 0} onClick={() => setSelectedId(filtered[selectedIndex - 1].id)}>← Poprzednia opinia</button><span>{selectedIndex + 1} / {filtered.length}</span><button className="outline-button small" disabled={selectedIndex < 0 || selectedIndex >= filtered.length - 1} onClick={() => setSelectedId(filtered[selectedIndex + 1].id)}>Następna opinia →</button></div>
              <div className="detail-top"><div><span className="rating detail-stars">{stars(selected.rating)}</span><span className="detail-date">{dateLabel(selected)}</span></div><a href={selected.sourceUrl ?? snapshot.location.sourceUrl} target="_blank" rel="noreferrer">Otwórz źródło ↗</a></div>
              <div className="reviewer"><div className="avatar" aria-hidden="true">{(selected.author ?? "?").slice(0,1).toLocaleUpperCase()}</div><div><strong>{selected.author ?? "Autor nieznany"}</strong><span>{selected.language ? `Język: ${selected.language}` : "Język nieokreślony"}</span></div><button className="single-assess" disabled={!configuration?.aiConfigured || !!busy} onClick={() => assess(selected.id)}>{busy === "assess" ? "Analiza…" : "Oceń ponownie"}</button></div>
              {selected.title && <h3 className="review-title">{selected.title}</h3>}
              <p className="review-fulltext">{selected.text || "Autor nie dodał treści do tej opinii."}</p>
              {!!selected.media.length && <div className="media-grid" aria-label="Zdjęcia i materiały opinii">{selected.media.map((media, index) => {
                const key = `${media.url}-${index}`;
                if (media.type === "video") return <a className="video-link" href={media.url} target="_blank" rel="noreferrer" key={key}>▶ Materiał wideo {index + 1}</a>;
                const imageIndex = photos.findIndex((photo) => photo.url === media.url);
                // eslint-disable-next-line @next/next/no-img-element -- Source media URLs are arbitrary; keep original images direct and unoptimized.
                return <button className="photo-thumb" type="button" key={key} onClick={(event) => { photoTrigger.current = event.currentTarget; setPhotoIndex(imageIndex); }} aria-label={`Powiększ zdjęcie ${imageIndex + 1}`}><img src={media.url} alt={media.caption || `Materiał ${index + 1} dodany do opinii`} loading="lazy"/></button>;
              })}</div>}
              {selected.ownerReply && <div className="owner-reply"><span>DOTYCHCZASOWA ODPOWIEDŹ LOKALIZACJI {selected.ownerReply.publishedAt && `· ${dateLabel({ ...selected, publishedAt: selected.ownerReply.publishedAt, publishedAtLabel: null })}`}</span><p>{selected.ownerReply.text}</p></div>}
              <div className="assessment-panel"><div className="panel-title"><span>OCENA NASTĘPNEJ CZYNNOŚCI</span>{assessment && <span className={`action-pill pill-${assessment.action}`}>{actionLabels[assessment.action]}</span>}</div>
                {!assessment ? <p className="unassessed">Ta opinia nie została jeszcze oceniona. Ocena wskaże możliwy następny krok i kryteria, które na niego wpłynęły.</p> : <><div className="assessment-reasons"><p>{assessment.reasons.length ? "Powody rekomendacji" : "Nie podano szczegółowych powodów."}</p><ul>{assessment.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></div><div className="signals">{assessment.signals.shouldReply && <span className="signal">Warto odpowiedzieć</span>}{assessment.signals.needsContext && <span className="signal caution">Potrzebny kontekst</span>}{assessment.signals.potentialViolation && <span className="signal caution">Możliwy problem z zasadami{assessment.signals.violationCategory ? ` · ${assessment.signals.violationCategory}` : ""}</span>}{!assessment.signals.shouldReply && !assessment.signals.needsContext && !assessment.signals.potentialViolation && <span className="signal">Brak dodatkowych sygnałów</span>}</div><div className="uncertainty">{assessment.confidence == null ? "Sygnał modelu: niepodany" : `Sygnał modelu: ${Math.round(assessment.confidence * 100)}%`}<span> · Rekomendacja wymaga ludzkiej decyzji.</span><small>{assessment.model} · zasady {assessment.policyVersion}</small></div></>}
              </div>
            </> : <div className="detail-empty"><div className="empty-orbit">✳</div><strong>Wybierz opinię z kolejki</strong><p>Szczegóły i rekomendacja pojawią się w tym panelu.</p></div>}
          </article>
          <aside className="reply-column" aria-label="Propozycja odpowiedzi i etykieta">
            {selected && assessment && ["reply", "human_review"].includes(assessment.action) ? <section className="reply-panel"><div className="panel-title"><span>PROPOZYCJA ODPOWIEDZI</span>{suggestion && <span className="suggestion-model">{suggestion.model}</span>}</div>
              <label htmlFor="manager-context">Kontekst od osoby zarządzającej <span>{assessment.signals.needsContext ? "Wymagany dla tej opinii; podaj tylko potwierdzone fakty." : "Opcjonalna, krótka informacja o faktach spoza opinii"}</span></label><textarea id="manager-context" rows={2} value={replyDraft.context} onChange={(e) => setDraft({ ...replyDraft, context: e.target.value })} placeholder="Podaj wyłącznie fakty, które można bezpiecznie uwzględnić…" />
              <div className="reply-controls"><span className="reply-control-label">Styl odpowiedzi</span><div className="style-options">{styles.map((option) => <button key={option.value} type="button" aria-pressed={replyDraft.style === option.value} onClick={() => setDraft({ ...replyDraft, style: option.value })}>{option.label}</button>)}</div><button className="primary generate" disabled={!configuration?.aiConfigured || !!busy || (assessment.signals.needsContext && !replyDraft.context.trim())} onClick={generateReply}>{busy === "reply" ? <><span className="spinner"/> Tworzę…</> : suggestion ? "Wygeneruj ponownie" : "Utwórz propozycję"}</button></div>
              <label className="reply-text-label" htmlFor="reply-text">Treść odpowiedzi</label><textarea id="reply-text" className="reply-text" rows={5} value={replyDraft.text} onChange={(e) => setDraft({ ...replyDraft, text: e.target.value })} placeholder="Propozycja pojawi się tutaj. Każda odpowiedź wymaga sprawdzenia i ręcznej publikacji." />
              <div className="reply-footer"><span>{suggestion ? `Wersja z ${new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeStyle: "short" }).format(new Date(suggestion.generatedAt))}` : "Brak zapisanej propozycji"}</span><div><button className="outline-button small" disabled={!replyDraft.text.trim() || !!busy} onClick={async () => { try { await navigator.clipboard.writeText(replyDraft.text); setNotice("Skopiowano odpowiedź. Przed publikacją sprawdź ją w Google."); } catch { setError("Schowek jest niedostępny. Zaznacz i skopiuj tekst ręcznie."); } }}>Kopiuj</button><button className="primary small" disabled={!suggestion || !replyDraft.text.trim() || !!busy} onClick={() => void saveReview({ replyText: replyDraft.text })}>{busy === "save" ? "Zapisuję…" : "Zapisz zmiany"}</button></div></div>
              <p className="human-check">To szkic do sprawdzenia. ReviewGuard nie publikuje odpowiedzi w Google.</p>
            </section> : <div className="reply-empty"><span className="eyebrow">PROPOZYCJA ODPOWIEDZI</span><strong>{assessment ? "Ta opinia nie wymaga odpowiedzi" : "Wybierz opinię z kolejki"}</strong><p>{assessment ? "Zalecanym działaniem jest decyzja zespołu widoczna w rekomendacji." : "Wybierz opinię, aby zobaczyć jej rekomendację i dostępne działania."}</p></div>}
            {selected && <section className="label-panel"><div className="panel-title"><span>ETYKIETA REFERENCYJNA</span><span className="separate-label">ODDZIELNA OD REKOMENDACJI MODELU</span></div><p>Jaką czynność osoba zarządzająca wybrałaby dla tej opinii? Etykiety służą wyłącznie do oceny backtestu.</p><div className="label-buttons">{actions.map((action) => <button key={action} disabled={!!busy} className={workspace?.labels[selected.id] === action ? "chosen" : ""} onClick={() => void saveReview({ label: action })}>{actionShort[action]}</button>)}{workspace?.labels[selected.id] && <button className="clear-label" disabled={!!busy} onClick={() => void saveReview({ label: null })}>Usuń etykietę</button>}</div></section>}
          </aside>
        </div>
      </section>

      <section className="backtest-section"><div className="backtest-copy"><p className="eyebrow">SPRAWDŹ NA SWOICH ETYKIETACH</p><h2>Czy rekomendacje pasują<br/>do decyzji zespołu?</h2><p>Backtest porównuje zapisane rekomendacje z niezależnymi etykietami referencyjnymi. Wynik dotyczy tylko tej oznaczonej próbki.</p><button className="outline-button" onClick={runBacktest} disabled={!!busy}>{busy === "backtest" ? <><span className="spinner"/> Liczę…</> : "Uruchom backtest →"}</button></div>
        {backtest ? <div className="backtest-results"><div className="result-summary"><div><strong>{backtest.labelled}</strong><span>etykiet referencyjnych</span></div><div><strong>{backtest.evaluated}</strong><span>porównanych ocen</span></div><div><strong>{backtest.accuracy == null ? "—" : `${Math.round(backtest.accuracy * 100)}%`}</strong><span>zgodność w tej próbce</span></div></div>{backtest.missingAssessments > 0 && <p className="coverage-note">{backtest.missingAssessments} etykiet nie ma jeszcze odpowiadającej oceny.</p>}<div className="matrix-wrap"><h3>Macierz pomyłek</h3><p>Wiersze: etykiety referencyjne · kolumny: rekomendacje modelu</p><div className="matrix-scroll"><table className="matrix"><thead><tr><th scope="col">Ref. ↓ / Model →</th>{backtest.actions.map((action) => <th key={action} scope="col">{actionShort[action]}</th>)}</tr></thead><tbody>{backtest.actions.map((action, i) => <tr key={action}><th scope="row">{actionShort[action]}</th>{backtest.matrix[i]?.map((value, j) => <td key={j}>{value}</td>)}</tr>)}</tbody></table></div></div><div className="per-action"><h3>Wyniki według czynności</h3><table><thead><tr><th scope="col">Czynność</th><th scope="col">Precyzja</th><th scope="col">Czułość</th><th scope="col">Próba</th></tr></thead><tbody>{backtest.perAction.map((item) => <tr key={item.action}><th scope="row">{actionShort[item.action]}</th><td>{item.precision == null ? "—" : `${Math.round(item.precision * 100)}%`}</td><td>{item.recall == null ? "—" : `${Math.round(item.recall * 100)}%`}</td><td>{item.support}</td></tr>)}</tbody></table></div><p className="backtest-warning">Nie używaj tej samej oznaczonej próbki do dostrajania promptu i końcowej akceptacji modelu. Wynik nie określa jakości poza tym zbiorem.</p></div> : <div className="backtest-placeholder"><span>01 — Zbierz etykiety</span><span>02 — Porównaj rekomendacje</span><span>03 — Oceń macierz</span></div>}</section>
    </>}
    {photoIndex !== null && photos[photoIndex] && <div className="photo-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPhotoIndex(null); }}>
      <div aria-label={`Zdjęcie ${photoIndex + 1} z ${photos.length}`} aria-modal="true" className="photo-dialog" ref={photoDialog} role="dialog" tabIndex={-1}>
        <button className="photo-close" type="button" onClick={() => setPhotoIndex(null)} aria-label="Zamknij zdjęcie">×</button>
        {photos.length > 1 && <button className="photo-nav photo-prev" type="button" onClick={() => setPhotoIndex((photoIndex + photos.length - 1) % photos.length)} aria-label="Poprzednie zdjęcie">←</button>}
        {/* eslint-disable-next-line @next/next/no-img-element -- Source media URLs are arbitrary; keep original images direct and unoptimized. */}
        <img src={photos[photoIndex].url} alt={photos[photoIndex].caption || `Zdjęcie ${photoIndex + 1} dodane do opinii`}/>
        {photos.length > 1 && <button className="photo-nav photo-next" type="button" onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)} aria-label="Następne zdjęcie">→</button>}
        <span className="photo-count">{photoIndex + 1} / {photos.length}</span>
      </div>
    </div>}
    <footer className="footer"><span>ReviewGuard · Przegląd opinii pod kontrolą zespołu</span><span>Import i rekomendacje nie oznaczają publikacji.</span></footer>
  </main></div>;
}
