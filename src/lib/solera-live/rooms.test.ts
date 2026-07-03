import { describe, expect, it } from "vitest";
import { SoleraLiveRoomCapacityError, SoleraLiveRoomRegistry } from "./rooms";

describe("Solera Live room assignment", () => {
  it("Given a room reaches 16 users When another user joins Then overflow moves to another room", () => {
    const registry = new SoleraLiveRoomRegistry();
    const assignments = Array.from({ length: 17 }, (_, index) =>
      registry.assign({ requestedRegion: "eu", clientId: `client-${index}` }, new Date("2026-06-30T12:00:00.000Z")),
    );

    expect(assignments[0]?.roomId).toBe("solera-eu-001");
    expect(assignments[15]?.roomId).toBe("solera-eu-001");
    expect(assignments[15]?.occupancyEstimate).toBe(16);
    expect(assignments[16]?.roomId).toBe("solera-eu-002");
    expect(assignments[16]?.occupancyEstimate).toBe(1);
  });

  it("Given active room capacity is exhausted When another user joins Then assignment fails closed", () => {
    const registry = new SoleraLiveRoomRegistry({ maxRoomSize: 1, maxActiveRooms: 2 });

    registry.assign({ requestedRegion: "eu" }, new Date("2026-06-30T12:00:00.000Z"));
    registry.assign({ requestedRegion: "us" }, new Date("2026-06-30T12:00:01.000Z"));

    expect(() => registry.assign({ requestedRegion: "eu" }, new Date("2026-06-30T12:00:02.000Z"))).toThrow(SoleraLiveRoomCapacityError);
  });

  it("Given full rooms have expired When another user joins Then expired rooms do not consume capacity", () => {
    const registry = new SoleraLiveRoomRegistry({ assignmentTtlSeconds: 1, maxRoomSize: 1, maxActiveRooms: 1 });

    registry.assign({ requestedRegion: "eu" }, new Date("2026-06-30T12:00:00.000Z"));
    const assignment = registry.assign({ requestedRegion: "eu" }, new Date("2026-06-30T12:00:02.000Z"));

    expect(assignment.roomId).toBe("solera-eu-002");
    expect(assignment.occupancyEstimate).toBe(1);
  });

  it("Given a previous room is still active When reconnecting Then assignment keeps the same room", () => {
    const registry = new SoleraLiveRoomRegistry();
    const firstAssignment = registry.assign({ requestedRegion: "us", clientId: "client-a" }, new Date("2026-06-30T12:00:00.000Z"));
    const reconnectAssignment = registry.assign(
      {
        requestedRegion: "us",
        previousRoomId: firstAssignment.roomId,
        clientId: firstAssignment.clientId,
        assignmentProof: firstAssignment.assignmentProof,
      },
      new Date("2026-06-30T12:00:30.000Z"),
    );

    expect(reconnectAssignment.roomId).toBe(firstAssignment.roomId);
    expect(reconnectAssignment.clientId).toBe(firstAssignment.clientId);
    expect(reconnectAssignment.assignmentProof).toBe(firstAssignment.assignmentProof);
    expect(reconnectAssignment.occupancyEstimate).toBe(1);
  });

  it("Given a copied client id without its proof When assigning Then the registry issues a different identity", () => {
    const registry = new SoleraLiveRoomRegistry();
    const firstAssignment = registry.assign({ requestedRegion: "eu", clientId: "client-a" }, new Date("2026-06-30T12:00:00.000Z"));
    const copiedClientAssignment = registry.assign(
      { requestedRegion: "eu", previousRoomId: firstAssignment.roomId, clientId: firstAssignment.clientId },
      new Date("2026-06-30T12:00:30.000Z"),
    );

    expect(copiedClientAssignment.clientId).not.toBe(firstAssignment.clientId);
    expect(registry.hasActiveAssignment("eu", firstAssignment.roomId, firstAssignment.clientId, "", new Date("2026-06-30T12:00:45.000Z"))).toBe(false);
    expect(
      registry.hasActiveAssignment("eu", firstAssignment.roomId, firstAssignment.clientId, firstAssignment.assignmentProof, new Date("2026-06-30T12:00:45.000Z")),
    ).toBe(true);
  });

  it("Given an expired room When reconnecting Then a new assignment is created", () => {
    const registry = new SoleraLiveRoomRegistry({ assignmentTtlSeconds: 1 });
    const firstAssignment = registry.assign({ requestedRegion: "eu", clientId: "client-a" }, new Date("2026-06-30T12:00:00.000Z"));
    const reconnectAssignment = registry.assign(
      {
        requestedRegion: "eu",
        previousRoomId: firstAssignment.roomId,
        clientId: firstAssignment.clientId,
        assignmentProof: firstAssignment.assignmentProof,
      },
      new Date("2026-06-30T12:00:02.000Z"),
    );

    expect(reconnectAssignment.roomId).toBe("solera-eu-002");
    expect(reconnectAssignment.clientId).not.toBe(firstAssignment.clientId);
  });
});
