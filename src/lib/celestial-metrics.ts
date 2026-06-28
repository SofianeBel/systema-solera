import { assertNever } from "./assert-never";
import { MODEL_IDS, type ModelId } from "./models";

export type SceneVector = [number, number, number];

export type CelestialMetric = Readonly<{
  id: ModelId;
  name: string;
  diameterKm: number;
  surfaceLabel: string;
  surfaceKind: "photosphere" | "surface";
  orbitKmFromSol: number;
  orbitsModelId: ModelId | null;
  scenePosition: SceneVector;
  visualRadius: number;
}>;

const KM_PER_SCENE_UNIT = 21_000_000;

const SOL_METRIC: CelestialMetric = {
  id: "sol",
  name: "Sol",
  diameterKm: 1_392_700,
  surfaceLabel: "6.09T km²",
  surfaceKind: "photosphere",
  orbitKmFromSol: 0,
  orbitsModelId: null,
  scenePosition: [0, 0, 0],
  visualRadius: 1.62,
};

const TERRA_ORBIT_KM = 149_597_870;
const LUNA_ORBIT_FROM_TERRA_KM = 384_400;

const TERRA_METRIC: CelestialMetric = {
  id: "terra",
  name: "Terra",
  diameterKm: 12_742,
  surfaceLabel: "510.1M km²",
  surfaceKind: "surface",
  orbitKmFromSol: TERRA_ORBIT_KM,
  orbitsModelId: "sol",
  scenePosition: [TERRA_ORBIT_KM / KM_PER_SCENE_UNIT, 0, 0],
  visualRadius: 0.82,
};

const LUNA_SCENE_ORBIT_RADIUS = 0.92;

const LUNA_METRIC: CelestialMetric = {
  id: "luna",
  name: "Luna",
  diameterKm: 3_474.8,
  surfaceLabel: "37.9M km²",
  surfaceKind: "surface",
  orbitKmFromSol: TERRA_ORBIT_KM + LUNA_ORBIT_FROM_TERRA_KM,
  orbitsModelId: "terra",
  scenePosition: [TERRA_METRIC.scenePosition[0] + LUNA_SCENE_ORBIT_RADIUS, 0.32, -0.52],
  visualRadius: TERRA_METRIC.visualRadius * 0.25,
};

export function getCelestialMetric(modelId: ModelId): CelestialMetric {
  switch (modelId) {
    case "sol":
      return SOL_METRIC;
    case "terra":
      return TERRA_METRIC;
    case "luna":
      return LUNA_METRIC;
    default:
      return assertNever(modelId);
  }
}

export function getDistantMetrics(modelId: ModelId): readonly CelestialMetric[] {
  return MODEL_IDS.filter((candidateId) => candidateId !== modelId).map((candidateId) => getCelestialMetric(candidateId));
}

function formatKm(kilometers: number): string {
  if (kilometers >= 1_000_000) {
    return `${(kilometers / 1_000_000).toFixed(1)}M km`;
  }
  return `${Math.round(kilometers).toLocaleString("en-US")} km`;
}

export function formatDiameter(metric: CelestialMetric): string {
  return `Diameter ${formatKm(metric.diameterKm)}`;
}

export function formatSurfaceMetric(metric: CelestialMetric): string {
  const label = metric.surfaceKind === "photosphere" ? "Photosphere area" : "Surface area";
  return `${label} ${metric.surfaceLabel}`;
}

export function formatScaleMode(): string {
  return "Scale: fixed scene / camera zoom";
}

export function formatDistance(fromModelId: ModelId, toModelId: ModelId): string {
  const fromMetric = getCelestialMetric(fromModelId);
  const toMetric = getCelestialMetric(toModelId);
  return `${formatKm(Math.abs(toMetric.orbitKmFromSol - fromMetric.orbitKmFromSol))} away`;
}
