import { currentAssessments } from "@/lib/product/assessment-batch";
import { calculateBacktest } from "@/lib/product/backtest";
import { readWorkspace } from "@/lib/product/store";
import { ensureSameOrigin, errorResponse, workspaceId } from "@/lib/product/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const workspace = await readWorkspace(await workspaceId());
    return Response.json({ report: calculateBacktest({ ...workspace, assessments: currentAssessments(workspace) }) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
