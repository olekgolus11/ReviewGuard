import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getAIConfiguration } from "./ai";
import type { ProductWorkspace } from "./types";

export class ProductError extends Error { constructor(message: string, public status = 400) { super(message); } }
export async function workspaceId() {
  const jar = await cookies();
  const existing = jar.get("reviewguard-workspace")?.value;
  if (existing && /^[0-9a-f-]{36}$/.test(existing)) return existing;
  const id = randomUUID();
  jar.set("reviewguard-workspace", id, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return id;
}
export function workspaceResponse(workspace: ProductWorkspace) {
  return Response.json({ workspace, configuration: { ...getAIConfiguration(), storage: "local-filesystem" } }, { headers: { "Cache-Control": "no-store" } });
}
export function ensureSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ProductError("Żądanie musi pochodzić z tej aplikacji.", 403);
}
export async function bodyObject(request: Request): Promise<Record<string, unknown>> {
  ensureSameOrigin(request);
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ProductError("Wymagany format JSON.", 415);
  const raw = await request.text();
  if (raw.length > 32_000) throw new ProductError("Przesłano zbyt dużo danych.", 413);
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new ProductError("Nieprawidłowy JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ProductError("Wymagany obiekt JSON.");
  return value as Record<string, unknown>;
}
export function requiredString(body: Record<string, unknown>, field: string, max = 4096) {
  const value = body[field];
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new ProductError(`Nieprawidłowe pole: ${field}.`);
  return value.trim();
}
export function findReview(workspace: ProductWorkspace, id: string) {
  const review = workspace.snapshot?.reviews.find(review => review.id === id);
  if (!review || !workspace.snapshot) throw new ProductError("Nie znaleziono opinii. Zaimportuj miejsce ponownie.", 404);
  return { review, location: workspace.snapshot.location };
}
export function errorResponse(error: unknown) {
  const status = error instanceof ProductError ? error.status : 502;
  const message = error instanceof Error ? error.message : "Operacja nie powiodła się. Spróbuj ponownie.";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
