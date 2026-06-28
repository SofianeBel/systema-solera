import { describe, expect, it } from "vitest";
import { closeScene, openScene, selectedModelId } from "./scene-state";

describe("scene state", () => {
  it("Given the grid When Sol opens Then selectedModelId returns Sol", () => {
    const state = openScene("sol");

    expect(state).toEqual({ status: "immersive", modelId: "sol" });
    expect(selectedModelId(state)).toBe("sol");
  });

  it("Given an immersive scene When it closes Then the selected id is empty", () => {
    const state = closeScene();

    expect(state).toEqual({ status: "grid" });
    expect(selectedModelId(state)).toBeNull();
  });
});
