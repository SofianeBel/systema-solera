import { SOLERA_LIVE_CHAT_MAX_LENGTH, SOLERA_LIVE_CHAT_RATE_LIMIT_COUNT, SOLERA_LIVE_CHAT_RATE_LIMIT_WINDOW_SECONDS } from "./config";
import { hasSoleraLiveBlockedPublicText } from "./moderation";
import { isSoleraLiveRegion } from "./region";
import { type SoleraLiveChatMessage } from "./types";

export type SoleraLiveChatValidationResult =
  | Readonly<{ ok: true; text: string }>
  | Readonly<{ ok: false; reason: "empty" | "too_long" | "blocked_term" | "link" | "spam" | "rate_limited"; message: string; retryAfterMs?: number }>;

export type SoleraLiveChatMessageValidationResult =
  | Readonly<{ ok: true; chatMessage: SoleraLiveChatMessage }>
  | Readonly<{ ok: false; message: string }>;

const LINK_PATTERN = /\b(?:https?:\/\/|www\.|(?:discord\.gg|bit\.ly|tinyurl\.com|t\.me)\/|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/\S*)?)/i;
const REPEATED_CHARACTER_PATTERN = /(.)\1{9,}/i;

function stringField(payload: Readonly<Record<string, unknown>>, key: string, maxLength: number): string | undefined {
  const value = payload[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().slice(0, maxLength);
  return normalizedValue || undefined;
}

export function validateSoleraLiveChatText(input: string, maxLength = SOLERA_LIVE_CHAT_MAX_LENGTH): SoleraLiveChatValidationResult {
  const oversizedInput = input.length > maxLength + 2048;
  const rawText = oversizedInput ? input.slice(0, maxLength + 2049) : input;
  const text = rawText.trim().replace(/\s+/g, " ");

  if (!text) {
    return { ok: false, reason: "empty", message: "Write a message first." };
  }

  if (oversizedInput || text.length > maxLength) {
    return { ok: false, reason: "too_long", message: `Keep chat under ${maxLength} characters.` };
  }

  if (LINK_PATTERN.test(text)) {
    return { ok: false, reason: "link", message: "Links are not available in public chat." };
  }

  if (REPEATED_CHARACTER_PATTERN.test(text)) {
    return { ok: false, reason: "spam", message: "That looks like spam." };
  }

  if (hasSoleraLiveBlockedPublicText(text)) {
    return { ok: false, reason: "blocked_term", message: "That message is not safe for public chat." };
  }

  return { ok: true, text };
}

export function validateSoleraLiveChatMessagePayload(payload: unknown, maxLength = SOLERA_LIVE_CHAT_MAX_LENGTH): SoleraLiveChatMessageValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Chat payload must be an object." };
  }

  const chatPayload = payload as Readonly<Record<string, unknown>>;
  const messageId = stringField(chatPayload, "messageId", 80);
  const userId = stringField(chatPayload, "userId", 80);
  const displayName = stringField(chatPayload, "displayName", 24);
  const roomId = stringField(chatPayload, "roomId", 80);
  const region = chatPayload["region"];
  const text = stringField(chatPayload, "text", maxLength + 1);
  const createdAt = stringField(chatPayload, "createdAt", 40);

  if (!messageId || !userId || !displayName || !roomId || !isSoleraLiveRegion(region) || !text || !createdAt) {
    return { ok: false, message: "Chat message is missing required fields." };
  }

  if (hasSoleraLiveBlockedPublicText(displayName)) {
    return { ok: false, message: "That message is not safe for public chat." };
  }

  if (!roomId.startsWith(`solera-${region}-`) || Number.isNaN(new Date(createdAt).getTime())) {
    return { ok: false, message: "Chat message contains invalid room or time metadata." };
  }

  const textValidation = validateSoleraLiveChatText(text, maxLength);
  if (!textValidation.ok) {
    return { ok: false, message: textValidation.message };
  }

  return {
    ok: true,
    chatMessage: {
      messageId,
      userId,
      displayName,
      roomId,
      region,
      text: textValidation.text,
      createdAt,
    },
  };
}

export class SoleraLiveChatRateLimiter {
  private readonly buckets = new Map<string, number[]>();

  constructor(
    private readonly limit = SOLERA_LIVE_CHAT_RATE_LIMIT_COUNT,
    private readonly windowMs = SOLERA_LIVE_CHAT_RATE_LIMIT_WINDOW_SECONDS * 1000,
  ) {}

  check(userId: string, nowMs = Date.now()): SoleraLiveChatValidationResult {
    const oldestAllowedMs = nowMs - this.windowMs;
    const recentMessages = (this.buckets.get(userId) ?? []).filter((timestampMs) => timestampMs > oldestAllowedMs);

    if (recentMessages.length >= this.limit) {
      const retryAfterMs = Math.max(0, this.windowMs - (nowMs - (recentMessages[0] ?? nowMs)));
      this.buckets.set(userId, recentMessages);
      return { ok: false, reason: "rate_limited", message: "Slow down before sending another message.", retryAfterMs };
    }

    recentMessages.push(nowMs);
    this.buckets.set(userId, recentMessages);
    return { ok: true, text: "" };
  }

  reset(): void {
    this.buckets.clear();
  }
}
