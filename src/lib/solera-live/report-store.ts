import { type SoleraLiveReportRecord } from "./types";

export const SOLERA_LIVE_REPORT_FALLBACK_MAX_RECORDS = 200;

const fallbackReports = new Map<string, SoleraLiveReportRecord>();

export async function storeSoleraLiveReport(record: SoleraLiveReportRecord): Promise<"blobs" | "memory"> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: "solera-live-reports", consistency: "strong" });
    await store.setJSON(`${record.region}/${record.reportId}.json`, record);
    return "blobs";
  } catch {
    fallbackReports.set(record.reportId, record);
    while (fallbackReports.size > SOLERA_LIVE_REPORT_FALLBACK_MAX_RECORDS) {
      const oldestReportId = fallbackReports.keys().next().value;
      if (!oldestReportId) {
        break;
      }
      fallbackReports.delete(oldestReportId);
    }
    return "memory";
  }
}

export function getFallbackSoleraLiveReports(): readonly SoleraLiveReportRecord[] {
  return [...fallbackReports.values()];
}

export function resetFallbackSoleraLiveReports(): void {
  fallbackReports.clear();
}
