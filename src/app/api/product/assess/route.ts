import { assessReview } from "@/lib/product/ai";
import { readWorkspace, reviewFingerprint, updateWorkspace } from "@/lib/product/store";
import { bodyObject, errorResponse, findReview, ProductError, requiredString, workspaceId, workspaceResponse } from "@/lib/product/http";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const body = await bodyObject(request);
    const id = await workspaceId();
    const current = await readWorkspace(id);
    if (!current.snapshot) throw new ProductError("Najpierw zaimportuj miejsce.");
    const requestedId = body.reviewId === undefined ? null : requiredString(body, "reviewId", 1024);
    const reviews = requestedId ? [findReview(current, requestedId).review] : current.snapshot.reviews.filter(review => !current.assessments[review.id]);
    const startedAt = Date.now();
    // Save each successful evaluation immediately, so a remote failure does not discard a whole batch.
    for (let start = 0; start < reviews.length; start += 4) {
      if (Date.now() - startedAt > 240_000) throw new ProductError("Zapisano dotychczasowe oceny. Uruchom ocenę ponownie, aby dokończyć pozostałe opinie.", 408);
      const results = await Promise.allSettled(reviews.slice(start, start + 4).map(async review => {
        const assessment = await assessReview(review, current.snapshot!.location);
        await updateWorkspace(id, latest => {
          const fresh = findReview(latest, review.id);
          if (fresh.location.id !== current.snapshot!.location.id || reviewFingerprint(fresh.review) !== reviewFingerprint(review)) throw new ProductError("Opinia zmieniła się podczas oceny. Oceń ją ponownie.", 409);
          latest.assessments[review.id] = assessment;
        });
      }));
      const failed = results.find(result => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
    }
    return workspaceResponse(await readWorkspace(id));
  } catch (error) { return errorResponse(error); }
}
