import { NextResponse, type NextRequest } from "next/server";
import { getSoleraLivePublicConfig } from "@/lib/solera-live/config";
import { storeSoleraLiveReport } from "@/lib/solera-live/report-store";
import { SoleraLiveReportRateLimiter, validateSoleraLiveReportPayload } from "@/lib/solera-live/reports";
import { soleraLiveRoomRegistry } from "@/lib/solera-live/rooms";

export const dynamic = "force-dynamic";

const serverReportRateLimiter = new SoleraLiveReportRateLimiter();

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

  if (
    !soleraLiveRoomRegistry.hasActiveAssignment(
      validation.authorization.region,
      validation.authorization.roomId,
      validation.authorization.clientId,
      validation.authorization.assignmentProof,
    )
  ) {
    return NextResponse.json({ error: "Report is not authorized." }, { status: 403 });
  }

  const rateLimit = serverReportRateLimiter.check(validation.authorization.clientId);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.message, retryAfterMs: rateLimit.retryAfterMs }, { status: 429 });
  }

  const storedIn = await storeSoleraLiveReport(validation.record);

  return NextResponse.json({
    ok: true,
    reportId: validation.record.reportId,
    storedIn,
    expiresAt: validation.record.expiresAt,
  });
}
