import { SOLERA_LIVE_REGIONS, type SoleraLiveClientHints, type SoleraLiveRegion } from "./types";

export function isSoleraLiveRegion(value: unknown): value is SoleraLiveRegion {
  return typeof value === "string" && SOLERA_LIVE_REGIONS.includes(value as SoleraLiveRegion);
}

function regionFromLatency(hints: SoleraLiveClientHints | undefined): SoleraLiveRegion | null {
  const latencies = hints?.regionLatenciesMs;
  if (!latencies) {
    return null;
  }

  const candidates = SOLERA_LIVE_REGIONS
    .map((region) => ({ region, latency: latencies[region] }))
    .filter((candidate): candidate is { region: SoleraLiveRegion; latency: number } => typeof candidate.latency === "number" && Number.isFinite(candidate.latency));

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((left, right) => left.latency - right.latency)[0]?.region ?? null;
}

function regionFromPlatformHints(hints: SoleraLiveClientHints | undefined): SoleraLiveRegion | null {
  const timeZone = hints?.timeZone?.toLowerCase() ?? "";
  const locale = hints?.locale?.toLowerCase() ?? "";

  if (timeZone.startsWith("america/") || locale.endsWith("-us")) {
    return "us";
  }

  if (timeZone.startsWith("europe/") || locale.endsWith("-gb") || locale.endsWith("-fr") || locale.endsWith("-de") || locale.endsWith("-es") || locale.endsWith("-it")) {
    return "eu";
  }

  return null;
}

export function selectSoleraLiveRegion(input: Readonly<{ requestedRegion?: unknown; clientHints?: SoleraLiveClientHints }> = {}): SoleraLiveRegion {
  if (isSoleraLiveRegion(input.requestedRegion)) {
    return input.requestedRegion;
  }

  return regionFromLatency(input.clientHints) ?? regionFromPlatformHints(input.clientHints) ?? "eu";
}
