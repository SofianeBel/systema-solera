import { NextResponse, type NextRequest } from "next/server";
import { getSoleraLivePublicConfig } from "@/lib/solera-live/config";
import { storeSoleraLiveReport } from "@/lib/solera-live/report-store";
import { validateSoleraLiveReportPayload } from "@/lib/solera-live/reports";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const config = getSoleraLivePublicConfig();

  if (!config.enabled) {
    return NextResponse.json({ error: "Solera Live is disabled." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const validation = validateSoleraLiveReportPayload(payload);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const storedIn = await storeSoleraLiveReport(validation.record);

  return NextResponse.json({
    ok: true,
    reportId: validation.record.reportId,
    storedIn,
    expiresAt: validation.record.expiresAt,
  });
}
