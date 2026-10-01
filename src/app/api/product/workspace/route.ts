import { readWorkspace } from "@/lib/product/store";
import { errorResponse, workspaceId, workspaceResponse } from "@/lib/product/http";
export const runtime = "nodejs";
export async function GET() {
  try { return workspaceResponse(await readWorkspace(await workspaceId())); }
  catch (error) { return errorResponse(error); }
}
