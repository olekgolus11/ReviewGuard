import { readWorkspace } from "@/lib/product/store";
import { currentAssessments } from "@/lib/product/assessment-batch";
import { errorResponse, workspaceId } from "@/lib/product/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const workspace = await readWorkspace(await workspaceId());
    return Response.json({ version: 1, exportedAt: new Date().toISOString(), workspace: { ...workspace, assessments: currentAssessments(workspace) } }, { headers: { "Content-Disposition": 'attachment; filename="reviewguard-backtest.json"', "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
