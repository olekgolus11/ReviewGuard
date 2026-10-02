import { assessReview, getAIConfiguration } from "./ai";
import { POLICY_VERSION } from "./policy";
import { readWorkspace, reviewFingerprint, updateWorkspace } from "./store";
import type { AssessmentSummary, ProductWorkspace } from "./types";

export function currentAssessments(workspace: ProductWorkspace) {
  return Object.fromEntries(Object.entries(workspace.assessments).filter(([, assessment]) => assessment.policyVersion === POLICY_VERSION));
}

export function assessmentSummary(workspace: ProductWorkspace, message?: string): AssessmentSummary {
  const total = workspace.snapshot?.reviews.length ?? 0;
  const assessments = currentAssessments(workspace);
  const assessed = workspace.snapshot?.reviews.filter(review => assessments[review.id]).length ?? 0;
  const status = assessed === total ? "complete" : getAIConfiguration().aiConfigured ? "partial" : "unavailable";
  return { status, assessed, total, failed: total - assessed, ...(message ? { message } : {}) };
}

// Shared by import and explicit retry. Persist successes individually; never lose
// the source import or successful assessments because another provider call fails.
export async function assessWorkspace(id: string, options: { reviewId?: string; deadline?: number } = {}): Promise<{ workspace: ProductWorkspace; summary: AssessmentSummary }> {
  const current = await readWorkspace(id);
  if (!current.snapshot) throw new Error("Najpierw zaimportuj miejsce.");
  if (!getAIConfiguration().aiConfigured) return { workspace: current, summary: assessmentSummary(current, "Opinie pobrano. Klasyfikacja wymaga skonfigurowania dostępu do AI.") };
  const snapshot = current.snapshot;
  const assessments = currentAssessments(current);
  const reviews = snapshot.reviews.filter(review => options.reviewId ? review.id === options.reviewId : !assessments[review.id]);
  const deadline = options.deadline ?? Date.now() + 240_000;
  let message: string | undefined;
  for (let start = 0; start < reviews.length; start += 4) {
    if (Date.now() >= deadline) {
      message = "Zapisano opinie i dotychczasowe oceny. Ponów ocenę pozostałych opinii.";
      break;
    }
    const results = await Promise.allSettled(reviews.slice(start, start + 4).map(async review => {
      const assessment = await assessReview(review, snapshot.location);
      await updateWorkspace(id, latest => {
        const fresh = latest.snapshot?.reviews.find(item => item.id === review.id);
        if (!fresh || latest.snapshot?.location.id !== snapshot.location.id || reviewFingerprint(fresh) !== reviewFingerprint(review)) throw new Error("Opinia zmieniła się podczas oceny. Ponów jej ocenę.");
        latest.assessments[review.id] = assessment;
      });
    }));
    const failure = results.find(result => result.status === "rejected");
    if (failure?.status === "rejected") message = failure.reason instanceof Error ? failure.reason.message : "Część opinii nie została oceniona. Ponów ocenę pozostałych.";
  }
  const workspace = await readWorkspace(id);
  return { workspace, summary: assessmentSummary(workspace, message) };
}
