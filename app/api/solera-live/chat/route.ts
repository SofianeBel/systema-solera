import { Rest } from "ably";
import { NextResponse, type NextRequest } from "next/server";
import { getSoleraLivePublicConfig } from "@/lib/solera-live/config";
import { verifySoleraLiveChatToken } from "@/lib/solera-live/chat-token";
import { SoleraLiveChatRateLimiter, validateSoleraLiveChatMessagePayload } from "@/lib/solera-live/chat";
import { buildSoleraLiveChannels } from "@/lib/solera-live/types";

export const dynamic = "force-dynamic";

const serverChatRateLimiter = new SoleraLiveChatRateLimiter();

async function readPayload(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function readChatToken(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const token = (payload as Readonly<Record<string, unknown>>)["chatToken"];
  return typeof token === "string" ? token : undefined;
}

export async function POST(request: NextRequest) {
  const config = getSoleraLivePublicConfig();

  if (!config.enabled) {
    return NextResponse.json({ error: "Solera Live is disabled." }, { status: 403 });
  }

  const payload = await readPayload(request);
  const validation = validateSoleraLiveChatMessagePayload(payload, config.chat.maxLength);

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const tokenIsValid = verifySoleraLiveChatToken(readChatToken(payload), {
    userId: validation.chatMessage.userId,
    displayName: validation.chatMessage.displayName,
    roomId: validation.chatMessage.roomId,
    region: validation.chatMessage.region,
  });
  if (!tokenIsValid) {
    return NextResponse.json({ error: "Chat authorization is invalid." }, { status: 403 });
  }

  const rateLimit = serverChatRateLimiter.check(validation.chatMessage.userId);
  if (!rateLimit.ok) {
    return NextResponse.json({ error: rateLimit.message, retryAfterMs: rateLimit.retryAfterMs }, { status: 429 });
  }

  if (config.provider === "mock") {
    return NextResponse.json({ ok: true, provider: "mock", message: validation.chatMessage });
  }

  const apiKey = process.env["ABLY_API_KEY"];

  if (!apiKey) {
    return NextResponse.json({ error: "Ably credentials are not configured." }, { status: 503 });
  }

  const channels = buildSoleraLiveChannels(validation.chatMessage.region, validation.chatMessage.roomId);
  const rest = new Rest({ key: apiKey });
  await rest.channels.get(channels.chat).publish("chat", validation.chatMessage);

  return NextResponse.json({ ok: true, provider: "ably" });
}
