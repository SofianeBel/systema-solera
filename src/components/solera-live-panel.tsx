"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ModelId } from "@/lib/models";
import { SoleraLiveChatRateLimiter, validateSoleraLiveChatText } from "@/lib/solera-live/chat";
import { createSoleraLiveIdentity } from "@/lib/solera-live/identity";
import { selectSoleraLiveRegion } from "@/lib/solera-live/region";
import {
  SOLERA_LIVE_REGIONS,
  type SoleraLiveChatMessage,
  type SoleraLiveClientState,
  type SoleraLiveIdentity,
  type SoleraLivePingEvent,
  type SoleraLivePresenceData,
  type SoleraLivePublicConfig,
  type SoleraLiveRegion,
  type SoleraLiveRoomAssignment,
} from "@/lib/solera-live/types";
import { connectSoleraLiveRealtime, type SoleraLiveRealtimeConnection } from "./solera-live-realtime";

type SoleraLivePanelProps = Readonly<{
  selectedModelId: ModelId;
}>;

type RegionChoice = "auto" | SoleraLiveRegion;

const EMPTY_MESSAGES: readonly SoleraLiveChatMessage[] = [];
const EMPTY_PRESENCE: readonly SoleraLivePresenceData[] = [];

function createEventId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readClientHints() {
  if (typeof navigator === "undefined") {
    return {};
  }

  return {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language,
  };
}

function statusLabel(status: SoleraLiveClientState, hasJoined: boolean): string {
  if (!hasJoined && status === "idle") {
    return "Ready";
  }

  switch (status) {
    case "idle":
      return "Ready";
    case "disabled":
      return "Unavailable";
    case "connecting":
      return "Connecting";
    case "connected":
      return "Live";
    case "reconnecting":
      return "Reconnecting";
    case "offline":
      return "Offline";
    case "error":
      return "Error";
  }
}

function modelLabel(modelId: ModelId): string {
  return modelId.charAt(0).toUpperCase() + modelId.slice(1);
}

function markerStyle(member: SoleraLivePresenceData, index: number): CSSProperties {
  const seed = member.visualSeed.split("").reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
  const left = 16 + ((seed + index * 23) % 68);
  const top = 18 + (((seed >>> 8) + index * 17) % 58);

  return {
    "--marker-color": member.visualColor,
    left: `${left}%`,
    top: `${top}%`,
  } as CSSProperties;
}

export function SoleraLivePanel({ selectedModelId }: SoleraLivePanelProps) {
  const [config, setConfig] = useState<SoleraLivePublicConfig | null>(null);
  const [status, setStatus] = useState<SoleraLiveClientState>("connecting");
  const [regionChoice, setRegionChoice] = useState<RegionChoice>("auto");
  const [autoRegion, setAutoRegion] = useState<SoleraLiveRegion>("eu");
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [identity, setIdentity] = useState<SoleraLiveIdentity | null>(null);
  const [assignment, setAssignment] = useState<SoleraLiveRoomAssignment | null>(null);
  const [presence, setPresence] = useState<readonly SoleraLivePresenceData[]>(EMPTY_PRESENCE);
  const [messages, setMessages] = useState<readonly SoleraLiveChatMessage[]>(EMPTY_MESSAGES);
  const [messageDraft, setMessageDraft] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [mutedUserIds, setMutedUserIds] = useState<ReadonlySet<string>>(() => new Set());
  const [feedback, setFeedback] = useState("");
  const [lastPing, setLastPing] = useState<SoleraLivePingEvent | null>(null);
  const connectionRef = useRef<SoleraLiveRealtimeConnection | null>(null);
  const identityRef = useRef<SoleraLiveIdentity | null>(null);
  const assignmentRef = useRef<SoleraLiveRoomAssignment | null>(null);
  const rateLimiterRef = useRef(new SoleraLiveChatRateLimiter());

  const hasJoined = Boolean(identity && assignment);
  const selectedRegion = useMemo(() => {
    if (regionChoice !== "auto") {
      return regionChoice;
    }

    return autoRegion;
  }, [autoRegion, regionChoice]);
  const visibleMessages = useMemo(() => messages.filter((message) => !mutedUserIds.has(message.userId)), [messages, mutedUserIds]);

  const appendMessage = useCallback((message: SoleraLiveChatMessage) => {
    const validation = validateSoleraLiveChatText(message.text, config?.chat.maxLength);
    if (!validation.ok) {
      return;
    }

    const safeMessage = validation.text === message.text ? message : { ...message, text: validation.text };

    setMessages((currentMessages) => {
      if (currentMessages.some((currentMessage) => currentMessage.messageId === safeMessage.messageId)) {
        return currentMessages;
      }

      return [...currentMessages.slice(-31), safeMessage];
    });
  }, [config?.chat.maxLength]);

  const connectLive = useCallback(
    async (options: Readonly<{ reconnect?: boolean }> = {}) => {
      if (!config?.enabled) {
        setStatus("disabled");
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setStatus("offline");
        return;
      }

      const randomSeed = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : undefined;
      const nextIdentity =
        identityRef.current ??
        createSoleraLiveIdentity({
          displayName: displayNameDraft,
          ...(randomSeed ? { randomSeed } : {}),
        });
      identityRef.current = nextIdentity;
      setIdentity(nextIdentity);
      setStatus(options.reconnect ? "reconnecting" : "connecting");
      setFeedback("");

      try {
        const assignmentResponse = await fetch("/api/solera-live/rooms/assign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            requestedRegion: regionChoice === "auto" ? "auto" : regionChoice,
            previousRoomId: options.reconnect ? assignmentRef.current?.roomId : null,
            clientId: nextIdentity.userId,
            assignmentProof: options.reconnect ? assignmentRef.current?.assignmentProof : undefined,
            displayName: nextIdentity.displayName,
            clientHints: readClientHints(),
          }),
        });

        if (!assignmentResponse.ok) {
          throw new Error("Room assignment failed.");
        }

        const nextAssignment = (await assignmentResponse.json()) as SoleraLiveRoomAssignment;
        const assignedIdentity = { ...nextIdentity, userId: nextAssignment.clientId };
        identityRef.current = assignedIdentity;
        setIdentity(assignedIdentity);
        assignmentRef.current = nextAssignment;
        setAssignment(nextAssignment);
        connectionRef.current?.disconnect();
        connectionRef.current = null;
        connectionRef.current = await connectSoleraLiveRealtime({
          provider: config.provider,
          assignment: nextAssignment,
          identity: assignedIdentity,
          selectedModelId,
          callbacks: {
            onStatusChange: setStatus,
            onPresenceChange: setPresence,
            onChatMessage: appendMessage,
            onPing: setLastPing,
          },
        });
        setStatus("connected");
      } catch {
        setStatus("error");
        setFeedback("Solera Live is unavailable. Solo mode is still active.");
      }
    },
    [appendMessage, config, displayNameDraft, regionChoice, selectedModelId],
  );

  useEffect(() => {
    let active = true;
    setAutoRegion(selectSoleraLiveRegion({ requestedRegion: "auto", clientHints: readClientHints() }));

    void fetch("/api/solera-live/config")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Config unavailable.");
        }

        return (await response.json()) as SoleraLivePublicConfig;
      })
      .then((nextConfig) => {
        if (!active) {
          return;
        }

        setConfig(nextConfig);
        setStatus(nextConfig.enabled ? "idle" : "disabled");
      })
      .catch(() => {
        if (active) {
          setStatus("disabled");
          setFeedback("Solera Live is unavailable. Solo mode is still active.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!connectionRef.current || status !== "connected") {
      return;
    }

    void connectionRef.current.updatePresence(selectedModelId);
  }, [selectedModelId, status]);

  useEffect(() => {
    const handleOffline = () => setStatus("offline");
    const handleOnline = () => {
      if (identityRef.current) {
        void connectLive({ reconnect: true });
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [connectLive]);

  useEffect(() => {
    return () => {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
    };
  }, []);

  const sendMessage = async () => {
    if (!identity || !assignment || !connectionRef.current) {
      return;
    }

    const validation = validateSoleraLiveChatText(messageDraft, config?.chat.maxLength);
    if (!validation.ok) {
      setFeedback(validation.message);
      return;
    }

    const rateLimit = rateLimiterRef.current.check(identity.userId);
    if (!rateLimit.ok) {
      setFeedback(rateLimit.message);
      return;
    }

    const message: SoleraLiveChatMessage = {
      messageId: createEventId("chat"),
      userId: identity.userId,
      displayName: identity.displayName,
      roomId: assignment.roomId,
      region: assignment.region,
      text: validation.text,
      createdAt: new Date().toISOString(),
    };

    setMessageDraft("");
    setFeedback("");
    await connectionRef.current.sendChat(message).then(() => appendMessage(message)).catch(() => {
      setStatus("error");
      setFeedback("Message could not be sent.");
    });
  };

  const sendPing = async () => {
    if (!identity || !connectionRef.current) {
      return;
    }

    const ping: SoleraLivePingEvent = {
      pingId: createEventId("ping"),
      userId: identity.userId,
      displayName: identity.displayName,
      selectedModelId,
      createdAt: new Date().toISOString(),
    };

    setLastPing(ping);
    await connectionRef.current.sendPing(ping).catch(() => {
      setStatus("error");
      setFeedback("Ping could not be sent.");
    });
  };

  const reportMessage = async (message: SoleraLiveChatMessage) => {
    if (!identity || !assignment) {
      return;
    }

    const response = await fetch("/api/solera-live/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reporterUserId: identity.userId,
        targetUserId: message.userId,
        messageId: message.messageId,
        roomId: assignment.roomId,
        region: assignment.region,
        assignmentProof: assignment.assignmentProof,
        reason: "unsafe",
        messageText: message.text,
      }),
    });

    setFeedback(response.ok ? "Report acknowledged." : "Report could not be submitted.");
  };

  const disabled = status === "disabled";
  const canJoin = Boolean(config?.enabled) && !hasJoined && status !== "connecting";
  const canUseLive = status === "connected" && Boolean(connectionRef.current);

  return (
    <>
      <aside className="solera-live-panel" aria-label="Solera Live">
        <div className="solera-live-bar" data-state={status}>
          <span className="solera-live-dot" aria-hidden="true" />
          <span className="solera-live-title">Solera Live</span>
          <span className="solera-live-state">{statusLabel(status, hasJoined)}</span>
          {assignment ? (
            <>
              <span className="solera-live-meta">{assignment.region.toUpperCase()}</span>
              <span className="solera-live-meta">{assignment.occupancyEstimate}/{config?.room.maxSize ?? 16}</span>
            </>
          ) : (
            <span className="solera-live-meta">{selectedRegion.toUpperCase()}</span>
          )}
          {hasJoined ? (
            <>
              <button className="solera-live-icon-button" type="button" onClick={() => setChatOpen((open) => !open)} aria-expanded={chatOpen} aria-label="Toggle Solera Live chat">
                Chat
              </button>
              <button className="solera-live-icon-button" type="button" onClick={sendPing} disabled={!canUseLive}>
                Ping {modelLabel(selectedModelId)}
              </button>
            </>
          ) : (
            <button className="solera-live-join" type="button" onClick={() => void connectLive()} disabled={!canJoin}>
              {disabled ? "Solera Live unavailable" : "Join Solera Live"}
            </button>
          )}
        </div>

        {!hasJoined && config?.enabled ? (
          <div className="solera-live-entry">
            <label>
              <span>Name</span>
              <input value={displayNameDraft} maxLength={24} placeholder="Visitor name" onChange={(event) => setDisplayNameDraft(event.target.value)} />
            </label>
            <label>
              <span>Region</span>
              <select value={regionChoice} onChange={(event) => setRegionChoice(event.target.value as RegionChoice)}>
                <option value="auto">Auto ({selectedRegion.toUpperCase()})</option>
                {SOLERA_LIVE_REGIONS.map((region) => (
                  <option key={region} value={region}>
                    {region === "eu" ? "Europe" : "United States"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {chatOpen && hasJoined ? (
          <div className="solera-live-chat" aria-label="Solera Live chat">
            <div className="solera-live-messages" role="log" aria-live="polite">
              {visibleMessages.length === 0 ? <p>No messages yet.</p> : null}
              {visibleMessages.map((message) => (
                <article className="solera-live-message" key={message.messageId}>
                  <strong>{message.displayName}</strong>
                  <p>{message.text}</p>
                  <div className="solera-live-message-actions">
                    {message.userId !== identity?.userId ? (
                      <button type="button" onClick={() => setMutedUserIds((current) => new Set(current).add(message.userId))}>
                        Mute
                      </button>
                    ) : null}
                    <button type="button" onClick={() => void reportMessage(message)}>
                      Report
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <form
              className="solera-live-chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage();
              }}
            >
              <label className="sr-only" htmlFor="solera-live-message">
                Solera Live message
              </label>
              <input id="solera-live-message" value={messageDraft} maxLength={config?.chat.maxLength ?? 240} placeholder="Public message" onChange={(event) => setMessageDraft(event.target.value)} />
              <button type="submit" disabled={!canUseLive}>
                Send
              </button>
            </form>
          </div>
        ) : null}

        {feedback ? <p className="solera-live-feedback">{feedback}</p> : null}
        {lastPing ? (
          <p className="solera-live-feedback" aria-live="polite">
            Ping from {lastPing.displayName} near {modelLabel(lastPing.selectedModelId)}
          </p>
        ) : null}
      </aside>

      {presence.length > 0 ? (
        <div className="solera-live-markers" aria-label="Solera Live visitors">
          {presence.map((member, index) => (
            <span className="solera-live-marker" key={member.userId} style={markerStyle(member, index)} title={`${member.displayName} is viewing ${modelLabel(member.selectedModelId)}`}>
              {member.displayName.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
}
