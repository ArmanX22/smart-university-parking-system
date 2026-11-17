import { describe, it, expect } from "vitest";
import { formatMinutes } from "../lib/utils";

describe("Phase 1 Project Setup & Sanity Checks", () => {
  it("validates that the test runner functions properly", () => {
    expect(1 + 1).toBe(2);
  });

  it("correctly formats duration in minutes", () => {
    expect(formatMinutes(15)).toBe("15m");
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(90)).toBe("1h 30m");
  });
});
