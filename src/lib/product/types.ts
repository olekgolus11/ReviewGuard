export const ACTIONS = ["reply", "skip", "human_review", "report"] as const;
export type ReviewAction = typeof ACTIONS[number];
export type ReviewMedia = { url: string; type: "image" | "video"; caption?: string };
export type Location = { id: string; name: string; address: string | null; sourceUrl: string; totalReviewCount: number | null };
export type Review = {
  id: string; sourceUrl: string | null; author: string | null; rating: number;
  text: string; title: string | null; publishedAt: string | null; publishedAtLabel: string | null;
  language: string | null; media: ReviewMedia[];
  ownerReply: { text: string; publishedAt: string | null } | null;
};
export type ImportSnapshot = {
  id: string; importedAt: string; location: Location; reviews: Review[];
  coverage: { requestedLimit: number; importedCount: number; totalReviewCount: number | null; sort: string; complete: boolean; stopReason: string };
};
export type ReviewAssessment = {
  reviewId: string; action: ReviewAction; reasons: string[];
  signals: { needsContext: boolean; potentialViolation: boolean; violationCategory: string | null; shouldReply: boolean };
  confidence: number | null; model: string; policyVersion: string; assessedAt: string;
};
export type ReplySuggestion = { reviewId: string; text: string; originalText?: string; editedAt?: string; model: string; generatedAt: string; managerContext: string; style: ReplyStyle };
export type ReplyStyle = "warm" | "concise" | "professional";
export type ReferenceLabel = { reviewId: string; action: ReviewAction };
export type ProductWorkspace = {
  snapshot: ImportSnapshot | null; assessments: Record<string, ReviewAssessment>;
  replies: Record<string, ReplySuggestion>; labels: Record<string, ReviewAction>;
};
export type ProductConfiguration = { aiConfigured: boolean; classifierModel: string; replyModel: string; storage: string };
export type AssessmentSummary = { status: "complete" | "partial" | "unavailable"; assessed: number; total: number; failed: number; message?: string };
export type WorkspaceResponse = { workspace: ProductWorkspace; configuration: ProductConfiguration; assessmentSummary?: AssessmentSummary };
