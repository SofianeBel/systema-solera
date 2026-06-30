import { isSoleraLiveRegion } from "./region";
import { type SoleraLiveReportReason, type SoleraLiveReportRecord } from "./types";

export const SOLERA_LIVE_REPORT_REASONS = ["abuse", "spam", "unsafe", "other"] as const satisfies readonly SoleraLiveReportReason[];
export const SOLERA_LIVE_REPORT_RETENTION_DAYS = 7;

type ReportPayload = Readonly<Record<string, unknown>>;

export type SoleraLiveReportValidationResult =
  | Readonly<{ ok: true; record: SoleraLiveReportRecord }>
  | Readonly<{ ok: false; message: string }>;

function stringField(payload: ReportPayload, key: string, maxLength: number): string | undefined {
  const value = payload[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const normalizedValue = value.trim().slice(0, maxLength);
  return normalizedValue || undefined;
}

function isReportReason(value: unknown): value is SoleraLiveReportReason {
  return typeof value === "string" && SOLERA_LIVE_REPORT_REASONS.includes(value as SoleraLiveReportReason);
}

export function validateSoleraLiveReportPayload(payload: unknown, now = new Date()): SoleraLiveReportValidationResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Report payload must be an object." };
  }

  const reportPayload = payload as ReportPayload;
  const reporterUserId = stringField(reportPayload, "reporterUserId", 80);
  const roomId = stringField(reportPayload, "roomId", 80);
  const targetUserId = stringField(reportPayload, "targetUserId", 80);
  const messageId = stringField(reportPayload, "messageId", 80);
  const region = reportPayload["region"];
  const reason = reportPayload["reason"];

  if (!reporterUserId || !roomId || !isSoleraLiveRegion(region) || !isReportReason(reason)) {
    return { ok: false, message: "Report is missing required moderation fields." };
  }

  if (!targetUserId && !messageId) {
    return { ok: false, message: "Report must target a user or a message." };
  }

  const expiresAt = new Date(now.getTime() + SOLERA_LIVE_REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const reportId = `report-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const messageText = stringField(reportPayload, "messageText", 280);
  const note = stringField(reportPayload, "note", 280);

  return {
    ok: true,
    record: {
      reportId,
      reporterUserId,
      roomId,
      region,
      reason,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      ...(targetUserId ? { targetUserId } : {}),
      ...(messageId ? { messageId } : {}),
      ...(messageText ? { messageText } : {}),
      ...(note ? { note } : {}),
    },
  };
}
