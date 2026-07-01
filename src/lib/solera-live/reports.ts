import { isSoleraLiveRegion } from "./region";
import { type SoleraLiveRegion, type SoleraLiveReportReason, type SoleraLiveReportRecord } from "./types";

export const SOLERA_LIVE_REPORT_REASONS = ["abuse", "spam", "unsafe", "other"] as const satisfies readonly SoleraLiveReportReason[];
export const SOLERA_LIVE_REPORT_RETENTION_DAYS = 7;
export const SOLERA_LIVE_REPORT_RATE_LIMIT_COUNT = 3;
export const SOLERA_LIVE_REPORT_GLOBAL_RATE_LIMIT_COUNT = 120;
export const SOLERA_LIVE_REPORT_RATE_LIMIT_WINDOW_SECONDS = 60;

type ReportPayload = Readonly<Record<string, unknown>>;

export type SoleraLiveReportValidationResult =
  | Readonly<{ ok: true; authorization: Readonly<{ assignmentProof: string; clientId: string; region: SoleraLiveRegion; roomId: string }>; record: SoleraLiveReportRecord }>
  | Readonly<{ ok: false; message: string }>;

export type SoleraLiveReportRateLimitResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; reason: "rate_limited"; message: string; retryAfterMs: number }>;

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
  const assignmentProof = stringField(reportPayload, "assignmentProof", 120);
  const region = reportPayload["region"];
  const reason = reportPayload["reason"];

  if (!reporterUserId || !roomId || !assignmentProof || !isSoleraLiveRegion(region) || !isReportReason(reason)) {
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
    authorization: {
      assignmentProof,
      clientId: reporterUserId,
      region,
      roomId,
    },
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

export class SoleraLiveReportRateLimiter {
  private readonly clientBuckets = new Map<string, number[]>();
  private globalBucket: number[] = [];

  constructor(
    private readonly clientLimit = SOLERA_LIVE_REPORT_RATE_LIMIT_COUNT,
    private readonly globalLimit = SOLERA_LIVE_REPORT_GLOBAL_RATE_LIMIT_COUNT,
    private readonly windowMs = SOLERA_LIVE_REPORT_RATE_LIMIT_WINDOW_SECONDS * 1000,
  ) {}

  check(clientId: string, nowMs = Date.now()): SoleraLiveReportRateLimitResult {
    const bucketKey = clientId.trim() || "unknown-client";
    const oldestAllowedMs = nowMs - this.windowMs;
    const clientReports = (this.clientBuckets.get(bucketKey) ?? []).filter((timestampMs) => timestampMs > oldestAllowedMs);
    const globalReports = this.globalBucket.filter((timestampMs) => timestampMs > oldestAllowedMs);
    const clientLimited = clientReports.length >= this.clientLimit;
    const globalLimited = globalReports.length >= this.globalLimit;

    if (clientLimited || globalLimited) {
      const oldestReportMs = (clientLimited ? clientReports[0] : globalReports[0]) ?? nowMs;
      const retryAfterMs = Math.max(0, this.windowMs - (nowMs - oldestReportMs));
      this.clientBuckets.set(bucketKey, clientReports);
      this.globalBucket = globalReports;
      return { ok: false, reason: "rate_limited", message: "Slow down before sending another report.", retryAfterMs };
    }

    clientReports.push(nowMs);
    globalReports.push(nowMs);
    this.clientBuckets.set(bucketKey, clientReports);
    this.globalBucket = globalReports;
    return { ok: true };
  }

  reset(): void {
    this.clientBuckets.clear();
    this.globalBucket = [];
  }
}
