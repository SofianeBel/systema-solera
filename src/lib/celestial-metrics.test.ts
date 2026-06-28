import { describe, expect, it } from "vitest";
import {
  formatDiameter,
  formatDistance,
  formatScaleMode,
  formatSurfaceMetric,
  getCelestialMetric,
  getDistantMetrics,
} from "./celestial-metrics";

describe("celestial metrics", () => {
  it("Given Sol Terra and Luna When metrics are inspected Then real scale labels and compressed scene positions are available", () => {
    const terra = getCelestialMetric("terra");
    const luna = getCelestialMetric("luna");
    const distantFromTerra = getDistantMetrics("terra").map((metric) => metric.id);

    expect(formatDiameter(terra)).toBe("Diameter 12,742 km");
    expect(terra.surfaceLabel).toBe("510.1M km²");
    expect(formatSurfaceMetric(getCelestialMetric("sol"))).toBe("Photosphere area 6.09T km²");
    expect(formatSurfaceMetric(terra)).toBe("Surface area 510.1M km²");
    expect(formatScaleMode()).toBe("Scale: fixed scene / camera zoom");
    expect(formatDistance("sol", "terra")).toBe("149.6M km away");
    expect(formatDistance("terra", "luna")).toBe("384,400 km away");
    expect(terra.orbitsModelId).toBe("sol");
    expect(luna.orbitsModelId).toBe("terra");
    expect(luna.visualRadius / terra.visualRadius).toBeCloseTo(0.25, 1);
    expect(terra.scenePosition[0]).toBeGreaterThan(0);
    expect(luna.scenePosition[0]).toBeGreaterThan(terra.scenePosition[0]);
    expect(distantFromTerra).toEqual(["sol", "luna"]);
  });
});
