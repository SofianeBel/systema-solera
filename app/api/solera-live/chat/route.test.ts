import { afterEach, describe, expect, it, vi } from "vitest";
import { type NextRequest } from "next/server";
import { createSoleraLiveChatToken } from "@/lib/solera-live/chat-token";
import { POST } from "./route";

function createChatRequest(
  text: string,
  options: Readonly<{ displayName?: string; ip?: string; token?: string; userId?: string }> = {},
): NextRequest {
  const displayName = options.displayName ?? "Aster";
  const userId = options.userId ?? "user-1";
  const roomId = "solera-eu-001";
  const region = "eu";
  const chatToken =
    options.token ??
    createSoleraLiveChatToken({
      userId,
      displayName,
      roomId,
      region,
    });

  return new Request("http://localhost/api/solera-live/chat", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": options.ip ?? "198.51.100.1" },
    body: JSON.stringify({
      messageId: `message-${text.length}`,
      userId,
      displayName,
      roomId,
      region,
      text,
      createdAt: "2026-06-30T12:00:00.000Z",
      chatToken,
    }),
  }) as NextRequest;
}

describe("Solera Live chat route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Given an unsafe message When posting chat Then the server rejects it", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");
    vi.stubEnv("SOLERA_LIVE_REALTIME_PROVIDER", "mock");

    const response = await POST(createChatRequest("c o n n a r d"));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("That message is not safe for public chat.");
  });

  it("Given an obfuscated unsafe English message When posting chat Then the server rejects it", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");
    vi.stubEnv("SOLERA_LIVE_REALTIME_PROVIDER", "mock");

    const response = await POST(createChatRequest("d u m b a s s"));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("That message is not safe for public chat.");
  });

  it("Given an unsafe display name When posting chat Then the server rejects it", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");
    vi.stubEnv("SOLERA_LIVE_REALTIME_PROVIDER", "mock");

    const response = await POST(createChatRequest("Hello Solera", { displayName: "c o n n a r d" }));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("That message is not safe for public chat.");
  });

  it("Given a safe message When posting chat in mock mode Then the server accepts it", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");
    vi.stubEnv("SOLERA_LIVE_REALTIME_PROVIDER", "mock");

    const response = await POST(createChatRequest("Hello Solera"));

    expect(response.status).toBe(200);
  });

  it("Given a missing chat token When posting chat Then the server rejects it", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");
    vi.stubEnv("SOLERA_LIVE_REALTIME_PROVIDER", "mock");

    const response = await POST(createChatRequest("Hello Solera", { token: "" }));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Chat authorization is invalid.");
  });

  it("Given rotated user ids from one client When posting repeatedly Then server rate limiting still applies", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");
    vi.stubEnv("SOLERA_LIVE_REALTIME_PROVIDER", "mock");

    const responses = await Promise.all(
      Array.from({ length: 6 }, (_, index) => POST(createChatRequest(`Hello Solera ${index}`, { ip: "203.0.113.9", userId: `rotating-user-${index}` }))),
    );

    expect(responses.slice(0, 5).every((response) => response.status === 200)).toBe(true);
    expect(responses[5]?.status).toBe(429);
  });
});
