import { describe, expect, it } from "vitest";
import { getCelestialMetric } from "./celestial-metrics";
import { MODEL_IDS } from "./models";
import { renderedSceneRadius, sceneScaleMultiplier, selectedCameraComposition } from "./scene-composition";

describe("scene composition", () => {
  function cameraDistance(modelId: "luna" | "sol" | "terra"): number {
    const offset = selectedCameraComposition(modelId, false).offset;
    return Math.hypot(...offset);
  }

  it("Given any selected scene When scene radii are resolved Then astres keep one shared scale", () => {
    for (const selectedModelId of MODEL_IDS) {
      for (const modelId of MODEL_IDS) {
        expect(sceneScaleMultiplier(modelId, selectedModelId)).toBe(1);
        expect(renderedSceneRadius(modelId, selectedModelId)).toBe(getCelestialMetric(modelId).visualRadius);
      }
    }
  });

  it("Given a selected scene When camera composition is resolved Then controls orbit the selected astre", () => {
    for (const modelId of MODEL_IDS) {
      expect(selectedCameraComposition(modelId, false).target).toEqual(getCelestialMetric(modelId).scenePosition);
    }
  });

  it("Given the celestial metrics When scene radii are resolved Then Luna keeps a satellite-scale radius", () => {
    const luna = getCelestialMetric("luna");
    const terra = getCelestialMetric("terra");
    const lunaRadius = renderedSceneRadius("luna", "luna");
    const terraRadius = renderedSceneRadius("terra", "luna");

    expect(luna.visualRadius / terra.visualRadius).toBeCloseTo(0.25, 2);
    expect(lunaRadius / terraRadius).toBeLessThan(0.35);
  });

  it("Given camera composition When target radius changes Then apparent size comes from zoom distance", () => {
    expect(cameraDistance("luna")).toBeLessThan(cameraDistance("terra"));
    expect(cameraDistance("terra")).toBeLessThan(cameraDistance("sol"));
    expect(selectedCameraComposition("luna", false).minDistance).toBeLessThan(selectedCameraComposition("terra", false).minDistance);
    expect(selectedCameraComposition("terra", false).minDistance).toBeLessThan(selectedCameraComposition("sol", false).minDistance);
  });
});
