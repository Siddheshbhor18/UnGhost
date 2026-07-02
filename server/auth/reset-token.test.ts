import { describe, expect, it } from "vitest";
import {
  consumeResetToken,
  issueResetToken,
  peekResetToken,
} from "./reset-token";

describe("reset-token", () => {
  it("issues a 64-char hex token and binds it to a user id", async () => {
    const { token, rateLimited } = await issueResetToken("u_alice", "a@x.com");
    expect(rateLimited).toBe(false);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(await peekResetToken(token)).toBe("u_alice");
  });

  it("consume returns the user id then invalidates the token", async () => {
    const { token } = await issueResetToken("u_bob", "b@x.com");
    expect(await consumeResetToken(token)).toBe("u_bob");
    expect(await peekResetToken(token)).toBeNull();
    expect(await consumeResetToken(token)).toBeNull();
  });

  it("rejects malformed tokens", async () => {
    expect(await peekResetToken("")).toBeNull();
    expect(await consumeResetToken("")).toBeNull();
  });

  it("rate-limits after 5 requests in the same window", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await issueResetToken("u_x", "rate@x.com");
      expect(r.rateLimited).toBe(false);
    }
    const sixth = await issueResetToken("u_x", "rate@x.com");
    expect(sixth.rateLimited).toBe(true);
    expect(sixth.token).toBe("");
  });

  it("scopes rate-limit per email", async () => {
    for (let i = 0; i < 5; i++) await issueResetToken("u_x", "a@x.com");
    const otherEmail = await issueResetToken("u_y", "b@x.com");
    expect(otherEmail.rateLimited).toBe(false);
  });

  it("consume is atomic — concurrent calls only one wins", async () => {
    // Regression: `get` then `del` split let two concurrent consumers both
    // see the userId. Switched to `getdel` so only one caller gets the id.
    const { token } = await issueResetToken("u_race", "race@x.com");
    const [a, b] = await Promise.all([
      consumeResetToken(token),
      consumeResetToken(token),
    ]);
    const winners = [a, b].filter((v) => v !== null);
    expect(winners).toEqual(["u_race"]);
  });
});
