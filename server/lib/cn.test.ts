import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins standard classes", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("handles conditional classes", () => {
    expect(cn("a", false && "b", true && "c")).toBe("a c");
  });

  it("merges Tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "p-4")).toBe("p-4");
  });
});
