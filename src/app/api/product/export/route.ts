import { readWorkspace } from "@/lib/product/store";
import { errorResponse, workspaceId } from "@/lib/product/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json({ version: 1, exportedAt: new Date().toISOString(), workspace: await readWorkspace(await workspaceId()) }, { headers: { "Content-Disposition": 'attachment; filename="reviewguard-backtest.json"', "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
