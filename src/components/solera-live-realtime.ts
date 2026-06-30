"use client";

import type { InboundMessage, PresenceMessage, TokenRequest } from "ably";
import type { ModelId } from "@/lib/models";
import { hasSoleraLiveBlockedPublicText } from "@/lib/solera-live/moderation";
import {
  type SoleraLiveChatMessage,
  type SoleraLiveClientState,
  type SoleraLiveIdentity,
  type SoleraLivePingEvent,
  type SoleraLivePresenceData,
  type SoleraLiveProvider,
  type SoleraLiveRoomAssignment,
} from "@/lib/solera-live/types";

export type SoleraLiveRealtimeCallbacks = Readonly<{
  onStatusChange: (status: SoleraLiveClientState) => void;
  onPresenceChange: (presence: SoleraLivePresenceData[]) => void;
  onChatMessage: (message: SoleraLiveChatMessage) => void;
  onPing: (ping: SoleraLivePingEvent) => void;
}>;

export type SoleraLiveRealtimeConnection = Readonly<{
  sendChat: (message: SoleraLiveChatMessage) => Promise<void>;
  sendPing: (ping: SoleraLivePingEvent) => Promise<void>;
  updatePresence: (selectedModelId: ModelId) => Promise<void>;
  disconnect: () => void;
}>;

type ConnectInput = Readonly<{
  provider: SoleraLiveProvider;
  assignment: SoleraLiveRoomAssignment;
  identity: SoleraLiveIdentity;
  selectedModelId: ModelId;
  callbacks: SoleraLiveRealtimeCallbacks;
}>;

type MockRoomState = {
  members: Map<string, SoleraLivePresenceData>;
};

const mockRooms = new Map<string, MockRoomState>();

function createPresenceData(identity: SoleraLiveIdentity, selectedModelId: ModelId): SoleraLivePresenceData {
  return {
    userId: identity.userId,
    displayName: identity.displayName,
    visualSeed: identity.visualSeed,
    visualColor: identity.visualColor,
    selectedModelId,
    lastActivityAt: new Date().toISOString(),
  };
}

function readPresenceMessage(message: PresenceMessage): SoleraLivePresenceData | null {
  const data = message.data;
  return isPresenceData(data) ? data : null;
}

function isPresenceData(data: unknown): data is SoleraLivePresenceData {
  return Boolean(
    data &&
      typeof data === "object" &&
      typeof (data as SoleraLivePresenceData).userId === "string" &&
      typeof (data as SoleraLivePresenceData).displayName === "string" &&
      (data as SoleraLivePresenceData).displayName.length <= 24 &&
      !hasSoleraLiveBlockedPublicText((data as SoleraLivePresenceData).displayName) &&
      typeof (data as SoleraLivePresenceData).selectedModelId === "string" &&
      typeof (data as SoleraLivePresenceData).visualSeed === "string" &&
      typeof (data as SoleraLivePresenceData).visualColor === "string",
  );
}

function isChatMessage(data: unknown): data is SoleraLiveChatMessage {
  return Boolean(
    data &&
      typeof data === "object" &&
      typeof (data as SoleraLiveChatMessage).messageId === "string" &&
      typeof (data as SoleraLiveChatMessage).userId === "string" &&
      typeof (data as SoleraLiveChatMessage).displayName === "string" &&
      (data as SoleraLiveChatMessage).displayName.length <= 24 &&
      !hasSoleraLiveBlockedPublicText((data as SoleraLiveChatMessage).displayName) &&
      typeof (data as SoleraLiveChatMessage).text === "string" &&
      (data as SoleraLiveChatMessage).text.length <= 280 &&
      !hasSoleraLiveBlockedPublicText((data as SoleraLiveChatMessage).text),
  );
}

function isPingEvent(data: unknown): data is SoleraLivePingEvent {
  return Boolean(
    data &&
      typeof data === "object" &&
      typeof (data as SoleraLivePingEvent).pingId === "string" &&
      typeof (data as SoleraLivePingEvent).userId === "string" &&
      typeof (data as SoleraLivePingEvent).displayName === "string" &&
      (data as SoleraLivePingEvent).displayName.length <= 24 &&
      !hasSoleraLiveBlockedPublicText((data as SoleraLivePingEvent).displayName) &&
      typeof (data as SoleraLivePingEvent).selectedModelId === "string",
  );
}

function readMessageData(message: InboundMessage): unknown {
  return message.data;
}

function mapConnectionState(state: string): SoleraLiveClientState {
  switch (state) {
    case "connected":
      return "connected";
    case "connecting":
      return "connecting";
    case "disconnected":
    case "suspended":
      return "reconnecting";
    case "failed":
    case "closed":
      return "error";
    default:
      return "connecting";
  }
}

async function publishChatThroughServer(message: SoleraLiveChatMessage & Readonly<{ chatToken?: string }>): Promise<void> {
  const response = await fetch("/api/solera-live/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
    throw new Error(typeof payload?.error === "string" ? payload.error : "Message could not be sent.");
  }
}

async function connectAblyRealtime(input: ConnectInput): Promise<SoleraLiveRealtimeConnection> {
  const Ably = await import("ably");
  const tokenPayload = {
    clientId: input.identity.userId,
    region: input.assignment.region,
    roomId: input.assignment.roomId,
  };
  const client = new Ably.Realtime({
    clientId: input.identity.userId,
    authCallback: (_tokenParams, callback) => {
      void fetch("/api/solera-live/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tokenPayload),
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error("Unable to issue Solera Live token.");
          }

          const body = (await response.json()) as { tokenRequest?: TokenRequest };
          if (!body.tokenRequest) {
            throw new Error("Solera Live token endpoint did not return an Ably token request.");
          }

          callback(null, body.tokenRequest);
        })
        .catch((error: unknown) => {
          callback(error instanceof Error ? error.message : "Unable to authorize Solera Live.", null);
        });
    },
  });

  const presenceChannel = client.channels.get(input.assignment.channels.presence);
  const chatChannel = client.channels.get(input.assignment.channels.chat);
  const pingChannel = client.channels.get(input.assignment.channels.pings);
  const presence = new Map<string, SoleraLivePresenceData>();

  const publishPresence = () => {
    input.callbacks.onPresenceChange([...presence.values()].filter((member) => member.userId !== input.identity.userId));
  };
  const presenceListener = (message: PresenceMessage) => {
    const data = readPresenceMessage(message);
    if (!data) {
      return;
    }

    if (message.action === "leave") {
      presence.delete(data.userId);
    } else {
      presence.set(data.userId, data);
    }

    publishPresence();
  };
  const chatListener = (message: InboundMessage) => {
    const data = readMessageData(message);
    if (isChatMessage(data)) {
      input.callbacks.onChatMessage(data);
    }
  };
  const pingListener = (message: InboundMessage) => {
    const data = readMessageData(message);
    if (isPingEvent(data)) {
      input.callbacks.onPing(data);
    }
  };
  const connectionListener = (change: { current: string }) => input.callbacks.onStatusChange(mapConnectionState(change.current));

  client.connection.on(connectionListener);
  await Promise.all([presenceChannel.presence.subscribe(["enter", "update", "leave"], presenceListener), chatChannel.subscribe("chat", chatListener), pingChannel.subscribe("ping", pingListener)]);
  const members = await presenceChannel.presence.get();
  for (const member of members) {
    const data = readPresenceMessage(member);
    if (data) {
      presence.set(data.userId, data);
    }
  }

  await presenceChannel.presence.enter(createPresenceData(input.identity, input.selectedModelId));
  input.callbacks.onStatusChange("connected");
  publishPresence();

  return {
    sendChat: (message) => publishChatThroughServer(input.assignment.chatToken ? { ...message, chatToken: input.assignment.chatToken } : message),
    sendPing: (ping) => pingChannel.publish("ping", ping).then(() => undefined),
    updatePresence: (selectedModelId) => presenceChannel.presence.update(createPresenceData(input.identity, selectedModelId)),
    disconnect: () => {
      presenceChannel.presence.unsubscribe();
      chatChannel.unsubscribe();
      pingChannel.unsubscribe();
      client.connection.off(connectionListener);
      client.close();
    },
  };
}

function connectMockRealtime(input: ConnectInput): SoleraLiveRealtimeConnection {
  const roomKey = input.assignment.roomId;
  const room = mockRooms.get(roomKey) ?? { members: new Map<string, SoleraLivePresenceData>() };
  const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(`solera-live:${roomKey}`);
  let closed = false;

  const postToChannel = (message: unknown) => {
    if (closed || !channel) {
      return;
    }

    try {
      channel.postMessage(message);
    } catch (error) {
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        closed = true;
        return;
      }

      throw error;
    }
  };
  const emitPresence = () => {
    if (closed) {
      return;
    }

    input.callbacks.onPresenceChange([...room.members.values()].filter((member) => member.userId !== input.identity.userId));
  };
  const upsertSelf = (selectedModelId: ModelId) => {
    if (closed) {
      return;
    }

    room.members.set(input.identity.userId, createPresenceData(input.identity, selectedModelId));
    mockRooms.set(roomKey, room);
    emitPresence();
    postToChannel({ kind: "presence", data: [...room.members.values()] });
  };

  channel?.addEventListener("message", (event: MessageEvent<unknown>) => {
    if (closed) {
      return;
    }

    const data = event.data as { kind?: unknown; data?: unknown };
    if (data.kind === "presence" && Array.isArray(data.data)) {
      room.members.clear();
      for (const member of data.data) {
        if (isPresenceData(member)) {
          room.members.set(member.userId, member);
        }
      }
      emitPresence();
    }
    if (data.kind === "chat" && isChatMessage(data.data)) {
      input.callbacks.onChatMessage(data.data);
    }
    if (data.kind === "ping" && isPingEvent(data.data)) {
      input.callbacks.onPing(data.data);
    }
  });

  upsertSelf(input.selectedModelId);
  const connectedTimer = window.setTimeout(() => {
    if (!closed) {
      input.callbacks.onStatusChange("connected");
    }
  }, 50);

  return {
    sendChat: async (message) => {
      if (closed) {
        return;
      }

      input.callbacks.onChatMessage(message);
      postToChannel({ kind: "chat", data: message });
    },
    sendPing: async (ping) => {
      if (closed) {
        return;
      }

      input.callbacks.onPing(ping);
      postToChannel({ kind: "ping", data: ping });
    },
    updatePresence: async (selectedModelId) => {
      upsertSelf(selectedModelId);
    },
    disconnect: () => {
      if (closed) {
        return;
      }

      window.clearTimeout(connectedTimer);
      room.members.delete(input.identity.userId);
      emitPresence();
      postToChannel({ kind: "presence", data: [...room.members.values()] });
      closed = true;
      channel?.close();
    },
  };
}

export async function connectSoleraLiveRealtime(input: ConnectInput): Promise<SoleraLiveRealtimeConnection> {
  if (input.provider === "mock") {
    return connectMockRealtime(input);
  }

  return connectAblyRealtime(input);
}
