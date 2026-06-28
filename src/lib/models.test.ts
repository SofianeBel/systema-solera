import { describe, expect, it } from "vitest";
import { MODEL_CATALOG, MODEL_IDS, getModelById } from "./models";

describe("MODEL_CATALOG", () => {
  it("Given the Solera catalog When inspected Then it exposes exact Sol Terra Luna ids", () => {
    expect(MODEL_CATALOG.map((model) => model.id)).toEqual(MODEL_IDS);
  });

  it("Given each model When pricing is rendered Then exactly three price cells exist", () => {
    for (const model of MODEL_CATALOG) {
      expect(model.prices).toHaveLength(3);
      expect(model.role.length).toBeGreaterThan(10);
      expect(model.summary.length).toBeGreaterThan(40);
    }
  });

  it("Given a model id When looked up Then the matching immutable catalog entry returns", () => {
    expect(getModelById("sol").name).toBe("Sol");
    expect(getModelById("terra").name).toBe("Terra");
    expect(getModelById("luna").name).toBe("Luna");
  });

  it("Given the public model cards When rendered Then they use the reference pricing and descriptions", () => {
    expect(getModelById("sol")).toMatchObject({
      role: "Flagship model for ambitious agentic work",
      prices: [
        { label: "Input", value: "$5.00" },
        { label: "Cached Input", value: "$0.50" },
        { label: "Output", value: "$30.00" },
      ],
    });
    expect(getModelById("terra")).toMatchObject({
      role: "Balanced model for efficient, everyday work",
      prices: [
        { label: "Input", value: "$2.50" },
        { label: "Cached Input", value: "$0.25" },
        { label: "Output", value: "$15.00" },
      ],
    });
    expect(getModelById("luna")).toMatchObject({
      role: "Fast, affordable model for high-volume work",
      prices: [
        { label: "Input", value: "$1.00" },
        { label: "Cached Input", value: "$0.10" },
        { label: "Output", value: "$6.00" },
      ],
    });
  });

  it("Given astronomical scene panels When model data is inspected Then Sol exposes power stats and warning labels", () => {
    expect(getModelById("sol").sceneStats).toEqual([
      { label: "Luminosity", value: "High-energy reference" },
      { label: "Gravity", value: "System anchor" },
      { label: "Orbit role", value: "Central photosphere" },
      { label: "Activity", value: "Prominences and flares" },
      { label: "Temperature", value: "Plasma field" },
    ]);
    expect(getModelById("sol").warnings).toEqual(["Radiation zone", "High energy field", "Stable orbit required"]);
  });
});
