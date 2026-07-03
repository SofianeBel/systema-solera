import { assertNever } from "../../lib/assert-never";
import type { ModelId } from "../../lib/models";
import * as THREE from "three";

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
  const effectiveQuality = surface === "preview" ? "2k" : quality;

  switch (modelId) {
    case "sol":
      return {
        colorMap: texturePath(`${effectiveQuality}_sun.jpg`),
        attributions: [SOLAR_SYSTEM_SCOPE],
      };
    case "terra":
      return {
        colorMap: texturePath(`${effectiveQuality}_earth_daymap.jpg`),
        cloudMap: texturePath(`${effectiveQuality}_earth_clouds.jpg`),
        nightMap: texturePath(`${effectiveQuality}_earth_nightmap.jpg`),
        attributions: [NASA_BLUE_MARBLE, NASA_BLACK_MARBLE, SOLAR_SYSTEM_SCOPE],
      };
    case "luna":
      return {
        colorMap: texturePath(`${effectiveQuality}_moon.jpg`),
        attributions: [NASA_MOON_KIT],
      };
    default:
      return assertNever(modelId);
  }
}

const textureCache = new Map<string, Promise<THREE.Texture>>();

function textureUrls(assets: BodyTextureAssets): string[] {
  return Array.from(new Set([assets.colorMap, assets.cloudMap, assets.nightMap].filter((url): url is string => Boolean(url))));
}

function configureColorTexture(texture: THREE.Texture): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

export function loadTextureAsset(url: string): Promise<THREE.Texture> {
  const cached = textureCache.get(url);
  if (cached) {
    return cached;
  }

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (texture) => resolve(configureColorTexture(texture)),
      undefined,
      (error) => reject(error),
    );
  });
  textureCache.set(url, promise);
  return promise;
}

export async function preloadBodyTextures(modelId: ModelId, surface: BodyTextureSurface, quality: TextureQuality): Promise<void> {
  const assets = getBodyTextureAssets(modelId, surface, quality);
  await Promise.all(textureUrls(assets).map((url) => loadTextureAsset(url)));
}
