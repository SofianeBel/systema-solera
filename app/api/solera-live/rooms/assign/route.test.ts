import { afterEach, describe, expect, it, vi } from "vitest";
import { type NextRequest } from "next/server";
import { soleraLiveRoomRegistry } from "@/lib/solera-live/rooms";
import { POST } from "./route";

function createAssignRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/solera-live/rooms/assign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("Solera Live room assignment route", () => {
  afterEach(() => {
    soleraLiveRoomRegistry.reset();
    vi.unstubAllEnvs();
  });

  it("Given a valid identity When assigning a room Then it returns a chat token", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");

    const response = await POST(createAssignRequest({ requestedRegion: "eu", clientId: "user-1", displayName: "Aster" }));
    const body = (await response.json()) as { chatToken?: string; roomId?: string };

    expect(response.status).toBe(200);
    expect(body.roomId).toBe("solera-eu-001");
    expect(typeof body.chatToken).toBe("string");
  });

  it("Given malformed optional fields When assigning a room Then it ignores them instead of throwing", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");

    const response = await POST(
      createAssignRequest({
        requestedRegion: 42,
        previousRoomId: ["solera-eu-001"],
        clientId: 123,
        displayName: null,
        clientHints: { locale: 123, regionLatenciesMs: { eu: "fast", us: 20 } },
      }),
    );
    const body = (await response.json()) as { region?: string; roomId?: string; chatToken?: string };

    expect(response.status).toBe(200);
    expect(body.region).toBe("us");
    expect(body.roomId).toBe("solera-us-001");
    expect(body.chatToken).toBeUndefined();
  });
});
