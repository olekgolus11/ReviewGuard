import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ImportSnapshot, ProductWorkspace, Review } from "./types.ts";

export const emptyWorkspace = (): ProductWorkspace => ({ snapshot: null, assessments: {}, replies: {}, labels: {} });
export function reviewFingerprint(review: Review): string {
  return createHash("sha256").update(JSON.stringify({ rating: review.rating, text: review.text, title: review.title, language: review.language, media: review.media, ownerReply: review.ownerReply })).digest("hex");
}
const processState = globalThis as typeof globalThis & { reviewGuardLocks?: Map<string, Promise<unknown>> };
const locks = processState.reviewGuardLocks ??= new Map();
function directory() { return process.env.REVIEWGUARD_DATA_DIR || path.join(process.cwd(), ".reviewguard-data"); }
function workspacePath(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("Nieprawidłowa sesja produktu.");
  return path.join(directory(), id, "workspace.json");
}
async function atomicWrite(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, file);
}
export async function readWorkspace(id: string): Promise<ProductWorkspace> {
  try { return JSON.parse(await readFile(workspacePath(id), "utf8")) as ProductWorkspace; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return emptyWorkspace();
    throw error;
  }
}
export async function updateWorkspace(id: string, update: (workspace: ProductWorkspace) => void | Promise<void>): Promise<ProductWorkspace> {
  const key = workspacePath(id);
  const previous = locks.get(key) ?? Promise.resolve();
  const pending = previous.catch(() => {}).then(async () => {
    const workspace = await readWorkspace(id);
    await update(workspace);
    await atomicWrite(key, workspace);
    return workspace;
  });
  locks.set(key, pending);
  try { return await pending; }
  finally { if (locks.get(key) === pending) locks.delete(key); }
}
export function applyImport(workspace: ProductWorkspace, snapshot: ImportSnapshot) {
  const unique = Array.from(new Map(snapshot.reviews.map(review => [review.id, review])).values());
  snapshot = { ...snapshot, reviews: unique, coverage: { ...snapshot.coverage, importedCount: unique.length } };
  const previous = workspace.snapshot;
  const sameLocation = previous?.location.id === snapshot.location.id;
  const previousReviews = new Map(previous?.reviews.map(review => [review.id, review]));
  for (const field of ["assessments", "replies", "labels"] as const) {
    const retained = Object.keys(workspace[field]).filter(id => {
      const old = previousReviews.get(id), fresh = unique.find(review => review.id === id);
      return sameLocation && old && fresh && reviewFingerprint(old) === reviewFingerprint(fresh);
    });
    for (const id of Object.keys(workspace[field])) if (!retained.includes(id)) delete workspace[field][id];
  }
  workspace.snapshot = snapshot;
}
export async function saveImport(id: string, snapshot: ImportSnapshot): Promise<ProductWorkspace> {
  if (!/^[0-9a-f-]{36}$/.test(snapshot.id)) throw new Error("Nieprawidłowy identyfikator importu.");
  await atomicWrite(path.join(path.dirname(workspacePath(id)), "snapshots", `${snapshot.id}.json`), snapshot);
  return updateWorkspace(id, workspace => applyImport(workspace, snapshot));
}
