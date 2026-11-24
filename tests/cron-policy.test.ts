import { describe, expect, it } from "vitest";
import { isResetAuthorized } from "@/server/auth/cron-policy";

describe("cron authorization", () => {
  it("accepts only Bearer authorization", () => {
    expect(isResetAuthorized("Bearer secret", "secret")).toBe(true);
    expect(isResetAuthorized("secret", "secret")).toBe(false);
    expect(isResetAuthorized(null, "secret")).toBe(false);
  });
});
