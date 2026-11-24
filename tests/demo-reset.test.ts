import { beforeEach, describe, expect, it, vi } from "vitest";

const reset = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/demo-reset.service", () => ({
  DemoResetService: { reset },
}));

import { isResetAuthorized } from "@/server/auth/cron-policy";
import { GET, POST } from "@/app/api/cron/reset-demo/route";

describe("nightly demo reset", () => {
  beforeEach(() => {
    reset.mockReset();
    delete process.env.CRON_SECRET;
    delete process.env.RESET_SECRET;
  });

  it("uses constant-time Bearer authorization and rejects missing credentials", () => {
    expect(isResetAuthorized(null, "reset-secret")).toBe(false);
    expect(isResetAuthorized("Bearer wrong", "reset-secret")).toBe(false);
    expect(isResetAuthorized("Bearer reset-secret", "reset-secret")).toBe(true);
  });

  it("rejects an unauthorized reset without touching data", async () => {
    process.env.RESET_SECRET = "reset-secret";
    reset.mockClear();
    const request = new Request("http://localhost/api/cron/reset-demo", { method: "POST" });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(reset).not.toHaveBeenCalled();
  });

  it("accepts Vercel Cron GET requests signed with CRON_SECRET", async () => {
    process.env.CRON_SECRET = "cron-secret";
    reset.mockResolvedValue({ users: 3, areas: 3, slots: 15 });
    const request = new Request("http://localhost/api/cron/reset-demo", {
      headers: { authorization: "Bearer cron-secret" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(reset).toHaveBeenCalled();
  });

  it("runs the reset for an authorized request and returns its summary", async () => {
    process.env.RESET_SECRET = "reset-secret";
    reset.mockResolvedValue({ users: 3, areas: 3, slots: 15 });
    const request = new Request("http://localhost/api/cron/reset-demo", {
      method: "POST",
      headers: { authorization: "Bearer reset-secret" },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(body).toEqual({ success: true, data: { users: 3, areas: 3, slots: 15 } });
  });
});
