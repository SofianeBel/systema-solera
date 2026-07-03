import { afterEach, describe, expect, it, vi } from "vitest";
import { type NextRequest } from "next/server";
import { soleraLiveRoomRegistry } from "@/lib/solera-live/rooms";
import { buildSoleraLiveChannels, type SoleraLiveRoomAssignment } from "@/lib/solera-live/types";
import { POST as assignRoom } from "../rooms/assign/route";
import { POST } from "./route";

function createAssignRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/solera-live/rooms/assign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function createTokenRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/solera-live/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("Solera Live token route", () => {
  afterEach(() => {
    soleraLiveRoomRegistry.reset();
    vi.unstubAllEnvs();
  });

  it("Given no matching room assignment When requesting a realtime token Then the server rejects it", async () => {
    vi.stubEnv("ABLY_API_KEY", "app.key:secret");
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");

    const response = await POST(createTokenRequest({ clientId: "attacker", assignmentProof: "proof", region: "eu", roomId: "solera-eu-999" }));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Token request is not authorized.");
  });

  it("Given another client owns the room When requesting a realtime token Then the server rejects it", async () => {
    vi.stubEnv("ABLY_API_KEY", "app.key:secret");
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");

    const assignmentResponse = await assignRoom(createAssignRequest({ requestedRegion: "eu", clientId: "user-1", displayName: "Aster" }));
    const assignment = (await assignmentResponse.json()) as SoleraLiveRoomAssignment;
    const response = await POST(
      createTokenRequest({ clientId: "attacker", assignmentProof: assignment.assignmentProof, region: assignment.region, roomId: assignment.roomId }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Token request is not authorized.");
  });

  it("Given a copied client id without its assignment proof When requesting a realtime token Then the server rejects it", async () => {
    vi.stubEnv("ABLY_API_KEY", "app.key:secret");
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");

    const assignmentResponse = await assignRoom(createAssignRequest({ requestedRegion: "eu", clientId: "user-1", displayName: "Aster" }));
    const assignment = (await assignmentResponse.json()) as SoleraLiveRoomAssignment;
    const response = await POST(createTokenRequest({ clientId: assignment.clientId, region: assignment.region, roomId: assignment.roomId }));
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Token request is not authorized.");
  });

  it("Given an active room assignment When requesting a realtime token Then the server returns scoped Ably credentials", async () => {
    vi.stubEnv("ABLY_API_KEY", "app.key:secret");
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");

    const assignmentResponse = await assignRoom(createAssignRequest({ requestedRegion: "eu", clientId: "user-1", displayName: "Aster" }));
    const assignment = (await assignmentResponse.json()) as SoleraLiveRoomAssignment;
    const tokenResponse = await POST(
      createTokenRequest({
        clientId: assignment.clientId,
        assignmentProof: assignment.assignmentProof,
        region: assignment.region,
        roomId: assignment.roomId,
      }),
    );
    const body = (await tokenResponse.json()) as {
      provider?: string;
      tokenRequest?: { capability?: string | Record<string, string[]>; clientId?: string };
    };
    const channels = buildSoleraLiveChannels("eu", "solera-eu-001");
    const capability = typeof body.tokenRequest?.capability === "string" ? JSON.parse(body.tokenRequest.capability) : body.tokenRequest?.capability;

    expect(tokenResponse.status).toBe(200);
    expect(body.provider).toBe("ably");
    expect(body.tokenRequest?.clientId).toBe(assignment.clientId);
    expect(capability?.[channels.chat]).toEqual(["subscribe"]);
  });
});
