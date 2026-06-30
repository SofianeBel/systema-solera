import { describe, expect, it } from "vitest";
import { SoleraLiveChatRateLimiter, validateSoleraLiveChatMessagePayload, validateSoleraLiveChatText } from "./chat";

describe("Solera Live chat safety", () => {
  it("Given a normal message When validating Then it is normalized and accepted", () => {
    expect(validateSoleraLiveChatText("  Hello   Solera  ")).toEqual({ ok: true, text: "Hello Solera" });
  });

  it("Given a link When validating Then it is blocked", () => {
    const result = validateSoleraLiveChatText("visit https://example.com");

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toBe("link");
  });

  it("Given bare domains or invite URLs When validating Then they are blocked", () => {
    for (const text of ["visit example.com", "join discord.gg/solera", "open bit.ly/solera"]) {
      const result = validateSoleraLiveChatText(text);

      expect(result).toMatchObject({ ok: false, reason: "link" });
    }
  });

  it("Given unsafe public text When validating Then it is blocked", () => {
    const result = validateSoleraLiveChatText("kys");

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toBe("blocked_term");
  });

  it("Given common public insults When validating Then they are blocked", () => {
    for (const text of [
      "abruti",
      "connard",
      "ta gueule",
      "nique ta mere",
      "fils de pute",
      "asshole",
      "dumbass",
      "moron",
      "fuck you",
      "piss off",
      "go kill yourself",
      "end yourself",
    ]) {
      const result = validateSoleraLiveChatText(text);

      expect(result).toMatchObject({ ok: false, reason: "blocked_term" });
    }
  });

  it("Given obfuscated public insults When validating Then they are blocked", () => {
    for (const text of [
      "c0nn@rd",
      "с0nnаrd",
      "c o n n a r d",
      "p.u.t.a.i.n",
      "m3rd3",
      "ＦＵＣＫ",
      "f*ck",
      "f u c k",
      "d u m b a s s",
      "pr1ck",
      "ѕhіt",
      "w a n k e r",
      "t.w.a.t",
    ]) {
      const result = validateSoleraLiveChatText(text);

      expect(result).toMatchObject({ ok: false, reason: "blocked_term" });
    }
  });

  it("Given severe slurs with common evasion When validating Then they are blocked", () => {
    for (const text of ["n" + "igga", "n" + "igger", "n\u200Bigg\u200Ber", "n 1 g g 3 r", "p e d e", "f@gg0t", "negre", "n e g r e"]) {
      const result = validateSoleraLiveChatText(text);

      expect(result).toMatchObject({ ok: false, reason: "blocked_term" });
    }
  });

  it("Given short unsafe tokens with punctuation or spacing When validating Then they are blocked", () => {
    for (const text of ["k y s", "f.d.p", "n t m", "t.g"]) {
      const result = validateSoleraLiveChatText(text);

      expect(result).toMatchObject({ ok: false, reason: "blocked_term" });
    }
  });

  it("Given a safe word containing a blocked short word When validating Then it is accepted", () => {
    expect(validateSoleraLiveChatText("The connection to Solera is smooth").ok).toBe(true);
    expect(validateSoleraLiveChatText("Classic orbital analysis with assistant mode").ok).toBe(true);
    expect(validateSoleraLiveChatText("Go Diego through the orbit path").ok).toBe(true);
    expect(validateSoleraLiveChatText("The drop deadline is tomorrow").ok).toBe(true);
  });

  it("Given an unsafe chat message payload When validating Then it is rejected", () => {
    const result = validateSoleraLiveChatMessagePayload({
      messageId: "message-1",
      userId: "user-1",
      displayName: "Aster",
      roomId: "solera-eu-001",
      region: "eu",
      text: "c o n n a r d",
      createdAt: "2026-06-30T12:00:00.000Z",
    });

    expect(result).toEqual({ ok: false, message: "That message is not safe for public chat." });
  });

  it("Given an unsafe display name in a chat payload When validating Then it is rejected", () => {
    const result = validateSoleraLiveChatMessagePayload({
      messageId: "message-1",
      userId: "user-1",
      displayName: "c o n n a r d",
      roomId: "solera-eu-001",
      region: "eu",
      text: "Hello Solera",
      createdAt: "2026-06-30T12:00:00.000Z",
    });

    expect(result).toEqual({ ok: false, message: "That message is not safe for public chat." });
  });

  it("Given a very long input When validating Then it is rejected before moderation work", () => {
    const result = validateSoleraLiveChatText("hello ".repeat(500));

    expect(result).toMatchObject({ ok: false, reason: "too_long" });
  });

  it("Given too many messages inside the window When checking rate limit Then the next message is blocked", () => {
    const limiter = new SoleraLiveChatRateLimiter(2, 1000);

    expect(limiter.check("client-a", 1000).ok).toBe(true);
    expect(limiter.check("client-a", 1100).ok).toBe(true);
    const result = limiter.check("client-a", 1200);

    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toBe("rate_limited");
  });
});
