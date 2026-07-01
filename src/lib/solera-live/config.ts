import { isSoleraLiveRegion } from "./region";
import { SOLERA_LIVE_REGIONS, type SoleraLivePublicConfig, type SoleraLiveProvider, type SoleraLiveRegion } from "./types";

export const SOLERA_LIVE_ROOM_TARGET_SIZE = 8;
export const SOLERA_LIVE_ROOM_MAX_SIZE = 16;
export const SOLERA_LIVE_MAX_ACTIVE_ROOMS = 32;
export const SOLERA_LIVE_ASSIGNMENT_TTL_SECONDS = 120;
export const SOLERA_LIVE_TOKEN_TTL_SECONDS = 15 * 60;
export const SOLERA_LIVE_CHAT_MAX_LENGTH = 240;
export const SOLERA_LIVE_CHAT_RATE_LIMIT_COUNT = 5;
export const SOLERA_LIVE_CHAT_RATE_LIMIT_WINDOW_SECONDS = 10;

type SoleraLiveEnv = Readonly<Record<string, string | undefined>>;

function readBoolean(value: string | undefined): boolean {
  return value === "1" || value?.toLowerCase() === "true";
}

function readProvider(env: SoleraLiveEnv): SoleraLiveProvider {
  if (env["SOLERA_LIVE_REALTIME_PROVIDER"] === "mock") {
    return "mock";
  }

  return env["ABLY_API_KEY"] ? "ably" : "mock";
}

function readDefaultRegion(env: SoleraLiveEnv): SoleraLiveRegion {
  const configuredRegion = env["SOLERA_LIVE_DEFAULT_REGION"];
  return isSoleraLiveRegion(configuredRegion) ? configuredRegion : "eu";
}

export function getSoleraLivePublicConfig(env: SoleraLiveEnv = process.env): SoleraLivePublicConfig {
  const enabled = readBoolean(env["SOLERA_LIVE_ENABLED"]);
  const unavailableReason = enabled ? undefined : "feature_flag_disabled";

  return {
    enabled,
    provider: readProvider(env),
    supportedRegions: SOLERA_LIVE_REGIONS,
    defaultRegion: readDefaultRegion(env),
    room: {
      targetSize: SOLERA_LIVE_ROOM_TARGET_SIZE,
      maxSize: SOLERA_LIVE_ROOM_MAX_SIZE,
      assignmentTtlSeconds: SOLERA_LIVE_ASSIGNMENT_TTL_SECONDS,
    },
    chat: {
      maxLength: SOLERA_LIVE_CHAT_MAX_LENGTH,
      rateLimitCount: SOLERA_LIVE_CHAT_RATE_LIMIT_COUNT,
      rateLimitWindowSeconds: SOLERA_LIVE_CHAT_RATE_LIMIT_WINDOW_SECONDS,
    },
    tokenTtlSeconds: SOLERA_LIVE_TOKEN_TTL_SECONDS,
    ...(unavailableReason ? { unavailableReason } : {}),
  };
}
