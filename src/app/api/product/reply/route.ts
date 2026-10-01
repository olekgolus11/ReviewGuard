import { generateReply } from "@/lib/product/ai";
import { readWorkspace, reviewFingerprint, updateWorkspace } from "@/lib/product/store";
import { bodyObject, errorResponse, findReview, ProductError, requiredString, workspaceId, workspaceResponse } from "@/lib/product/http";
import type { ReplyStyle } from "@/lib/product/types";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const body = await bodyObject(request);
    const reviewId = requiredString(body, "reviewId", 1024);
    const managerContext = body.managerContext ?? "";
    if (typeof managerContext !== "string" || managerContext.length > 8000) throw new ProductError("Kontekst może mieć maksymalnie 8000 znaków.");
    const style = body.style ?? "professional";
    if (!["warm", "concise", "professional"].includes(String(style))) throw new ProductError("Nieprawidłowy styl odpowiedzi.");
    const id = await workspaceId();
    const current = await readWorkspace(id);
    const { review, location } = findReview(current, reviewId);
    const assessment = current.assessments[reviewId];
    if (!assessment) throw new ProductError("Najpierw oceń opinię.");
    if (assessment.action === "report" || assessment.action === "skip") throw new ProductError("Ta opinia nie jest przeznaczona do przygotowania odpowiedzi.");
    if (assessment.signals.needsContext && !managerContext.trim()) throw new ProductError("Dodaj fakty od osoby odpowiedzialnej za miejsce przed wygenerowaniem odpowiedzi.");
    const reply = await generateReply(review, location, { managerContext: managerContext.trim(), style: style as ReplyStyle });
    return workspaceResponse(await updateWorkspace(id, latest => {
      const fresh = findReview(latest, reviewId);
      if (fresh.location.id !== location.id || reviewFingerprint(fresh.review) !== reviewFingerprint(review)) throw new ProductError("Opinia zmieniła się. Wygeneruj odpowiedź ponownie.", 409);
      latest.replies[reviewId] = reply;
    }));
  } catch (error) { return errorResponse(error); }
}
