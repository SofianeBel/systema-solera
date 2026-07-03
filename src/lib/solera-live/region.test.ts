import { describe, expect, it } from "vitest";
import { selectSoleraLiveRegion } from "./region";

describe("Solera Live region selection", () => {
  it("Given a manual Europe override When selecting a region Then it returns eu", () => {
    expect(selectSoleraLiveRegion({ requestedRegion: "eu", clientHints: { timeZone: "America/New_York", locale: "en-US" } })).toBe("eu");
  });

  it("Given latency hints When US is faster Then it returns us", () => {
    expect(selectSoleraLiveRegion({ requestedRegion: "auto", clientHints: { regionLatenciesMs: { eu: 130, us: 42 } } })).toBe("us");
  });

  it("Given platform hints When the timezone is European Then it returns eu", () => {
    expect(selectSoleraLiveRegion({ requestedRegion: "auto", clientHints: { timeZone: "Europe/Paris", locale: "fr-FR" } })).toBe("eu");
  });
});
