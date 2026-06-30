import { type SoleraLiveIdentity } from "./types";
import { hasSoleraLiveBlockedPublicText } from "./moderation";

const GENERATED_NAMES = ["Sol", "Terra", "Luna", "Orbit", "Aster", "Nova", "Comet", "Zenith"] as const;
const VISUAL_COLORS = ["#f7c767", "#73d6ff", "#d7d9e5", "#ff8f70", "#9ce6b8", "#a9b5ff"] as const;

export function normalizeSoleraLiveDisplayName(input: string): string {
  const readableInput = input.trim().replace(/\s+/g, " ").slice(0, 64);
  const displayName = readableInput
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w -]/g, "")
    .slice(0, 24);

  if (!displayName || hasSoleraLiveBlockedPublicText(readableInput) || hasSoleraLiveBlockedPublicText(displayName)) {
    return "";
  }

  return displayName;
}

export function hashSoleraLiveString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function createSoleraLiveIdentity(input: Readonly<{ displayName?: string; randomSeed?: string }> = {}): SoleraLiveIdentity {
  const seed = input.randomSeed ?? Math.random().toString(36).slice(2, 10);
  const hash = hashSoleraLiveString(seed);
  const generatedName = `${GENERATED_NAMES[hash % GENERATED_NAMES.length]}-${String(hash % 1000).padStart(3, "0")}`;
  const displayName = normalizeSoleraLiveDisplayName(input.displayName ?? "") || generatedName;
  const visualColor = VISUAL_COLORS[hash % VISUAL_COLORS.length] ?? VISUAL_COLORS[0];

  return {
    userId: `solera-${seed}`,
    displayName,
    visualSeed: seed,
    visualColor,
  };
}
