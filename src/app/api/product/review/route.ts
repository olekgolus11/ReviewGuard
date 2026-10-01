import { reviewActions } from "@/lib/product/backtest";
import { updateWorkspace } from "@/lib/product/store";
import { bodyObject, errorResponse, findReview, ProductError, requiredString, workspaceId, workspaceResponse } from "@/lib/product/http";
import type { ReviewAction } from "@/lib/product/types";
export const runtime = "nodejs";
export async function PATCH(request: Request) {
  try {
    const body = await bodyObject(request);
    const reviewId = requiredString(body, "reviewId", 1024);
    if (body.replyText === undefined && body.label === undefined) throw new ProductError("Brak zmian do zapisania.");
    if (body.replyText !== undefined && (typeof body.replyText !== "string" || body.replyText.length > 12000 || !body.replyText.trim())) throw new ProductError("Odpowiedź musi zawierać od 1 do 12000 znaków.");
    if (body.label !== undefined && body.label !== null && !reviewActions.includes(body.label as ReviewAction)) throw new ProductError("Nieprawidłowa etykieta referencyjna.");
    return workspaceResponse(await updateWorkspace(await workspaceId(), workspace => {
      findReview(workspace, reviewId);
      if (typeof body.replyText === "string") {
        if (!workspace.replies[reviewId]) throw new ProductError("Najpierw wygeneruj propozycję odpowiedzi.");
        workspace.replies[reviewId].text = body.replyText.trim();
      }
      if (body.label === null) delete workspace.labels[reviewId];
      else if (body.label !== undefined) workspace.labels[reviewId] = body.label as ReviewAction;
    }));
  } catch (error) { return errorResponse(error); }
}
