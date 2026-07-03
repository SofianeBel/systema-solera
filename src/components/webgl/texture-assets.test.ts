import { describe, expect, it } from "vitest";
import { getBodyTextureAssets } from "./texture-assets";

describe("body texture assets", () => {
  it("Given desktop and compact profiles When textures are resolved Then quality follows the rendering budget", () => {
    const previewTerra = getBodyTextureAssets("terra", "preview", "8k");
    const previewSol = getBodyTextureAssets("sol", "preview", "8k");
    const previewLuna = getBodyTextureAssets("luna", "preview", "8k");
    const immersiveTerra = getBodyTextureAssets("terra", "immersive", "8k");
    const immersiveSol = getBodyTextureAssets("sol", "immersive", "8k");
    const immersiveLuna = getBodyTextureAssets("luna", "immersive", "8k");
    const terraSources = immersiveTerra.attributions.map((attribution) => attribution.source);

    expect(previewSol.colorMap).toBe("/textures/solera/2k_sun.jpg");
    expect(previewTerra.colorMap).toBe("/textures/solera/2k_earth_daymap.jpg");
    expect(previewTerra.cloudMap).toBe("/textures/solera/2k_earth_clouds.jpg");
    expect(previewTerra.nightMap).toBe("/textures/solera/2k_earth_nightmap.jpg");
    expect(previewLuna.colorMap).toBe("/textures/solera/2k_moon.jpg");
    expect(immersiveTerra.colorMap).toBe("/textures/solera/8k_earth_daymap.jpg");
    expect(immersiveTerra.cloudMap).toBe("/textures/solera/8k_earth_clouds.jpg");
    expect(immersiveTerra.nightMap).toBe("/textures/solera/8k_earth_nightmap.jpg");
    expect(immersiveSol.colorMap).toBe("/textures/solera/8k_sun.jpg");
    expect(immersiveLuna.colorMap).toBe("/textures/solera/8k_moon.jpg");
    expect(terraSources).toContain("NASA Blue Marble Next Generation");
    expect(terraSources).toContain("NASA Black Marble 2016");
    expect(immersiveLuna.attributions).toContainEqual(
      expect.objectContaining({ source: "NASA SVS CGI Moon Kit" }),
    );
  });
});
