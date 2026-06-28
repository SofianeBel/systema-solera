import { describe, expect, it } from "vitest";
import { atmosphereFragmentShader, atmosphereVertexShader, fragmentShader, getBodyShader } from "./shaders";

describe("body shaders", () => {
  it("Given Sol is plasma When its shader profile is resolved Then the photosphere is procedural rather than texture-driven", () => {
    const shader = getBodyShader("sol");

    expect(shader.textureInfluence).toBe(0);
    expect(shader.atmosphereIntensity).toBeGreaterThan(0.2);
    expect(shader.atmosphereIntensity).toBeLessThan(0.5);
  });

  it("Given Sol should feel turbulent When shader source is inspected Then it contains limb darkening and irregular corona cues", () => {
    expect(fragmentShader).toContain("limbShade");
    expect(fragmentShader).toContain("centerHeat");
    expect(fragmentShader).toContain("chromosphereRing");
    expect(atmosphereVertexShader).toContain("coronaWarp");
    expect(atmosphereFragmentShader).toContain("outerCorona");
    expect(atmosphereFragmentShader).toContain("irregularBloom");
    expect(atmosphereFragmentShader).toContain("localizedProminence");
    expect(atmosphereFragmentShader).toContain("prominenceArcs");
  });

  it("Given Luna is a dry satellite When its shader profile is resolved Then it avoids blue atmospheric styling", () => {
    const shader = getBodyShader("luna");

    expect(shader.atmosphereIntensity).toBeLessThan(0.04);
    expect(shader.glowColor.z).toBeLessThan(0.82);
  });
});
