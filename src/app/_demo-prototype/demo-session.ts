import type {
  DemoLocale,
  DemoReview,
  DemoReviewId,
  ReplyLength,
  ReplyStyle,
  ReviewCategory,
  ReviewStatus,
} from "./demo-data";
import type { ProductAnalyticsEvent } from "../_analytics/product-analytics";

export type ReviewFilter = "all" | "violations" | ReviewCategory;
export type ReplyAction = "edited" | "approved" | "copied" | "style" | "length" | "variant";

type ApprovalState = {
  statuses: Record<string, ReviewStatus>;
};

type ReplySelection = {
  locale: DemoLocale;
  style: ReplyStyle;
  version: number;
  length: ReplyLength;
  managerNote?: string;
};

const customContextReplyTemplates: Record<
  DemoLocale,
  Record<ReplyStyle, readonly [string, string]>
> = {
  pl: {
    warm: [
      "Dziękujemy za dodatkowy kontekst. Po sprawdzeniu sytuacji możemy potwierdzić: {fact} Przepraszamy za opisane doświadczenie i chcemy właściwie domknąć sprawę.",
      "Dziękujemy za przekazane informacje. Zweryfikowaliśmy sytuację: {fact} Przepraszamy i zależy nam na właściwym rozwiązaniu tej sprawy.",
    ],
    concise: [
      "Po sprawdzeniu sytuacji potwierdzamy: {fact} Przepraszamy za opisane doświadczenie.",
      "Zweryfikowaliśmy sytuację: {fact} Przepraszamy i chcemy właściwie domknąć sprawę.",
    ],
    casual: [
      "Sprawdziliśmy sytuację: {fact} Przepraszamy — chcemy właściwie domknąć tę sprawę.",
      "Dzięki za sygnał. Ustaliliśmy: {fact} Przepraszamy i zajmiemy się właściwym rozwiązaniem sprawy.",
    ],
  },
  en: {
    warm: [
      "Thank you for the additional context. After reviewing the situation, we can confirm: {fact} We are sorry about the experience described and want to resolve it properly.",
      "Thank you for the information. We reviewed the situation and established that {fact} We are sorry and want to reach the right resolution.",
    ],
    concise: [
      "After reviewing the situation, we can confirm: {fact} We are sorry about the experience described.",
      "We reviewed the situation: {fact} We are sorry and want to resolve it properly.",
    ],
    casual: [
      "We checked what happened: {fact} We are sorry and want to put this right.",
      "Thanks for raising this. We established that {fact} We are sorry and will work toward the right resolution.",
    ],
  },
};

function shortenReply(text: string) {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (!sentences?.length) return text;
  return sentences.slice(0, 2).join(" ").trim();
}

function punctuateFact(note: string) {
  const fact = note.trim();
  return /[.!?]$/.test(fact) ? fact : `${fact}.`;
}

function replyWithCustomContext(
  locale: DemoLocale,
  style: ReplyStyle,
  version: number,
  managerNote: string,
) {
  const fact = punctuateFact(managerNote);
  return customContextReplyTemplates[locale][style][version].replace("{fact}", fact);
}

export function matchesReviewFilter(
  review: DemoReview,
  filter: ReviewFilter,
) {
  if (filter === "all") return true;
  if (filter === "violations") return false;
  return review.category === filter;
}

type ReviewSelectionState = {
  selectedId: DemoReviewId;
  viewed: DemoReviewId[];
};

export function appendIfMissing<T>(items: T[], next: T) {
  return items.includes(next) ? items : [...items, next];
}

export function initialReviewSelection(reviews: DemoReview[]): ReviewSelectionState {
  const first = reviews[0];
  if (!first) throw new Error("The demo review sample must not be empty");
  return { selectedId: first.id, viewed: [] };
}

export function selectReviewInSession<T extends ReviewSelectionState>(
  state: T,
  reviewId: DemoReviewId,
): T {
  return {
    ...state,
    selectedId: reviewId,
    viewed: appendIfMissing(state.viewed, reviewId),
  };
}

export function selectionAfterFilterChange<T extends ReviewSelectionState>(
  state: T,
  reviews: DemoReview[],
  filter: ReviewFilter,
): T {
  const matches = reviews.filter((review) => matchesReviewFilter(review, filter));
  if (matches.some((review) => review.id === state.selectedId) || !matches[0]) return state;
  return selectReviewInSession(state, matches[0].id);
}

export function reviewOpenedEvent(
  locale: DemoLocale,
  review: DemoReview,
): Extract<ProductAnalyticsEvent, { name: "review_opened" }> {
  return {
    name: "review_opened",
    properties: {
      locale,
      review_id: review.id,
      rating: review.rating,
      review_category: review.category,
    },
  };
}

export function replyActionEvent(
  locale: DemoLocale,
  review: DemoReview,
  action: ReplyAction,
): Extract<
  ProductAnalyticsEvent,
  { name: "reply_edited" | "reply_approved" | "reply_copied" | "prepared_reply_variant_selected" }
> {
  const properties = {
    locale,
    page_kind: "demo" as const,
    review_id: review.id,
    rating: review.rating,
    review_category: review.category,
  };

  switch (action) {
    case "edited":
      return { name: "reply_edited", properties };
    case "approved":
      return { name: "reply_approved", properties };
    case "copied":
      return { name: "reply_copied", properties };
    case "style":
    case "length":
    case "variant":
      return {
        name: "prepared_reply_variant_selected",
        properties: { ...properties, action_kind: action },
      };
  }
}

export function preparedReply(review: DemoReview, selection: ReplySelection) {
  const { locale, style, length, managerNote = "" } = selection;
  const version = Math.abs(selection.version) % 2;
  const hasContext = Boolean(review.managerContext && managerNote.trim());
  const hasPreparedContext = Boolean(
    review.managerContext
      && managerNote.trim() === review.managerContext.example[locale],
  );

  if (hasContext && !hasPreparedContext) {
    const reply = replyWithCustomContext(locale, style, version, managerNote);
    return length === "short" ? shortenReply(reply) : reply;
  }

  const variants = hasPreparedContext
    ? review.managerContext?.replies[style][locale]
    : [review.replies[style][locale], review.alternateReplies[style][locale]];
  const reply = variants?.[version] ?? review.replies[style][locale];

  return length === "short" ? shortenReply(reply) : reply;
}

export function nextReplyStatus(review: DemoReview, managerNote: string): ReviewStatus {
  return review.managerContext && !managerNote.trim() ? "context" : "ready";
}

export function invalidateApproval<T extends ApprovalState>(
  state: T,
  reviewId: string,
  nextStatus: ReviewStatus,
): T {
  return {
    ...state,
    statuses: { ...state.statuses, [reviewId]: nextStatus },
  };
}

export function sessionSummary(state: ApprovalState) {
  const approved = Object.values(state.statuses).filter((status) => status === "approved").length;
  return { approved, savedMinutes: approved * 5 };
}
