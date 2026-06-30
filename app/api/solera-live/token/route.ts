import { NextResponse, type NextRequest } from "next/server";
import { getSoleraLivePublicConfig } from "@/lib/solera-live/config";
import { createSoleraLiveAblyTokenRequest } from "@/lib/solera-live/ably-token";
import { isSoleraLiveRegion } from "@/lib/solera-live/region";
import { soleraLiveRoomRegistry } from "@/lib/solera-live/rooms";

export const dynamic = "force-dynamic";

type TokenPayload = Readonly<{
  clientId?: unknown;
  region?: unknown;
  roomId?: unknown;
}>;

async function readPayload(request: NextRequest): Promise<TokenPayload> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as TokenPayload) : {};
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const config = getSoleraLivePublicConfig();

  if (!config.enabled) {
    return NextResponse.json({ error: "Solera Live is disabled." }, { status: 403 });
  }

  const payload = await readPayload(request);
  const clientId = typeof payload.clientId === "string" ? payload.clientId.trim() : "";
  const roomId = typeof payload.roomId === "string" ? payload.roomId.trim() : "";
  const region = payload.region;

  if (!clientId || !roomId || !isSoleraLiveRegion(region) || !roomId.startsWith(`solera-${region}-`)) {
    return NextResponse.json({ error: "Invalid token request." }, { status: 400 });
  }

  if (!soleraLiveRoomRegistry.hasActiveAssignment(region, roomId, clientId)) {
    return NextResponse.json({ error: "Token request is not authorized." }, { status: 403 });
  }

  if (config.provider === "mock") {
    return NextResponse.json({
      provider: "mock",
      token: `mock-${clientId}-${roomId}`,
      expiresAt: new Date(Date.now() + config.tokenTtlSeconds * 1000).toISOString(),
    });
  }

  const apiKey = process.env["ABLY_API_KEY"];

  if (!apiKey) {
    return NextResponse.json({ error: "Ably credentials are not configured." }, { status: 503 });
  }

  const tokenRequest = await createSoleraLiveAblyTokenRequest({
    apiKey,
    clientId,
    region,
    roomId,
    ttlSeconds: config.tokenTtlSeconds,
  });

  return NextResponse.json({ provider: "ably", tokenRequest });
}
