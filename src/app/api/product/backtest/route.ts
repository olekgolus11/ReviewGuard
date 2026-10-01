import { calculateBacktest } from "@/lib/product/backtest";
import { readWorkspace } from "@/lib/product/store";
import { ensureSameOrigin, errorResponse, workspaceId } from "@/lib/product/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    return Response.json({ report: calculateBacktest(await readWorkspace(await workspaceId())) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
