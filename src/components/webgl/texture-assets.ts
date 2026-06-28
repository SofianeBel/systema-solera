import { assertNever } from "../../lib/assert-never";
import type { ModelId } from "../../lib/models";

export type BodyTextureSurface = "preview" | "immersive";
export type TextureQuality = "2k" | "8k";

export type TextureLicense = "CC-BY-4.0" | "NASA Open Media";

export type TextureAttribution = Readonly<{
  source: string;
  sourceUrl: string;
  license: TextureLicense;
  licenseUrl: string;
}>;

export type BodyTextureAssets = Readonly<{
  colorMap: string;
  cloudMap?: string;
  nightMap?: string;
  attributions: readonly [TextureAttribution, ...TextureAttribution[]];
}>;

const SOLAR_SYSTEM_SCOPE: TextureAttribution = {
  source: "Solar System Scope textures",
  sourceUrl: "https://www.solarsystemscope.com/textures/",
  license: "CC-BY-4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
};

const NASA_MEDIA_LICENSE_URL = "https://www.nasa.gov/nasa-brand-center/images-and-media/";

const NASA_BLUE_MARBLE: TextureAttribution = {
  source: "NASA Blue Marble Next Generation",
  sourceUrl: "https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/",
  license: "NASA Open Media",
  licenseUrl: NASA_MEDIA_LICENSE_URL,
};

const NASA_BLACK_MARBLE: TextureAttribution = {
  source: "NASA Black Marble 2016",
  sourceUrl: "https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/",
  license: "NASA Open Media",
  licenseUrl: NASA_MEDIA_LICENSE_URL,
};

const NASA_MOON_KIT: TextureAttribution = {
  source: "NASA SVS CGI Moon Kit",
  sourceUrl: "https://svs.gsfc.nasa.gov/4720/",
  license: "NASA Open Media",
  licenseUrl: NASA_MEDIA_LICENSE_URL,
};

function texturePath(fileName: string): string {
  return `/textures/solera/${fileName}`;
}

export function getBodyTextureAssets(modelId: ModelId, surface: BodyTextureSurface, quality: TextureQuality): BodyTextureAssets {
  switch (modelId) {
    case "sol":
      return {
        colorMap: texturePath(`${quality}_sun.jpg`),
        attributions: [SOLAR_SYSTEM_SCOPE],
      };
    case "terra":
      return {
        colorMap: texturePath(`${quality}_earth_daymap.jpg`),
        cloudMap: texturePath(`${quality}_earth_clouds.jpg`),
        nightMap: texturePath(`${quality}_earth_nightmap.jpg`),
        attributions: [NASA_BLUE_MARBLE, NASA_BLACK_MARBLE, SOLAR_SYSTEM_SCOPE],
      };
    case "luna":
      return {
        colorMap: texturePath(`${quality}_moon.jpg`),
        attributions: [NASA_MOON_KIT],
      };
    default:
      return assertNever(modelId);
  }
}
