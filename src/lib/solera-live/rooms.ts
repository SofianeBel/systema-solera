import { randomBytes } from "node:crypto";
import { SOLERA_LIVE_ASSIGNMENT_TTL_SECONDS, SOLERA_LIVE_MAX_ACTIVE_ROOMS, SOLERA_LIVE_ROOM_MAX_SIZE } from "./config";
import { selectSoleraLiveRegion } from "./region";
import { buildSoleraLiveChannels, SOLERA_LIVE_REGIONS, type SoleraLiveRegion, type SoleraLiveRoomAssignment, type SoleraLiveRoomAssignmentRequest } from "./types";

type OccupantRecord = {
  assignmentProof: string;
  expiresAtMs: number;
};

type RoomRecord = {
  region: SoleraLiveRegion;
  roomId: string;
  occupants: Map<string, OccupantRecord>;
};

export type SoleraLiveRoomRegistryOptions = Readonly<{
  maxActiveRooms?: number;
  maxRoomSize?: number;
  assignmentTtlSeconds?: number;
}>;

export class SoleraLiveRoomCapacityError extends Error {
  constructor() {
    super("Solera Live is at capacity. Try again soon.");
    this.name = "SoleraLiveRoomCapacityError";
  }
}

export class SoleraLiveRoomRegistry {
  private readonly rooms = new Map<SoleraLiveRegion, RoomRecord[]>();
  private readonly nextRoomOrdinal = new Map<SoleraLiveRegion, number>();

  constructor(private readonly options: SoleraLiveRoomRegistryOptions = {}) {}

  assign(request: SoleraLiveRoomAssignmentRequest, now = new Date()): SoleraLiveRoomAssignment {
    const region = selectSoleraLiveRegion({
      ...(request.requestedRegion ? { requestedRegion: request.requestedRegion } : {}),
      ...(request.clientHints ? { clientHints: request.clientHints } : {}),
    });
    const nowMs = now.getTime();
    const ttlMs = this.assignmentTtlSeconds * 1000;
    const regionRooms = this.activeRooms(region, nowMs);
    const previousRoom = request.previousRoomId ? regionRooms.find((room) => room.roomId === request.previousRoomId) : undefined;
    const requestedClientId = request.clientId?.trim();
    const requestedProof = request.assignmentProof?.trim();
    const previousOccupant = requestedClientId && requestedProof ? previousRoom?.occupants.get(requestedClientId) : undefined;
    const hasPreviousAssignment = Boolean(
      requestedClientId && requestedProof && previousOccupant?.assignmentProof === requestedProof && previousOccupant.expiresAtMs > nowMs,
    );
    const clientId = hasPreviousAssignment && requestedClientId ? requestedClientId : this.createClientId();
    const assignmentProof = hasPreviousAssignment && requestedProof ? requestedProof : this.createAssignmentProof();
    const selectedRoom = this.roomCanAccept(previousRoom, clientId) ? previousRoom : this.findOrCreateRoom(region, regionRooms, clientId, nowMs);

    selectedRoom.occupants.set(clientId, { assignmentProof, expiresAtMs: nowMs + ttlMs });

    return {
      region,
      roomId: selectedRoom.roomId,
      clientId,
      assignmentProof,
      occupancyEstimate: selectedRoom.occupants.size,
      channels: buildSoleraLiveChannels(region, selectedRoom.roomId),
      expiresAt: new Date(nowMs + ttlMs).toISOString(),
    };
  }

  reset(): void {
    this.rooms.clear();
    this.nextRoomOrdinal.clear();
  }

  hasActiveAssignment(region: SoleraLiveRegion, roomId: string, clientId: string, assignmentProof: string, now = new Date()): boolean {
    const normalizedClientId = clientId.trim();
    const normalizedProof = assignmentProof.trim();
    if (!normalizedClientId || !normalizedProof) {
      return false;
    }

    const nowMs = now.getTime();
    const regionRooms = this.activeRooms(region, nowMs);
    const room = regionRooms.find((candidateRoom) => candidateRoom.roomId === roomId);
    const occupant = room?.occupants.get(normalizedClientId);

    return occupant !== undefined && occupant.assignmentProof === normalizedProof && occupant.expiresAtMs > nowMs;
  }

  private get maxRoomSize(): number {
    return this.options.maxRoomSize ?? SOLERA_LIVE_ROOM_MAX_SIZE;
  }

  private get maxActiveRooms(): number {
    return this.options.maxActiveRooms ?? SOLERA_LIVE_MAX_ACTIVE_ROOMS;
  }

  private get assignmentTtlSeconds(): number {
    return this.options.assignmentTtlSeconds ?? SOLERA_LIVE_ASSIGNMENT_TTL_SECONDS;
  }

  private activeRoomCount(nowMs: number): number {
    return SOLERA_LIVE_REGIONS.reduce((total, region) => total + this.activeRooms(region, nowMs).length, 0);
  }

  private activeRooms(region: SoleraLiveRegion, nowMs: number): RoomRecord[] {
    const rooms = this.rooms.get(region) ?? [];
    const activeRooms = rooms.filter((room) => {
      for (const [clientId, occupant] of room.occupants) {
        if (occupant.expiresAtMs <= nowMs) {
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

  private findOrCreateRoom(region: SoleraLiveRegion, regionRooms: RoomRecord[], clientId: string, nowMs: number): RoomRecord {
    const availableRoom = regionRooms.find((room) => this.roomCanAccept(room, clientId));
    if (availableRoom) {
      return availableRoom;
    }

    if (this.activeRoomCount(nowMs) >= this.maxActiveRooms) {
      throw new SoleraLiveRoomCapacityError();
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

  private createClientId(): string {
    return `client-${randomBytes(18).toString("base64url")}`;
  }

  private createAssignmentProof(): string {
    return randomBytes(32).toString("base64url");
  }
}

export const soleraLiveRoomRegistry = new SoleraLiveRoomRegistry();
