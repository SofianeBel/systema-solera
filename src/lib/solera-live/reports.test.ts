import { describe, expect, it } from "vitest";
import { validateSoleraLiveReportPayload } from "./reports";

describe("Solera Live report validation", () => {
  it("Given a valid message report When validating Then it receives seven-day retention metadata", () => {
    const result = validateSoleraLiveReportPayload(
      {
        reporterUserId: "reporter",
        targetUserId: "target",
        messageId: "message-1",
        roomId: "solera-eu-001",
        region: "eu",
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
      reason: "spam",
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toBe("Report must target a user or a message.");
  });
});
