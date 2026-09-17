import assert from "node:assert/strict";
import test from "node:test";
import { demoReviews } from "./demo-data.ts";
import {
  invalidateApproval,
  initialReviewSelection,
  matchesReviewFilter,
  selectReviewInSession,
  reviewOpenedEvent,
  selectionAfterFilterChange,
  preparedReply,
  sessionSummary,
} from "./demo-session.ts";

test("direct review selection records the browser-local opening and emits the allowlisted analytics event", () => {
  const review = demoReviews.find((candidate) => candidate.id === "M1");
  assert.ok(review);
  const initial = { selectedId: "P1" as const, viewed: [] };

  const selected = selectReviewInSession(initial, review.id);
  const event = reviewOpenedEvent("pl", review);

  assert.deepEqual(selected, { selectedId: "M1", viewed: ["M1"] });
  assert.deepEqual(event, {
    name: "review_opened",
    properties: {
      locale: "pl",
      review_id: "M1",
      rating: 3,
      review_category: "personalize",
    },
  });
});

test("stepper navigation keeps repeated review selections as raw events", () => {
  const review = demoReviews.find((candidate) => candidate.id === "P2");
  assert.ok(review);
  const initial = { selectedId: "P1" as const, viewed: [] };

  const first = selectReviewInSession(initial, review.id);
  const second = selectReviewInSession(first, review.id);
  const events = [reviewOpenedEvent("en", review), reviewOpenedEvent("en", review)];

  assert.deepEqual(second, { selectedId: "P2", viewed: ["P2"] });
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], events[1]);
});

test("initial rendering starts unopened and filter-driven selection changes only the browser-local summary", () => {
  const initial = initialReviewSelection(demoReviews);

  const selected = selectionAfterFilterChange(initial, demoReviews, "caution");

  assert.deepEqual(initial, { selectedId: "P1", viewed: [] });
  assert.equal(selected.selectedId, "N1");
  assert.deepEqual(selected.viewed, ["N1"]);
});

test("regeneration selects another reply prepared for the same review and style", () => {
  const review = demoReviews[0];

  const first = preparedReply(review, {
    locale: "pl",
    style: "warm",
    version: 0,
    length: "standard",
  });
  const second = preparedReply(review, {
    locale: "pl",
    style: "warm",
    version: 1,
    length: "standard",
  });

  assert.equal(
    first,
    "Bardzo dziękujemy! Cieszymy się, że pizza smakowała, a odbiór przebiegł sprawnie. Zapraszamy ponownie!",
  );
  assert.equal(
    second,
    "Dziękujemy za miłe słowa! Szczególnie cieszy nas smak pizzy i szybki odbiór. Będzie nam bardzo miło gościć Państwa ponownie.",
  );
  assert.notEqual(first, second);
});

test("manager context reply uses a review owner's custom confirmed facts", () => {
  const review = demoReviews.find((candidate) => candidate.managerContext);
  assert.ok(review?.managerContext);

  const contextual = preparedReply(review, {
    locale: "pl",
    style: "warm",
    version: 0,
    length: "standard",
    managerNote: "Kierowca potwierdził awarię samochodu.",
  });

  assert.equal(
    contextual,
    "Dziękujemy za dodatkowy kontekst. Po sprawdzeniu sytuacji możemy potwierdzić: Kierowca potwierdził awarię samochodu. Przepraszamy za opisane doświadczenie i chcemy właściwie domknąć sprawę.",
  );
});

test("regeneration changes a concise reply built from manager context", () => {
  const review = demoReviews.find((candidate) => candidate.managerContext);
  assert.ok(review);
  const selection = {
    locale: "pl" as const,
    style: "concise" as const,
    length: "standard" as const,
    managerNote: "Kierowca potwierdził awarię samochodu.",
  };

  const first = preparedReply(review, { ...selection, version: 0 });
  const second = preparedReply(review, { ...selection, version: 1 });

  assert.equal(
    first,
    "Po sprawdzeniu sytuacji potwierdzamy: Kierowca potwierdził awarię samochodu. Przepraszamy za opisane doświadczenie.",
  );
  assert.equal(
    second,
    "Zweryfikowaliśmy sytuację: Kierowca potwierdził awarię samochodu. Przepraszamy i chcemy właściwie domknąć sprawę.",
  );
});

test("changing a reply invalidates its approval and saved-time estimate", () => {
  const initial = {
    statuses: { P1: "approved" as const, P2: "ready" as const },
  };

  const changed = invalidateApproval(initial, "P1", "ready");

  assert.deepEqual(changed, {
    statuses: { P1: "ready", P2: "ready" },
  });
  assert.deepEqual(sessionSummary(changed), { approved: 0, savedMinutes: 0 });
});

test("potential-policy-violation filter has an honest empty result", () => {
  assert.equal(
    demoReviews.filter((review) => matchesReviewFilter(review, "violations")).length,
    0,
  );
});
