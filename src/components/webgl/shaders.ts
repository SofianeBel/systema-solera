import * as THREE from "three";
import { assertNever } from "@/lib/assert-never";
import type { ModelId } from "@/lib/models";

export type BodyShader = Readonly<{
  baseColor: THREE.Vector3;
  accentColor: THREE.Vector3;
  glowColor: THREE.Vector3;
  noiseScale: number;
  rimPower: number;
  mode: number;
  textureInfluence: number;
  atmospherePower: number;
  atmosphereIntensity: number;
  atmosphereScale: number;
}>;

export { atmosphereFragmentShader, atmosphereVertexShader } from "./atmosphere-shader-source";
export { fragmentShader, vertexShader } from "./body-shader-source";

export function getBodyShader(modelId: ModelId): BodyShader {
  switch (modelId) {
    case "sol":
      return {
        baseColor: new THREE.Vector3(1.0, 0.48, 0.08),
        accentColor: new THREE.Vector3(1.0, 0.86, 0.26),
        glowColor: new THREE.Vector3(0.95, 0.24, 0.05),
        noiseScale: 4.4,
        rimPower: 1.18,
        mode: 0,
        textureInfluence: 0,
        atmospherePower: 1.74,
        atmosphereIntensity: 0.28,
        atmosphereScale: 1.035,
      };
    case "terra":
      return {
        baseColor: new THREE.Vector3(0.05, 0.26, 0.46),
        accentColor: new THREE.Vector3(0.18, 0.68, 0.62),
        glowColor: new THREE.Vector3(0.20, 0.55, 0.88),
        noiseScale: 5.2,
        rimPower: 2.2,
        mode: 1,
        textureInfluence: 1,
        atmospherePower: 2.7,
        atmosphereIntensity: 0.22,
        atmosphereScale: 1.018,
      };
    case "luna":
      return {
        baseColor: new THREE.Vector3(0.50, 0.52, 0.56),
        accentColor: new THREE.Vector3(0.88, 0.90, 0.96),
        glowColor: new THREE.Vector3(0.62, 0.62, 0.66),
        noiseScale: 7.5,
        rimPower: 2.8,
        mode: 2,
        textureInfluence: 0.98,
        atmospherePower: 3.2,
        atmosphereIntensity: 0.026,
        atmosphereScale: 1.004,
      };
    default:
      return assertNever(modelId);
  }
}
