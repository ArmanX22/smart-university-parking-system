import { describe, expect, it, vi } from "vitest";

const deleteMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  default: {
    devicePushToken: { deleteMany },
  },
}));

import { NotificationService } from "@/server/services/notification.service";

describe("push-token ownership", () => {
  it("deletes a token only when it belongs to the authenticated user", async () => {
    deleteMany.mockResolvedValue({ count: 1 });

    await NotificationService.unregisterToken("user-1", "token-1");

    expect(deleteMany).toHaveBeenCalledWith({
      where: { token: "token-1", userId: "user-1" },
    });
  });
});
