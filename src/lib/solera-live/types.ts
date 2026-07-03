import type { ModelId } from "@/lib/models";

export const SOLERA_LIVE_REGIONS = ["eu", "us"] as const;

export type SoleraLiveRegion = (typeof SOLERA_LIVE_REGIONS)[number];

export type SoleraLiveProvider = "ably" | "mock";

export type SoleraLiveClientState = "idle" | "disabled" | "connecting" | "connected" | "reconnecting" | "offline" | "error";

export type SoleraLiveChannels = Readonly<{
  presence: string;
  chat: string;
  pings: string;
  occupancy: string;
}>;

export type SoleraLivePublicConfig = Readonly<{
  enabled: boolean;
  provider: SoleraLiveProvider;
  supportedRegions: readonly SoleraLiveRegion[];
  defaultRegion: SoleraLiveRegion;
  room: Readonly<{
    targetSize: number;
    maxSize: number;
    assignmentTtlSeconds: number;
  }>;
  chat: Readonly<{
    maxLength: number;
    rateLimitCount: number;
    rateLimitWindowSeconds: number;
  }>;
  tokenTtlSeconds: number;
  unavailableReason?: string;
}>;

export type SoleraLiveClientHints = Readonly<{
  timeZone?: string;
  locale?: string;
  regionLatenciesMs?: Partial<Record<SoleraLiveRegion, number>>;
}>;

export type SoleraLiveRoomAssignmentRequest = Readonly<{
  requestedRegion?: SoleraLiveRegion | "auto" | string;
  previousRoomId?: string | null;
  clientId?: string;
  assignmentProof?: string;
  displayName?: string;
  clientHints?: SoleraLiveClientHints;
}>;

export type SoleraLiveRoomAssignment = Readonly<{
  region: SoleraLiveRegion;
  roomId: string;
  clientId: string;
  assignmentProof: string;
  occupancyEstimate: number;
  channels: SoleraLiveChannels;
  expiresAt: string;
  chatToken?: string;
}>;

export type SoleraLiveIdentity = Readonly<{
  userId: string;
  displayName: string;
  visualSeed: string;
  visualColor: string;
}>;

export type SoleraLivePresenceData = Readonly<{
  userId: string;
  displayName: string;
  selectedModelId: ModelId;
  visualSeed: string;
  visualColor: string;
  lastActivityAt: string;
}>;

export type SoleraLiveChatMessage = Readonly<{
  messageId: string;
  userId: string;
  displayName: string;
  roomId: string;
  region: SoleraLiveRegion;
  text: string;
  createdAt: string;
}>;

export type SoleraLivePingEvent = Readonly<{
  pingId: string;
  userId: string;
  displayName: string;
  selectedModelId: ModelId;
  target?: Readonly<{
    x: number;
    y: number;
    z?: number;
  }>;
  createdAt: string;
}>;

export type SoleraLiveReportReason = "abuse" | "spam" | "unsafe" | "other";

export type SoleraLiveReportRecord = Readonly<{
  reportId: string;
  reporterUserId: string;
  roomId: string;
  region: SoleraLiveRegion;
  reason: SoleraLiveReportReason;
  createdAt: string;
  expiresAt: string;
  targetUserId?: string;
  messageId?: string;
  messageText?: string;
  note?: string;
}>;

export function buildSoleraLiveChannels(region: SoleraLiveRegion, roomId: string): SoleraLiveChannels {
  const channelBase = `solera-live:${region}:${roomId}`;

  return {
    presence: `${channelBase}:presence`,
    chat: `${channelBase}:chat`,
    pings: `${channelBase}:pings`,
    occupancy: `${channelBase}:occupancy`,
  };
}
