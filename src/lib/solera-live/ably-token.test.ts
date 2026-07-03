import { describe, expect, it } from "vitest";
import { createSoleraLiveAblyTokenRequest } from "./ably-token";
import { buildSoleraLiveChannels } from "./types";

describe("Solera Live Ably token", () => {
  it("Given a chat channel When creating a client token Then direct chat publish is not allowed", async () => {
    const tokenRequest = await createSoleraLiveAblyTokenRequest({
      apiKey: "app.key:secret",
      clientId: "client-a",
      region: "eu",
      roomId: "solera-eu-001",
    });
    const capability = typeof tokenRequest.capability === "string" ? JSON.parse(tokenRequest.capability) : tokenRequest.capability;
    const channels = buildSoleraLiveChannels("eu", "solera-eu-001");

    expect(capability[channels.chat]).toEqual(["subscribe"]);
  });
});
