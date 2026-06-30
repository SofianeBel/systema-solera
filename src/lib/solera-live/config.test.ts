import { describe, expect, it } from "vitest";
import { getSoleraLivePublicConfig } from "./config";

describe("Solera Live public config", () => {
  it("Given no feature flag When reading config Then Solera Live is disabled", () => {
    const config = getSoleraLivePublicConfig({});

    expect(config.enabled).toBe(false);
    expect(config.unavailableReason).toBe("feature_flag_disabled");
  });

  it("Given the feature flag and no Ably key When reading config Then mock provider is used", () => {
    const config = getSoleraLivePublicConfig({ SOLERA_LIVE_ENABLED: "true" });

    expect(config.enabled).toBe(true);
    expect(config.provider).toBe("mock");
  });

  it("Given the feature flag and Ably key When reading config Then Ably provider is used", () => {
    const config = getSoleraLivePublicConfig({ SOLERA_LIVE_ENABLED: "true", ABLY_API_KEY: "app.key:secret" });

    expect(config.provider).toBe("ably");
  });
});
