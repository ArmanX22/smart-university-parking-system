import prisma from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging, type MulticastMessage, type SendResponse } from "firebase-admin/messaging";

// Safe Singleton Initialization for Firebase Admin
function getFirebaseAdminApp(): App | null {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      privateKey = privateKey.replace(/\\n/g, "\n");

      return initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } catch (err) {
      console.warn("⚠️ Firebase Admin initialization failed; falling back to in-app notification mode:", err);
      return null;
    }
  }

  return null;
}

export class NotificationService {
  /**
   * Dispatches a notification to a specific user.
   * 1. Creates an in-app persistent Notification in TiDB.
   * 2. Sends Web Push to all active device push tokens via Firebase Cloud Messaging.
   * 3. Prunes stale or unregistered tokens upon FCM error feedback.
   */
  static async sendNotification(data: {
    userId: string;
    title: string;
    body: string;
    type: NotificationType;
    clickAction?: string;
    metadata?: Record<string, string>;
  }) {
    // 1. Create persistent in-app notification in TiDB
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type,
      },
    });

    // 2. Query user's registered push tokens
    const tokens = await prisma.devicePushToken.findMany({
      where: { userId: data.userId },
      select: { id: true, token: true },
    });

    if (tokens.length === 0) {
      return { inAppOnly: true, notification };
    }

    const app = getFirebaseAdminApp();
    if (!app) {
      // In development or when FCM keys are pending, in-app notification succeeds cleanly
      console.log(`[FCM Mock Push] To User: ${data.userId} | ${data.title}: ${data.body}`);
      return { inAppOnly: true, notification };
    }

    // 3. Send Web Push via Firebase Admin Multicast
    const pushPayload: MulticastMessage = {
      tokens: tokens.map((t) => t.token),
      notification: {
        title: data.title,
        body: data.body,
      },
      data: {
        type: data.type,
        click_action: data.clickAction || "/driver",
        ...(data.metadata || {}),
      },
      webpush: {
        fcmOptions: {
          link: data.clickAction || "/driver",
        },
      },
    };

    try {
      const messaging = getMessaging(app);
      const response = await messaging.sendEachForMulticast(pushPayload);

      // 4. Prune dead or revoked tokens
      const deadTokenIds: string[] = [];
      response.responses.forEach((resp: SendResponse, idx: number) => {
        if (!resp.success && resp.error) {
          const code = resp.error.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered"
          ) {
            deadTokenIds.push(tokens[idx].id);
          }
        }
      });

      if (deadTokenIds.length > 0) {
        await prisma.devicePushToken.deleteMany({
          where: { id: { in: deadTokenIds } },
        });
        console.log(`Pruned ${deadTokenIds.length} invalid FCM device tokens.`);
      }

      return {
        inAppOnly: false,
        notification,
        fcmSuccessCount: response.successCount,
        fcmFailureCount: response.failureCount,
      };
    } catch (fcmError) {
      console.error("FCM dispatch error:", fcmError);
      return { inAppOnly: true, notification, fcmError: (fcmError as Error).message };
    }
  }

  // ===========================================================================
  // SPECIFIC NOTIFICATION SCENARIOS
  // ===========================================================================

  static async notifyBookingConfirmed(booking: {
    userId: string;
    bookingCode: string;
    slotNumber: string;
    appliedGraceMinutes: number;
  }) {
    return this.sendNotification({
      userId: booking.userId,
      title: "Booking Confirmed! 🚗",
      body: `Slot ${booking.slotNumber} reserved (${booking.bookingCode}). Please arrive within ${booking.appliedGraceMinutes} minutes.`,
      type: NotificationType.BOOKING_CONFIRMED,
      metadata: { bookingCode: booking.bookingCode },
    });
  }

  static async notifyArrivalReminder(booking: {
    userId: string;
    slotNumber: string;
    minutesRemaining: number;
  }) {
    return this.sendNotification({
      userId: booking.userId,
      title: "Arrival Grace Window Expiring Soon ⏰",
      body: `You have ${booking.minutesRemaining} minutes remaining to check in at slot ${booking.slotNumber} before your reservation is marked as No-Show.`,
      type: NotificationType.ARRIVAL_REMINDER,
    });
  }

  static async notifyVehicleArrived(booking: {
    userId: string;
    slotNumber: string;
    appliedDurationMinutes: number;
  }) {
    return this.sendNotification({
      userId: booking.userId,
      title: "Arrival Verified - Parking Active ✅",
      body: `Welcome! Your parking session for slot ${booking.slotNumber} has commenced (${booking.appliedDurationMinutes} min duration limit).`,
      type: NotificationType.VEHICLE_ARRIVED,
    });
  }

  static async notifyParkingWarning(booking: {
    userId: string;
    slotNumber: string;
    minutesRemaining: number;
  }) {
    return this.sendNotification({
      userId: booking.userId,
      title: "Parking Time Nearly Expired ⚠️",
      body: `Your parking duration for slot ${booking.slotNumber} expires in ${booking.minutesRemaining} minutes. Please prepare to exit.`,
      type: NotificationType.PARKING_WARNING,
    });
  }

  static async notifyParkingExpired(booking: {
    userId: string;
    slotNumber: string;
  }) {
    return this.sendNotification({
      userId: booking.userId,
      title: "Parking Duration Expired - Exit Gate Required 🚨",
      body: `Allowed parking time for slot ${booking.slotNumber} has elapsed. Please proceed to the exit gate immediately.`,
      type: NotificationType.PARKING_EXPIRED,
    });
  }

  static async notifyNoShow(booking: {
    userId: string;
    slotNumber: string;
  }) {
    return this.sendNotification({
      userId: booking.userId,
      title: "Reservation Cancelled (No-Show) ❌",
      body: `Your reservation for slot ${booking.slotNumber} was automatically cancelled due to arrival grace expiration.`,
      type: NotificationType.NO_SHOW_CANCELLED,
    });
  }

  static async notifyVehicleExit(booking: {
    userId: string;
    slotNumber: string;
  }) {
    return this.sendNotification({
      userId: booking.userId,
      title: "Departure Confirmed - Slot Released 👋",
      body: `Vehicle exit for slot ${booking.slotNumber} was verified. Thank you for using UniParking!`,
      type: NotificationType.VEHICLE_EXIT,
    });
  }

  static async notifyWaitingAllocated(booking: {
    userId: string;
    slotNumber: string;
    bookingCode: string;
    appliedGraceMinutes: number;
  }) {
    return this.sendNotification({
      userId: booking.userId,
      title: "Parking Slot Available! 🎉",
      body: `A slot just freed up! You have been allocated slot ${booking.slotNumber} (${booking.bookingCode}). Arrival grace: ${booking.appliedGraceMinutes} min.`,
      type: NotificationType.WAITING_ALLOCATED,
      metadata: { bookingCode: booking.bookingCode },
    });
  }

  // ===========================================================================
  // TOKEN REGISTRATION & MANAGEMENT
  // ===========================================================================

  static async registerToken(userId: string, token: string, platform = "web") {
    return await prisma.devicePushToken.upsert({
      where: { token },
      update: {
        userId,
        platform,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        token,
        platform,
      },
    });
  }

  static async unregisterToken(userId: string, token: string) {
    return await prisma.devicePushToken.deleteMany({
      where: { token, userId },
    });
  }

  static async listUserNotifications(userId: string, limit = 30) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async markAsRead(userId: string, notificationIds?: string[]) {
    if (notificationIds && notificationIds.length > 0) {
      return await prisma.notification.updateMany({
        where: { id: { in: notificationIds }, userId },
        data: { readAt: new Date() },
      });
    }

    return await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
