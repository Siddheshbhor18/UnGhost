import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseBody, parseQuery } from "./validate";

describe("validate", () => {
  const Schema = z.object({
    name: z.string().min(3),
    age: z.coerce.number()
  });

  describe("parseBody", () => {
    it("successfully parses valid json body", async () => {
      const req = new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", age: "30" }),
        headers: { "content-type": "application/json" }
      });
      const result = await parseBody(req, Schema);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ name: "Alice", age: 30 });
      }
    });

    it("returns bad_json for invalid JSON", async () => {
      const req = new Request("http://localhost/api", {
        method: "POST",
        body: "not-json"
      });
      const result = await parseBody(req, Schema);
      expect(result.ok).toBe(false);
    });

    it("returns invalid_input for schema mismatch", async () => {
      const req = new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ name: "Al", age: "abc" }),
        headers: { "content-type": "application/json" }
      });
      const result = await parseBody(req, Schema);
      expect(result.ok).toBe(false);
    });
  });

  describe("parseQuery", () => {
    it("successfully parses valid query parameters", () => {
      const req = new Request("http://localhost/api?name=Bob&age=25");
      const result = parseQuery(req, Schema);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ name: "Bob", age: 25 });
      }
    });

    it("returns invalid_query for parameter mismatch", () => {
      const req = new Request("http://localhost/api?name=Bo&age=notanumber");
      const result = parseQuery(req, Schema);
      expect(result.ok).toBe(false);
    });
  });
});
