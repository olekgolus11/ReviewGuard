import { importGoogleMapsLocation } from "@/lib/product/google-maps";
import { saveImport } from "@/lib/product/store";
import { assessWorkspace } from "@/lib/product/assessment-batch";
import { bodyObject, errorResponse, ProductError, requiredString, workspaceId, workspaceResponse } from "@/lib/product/http";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request: Request) {
  try {
    const startedAt = Date.now();
    const body = await bodyObject(request);
    const url = requiredString(body, "url", 2048);
    const limit = body.limit ?? 50;
    if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 200) throw new ProductError("Limit opinii musi być liczbą od 1 do 200.");
    const id = await workspaceId();
    const snapshot = await importGoogleMapsLocation(url, limit);
    await saveImport(id, snapshot);
    const result = await assessWorkspace(id, { deadline: startedAt + 270_000 });
    return workspaceResponse(result.workspace, result.summary);
  } catch (error) { return errorResponse(error); }
}
