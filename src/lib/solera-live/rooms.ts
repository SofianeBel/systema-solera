import { SOLERA_LIVE_ASSIGNMENT_TTL_SECONDS, SOLERA_LIVE_ROOM_MAX_SIZE } from "./config";
import { selectSoleraLiveRegion } from "./region";
import { buildSoleraLiveChannels, type SoleraLiveRegion, type SoleraLiveRoomAssignment, type SoleraLiveRoomAssignmentRequest } from "./types";

type RoomRecord = {
  region: SoleraLiveRegion;
  roomId: string;
  occupants: Map<string, number>;
};

export type SoleraLiveRoomRegistryOptions = Readonly<{
  maxRoomSize?: number;
  assignmentTtlSeconds?: number;
}>;

export class SoleraLiveRoomRegistry {
  private readonly rooms = new Map<SoleraLiveRegion, RoomRecord[]>();
  private readonly nextRoomOrdinal = new Map<SoleraLiveRegion, number>();
  private anonymousClientOrdinal = 0;

  constructor(private readonly options: SoleraLiveRoomRegistryOptions = {}) {}

  assign(request: SoleraLiveRoomAssignmentRequest, now = new Date()): SoleraLiveRoomAssignment {
    const region = selectSoleraLiveRegion({
      ...(request.requestedRegion ? { requestedRegion: request.requestedRegion } : {}),
      ...(request.clientHints ? { clientHints: request.clientHints } : {}),
    });
    const nowMs = now.getTime();
    const ttlMs = this.assignmentTtlSeconds * 1000;
    const clientId = this.clientIdFor(request.clientId);
    const regionRooms = this.activeRooms(region, nowMs);
    const previousRoom = request.previousRoomId ? regionRooms.find((room) => room.roomId === request.previousRoomId) : undefined;
    const selectedRoom = this.roomCanAccept(previousRoom, clientId) ? previousRoom : this.findOrCreateRoom(region, regionRooms, clientId);

    selectedRoom.occupants.set(clientId, nowMs + ttlMs);

    return {
      region,
      roomId: selectedRoom.roomId,
      occupancyEstimate: selectedRoom.occupants.size,
      channels: buildSoleraLiveChannels(region, selectedRoom.roomId),
      expiresAt: new Date(nowMs + ttlMs).toISOString(),
    };
  }

  reset(): void {
    this.rooms.clear();
    this.nextRoomOrdinal.clear();
    this.anonymousClientOrdinal = 0;
  }

  hasActiveAssignment(region: SoleraLiveRegion, roomId: string, clientId: string, now = new Date()): boolean {
    const normalizedClientId = clientId.trim();
    if (!normalizedClientId) {
      return false;
    }

    const nowMs = now.getTime();
    const regionRooms = this.activeRooms(region, nowMs);
    const room = regionRooms.find((candidateRoom) => candidateRoom.roomId === roomId);
    const expiresAtMs = room?.occupants.get(normalizedClientId);

    return expiresAtMs !== undefined && expiresAtMs > nowMs;
  }

  private get maxRoomSize(): number {
    return this.options.maxRoomSize ?? SOLERA_LIVE_ROOM_MAX_SIZE;
  }

  private get assignmentTtlSeconds(): number {
    return this.options.assignmentTtlSeconds ?? SOLERA_LIVE_ASSIGNMENT_TTL_SECONDS;
  }

  private activeRooms(region: SoleraLiveRegion, nowMs: number): RoomRecord[] {
    const rooms = this.rooms.get(region) ?? [];
    const activeRooms = rooms.filter((room) => {
      for (const [clientId, expiresAtMs] of room.occupants) {
        if (expiresAtMs <= nowMs) {
          room.occupants.delete(clientId);
        }
      }

      return room.occupants.size > 0;
    });

    this.rooms.set(region, activeRooms);
    return activeRooms;
  }

  private roomCanAccept(room: RoomRecord | undefined, clientId: string): room is RoomRecord {
    return Boolean(room && (room.occupants.has(clientId) || room.occupants.size < this.maxRoomSize));
  }

  private findOrCreateRoom(region: SoleraLiveRegion, regionRooms: RoomRecord[], clientId: string): RoomRecord {
    const availableRoom = regionRooms.find((room) => this.roomCanAccept(room, clientId));
    if (availableRoom) {
      return availableRoom;
    }

    const nextOrdinal = this.nextRoomOrdinal.get(region) ?? 1;
    const room: RoomRecord = {
      region,
      roomId: `solera-${region}-${String(nextOrdinal).padStart(3, "0")}`,
      occupants: new Map(),
    };

    this.nextRoomOrdinal.set(region, nextOrdinal + 1);
    regionRooms.push(room);
    this.rooms.set(region, regionRooms);
    return room;
  }

  private clientIdFor(clientId: string | undefined): string {
    const normalizedClientId = clientId?.trim();
    if (normalizedClientId) {
      return normalizedClientId;
    }

    this.anonymousClientOrdinal += 1;
    return `anonymous-${this.anonymousClientOrdinal}`;
  }
}

export const soleraLiveRoomRegistry = new SoleraLiveRoomRegistry();
