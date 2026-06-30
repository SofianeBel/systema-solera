import { describe, expect, it } from "vitest";
import { SoleraLiveRoomRegistry } from "./rooms";

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

  it("Given a previous room is still active When reconnecting Then assignment keeps the same room", () => {
    const registry = new SoleraLiveRoomRegistry();
    const firstAssignment = registry.assign({ requestedRegion: "us", clientId: "client-a" }, new Date("2026-06-30T12:00:00.000Z"));
    const reconnectAssignment = registry.assign(
      { requestedRegion: "us", previousRoomId: firstAssignment.roomId, clientId: "client-a" },
      new Date("2026-06-30T12:00:30.000Z"),
    );

    expect(reconnectAssignment.roomId).toBe(firstAssignment.roomId);
    expect(reconnectAssignment.occupancyEstimate).toBe(1);
  });

  it("Given an expired room When reconnecting Then a new assignment is created", () => {
    const registry = new SoleraLiveRoomRegistry({ assignmentTtlSeconds: 1 });
    const firstAssignment = registry.assign({ requestedRegion: "eu", clientId: "client-a" }, new Date("2026-06-30T12:00:00.000Z"));
    const reconnectAssignment = registry.assign(
      { requestedRegion: "eu", previousRoomId: firstAssignment.roomId, clientId: "client-a" },
      new Date("2026-06-30T12:00:02.000Z"),
    );

    expect(reconnectAssignment.roomId).toBe("solera-eu-002");
  });
});
