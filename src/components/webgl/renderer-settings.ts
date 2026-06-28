import * as THREE from "three";

export const TONE_MAPPING_EXPOSURE = 1.08;

type RendererSettings = Readonly<{
  antialias: true;
  alpha: boolean;
  powerPreference: WebGLPowerPreference;
}>;

export function rendererSettings(alpha: boolean): RendererSettings {
  return {
    antialias: true,
    alpha,
    powerPreference: "high-performance",
  };
}

export function configureRenderer(renderer: THREE.WebGLRenderer): void {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;
}
