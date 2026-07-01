import { describe, expect, it } from "vitest";
import { SoleraLiveReportRateLimiter, validateSoleraLiveReportPayload } from "./reports";

describe("Solera Live report validation", () => {
  it("Given a valid message report When validating Then it receives seven-day retention metadata", () => {
    const result = validateSoleraLiveReportPayload(
      {
        reporterUserId: "reporter",
        targetUserId: "target",
        messageId: "message-1",
        roomId: "solera-eu-001",
        region: "eu",
        assignmentProof: "proof-1",
        reason: "unsafe",
        messageText: "bad message",
      },
      new Date("2026-06-30T12:00:00.000Z"),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record.createdAt).toBe("2026-06-30T12:00:00.000Z");
      expect(result.record.expiresAt).toBe("2026-07-07T12:00:00.000Z");
      expect(result.record.messageText).toBe("bad message");
    }
  });

  it("Given no target user or message When validating Then it is rejected", () => {
    const result = validateSoleraLiveReportPayload({
      reporterUserId: "reporter",
      roomId: "solera-us-001",
      region: "us",
      assignmentProof: "proof-1",
      reason: "spam",
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toBe("Report must target a user or a message.");
  });

  it("Given no assignment proof When validating Then it is rejected", () => {
    const result = validateSoleraLiveReportPayload({
      reporterUserId: "reporter",
      targetUserId: "target",
      roomId: "solera-us-001",
      region: "us",
      reason: "spam",
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toBe("Report is missing required moderation fields.");
  });

  it("Given too many reports from one client inside the window When checking rate limit Then the next report is blocked", () => {
    const limiter = new SoleraLiveReportRateLimiter(2, 100, 1000);

    expect(limiter.check("client-a", 1000).ok).toBe(true);
    expect(limiter.check("client-a", 1100).ok).toBe(true);
    const result = limiter.check("client-a", 1200);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toBe("rate_limited");
  });

  it("Given too many reports across clients inside the window When checking rate limit Then the global budget blocks writes", () => {
    const limiter = new SoleraLiveReportRateLimiter(10, 2, 1000);

    expect(limiter.check("client-a", 1000).ok).toBe(true);
    expect(limiter.check("client-b", 1100).ok).toBe(true);
    const result = limiter.check("client-c", 1200);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toBe("rate_limited");
  });
});
