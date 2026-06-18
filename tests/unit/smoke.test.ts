import { describe, it, expect } from "vitest";

describe("Smoke test", () => {
  it("should pass basic math", () => {
    expect(1 + 1).toBe(2);
  });

  it("should have a working test environment", () => {
    expect(typeof window).toBe("object");
  });
});
