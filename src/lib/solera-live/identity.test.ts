import { describe, expect, it } from "vitest";
import { createSoleraLiveIdentity, normalizeSoleraLiveDisplayName } from "./identity";

describe("Solera Live identity safety", () => {
  it("Given a normal display name When normalizing Then it is accepted", () => {
    expect(normalizeSoleraLiveDisplayName("  Aster   Nova  ")).toBe("Aster Nova");
  });

  it("Given an unsafe display name When normalizing Then it is rejected", () => {
    expect(normalizeSoleraLiveDisplayName("c o n n a r d")).toBe("");
    expect(normalizeSoleraLiveDisplayName("n 1 g g 3 r")).toBe("");
  });

  it("Given an unsafe display name When creating an identity Then a generated name is used", () => {
    const identity = createSoleraLiveIdentity({ displayName: "f u c k", randomSeed: "safety01" });

    expect(identity.displayName).toMatch(/^(Sol|Terra|Luna|Orbit|Aster|Nova|Comet|Zenith)-\d{3}$/);
  });
});
