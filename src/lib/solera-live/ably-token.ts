import { Rest, type TokenRequest } from "ably";
import { SOLERA_LIVE_TOKEN_TTL_SECONDS } from "./config";
import { buildSoleraLiveChannels, type SoleraLiveRegion } from "./types";

export type SoleraLiveTokenRequestInput = Readonly<{
  apiKey: string;
  clientId: string;
  region: SoleraLiveRegion;
  roomId: string;
  ttlSeconds?: number;
}>;

export async function createSoleraLiveAblyTokenRequest(input: SoleraLiveTokenRequestInput): Promise<TokenRequest> {
  const channels = buildSoleraLiveChannels(input.region, input.roomId);
  const rest = new Rest({ key: input.apiKey });

  return rest.auth.createTokenRequest({
    clientId: input.clientId,
    ttl: (input.ttlSeconds ?? SOLERA_LIVE_TOKEN_TTL_SECONDS) * 1000,
    capability: {
      [channels.presence]: ["presence", "subscribe", "publish"],
      [channels.chat]: ["subscribe"],
      [channels.pings]: ["subscribe", "publish"],
      [channels.occupancy]: ["subscribe"],
    },
  });
}
