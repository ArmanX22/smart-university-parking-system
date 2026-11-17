import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../lib/prisma";
import { NotificationService } from "../server/services/notification.service";
import { NotificationType, UserRole } from "@prisma/client";

describe("Phase 7: FCM Push Notifications & In-App Alerts", () => {
  let testUserId: string;
  const testToken = `test-fcm-device-token-${Date.now()}`;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `fcm.tester.${Date.now()}@test.edu`,
        name: "FCM Tester",
        role: UserRole.DRIVER,
      },
    });
    testUserId = user.id;
  }, 30000);

  afterAll(async () => {
    if (testUserId) {
      await prisma.devicePushToken.deleteMany({ where: { userId: testUserId } });
      await prisma.notification.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
    await prisma.$disconnect();
  }, 30000);

  it("registers and upserts a device push token in TiDB", async () => {
    const registered = await NotificationService.registerToken(testUserId, testToken, "web");
    expect(registered.id).toBeDefined();
    expect(registered.token).toBe(testToken);
    expect(registered.userId).toBe(testUserId);

    // Verify token exists in database
    const tokenInDb = await prisma.devicePushToken.findUnique({
      where: { token: testToken },
    });
    expect(tokenInDb).toBeDefined();
  }, 30000);

  it("creates and logs in-app notifications for booking scenarios", async () => {
    // 1. Booking confirmed
    await NotificationService.notifyBookingConfirmed({
      userId: testUserId,
      bookingCode: "BK-FCM-001",
      slotNumber: "C01",
      appliedGraceMinutes: 15,
    });

    // 2. Parking expired
    await NotificationService.notifyParkingExpired({
      userId: testUserId,
      slotNumber: "C01",
    });

    const notifications = await NotificationService.listUserNotifications(testUserId);
    expect(notifications.length).toBe(2);

    const types = notifications.map((n) => n.type);
    expect(types).toContain(NotificationType.BOOKING_CONFIRMED);
    expect(types).toContain(NotificationType.PARKING_EXPIRED);
  }, 30000);

  it("marks notifications as read", async () => {
    const unreadBefore = await prisma.notification.count({
      where: { userId: testUserId, readAt: null },
    });
    expect(unreadBefore).toBeGreaterThanOrEqual(1);

    await NotificationService.markAsRead(testUserId);

    const unreadAfter = await prisma.notification.count({
      where: { userId: testUserId, readAt: null },
    });
    expect(unreadAfter).toBe(0);
  }, 30000);

  it("unregisters a device push token cleanly", async () => {
    await NotificationService.unregisterToken(testToken);

    const tokenInDb = await prisma.devicePushToken.findUnique({
      where: { token: testToken },
    });
    expect(tokenInDb).toBeNull();
  }, 30000);
});
