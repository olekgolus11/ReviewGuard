import { assessReview } from "../../src/lib/product/ai.ts";
import type { Location, Review } from "../../src/lib/product/types.ts";

type EvalVars = { rating: number; text: string; ownerReply?: string };

const location: Location = {
  id: "promptfoo-location",
  name: "Harbor Cafe",
  address: null,
  sourceUrl: "https://example.invalid/harbor-cafe",
  totalReviewCount: null,
};

export default class ReviewClassifierProvider {
  id = () => "reviewguard:production-assessReview";

  callApi = async (_prompt: string, context?: { vars?: EvalVars }) => {
    const vars = context?.vars;
    if (!vars || typeof vars.text !== "string" || typeof vars.rating !== "number") {
      return { error: "Each eval row must provide numeric rating and string text variables." };
    }
    const review: Review = {
      id: "promptfoo-review",
      sourceUrl: null,
      author: "Synthetic eval reviewer",
      rating: vars.rating,
      text: vars.text,
      title: null,
      publishedAt: null,
      publishedAtLabel: null,
      language: "en",
      media: [],
      ownerReply: vars.ownerReply ? { text: vars.ownerReply, publishedAt: null } : null,
    };
    try {
      const assessment = await assessReview(review, location);
      return { output: JSON.stringify(assessment) };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  };
}
