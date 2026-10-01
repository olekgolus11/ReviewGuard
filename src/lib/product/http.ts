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
  if (!origin) return;
  // Next can normalize Request.url to localhost behind a proxy or in dev.
  // The browser's Host header identifies the actual origin serving this UI.
  const host = request.headers.get("host") ?? new URL(request.url).host;
  let source: URL;
  try { source = new URL(origin); } catch { throw new ProductError("Nieprawidłowe źródło żądania.", 403); }
  if (!["http:", "https:"].includes(source.protocol) || source.host !== host || source.origin !== origin) {
    throw new ProductError("Żądanie musi pochodzić z tej aplikacji.", 403);
  }
}
export async function bodyObject(request: Request): Promise<Record<string, unknown>> {
  ensureSameOrigin(request);
  if (!request.headers.get("content-type")?.includes("application/json")) throw new ProductError("Wymagany format JSON.", 415);
  const maxBodyBytes = 32_000;
  const contentLength = request.headers.get("content-length");
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBodyBytes) {
    throw new ProductError("Przesłano zbyt dużo danych.", 413);
  }
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBodyBytes) {
          await reader.cancel().catch(() => undefined);
          throw new ProductError("Przesłano zbyt dużo danych.", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let raw: string;
  try { raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw new ProductError("Nieprawidłowy JSON."); }
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
  const status = error instanceof ProductError ? error.status : error instanceof TypeError ? 400 : 502;
  const message = error instanceof Error ? error.message : "Operacja nie powiodła się. Spróbuj ponownie.";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
