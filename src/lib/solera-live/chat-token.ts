import { createHmac, timingSafeEqual } from "node:crypto";
import { SOLERA_LIVE_ASSIGNMENT_TTL_SECONDS } from "./config";
import { type SoleraLiveRegion } from "./types";

type ChatTokenClaims = Readonly<{
  displayName: string;
  expiresAtMs: number;
  region: SoleraLiveRegion;
  roomId: string;
  userId: string;
}>;

export type SoleraLiveChatTokenSubject = Readonly<{
  displayName: string;
  region: SoleraLiveRegion;
  roomId: string;
  userId: string;
}>;

function chatTokenSecret(): string {
  return process.env["SOLERA_LIVE_CHAT_TOKEN_SECRET"] ?? process.env["ABLY_API_KEY"] ?? "solera-live-local-chat-token-secret";
}

function signTokenPayload(payload: string): string {
  return createHmac("sha256", chatTokenSecret()).update(payload).digest("base64url");
}

function sameSignature(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function createSoleraLiveChatToken(subject: SoleraLiveChatTokenSubject, nowMs = Date.now()): string {
  const claims: ChatTokenClaims = {
    ...subject,
    expiresAtMs: nowMs + SOLERA_LIVE_ASSIGNMENT_TTL_SECONDS * 1000,
  };
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signedPayload = `v1.${payload}`;

  return `${signedPayload}.${signTokenPayload(signedPayload)}`;
}

export function verifySoleraLiveChatToken(token: string | undefined, subject: SoleraLiveChatTokenSubject, nowMs = Date.now()): boolean {
  if (!token) {
    return false;
  }

  const [version, payload, signature, extra] = token.split(".");
  if (version !== "v1" || !payload || !signature || extra) {
    return false;
  }

  const signedPayload = `${version}.${payload}`;
  if (!sameSignature(signature, signTokenPayload(signedPayload))) {
    return false;
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<ChatTokenClaims>;

    return (
      claims.expiresAtMs !== undefined &&
      claims.expiresAtMs >= nowMs &&
      claims.userId === subject.userId &&
      claims.displayName === subject.displayName &&
      claims.roomId === subject.roomId &&
      claims.region === subject.region
    );
  } catch {
    return false;
  }
}
