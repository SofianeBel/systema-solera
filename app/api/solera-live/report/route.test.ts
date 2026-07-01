import { afterEach, describe, expect, it, vi } from "vitest";
import { type NextRequest } from "next/server";
import { resetFallbackSoleraLiveReports } from "@/lib/solera-live/report-store";
import { soleraLiveRoomRegistry } from "@/lib/solera-live/rooms";
import { type SoleraLiveRoomAssignment } from "@/lib/solera-live/types";
import { POST as assignRoom } from "../rooms/assign/route";
import { POST } from "./route";

function createAssignRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/solera-live/rooms/assign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

function createReportRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/solera-live/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as NextRequest;
}

describe("Solera Live report route", () => {
  afterEach(() => {
    soleraLiveRoomRegistry.reset();
    resetFallbackSoleraLiveReports();
    vi.unstubAllEnvs();
  });

  it("Given no active assignment When submitting a forged report Then the server rejects it", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");

    const response = await POST(
      createReportRequest({
        reporterUserId: "attacker",
        assignmentProof: "proof",
        targetUserId: "target",
        messageId: "message-1",
        roomId: "solera-eu-001",
        region: "eu",
        reason: "unsafe",
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Report is not authorized.");
  });

  it("Given another client owns the assignment proof When submitting a report Then the server rejects it", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");

    const assignmentResponse = await assignRoom(createAssignRequest({ requestedRegion: "eu", displayName: "Aster" }));
    const assignment = (await assignmentResponse.json()) as SoleraLiveRoomAssignment;
    const response = await POST(
      createReportRequest({
        reporterUserId: "attacker",
        assignmentProof: assignment.assignmentProof,
        targetUserId: assignment.clientId,
        messageId: "message-1",
        roomId: assignment.roomId,
        region: assignment.region,
        reason: "unsafe",
      }),
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(403);
    expect(body.error).toBe("Report is not authorized.");
  });

  it("Given an active room assignment When submitting a message report Then the server stores it", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");

    const assignmentResponse = await assignRoom(createAssignRequest({ requestedRegion: "eu", displayName: "Aster" }));
    const assignment = (await assignmentResponse.json()) as SoleraLiveRoomAssignment;
    const response = await POST(
      createReportRequest({
        reporterUserId: assignment.clientId,
        assignmentProof: assignment.assignmentProof,
        targetUserId: "target",
        messageId: "message-1",
        roomId: assignment.roomId,
        region: assignment.region,
        reason: "unsafe",
        messageText: "bad message",
      }),
    );
    const body = (await response.json()) as { expiresAt?: string; reportId?: string; storedIn?: string };

    expect(response.status).toBe(200);
    expect(body.reportId).toMatch(/^report-/);
    expect(body.storedIn).toMatch(/^(blobs|memory)$/);
    expect(body.expiresAt).toBeDefined();
  });

  it("Given repeated reports from one assigned client When the report budget is exhausted Then the server throttles further writes", async () => {
    vi.stubEnv("SOLERA_LIVE_ENABLED", "true");

    const assignmentResponse = await assignRoom(createAssignRequest({ requestedRegion: "eu", displayName: "Aster" }));
    const assignment = (await assignmentResponse.json()) as SoleraLiveRoomAssignment;
    const reportBody = {
      reporterUserId: assignment.clientId,
      assignmentProof: assignment.assignmentProof,
      targetUserId: "target",
      roomId: assignment.roomId,
      region: assignment.region,
      reason: "spam",
    };

    expect((await POST(createReportRequest({ ...reportBody, messageId: "message-1" }))).status).toBe(200);
    expect((await POST(createReportRequest({ ...reportBody, messageId: "message-2" }))).status).toBe(200);
    expect((await POST(createReportRequest({ ...reportBody, messageId: "message-3" }))).status).toBe(200);

    const response = await POST(createReportRequest({ ...reportBody, messageId: "message-4" }));
    const body = (await response.json()) as { error?: string; retryAfterMs?: number };

    expect(response.status).toBe(429);
    expect(body.error).toBe("Slow down before sending another report.");
    expect(body.retryAfterMs).toBeGreaterThan(0);
  });
});
