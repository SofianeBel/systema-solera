import { assertNever } from "./assert-never";
import type { ModelId } from "./models";

export type SceneState =
  | Readonly<{ status: "grid" }>
  | Readonly<{ status: "immersive"; modelId: ModelId }>;

export const GRID_SCENE: SceneState = { status: "grid" };

export function openScene(modelId: ModelId): SceneState {
  return { status: "immersive", modelId };
}

export function closeScene(): SceneState {
  return GRID_SCENE;
}

export function selectedModelId(state: SceneState): ModelId | null {
  switch (state.status) {
    case "grid":
      return null;
    case "immersive":
      return state.modelId;
    default:
      return assertNever(state);
  }
}
