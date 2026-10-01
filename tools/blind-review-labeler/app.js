import { prepareSource } from "./source-contract.mjs";

const LABELS = new Set(["reply", "skip", "human_review", "report"]);
const STORAGE_PREFIX = "reviewguard-blind-labels-v1:";
const elements = Object.fromEntries(["sourceFile", "loadPanel", "loadHint", "workspace", "changeSource", "progressCount", "progressTotal", "progressBar", "progressCaption", "coverage", "filter", "exportLabels", "importLabels", "labelsFile", "emptyState", "reviewCard", "reviewIndex", "reviewLocation", "reviewLocationAddress", "reviewDate", "reviewRating", "reviewer", "reviewId", "reviewTitle", "reviewText", "reviewMediaBlock", "reviewMedia", "ownerResponseBlock", "ownerResponse", "savedMark", "reason", "split", "previous", "next", "saveStatus", "notice"].map(id => [id, document.getElementById(id)]));
let dataset = null;
let currentIndex = 0;
let labels = Object.create(null);
let noticeTimer;

async function prepareDataset(parsed, fileName) {
  return { ...await prepareSource(parsed), fileName };
}

function showNotice(message, error = false) {
  clearTimeout(noticeTimer);
  elements.notice.textContent = message;
  elements.notice.classList.toggle("error", error);
  elements.notice.classList.remove("hidden");
  noticeTimer = setTimeout(() => elements.notice.classList.add("hidden"), 4400);
}

function storageKey() { return STORAGE_PREFIX + dataset.datasetHash; }

function exportRecord() {
  return { version: 1, datasetHash: dataset.datasetHash, labels: Object.values(labels).map(({ reviewId, sourceFingerprint, label, reason, split }) => ({ reviewId, fingerprint: sourceFingerprint, action: label, split, reason })) };
}

function persist() {
  if (!dataset) return;
  try {
    localStorage.setItem(storageKey(), JSON.stringify(exportRecord()));
    elements.saveStatus.textContent = "Zapisano lokalnie";
    elements.saveStatus.classList.remove("error");
  } catch {
    elements.saveStatus.textContent = "Brak miejsca na zapis";
    elements.saveStatus.classList.add("error");
    showNotice("Nie udało się zapisać lokalnie. Wyeksportuj etykiety, aby zachować postęp.", true);
  }
}

function currentReview() { return dataset?.reviews[currentIndex]; }

function availableReviews() {
  const filter = elements.filter.value;
  return dataset.reviews.map((review, index) => ({ review, index })).filter(({ review }) =>
    filter === "all" || (filter === "unlabeled" ? !labels[review.id] : Boolean(labels[review.id]))
  );
}

function renderCoverage() {
  const counts = { reply: 0, skip: 0, human_review: 0, report: 0, unlabeled: 0 };
  for (const review of dataset.reviews) {
    const label = labels[review.id]?.label;
    if (LABELS.has(label)) counts[label] += 1;
    else counts.unlabeled += 1;
  }
  const rows = [["Odpowiedzieć", counts.reply], ["Pominąć", counts.skip], ["Sprawdzić ręcznie", counts.human_review], ["Zgłosić", counts.report], ["Bez etykiety", counts.unlabeled]];
  elements.coverage.innerHTML = rows.map(([name, count]) => `<div class="coverage-row"><span><i></i>${name}</span><b>${count}</b></div>`).join("");
}

function render() {
  if (!dataset) return;
  const filter = elements.filter.value;
  const available = availableReviews();
  const found = available.findIndex(item => item.index === currentIndex);
  if (found < 0 && available.length) currentIndex = available[0].index;
  const position = available.findIndex(item => item.index === currentIndex);
  const review = position >= 0 ? available[position].review : undefined;
  const completed = Object.keys(labels).filter(id => LABELS.has(labels[id]?.label)).length;
  elements.progressCount.textContent = String(completed);
  elements.progressTotal.textContent = `/ ${dataset.reviews.length}`;
  elements.progressBar.style.width = `${Math.round(completed / dataset.reviews.length * 100)}%`;
  elements.progressCaption.textContent = completed === dataset.reviews.length ? "Etykietowanie zakończone" : `${dataset.reviews.length - completed} opinii czeka na etykietę`;
  elements.exportLabels.disabled = completed === 0;
  renderCoverage();
  elements.previous.disabled = !review || position === 0;
  const hasNext = Boolean(review && position < available.length - 1);
  const currentIsLabeled = Boolean(review && labels[review.id]);
  elements.next.disabled = !hasNext || filter === "unlabeled" || !currentIsLabeled;
  elements.next.textContent = filter === "unlabeled"
    ? "Oznacz, aby przejść →"
    : !hasNext
      ? "Koniec listy"
      : currentIsLabeled ? "Zapisz i dalej →" : "Wybierz etykietę →";
  elements.emptyState.classList.toggle("hidden", Boolean(review));
  elements.reviewCard.classList.toggle("hidden", !review);
  if (!review) return;
  elements.reviewIndex.textContent = `OPINIA ${String(currentIndex + 1).padStart(2, "0")} / ${dataset.reviews.length}`;
  elements.reviewLocation.textContent = review.location;
  elements.reviewLocationAddress.textContent = review.locationAddress;
  elements.reviewLocationAddress.classList.toggle("hidden", !review.locationAddress || review.locationAddress === review.location);
  elements.reviewDate.textContent = review.date;
  const rating = Number(review.rating);
  elements.reviewRating.textContent = review.rating !== "" && Number.isInteger(rating) && rating >= 1 && rating <= 5 ? `${"★".repeat(rating).padEnd(5, "☆")}` : "Ocena niepodana";
  elements.reviewer.textContent = review.reviewer;
  elements.reviewId.textContent = `ID ${review.id}`;
  elements.reviewText.textContent = review.text || "Opinia bez treści tekstowej.";
  elements.reviewTitle.textContent = review.title;
  elements.reviewTitle.classList.toggle("hidden", !review.title);
  elements.reviewMedia.replaceChildren();
  for (const item of review.media) {
    const line = document.createElement("p");
    line.textContent = [item.caption, item.type, item.reference].filter(Boolean).join(" · ");
    elements.reviewMedia.append(line);
  }
  elements.reviewMediaBlock.classList.toggle("hidden", review.media.length === 0);
  elements.ownerResponse.textContent = review.ownerResponse;
  elements.ownerResponseBlock.classList.toggle("hidden", !review.ownerResponse);
  const saved = labels[review.id];
  document.querySelectorAll(".label-option").forEach(button => button.classList.toggle("selected", button.dataset.label === saved?.label));
  elements.reason.value = saved?.reason ?? "";
  elements.split.value = saved?.split ?? "";
  elements.savedMark.textContent = saved ? "ZAPISANO" : "";
}

function saveCurrent(label) {
  const review = currentReview();
  if (!review || !LABELS.has(label)) return;
  if (!["development", "held_out"].includes(elements.split.value)) {
    showNotice("Najpierw wybierz podział dla tej opinii.", true);
    elements.split.focus();
    return;
  }
  const previousPosition = availableReviews().findIndex(item => item.index === currentIndex);
  labels[review.id] = { reviewId: review.id, sourceFingerprint: review.sourceFingerprint, label, reason: elements.reason.value.trim(), split: elements.split.value };
  if (elements.filter.value === "unlabeled") {
    const remaining = availableReviews();
    const nextPosition = Math.min(Math.max(previousPosition, 0), remaining.length - 1);
    if (remaining.length) currentIndex = remaining[nextPosition].index;
  }
  persist();
  render();
}

function setDataset(next) {
  dataset = next;
  currentIndex = 0;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey()) ?? "null");
    labels = stored ? validateLabels(stored, dataset) : Object.create(null);
  } catch (error) {
    labels = Object.create(null);
    showNotice(`Zapis dla tej próbki odrzucono: ${error.message}`, true);
  }
  elements.workspace.classList.remove("hidden");
  elements.loadPanel.classList.add("hidden");
  elements.loadHint.classList.add("hidden");
  render();
}

function validateLabels(data, sourceDataset) {
  if (!data || typeof data !== "object" || Array.isArray(data) || data.version !== 1 || data.datasetHash !== sourceDataset.datasetHash || !Array.isArray(data.labels)) throw new Error("Etykiety mają inną próbkę źródłową albo nieobsługiwaną wersję.");
  const reviewById = new Map(sourceDataset.reviews.map(review => [review.id, review]));
  const result = Object.create(null);
  for (const entry of data.labels) {
    if (!entry || typeof entry.reviewId !== "string" || !LABELS.has(entry.action) || !["development", "held_out"].includes(entry.split)) throw new Error("Plik zawiera niepoprawną etykietę.");
    const review = reviewById.get(entry.reviewId);
    if (!review || entry.fingerprint !== review.sourceFingerprint) throw new Error(`Nie pasuje źródło opinii ${entry.reviewId}.`);
    if (result[entry.reviewId]) throw new Error(`Powtórzona etykieta dla opinii ${entry.reviewId}.`);
    result[entry.reviewId] = { reviewId: entry.reviewId, sourceFingerprint: entry.fingerprint, label: entry.action, reason: typeof entry.reason === "string" ? entry.reason : "", split: entry.split };
  }
  return result;
}

async function readJson(file) {
  try { return JSON.parse(await file.text()); }
  catch { throw new Error("Plik nie zawiera poprawnego JSON."); }
}

elements.sourceFile.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try { setDataset(await prepareDataset(await readJson(file), file.name)); showNotice(`Wczytano ${dataset.reviews.length} opinii. Możesz wznowić etykietowanie.`); }
  catch (error) { showNotice(error.message, true); }
  event.target.value = "";
});

elements.changeSource.addEventListener("click", () => { elements.workspace.classList.add("hidden"); elements.loadPanel.classList.remove("hidden"); elements.loadHint.classList.remove("hidden"); });
document.querySelectorAll(".label-option").forEach(button => button.addEventListener("click", () => saveCurrent(button.dataset.label)));
elements.reason.addEventListener("change", () => { const saved = labels[currentReview()?.id]; if (saved) saveCurrent(saved.label); });
elements.split.addEventListener("change", () => { const saved = labels[currentReview()?.id]; if (saved && ["development", "held_out"].includes(elements.split.value)) saveCurrent(saved.label); });
elements.next.addEventListener("click", () => {
  const available = availableReviews();
  const position = available.findIndex(item => item.index === currentIndex);
  if (position < 0 || !labels[currentReview()?.id]) return;
  if (elements.filter.value === "unlabeled") return;
  if (position < available.length - 1) currentIndex = available[position + 1].index;
  render();
});
elements.previous.addEventListener("click", () => {
  const available = availableReviews();
  const position = available.findIndex(item => item.index === currentIndex);
  if (position > 0) currentIndex = available[position - 1].index;
  render();
});
elements.filter.addEventListener("change", () => { currentIndex = 0; render(); });
elements.exportLabels.addEventListener("click", () => {
  const output = exportRecord();
  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob); anchor.download = "reviewguard-reference-labels.json"; anchor.click(); URL.revokeObjectURL(anchor.href);
});
elements.importLabels.addEventListener("click", () => elements.labelsFile.click());
elements.labelsFile.addEventListener("change", async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try { labels = validateLabels(await readJson(file), dataset); persist(); render(); showNotice(`Wznowiono zapis: ${Object.keys(labels).length} etykiet.`); }
  catch (error) { showNotice(`Nie zaimportowano etykiet: ${error.message}`, true); }
  event.target.value = "";
});

if (!globalThis.crypto?.subtle) showNotice("Ta przeglądarka wymaga bezpiecznego kontekstu localhost.", true);
