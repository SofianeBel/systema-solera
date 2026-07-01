import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getFallbackSoleraLiveReports,
  resetFallbackSoleraLiveReports,
  SOLERA_LIVE_REPORT_FALLBACK_MAX_RECORDS,
  storeSoleraLiveReport,
} from "./report-store";
import { type SoleraLiveReportRecord } from "./types";

vi.mock("@netlify/blobs", () => ({
  getStore: () => {
    throw new Error("Blob storage unavailable");
  },
}));

function createReportRecord(index: number): SoleraLiveReportRecord {
  return {
    reportId: `report-${index}`,
    reporterUserId: `client-${index}`,
    roomId: "solera-eu-001",
    region: "eu",
    reason: "spam",
    createdAt: "2026-06-30T12:00:00.000Z",
    expiresAt: "2026-07-07T12:00:00.000Z",
    targetUserId: "target",
  };
}

describe("Solera Live report fallback store", () => {
  afterEach(() => {
    resetFallbackSoleraLiveReports();
  });

  it("Given more reports than the fallback budget When storing without Blob support Then it evicts oldest records", async () => {
    for (let index = 0; index < SOLERA_LIVE_REPORT_FALLBACK_MAX_RECORDS + 5; index += 1) {
      await storeSoleraLiveReport(createReportRecord(index));
    }

    const reports = getFallbackSoleraLiveReports();

    expect(reports).toHaveLength(SOLERA_LIVE_REPORT_FALLBACK_MAX_RECORDS);
    expect(reports[0]?.reportId).toBe("report-5");
    expect(reports.at(-1)?.reportId).toBe(`report-${SOLERA_LIVE_REPORT_FALLBACK_MAX_RECORDS + 4}`);
  });
});
