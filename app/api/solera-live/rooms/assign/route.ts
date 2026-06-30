import { NextResponse, type NextRequest } from "next/server";
import { createSoleraLiveChatToken } from "@/lib/solera-live/chat-token";
import { getSoleraLivePublicConfig } from "@/lib/solera-live/config";
import { soleraLiveRoomRegistry } from "@/lib/solera-live/rooms";
import { type SoleraLiveClientHints, type SoleraLiveRegion, type SoleraLiveRoomAssignmentRequest } from "@/lib/solera-live/types";

export const dynamic = "force-dynamic";

function stringField(payload: Readonly<Record<string, unknown>>, key: string, maxLength: number): string | undefined {
  const value = payload[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().slice(0, maxLength);
  return normalizedValue || undefined;
}

function readClientHints(value: unknown): SoleraLiveClientHints | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const payload = value as Readonly<Record<string, unknown>>;
  const regionLatencies = payload["regionLatenciesMs"];
  const clientHints: {
    locale?: string;
    regionLatenciesMs?: Partial<Record<SoleraLiveRegion, number>>;
    timeZone?: string;
  } = {};
  const locale = stringField(payload, "locale", 80);
  const timeZone = stringField(payload, "timeZone", 80);

  if (locale) {
    clientHints.locale = locale;
  }
  if (timeZone) {
    clientHints.timeZone = timeZone;
  }

  if (regionLatencies && typeof regionLatencies === "object" && !Array.isArray(regionLatencies)) {
    const latencyPayload = regionLatencies as Readonly<Record<string, unknown>>;
    const regionLatenciesMs: Partial<Record<SoleraLiveRegion, number>> = {};

    for (const region of ["eu", "us"] as const) {
      const latency = latencyPayload[region];
      if (typeof latency === "number" && Number.isFinite(latency)) {
        regionLatenciesMs[region] = latency;
      }
    }

    if (Object.keys(regionLatenciesMs).length > 0) {
      clientHints.regionLatenciesMs = regionLatenciesMs;
    }
  }

  return Object.keys(clientHints).length > 0 ? clientHints : undefined;
}

async function readRequestBody(request: NextRequest): Promise<SoleraLiveRoomAssignmentRequest> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return {};
    }

    const payload = body as Readonly<Record<string, unknown>>;
    const requestedRegion = stringField(payload, "requestedRegion", 16);
    const previousRoomId = stringField(payload, "previousRoomId", 80);
    const clientId = stringField(payload, "clientId", 80);
    const displayName = stringField(payload, "displayName", 24);
    const clientHints = readClientHints(payload["clientHints"]);

    return {
      ...(requestedRegion ? { requestedRegion } : {}),
      ...(previousRoomId ? { previousRoomId } : {}),
      ...(clientId ? { clientId } : {}),
      ...(displayName ? { displayName } : {}),
      ...(clientHints ? { clientHints } : {}),
    };
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const config = getSoleraLivePublicConfig();

  if (!config.enabled) {
    return NextResponse.json({ error: "Solera Live is disabled." }, { status: 403 });
  }

  const body = await readRequestBody(request);
  const assignment = soleraLiveRoomRegistry.assign(body);
  const chatToken =
    body.clientId && body.displayName
      ? createSoleraLiveChatToken({
          userId: body.clientId,
          displayName: body.displayName,
          roomId: assignment.roomId,
          region: assignment.region,
        })
      : undefined;

  return NextResponse.json({
    ...assignment,
    ...(chatToken ? { chatToken } : {}),
  });
}
