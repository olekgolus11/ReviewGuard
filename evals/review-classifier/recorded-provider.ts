import { applyReplyUsefulnessGate } from "../../src/lib/product/policy.ts";
import type { ReviewAction } from "../../src/lib/product/types.ts";

export default class RecordedAssessmentRoutingProvider {
  id = () => "reviewguard:recorded-assessment-routing";

  callApi = async (_prompt: string, context?: { vars?: { action?: string; confidence?: number; shouldReply?: boolean } }) => {
    const vars = context?.vars;
    if (
      !vars ||
      typeof vars.action !== "string" ||
      typeof vars.confidence !== "number" ||
      typeof vars.shouldReply !== "boolean"
    ) {
      return { error: "Recorded regression requires action, confidence, and shouldReply variables." };
    }
    const result = applyReplyUsefulnessGate(vars.action as ReviewAction, vars.confidence, vars.shouldReply);
    return { output: JSON.stringify(result) };
  };
}
