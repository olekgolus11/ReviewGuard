import type { ReviewAction, ReviewAssessment, Review, Location } from "./types";

export const CLASSIFIER_MODEL = "typesafe-ai/jev";
export const REPLY_MODEL = "openai/gpt-6-luna";
export const POLICY_VERSION = "live-review-2026-10-01";

// These are conservative prototype routing thresholds, not measured accuracy.
export const DECISION_THRESHOLDS = {
  action: 0.68,
  margin: 0.15,
  signal: 0.7,
  seriousIncident: 0.55,
} as const;

export const ACTIONS: readonly ReviewAction[] = ["reply", "skip", "human_review", "report"];

const violationCategoryLabels: Record<string, string> = {
  spam: "spam lub reklamę",
  harassment: "nękanie lub groźby",
  privacy: "ujawnienie danych prywatnych",
  unrelated: "treść niezwiązaną z lokalizacją",
  other: "inny możliwy problem z zasadami",
};

export function assessmentReasons(input: {
  action: ReviewAction;
  needsContext: boolean;
  potentialViolation: boolean;
  shouldReply: boolean;
  seriousIncident: boolean;
  hasText: boolean;
  existingReply: boolean;
  violationCategory: string | null;
}): string[] {
  const reasons: string[] = [];
  if (input.existingReply) reasons.push("Opinia ma już publiczną odpowiedź właściciela.");
  if (input.potentialViolation) {
    reasons.push(input.violationCategory
      ? `Możliwy problem z zasadami: ${violationCategoryLabels[input.violationCategory] ?? "nieokreślony typ"}. Sprawdź treść przed rozważeniem zgłoszenia.`
      : "Możliwy problem z zasadami. Człowiek powinien sprawdzić dowody przed rozważeniem zgłoszenia.");
  }
  if (input.needsContext) reasons.push("Opinia wymaga faktów lub kontekstu od właściciela lokalizacji.");
  if (input.seriousIncident) reasons.push("Opinia opisuje potencjalnie poważny incydent wymagający uwagi człowieka.");
  if (!input.hasText) reasons.push("Opinia nie zawiera tekstu, do którego można się odnieść.");
  if (input.action === "reply" && input.shouldReply && input.hasText) reasons.push("Opinia zawiera pytanie, konkretny opis doświadczenia lub przydatną uwagę, do której warto się odnieść.");
  if (input.action === "skip" && !input.existingReply && input.hasText) reasons.push("Według ocenionych kryteriów odpowiedź nie wniesie użytecznej informacji.");
  if (input.action === "report" && !input.potentialViolation) reasons.push("Model wskazał sprawdzenie pod kątem naruszenia, ale sygnał jest słaby. Zweryfikuj treść przed ewentualnym zgłoszeniem.");
  if (reasons.length === 0) {
    const actionReason: Record<ReviewAction, string> = {
      reply: input.shouldReply
        ? "Klasyfikacja wskazuje przygotowanie odpowiedzi. Sprawdź, czy będzie przydatna dla klienta."
        : "Klasyfikacja wskazuje przygotowanie odpowiedzi mimo słabego sygnału jej przydatności. Zweryfikuj decyzję przed użyciem sugestii.",
      skip: "Klasyfikacja wskazuje pominięcie tej opinii.",
      human_review: "Wynik klasyfikacji wymaga sprawdzenia przez człowieka.",
      report: "Klasyfikacja wskazuje możliwe naruszenie. Sprawdź treść i dowody przed ewentualnym zgłoszeniem.",
    };
    reasons.push(actionReason[input.action]);
  }
  return reasons;
}

export function validateReviewInput(review: Review, location: Location): void {
  if (!review.id || !location.id || !location.name) throw new Error("Do oceny AI wymagane są identyfikatory opinii i lokalizacji oraz jej nazwa.");
  if (!Number.isFinite(review.rating) || review.rating < 1 || review.rating > 5) throw new Error("Ocena opinii musi mieścić się w zakresie od 1 do 5 gwiazdek.");
  if (review.text.length > 8_000) throw new Error("Tekst opinii przekracza limit 8 000 znaków obsługiwany przez AI.");
}

export function createAssessment(params: {
  review: Review;
  action: ReviewAction;
  confidence: number | null;
  needsContext: boolean;
  potentialViolation: boolean;
  violationCategory: string | null;
  shouldReply: boolean;
  seriousIncident: boolean;
}): ReviewAssessment {
  const { review } = params;
  return {
    reviewId: review.id,
    action: params.action,
    reasons: assessmentReasons({
      action: params.action,
      needsContext: params.needsContext,
      potentialViolation: params.potentialViolation,
      shouldReply: params.shouldReply,
      seriousIncident: params.seriousIncident,
      hasText: review.text.trim().length > 0,
      existingReply: Boolean(review.ownerReply?.text.trim()),
      violationCategory: params.violationCategory,
    }),
    signals: {
      needsContext: params.needsContext,
      potentialViolation: params.potentialViolation,
      violationCategory: params.potentialViolation ? params.violationCategory : null,
      shouldReply: params.shouldReply,
    },
    confidence: params.confidence,
    model: CLASSIFIER_MODEL,
    policyVersion: POLICY_VERSION,
    assessedAt: new Date().toISOString(),
  };
}
