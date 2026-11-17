import prisma from "@/lib/prisma";
import { Prisma, SlotStatus, WaitingStatus, BookingStatus, Booking } from "@prisma/client";
import { ConflictError, NotFoundError } from "@/server/errors/api-error";

export class WaitingListService {
  /**
   * Enqueues a driver into the fair FIFO waiting list.
   */
  static async joinQueue(data: {
    userId: string;
    areaId: string;
    categoryId: string;
    vehicleId: string;
  }) {
    // Verify vehicle belongs to user
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: data.vehicleId, userId: data.userId },
    });
    if (!vehicle) {
      throw new NotFoundError("Selected vehicle not found or does not belong to user.");
    }

    // Check if slots are currently available (no queue needed)
    const availableSlots = await prisma.parkingSlot.count({
      where: {
        areaId: data.areaId,
        categoryId: data.categoryId,
        status: SlotStatus.AVAILABLE,
      },
    });

    if (availableSlots > 0) {
      throw new ConflictError(
        "Slots are currently available in this parking lot! You can make a direct reservation."
      );
    }

    // Check if user is already waiting in this area for this category
    const existing = await prisma.waitingListEntry.findFirst({
      where: {
        userId: data.userId,
        areaId: data.areaId,
        categoryId: data.categoryId,
        status: WaitingStatus.WAITING,
      },
    });

    if (existing) {
      throw new ConflictError("You are already on the waiting list for this vehicle category.");
    }

    const entry = await prisma.waitingListEntry.create({
      data: {
        userId: data.userId,
        areaId: data.areaId,
        categoryId: data.categoryId,
        status: WaitingStatus.WAITING,
      },
      include: {
        area: true,
        category: true,
      },
    });

    // Count user's position in queue
    const position = await prisma.waitingListEntry.count({
      where: {
        areaId: data.areaId,
        categoryId: data.categoryId,
        status: WaitingStatus.WAITING,
        createdAt: { lte: entry.createdAt },
      },
    });

    return {
      ...entry,
      position,
    };
  }

  /**
   * Transactionally allocates a freed slot to the next waiting user (FIFO).
   * If an eligible user exists, creates a PENDING_ARRIVAL booking and keeps slot RESERVED.
   * If no waiting user exists, frees slot to AVAILABLE.
   */
  static async allocateNext(
    tx: Prisma.TransactionClient,
    areaId: string,
    categoryId: string,
    slotId: string
  ): Promise<Booking | null> {
    // 1. Query earliest waiting entry (FIFO)
    const nextWaiting = await tx.waitingListEntry.findFirst({
      where: {
        areaId,
        categoryId,
        status: WaitingStatus.WAITING,
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          include: {
            vehicles: {
              where: { categoryId },
            },
          },
        },
      },
    });

    // If no one is waiting, release slot to AVAILABLE
    if (!nextWaiting) {
      await tx.parkingSlot.update({
        where: { id: slotId },
        data: {
          status: SlotStatus.AVAILABLE,
          version: { increment: 1 },
        },
      });
      return null;
    }

    // 2. Resolve vehicle for waiting user
    const vehicle = nextWaiting.user.vehicles[0];
    if (!vehicle) {
      // User has no valid vehicle registered for this category; skip and recurse
      await tx.waitingListEntry.update({
        where: { id: nextWaiting.id },
        data: { status: WaitingStatus.CANCELLED },
      });
      return this.allocateNext(tx, areaId, categoryId, slotId);
    }

    // 3. Fetch duration policy
    const policy = await tx.durationPolicy.findUnique({
      where: { categoryId },
    });
    const graceMinutes = policy?.arrivalGraceMinutes ?? 15;
    const durationMinutes = policy?.parkingDurationMinutes ?? 15;

    const arrivalExpiresAt = new Date(Date.now() + graceMinutes * 60 * 1000);
    const bookingCode = `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // 4. Create reservation in PENDING_ARRIVAL
    const booking = await tx.booking.create({
      data: {
        bookingCode,
        userId: nextWaiting.userId,
        vehicleId: vehicle.id,
        slotId,
        status: BookingStatus.PENDING_ARRIVAL,
        arrivalExpiresAt,
        appliedGraceMinutes: graceMinutes,
        appliedDurationMinutes: durationMinutes,
      },
    });

    // 5. Mark waiting entry as ALLOCATED
    await tx.waitingListEntry.update({
      where: { id: nextWaiting.id },
      data: {
        status: WaitingStatus.ALLOCATED,
        allocatedBookingId: booking.id,
      },
    });

    // 6. Keep slot RESERVED
    await tx.parkingSlot.update({
      where: { id: slotId },
      data: {
        status: SlotStatus.RESERVED,
        version: { increment: 1 },
      },
    });

    return booking;
  }

  /**
   * Cancel waiting entry.
   */
  static async cancelQueueEntry(userId: string, entryId: string) {
    const entry = await prisma.waitingListEntry.findFirst({
      where: { id: entryId, userId },
    });

    if (!entry) {
      throw new NotFoundError("Waiting list entry not found.");
    }

    if (entry.status !== WaitingStatus.WAITING) {
      throw new ConflictError("Cannot cancel an entry that is not currently waiting.");
    }

    return await prisma.waitingListEntry.update({
      where: { id: entryId },
      data: { status: WaitingStatus.CANCELLED },
    });
  }

  /**
   * List waiting entries for user.
   */
  static async listUserWaiting(userId: string) {
    const entries = await prisma.waitingListEntry.findMany({
      where: { userId },
      include: {
        area: true,
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate queue position for each active entry
    return await Promise.all(
      entries.map(async (entry) => {
        if (entry.status === WaitingStatus.WAITING) {
          const position = await prisma.waitingListEntry.count({
            where: {
              areaId: entry.areaId,
              categoryId: entry.categoryId,
              status: WaitingStatus.WAITING,
              createdAt: { lte: entry.createdAt },
            },
          });
          return { ...entry, position };
        }
        return { ...entry, position: null };
      })
    );
  }
}
