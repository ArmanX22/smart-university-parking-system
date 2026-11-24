import prisma from "@/lib/prisma";
import { SlotStatus, BookingStatus, UserRole } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors/api-error";
import { WaitingListService } from "./waiting-list.service";
import { SseService } from "./sse.service";
import { assertCanManageParkingArea } from "@/server/auth/gate-policy";

export class BookingService {
  /**
   * Concurrency-safe reservation creation.
   * Atomically verifies slot status inside a database transaction,
   * locks slot, checks vehicle eligibility, applies policy snapshot,
   * and creates booking in PENDING_ARRIVAL.
   */
  static async createBooking(data: {
    userId: string;
    slotId: string;
    vehicleId: string;
  }) {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Atomic Conditional Lock: Reserve slot ONLY if currently AVAILABLE
      const slotLock = await tx.parkingSlot.updateMany({
        where: {
          id: data.slotId,
          status: SlotStatus.AVAILABLE,
        },
        data: {
          status: SlotStatus.RESERVED,
          version: { increment: 1 },
        },
      });

      if (slotLock.count === 0) {
        throw new ConflictError(
          "This parking slot is no longer available (already reserved or under maintenance)."
        );
      }

      // 2. Fetch full slot, area, and policy metadata
      const slot = await tx.parkingSlot.findUnique({
        where: { id: data.slotId },
        include: {
          area: true,
          category: {
            include: { durationPolicy: true },
          },
        },
      });

      if (!slot) {
        throw new NotFoundError("Parking slot not found.");
      }

      if (!slot.area.isActive) {
        // Rollback slot status
        await tx.parkingSlot.update({
          where: { id: slot.id },
          data: { status: SlotStatus.AVAILABLE },
        });
        throw new ConflictError(`Parking area "${slot.area.name}" is currently inactive.`);
      }

      // 3. Validate vehicle ownership & category match
      const vehicle = await tx.vehicle.findFirst({
        where: { id: data.vehicleId, userId: data.userId },
        include: { category: true },
      });

      if (!vehicle) {
        await tx.parkingSlot.update({
          where: { id: slot.id },
          data: { status: SlotStatus.AVAILABLE },
        });
        throw new NotFoundError("Selected vehicle not found or does not belong to you.");
      }

      if (vehicle.categoryId !== slot.categoryId) {
        await tx.parkingSlot.update({
          where: { id: slot.id },
          data: { status: SlotStatus.AVAILABLE },
        });
        throw new ValidationError(
          `Vehicle category mismatch. Vehicle "${vehicle.licensePlate}" is a ${vehicle.category.name}, but slot "${slot.slotNumber}" is for ${slot.category.name}.`
        );
      }

      // 4. Prevent vehicle from having multiple overlapping active bookings
      const existingVehicleBooking = await tx.booking.findFirst({
        where: {
          vehicleId: data.vehicleId,
          status: { in: [BookingStatus.PENDING_ARRIVAL, BookingStatus.ACTIVE, BookingStatus.EXPIRED_AWAITING_EXIT] },
        },
      });

      if (existingVehicleBooking) {
        await tx.parkingSlot.update({
          where: { id: slot.id },
          data: { status: SlotStatus.AVAILABLE },
        });
        throw new ConflictError(
          `Vehicle "${vehicle.licensePlate}" already has an active reservation or parking session (${existingVehicleBooking.bookingCode}).`
        );
      }

      // 5. Policy snapshot & UTC expiry calculation
      const policy = slot.category.durationPolicy;
      const appliedGraceMinutes = policy?.arrivalGraceMinutes ?? 15;
      const appliedDurationMinutes = policy?.parkingDurationMinutes ?? 15;

      const now = new Date();
      const arrivalExpiresAt = new Date(now.getTime() + appliedGraceMinutes * 60 * 1000);
      const bookingCode = `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 6. Create booking record
      const booking = await tx.booking.create({
        data: {
          bookingCode,
          userId: data.userId,
          vehicleId: vehicle.id,
          slotId: slot.id,
          status: BookingStatus.PENDING_ARRIVAL,
          arrivalExpiresAt,
          appliedGraceMinutes,
          appliedDurationMinutes,
        },
        include: {
          slot: {
            include: {
              area: true,
              category: true,
            },
          },
          vehicle: true,
        },
      });

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          actorId: data.userId,
          action: "BOOKING_CREATED",
          entityType: "Booking",
          entityId: booking.id,
          metadataJson: JSON.stringify({
            bookingCode,
            slotNumber: slot.slotNumber,
            areaCode: slot.area.code,
            appliedGraceMinutes,
            appliedDurationMinutes,
          }),
        },
      });

      return booking;
    });

    // Real-time SSE Broadcast
    try {
      SseService.broadcastSlotUpdate({
        slotId: result.slotId,
        areaId: result.slot.areaId,
        slotNumber: result.slot.slotNumber,
        status: "RESERVED",
        category: result.slot.category.name,
      });
      SseService.broadcastBookingUpdate({
        bookingId: result.id,
        slotId: result.slotId,
        status: result.status,
        slotNumber: result.slot.slotNumber,
      });
    } catch {
      // quiet fail
    }

    return result;
  }

  /**
   * Cancel booking by driver (allowed only during PENDING_ARRIVAL).
   */
  static async cancelBooking(data: { userId: string; bookingId: string; reason?: string }) {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: data.bookingId },
        include: { slot: true },
      });

      if (!booking) {
        throw new NotFoundError("Booking record not found.");
      }

      if (booking.userId !== data.userId) {
        throw new ConflictError("You do not have permission to cancel this booking.");
      }

      if (booking.status !== BookingStatus.PENDING_ARRIVAL) {
        throw new ConflictError(
          `Cannot cancel booking in status "${booking.status}". Only PENDING_ARRIVAL bookings may be cancelled.`
        );
      }

      // 1. Mark booking as CANCELLED
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED },
      });

      // 2. Release slot or allocate to next waiting user
      await WaitingListService.allocateNext(
        tx,
        booking.slot.areaId,
        booking.slot.categoryId,
        booking.slotId
      );

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          actorId: data.userId,
          action: "BOOKING_CANCELLED",
          entityType: "Booking",
          entityId: booking.id,
          metadataJson: JSON.stringify({ reason: data.reason ?? "User cancelled" }),
        },
      });

      return { updatedBooking, booking };
    });

    try {
      SseService.broadcastSlotUpdate({
        slotId: result.booking.slotId,
        areaId: result.booking.slot.areaId,
        slotNumber: result.booking.slot.slotNumber,
        status: "AVAILABLE",
        category: result.booking.slot.categoryId,
      });
      SseService.broadcastBookingUpdate({
        bookingId: result.updatedBooking.id,
        slotId: result.booking.slotId,
        status: "CANCELLED",
        slotNumber: result.booking.slot.slotNumber,
      });
    } catch {
      // quiet fail
    }

    return result.updatedBooking;
  }

  /**
   * Attendant/QR Check-In: Verifies physical vehicle arrival.
   * Transitions booking to ACTIVE and slot to OCCUPIED.
   * Starts the allowed parking duration countdown.
   */
  static async verifyArrival(data: {
    actorId: string;
    actorRole: UserRole;
    assignedAreaId: string | null;
    bookingCode: string;
    qrSecret: string;
  }) {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { bookingCode: data.bookingCode.toUpperCase() },
        include: { slot: { include: { area: true, category: true } }, vehicle: true },
      });

      if (!booking) {
        throw new NotFoundError(`Booking "${data.bookingCode}" not found.`);
      }

      assertCanManageParkingArea(data.actorRole, data.assignedAreaId, booking.slot.areaId);

      if (booking.qrCodeSecret !== data.qrSecret) {
        throw new ValidationError("Invalid QR validation secret token.");
      }

      // Idempotency: If already active, return existing state
      if (booking.status === BookingStatus.ACTIVE) {
        return { booking, alreadyActive: true, lateArrival: false };
      }

      if (booking.status !== BookingStatus.PENDING_ARRIVAL) {
        throw new ConflictError(
          `Cannot check in booking. Current status is "${booking.status}".`
        );
      }

      const now = new Date();

      // Grace period timeout check
      if (booking.arrivalExpiresAt < now) {
        const transition = await tx.booking.updateMany({
          where: {
            id: booking.id,
            status: BookingStatus.PENDING_ARRIVAL,
            arrivalExpiresAt: { lte: now },
          },
          data: { status: BookingStatus.NO_SHOW },
        });

        if (transition.count === 1) {
          await WaitingListService.allocateNext(
            tx,
            booking.slot.areaId,
            booking.slot.categoryId,
            booking.slotId
          );
        }

        return {
          booking: { ...booking, status: BookingStatus.NO_SHOW },
          alreadyActive: false,
          lateArrival: true,
        };
      }

      // Calculate parking expiry from actual check-in time
      const parkingExpiresAt = new Date(now.getTime() + booking.appliedDurationMinutes * 60 * 1000);

      // Update booking to ACTIVE
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.ACTIVE,
          enteredAt: now,
          parkingExpiresAt,
        },
        include: {
          slot: true,
          vehicle: true,
        },
      });

      // Update slot to OCCUPIED
      await tx.parkingSlot.update({
        where: { id: booking.slotId },
        data: {
          status: SlotStatus.OCCUPIED,
          version: { increment: 1 },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: data.actorId,
          action: "ARRIVAL_VERIFIED",
          entityType: "Booking",
          entityId: booking.id,
          metadataJson: JSON.stringify({
            enteredAt: now.toISOString(),
            parkingExpiresAt: parkingExpiresAt.toISOString(),
          }),
        },
      });

      return { booking: updatedBooking, alreadyActive: false, lateArrival: false };
    });

    if (result.lateArrival) {
      throw new ConflictError(
        `Arrival grace period expired at ${result.booking.arrivalExpiresAt.toISOString()}. Booking marked as NO_SHOW.`
      );
    }

    try {
      if (!result.alreadyActive && result.booking) {
        SseService.broadcastSlotUpdate({
          slotId: result.booking.slotId,
          areaId: result.booking.slot?.areaId || "",
          slotNumber: result.booking.slot?.slotNumber || "",
          status: "OCCUPIED",
          category: result.booking.slot?.categoryId || "",
        });
        SseService.broadcastBookingUpdate({
          bookingId: result.booking.id,
          slotId: result.booking.slotId,
          status: "ACTIVE",
          slotNumber: result.booking.slot?.slotNumber || "",
        });
      }
    } catch {
      // quiet fail
    }

    return result;
  }

  /**
   * Attendant/QR Check-Out: Verifies physical vehicle departure.
   * Releases slot to AVAILABLE (or auto-allocates to next waiting user).
   * Marks booking as COMPLETED.
   */
  static async verifyExit(data: {
    actorId: string;
    actorRole: UserRole;
    assignedAreaId: string | null;
    bookingCode: string;
    qrSecret: string;
  }) {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { bookingCode: data.bookingCode.toUpperCase() },
        include: { slot: { include: { area: true, category: true } }, vehicle: true },
      });

      if (!booking) {
        throw new NotFoundError(`Booking "${data.bookingCode}" not found.`);
      }

      if (data.qrSecret && booking.qrCodeSecret !== data.qrSecret) {
        throw new ValidationError("Invalid QR validation secret token.");
      }

      // Idempotency: If already completed, return existing state
      if (booking.status === BookingStatus.COMPLETED) {
        return { booking, alreadyCompleted: true };
      }

      if (
        booking.status !== BookingStatus.ACTIVE &&
        booking.status !== BookingStatus.EXPIRED_AWAITING_EXIT
      ) {
        throw new ConflictError(
          `Cannot verify exit for booking with status "${booking.status}". Must be ACTIVE or EXPIRED_AWAITING_EXIT.`
        );
      }

      const now = new Date();

      // Mark booking as COMPLETED
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: BookingStatus.COMPLETED,
          exitedAt: now,
        },
        include: { slot: true, vehicle: true },
      });

      // Release slot or allocate to next waiting user
      const allocatedNext = await WaitingListService.allocateNext(
        tx,
        booking.slot.areaId,
        booking.slot.categoryId,
        booking.slotId
      );

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: data.actorId,
          action: "EXIT_VERIFIED",
          entityType: "Booking",
          entityId: booking.id,
          metadataJson: JSON.stringify({
            exitedAt: now.toISOString(),
            reallocatedToWaitingUser: !!allocatedNext,
          }),
        },
      });

      return {
        booking: updatedBooking,
        alreadyCompleted: false,
        reallocatedToWaitingUser: !!allocatedNext,
      };
    });

    try {
      if (!result.alreadyCompleted && result.booking) {
        SseService.broadcastSlotUpdate({
          slotId: result.booking.slotId,
          areaId: result.booking.slot?.areaId || "",
          slotNumber: result.booking.slot?.slotNumber || "",
          status: "AVAILABLE",
          category: result.booking.slot?.categoryId || "",
        });
        SseService.broadcastBookingUpdate({
          bookingId: result.booking.id,
          slotId: result.booking.slotId,
          status: "COMPLETED",
          slotNumber: result.booking.slot?.slotNumber || "",
        });
      }
    } catch {
      // quiet fail
    }

    return result;
  }

  /**
   * Retrieves active booking with server-derived countdowns.
   */
  static async getActiveBooking(userId: string) {
    const booking = await prisma.booking.findFirst({
      where: {
        userId,
        status: {
          in: [BookingStatus.PENDING_ARRIVAL, BookingStatus.ACTIVE, BookingStatus.EXPIRED_AWAITING_EXIT],
        },
      },
      include: {
        slot: {
          include: {
            area: true,
            category: true,
          },
        },
        vehicle: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!booking) return null;

    const now = Date.now();

    // 15-Minute Grace Period Expiry Check:
    // If user failed to arrive before arrivalExpiresAt, auto-cancel immediately and release slot
    if (booking.status === BookingStatus.PENDING_ARRIVAL && booking.arrivalExpiresAt.getTime() <= now) {
      await prisma.$transaction(async (tx) => {
        const transition = await tx.booking.updateMany({
          where: {
            id: booking.id,
            status: BookingStatus.PENDING_ARRIVAL,
            arrivalExpiresAt: { lte: new Date(now) },
          },
          data: { status: BookingStatus.NO_SHOW },
        });

        if (transition.count === 1) {
          await WaitingListService.allocateNext(
            tx,
            booking.slot.areaId,
            booking.slot.categoryId,
            booking.slotId
          );
        }
      });

      return null;
    }

    let remainingArrivalSeconds = 0;
    let remainingParkingSeconds = 0;

    if (booking.status === BookingStatus.PENDING_ARRIVAL) {
      remainingArrivalSeconds = Math.max(0, Math.floor((booking.arrivalExpiresAt.getTime() - now) / 1000));
    } else if (booking.status === BookingStatus.ACTIVE && booking.parkingExpiresAt) {
      remainingParkingSeconds = Math.max(0, Math.floor((booking.parkingExpiresAt.getTime() - now) / 1000));
    }

    return {
      ...booking,
      serverTime: new Date().toISOString(),
      remainingArrivalSeconds,
      remainingParkingSeconds,
    };
  }

  /**
   * Retrieves user booking history.
   */
  static async listUserBookings(userId: string, limit = 20) {
    return await prisma.booking.findMany({
      where: { userId },
      include: {
        slot: {
          include: {
            area: true,
            category: true,
          },
        },
        vehicle: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
