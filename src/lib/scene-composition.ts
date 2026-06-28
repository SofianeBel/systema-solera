import { getCelestialMetric, type SceneVector } from "./celestial-metrics";
import type { ModelId } from "./models";

type CameraComposition = Readonly<{
  maxDistance: number;
  minDistance: number;
  offset: SceneVector;
  target: SceneVector;
}>;

const COMPACT_CAMERA_DISTANCE_TO_RADIUS = 5.2;
const WIDE_CAMERA_DISTANCE_TO_RADIUS = 5.8;
const COMPACT_CAMERA_HEIGHT_TO_RADIUS = 1.08;
const WIDE_CAMERA_HEIGHT_TO_RADIUS = 1.28;
const MIN_CAMERA_DISTANCE_TO_RADIUS = 1.8;
const MIN_CAMERA_DISTANCE = 0.32;
const MAX_CAMERA_DISTANCE = 40;

function orbitalViewDirection(modelId: ModelId): [number, number] {
  const metric = getCelestialMetric(modelId);
  if (!metric.orbitsModelId) {
    return [0, 1];
  }

  const primaryMetric = getCelestialMetric(metric.orbitsModelId);
  const x = metric.scenePosition[0] - primaryMetric.scenePosition[0];
  const z = metric.scenePosition[2] - primaryMetric.scenePosition[2];
  const length = Math.hypot(x, z);
  if (length === 0) {
    return [0, 1];
  }

  return [x / length, z / length];
}

export function sceneScaleMultiplier(_modelId: ModelId, _selectedModelId: ModelId): number {
  return 1;
}

export function renderedSceneRadius(modelId: ModelId, selectedModelId: ModelId): number {
  return getCelestialMetric(modelId).visualRadius * sceneScaleMultiplier(modelId, selectedModelId);
}

export function selectedCameraComposition(modelId: ModelId, compact: boolean): CameraComposition {
  const metric = getCelestialMetric(modelId);
  const radius = renderedSceneRadius(modelId, modelId);
  const distanceRatio = compact ? COMPACT_CAMERA_DISTANCE_TO_RADIUS : WIDE_CAMERA_DISTANCE_TO_RADIUS;
  const heightRatio = compact ? COMPACT_CAMERA_HEIGHT_TO_RADIUS : WIDE_CAMERA_HEIGHT_TO_RADIUS;
  const distance = radius * distanceRatio;
  const [directionX, directionZ] = orbitalViewDirection(modelId);

  return {
    maxDistance: MAX_CAMERA_DISTANCE,
    minDistance: Math.max(MIN_CAMERA_DISTANCE, radius * MIN_CAMERA_DISTANCE_TO_RADIUS),
    offset: [directionX * distance, radius * heightRatio, directionZ * distance],
    target: metric.scenePosition,
  };
}
