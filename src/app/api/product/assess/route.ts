import { assessWorkspace } from "@/lib/product/assessment-batch";
import { readWorkspace } from "@/lib/product/store";
import { bodyObject, errorResponse, findReview, ProductError, requiredString, workspaceId, workspaceResponse } from "@/lib/product/http";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const body = await bodyObject(request);
    const id = await workspaceId();
    const current = await readWorkspace(id);
    if (!current.snapshot) throw new ProductError("Najpierw zaimportuj miejsce.");
    const reviewId = body.reviewId === undefined ? undefined : requiredString(body, "reviewId", 1024);
    if (reviewId) findReview(current, reviewId);
    const result = await assessWorkspace(id, { reviewId });
    return workspaceResponse(result.workspace, result.summary);
  } catch (error) { return errorResponse(error); }
}
