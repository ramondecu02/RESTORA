import { type NextRequest } from "next/server";
import { listLeads } from "@/lib/leads";
import { leadsToCsv } from "@/lib/csv";
import { isAdminAuthed } from "@/lib/session";
import { isLeadStatus } from "@/lib/types";

// GET /api/leads/export.csv — protected. Streams the (filtered) list as CSV.
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthed())) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const statusParam = params.get("status") ?? undefined;
  const leads = await listLeads({
    city: params.get("city")?.trim() || undefined,
    status: statusParam && isLeadStatus(statusParam) ? statusParam : undefined,
    q: params.get("q")?.trim() || undefined,
  });

  const csv = leadsToCsv(leads);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="restora-leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
