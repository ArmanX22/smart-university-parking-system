import prisma from "@/lib/prisma";
import { BookingStatus, NotificationType } from "@prisma/client";
import { WaitingListService } from "./waiting-list.service";

export interface ExpiryProcessResult {
  timestamp: string;
  processedArrivalGraceExpiries: number;
  processedParkingDurationExpiries: number;
  totalProcessed: number;
  errors: string[];
}

export class ExpiryService {
  private static BATCH_SIZE = 50;

  /**
   * Idempotent batch processor for expired reservations and overstaying vehicles.
   * Can be safely run by Vercel Cron, external schedulers, or manual Admin trigger.
   */
  static async processExpiries(): Promise<ExpiryProcessResult> {
    const now = new Date();
    const result: ExpiryProcessResult = {
      timestamp: now.toISOString(),
      processedArrivalGraceExpiries: 0,
      processedParkingDurationExpiries: 0,
      totalProcessed: 0,
      errors: [],
    };

    // =========================================================================
    // 1. Process Overdue Arrival Grace (PENDING_ARRIVAL -> NO_SHOW)
    // =========================================================================
    const overdueArrivals = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING_ARRIVAL,
        arrivalExpiresAt: { lte: now },
      },
      include: {
        slot: true,
        user: true,
        vehicle: true,
      },
      take: this.BATCH_SIZE,
    });

    for (const booking of overdueArrivals) {
      try {
        await prisma.$transaction(async (tx) => {
          // Idempotency check: Re-verify status inside transaction
          const current = await tx.booking.findUnique({
            where: { id: booking.id },
          });

          if (current?.status !== BookingStatus.PENDING_ARRIVAL) {
            return;
          }

          // Transition to NO_SHOW
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.NO_SHOW },
          });

          // Release slot to AVAILABLE or allocate to next waiting user
          const reallocated = await WaitingListService.allocateNext(
            tx,
            booking.slot.areaId,
            booking.slot.categoryId,
            booking.slotId
          );

          // In-app notification for driver
          await tx.notification.create({
            data: {
              userId: booking.userId,
              title: "Reservation Expired (No-Show)",
              body: `Your reservation for slot ${booking.slot.slotNumber} was cancelled because the ${booking.appliedGraceMinutes}-minute arrival grace period elapsed.`,
              type: NotificationType.NO_SHOW_CANCELLED,
            },
          });

          // Audit log
          await tx.auditLog.create({
            data: {
              action: "AUTO_EXPIRED_NO_SHOW",
              entityType: "Booking",
              entityId: booking.id,
              metadataJson: JSON.stringify({
                bookingCode: booking.bookingCode,
                slotNumber: booking.slot.slotNumber,
                reallocatedToWaitingUser: !!reallocated,
              }),
            },
          });
        });

        result.processedArrivalGraceExpiries++;
      } catch (err) {
        const msg = `Error expiring arrival grace for booking ${booking.bookingCode}: ${(err as Error).message}`;
        console.error(msg);
        result.errors.push(msg);
      }
    }

    // =========================================================================
    // 2. Process Overdue Parking Durations (ACTIVE -> EXPIRED_AWAITING_EXIT)
    // =========================================================================
    const overdueParkings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.ACTIVE,
        parkingExpiresAt: { lte: now },
      },
      include: {
        slot: true,
        user: true,
        vehicle: true,
      },
      take: this.BATCH_SIZE,
    });

    for (const booking of overdueParkings) {
      try {
        await prisma.$transaction(async (tx) => {
          // Idempotency check: Re-verify status inside transaction
          const current = await tx.booking.findUnique({
            where: { id: booking.id },
          });

          if (current?.status !== BookingStatus.ACTIVE) {
            return;
          }

          // Transition booking to EXPIRED_AWAITING_EXIT
          // CRITICAL SAFETY RULE: Slot remains OCCUPIED! Never mark AVAILABLE while vehicle is present!
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.EXPIRED_AWAITING_EXIT },
          });

          // In-app notification for driver
          await tx.notification.create({
            data: {
              userId: booking.userId,
              title: "Parking Duration Expired - Exit Required",
              body: `Your allowed parking time for slot ${booking.slot.slotNumber} has elapsed. Please proceed to the exit gate immediately to avoid overstay penalties.`,
              type: NotificationType.PARKING_EXPIRED,
            },
          });

          // Audit log
          await tx.auditLog.create({
            data: {
              action: "AUTO_EXPIRED_PARKING_OVERSTAY",
              entityType: "Booking",
              entityId: booking.id,
              metadataJson: JSON.stringify({
                bookingCode: booking.bookingCode,
                slotNumber: booking.slot.slotNumber,
                licensePlate: booking.vehicle.licensePlate,
              }),
            },
          });
        });

        result.processedParkingDurationExpiries++;
      } catch (err) {
        const msg = `Error processing parking overstay for booking ${booking.bookingCode}: ${(err as Error).message}`;
        console.error(msg);
        result.errors.push(msg);
      }
    }

    result.totalProcessed =
      result.processedArrivalGraceExpiries + result.processedParkingDurationExpiries;

    return result;
  }
}
