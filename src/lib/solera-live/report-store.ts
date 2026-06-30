import { type SoleraLiveReportRecord } from "./types";

const fallbackReports = new Map<string, SoleraLiveReportRecord>();

export async function storeSoleraLiveReport(record: SoleraLiveReportRecord): Promise<"blobs" | "memory"> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: "solera-live-reports", consistency: "strong" });
    await store.setJSON(`${record.region}/${record.reportId}.json`, record);
    return "blobs";
  } catch {
    fallbackReports.set(record.reportId, record);
    return "memory";
  }
}

export function getFallbackSoleraLiveReports(): readonly SoleraLiveReportRecord[] {
  return [...fallbackReports.values()];
}

export function resetFallbackSoleraLiveReports(): void {
  fallbackReports.clear();
}
