import { describe, expect, it } from "vitest";
import { resolveRenderingProfile } from "./rendering-profile";

describe("resolveRenderingProfile", () => {
  it("Given no WebGL When resolving capabilities Then CSS fallback disables animation", () => {
    const profile = resolveRenderingProfile({ width: 1200, devicePixelRatio: 2, supportsWebGL: false, prefersReducedMotion: false, sceneVisible: true });

    expect(profile.mode).toBe("css");
    expect(profile.frameloop).toBe("demand");
    expect(profile.animated).toBe(false);
  });

  it("Given mobile WebGL When resolving capabilities Then DPR and geometry are capped", () => {
    const profile = resolveRenderingProfile({ width: 390, devicePixelRatio: 3, supportsWebGL: true, prefersReducedMotion: false, sceneVisible: true });

    expect(profile.mode).toBe("webgl-live");
    expect(profile.compact).toBe(true);
    expect(profile.textureQuality).toBe("2k");
    expect(profile.dpr).toEqual([1, 1]);
    expect(profile.particleCount).toBeGreaterThanOrEqual(860);
    expect(profile.particleCount).toBeLessThanOrEqual(920);
    expect(profile.sphereSegments).toBe(48);
  });

  it("Given desktop live WebGL When resolving capabilities Then quality targets PC visuals", () => {
    const profile = resolveRenderingProfile({ width: 1440, devicePixelRatio: 2.5, supportsWebGL: true, prefersReducedMotion: false, sceneVisible: true });

    expect(profile.mode).toBe("webgl-live");
    expect(profile.compact).toBe(false);
    expect(profile.textureQuality).toBe("8k");
    expect(profile.dpr).toEqual([1, 2]);
    expect(profile.sphereSegments).toBe(128);
    expect(profile.particleCount).toBeGreaterThanOrEqual(2500);
    expect(profile.particleCount).toBeLessThanOrEqual(2700);
  });

  it("Given reduced motion When resolving capabilities Then the canvas renders on demand", () => {
    const profile = resolveRenderingProfile({ width: 1440, devicePixelRatio: 2, supportsWebGL: true, prefersReducedMotion: true, sceneVisible: true });

    expect(profile.mode).toBe("webgl-static");
    expect(profile.textureQuality).toBe("2k");
    expect(profile.dpr).toEqual([1, 1.5]);
    expect(profile.frameloop).toBe("demand");
  });
});
