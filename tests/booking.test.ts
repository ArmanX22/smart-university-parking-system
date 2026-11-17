import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../lib/prisma";
import { BookingService } from "../server/services/booking.service";
import { WaitingListService } from "../server/services/waiting-list.service";
import { SlotStatus, BookingStatus, UserRole } from "@prisma/client";
import { ConflictError } from "../server/errors/api-error";

describe("Phase 5: Transactional Booking Engine & Concurrency Protections", () => {
  let testAreaId: string;
  let testCategoryId: string;
  let driver1Id: string;
  let driver2Id: string;
  let vehicle1Id: string;
  let vehicle2Id: string;
  let testSlotId: string;

  beforeAll(async () => {
    // 1. Setup test area with unique code
    const area = await prisma.parkingArea.create({
      data: {
        name: "Concurrency Test Lab Lot",
        code: `TEST-RACE-${Date.now()}`,
        totalSlots: 1,
      },
    });
    testAreaId = area.id;

    // 2. Fetch Car Category
    const category = await prisma.vehicleCategory.findUnique({
      where: { name: "CAR" },
    });
    testCategoryId = category!.id;

    // 3. Create single test slot
    const slot = await prisma.parkingSlot.create({
      data: {
        areaId: testAreaId,
        categoryId: testCategoryId,
        slotNumber: "CRACE-01",
        status: SlotStatus.AVAILABLE,
      },
    });
    testSlotId = slot.id;

    // 4. Create two test drivers
    const driver1 = await prisma.user.create({
      data: {
        email: `race.driver1.${Date.now()}@test.edu`,
        name: "Race Driver One",
        role: UserRole.DRIVER,
      },
    });
    driver1Id = driver1.id;

    const driver2 = await prisma.user.create({
      data: {
        email: `race.driver2.${Date.now()}@test.edu`,
        name: "Race Driver Two",
        role: UserRole.DRIVER,
      },
    });
    driver2Id = driver2.id;

    // 5. Register vehicles
    const v1 = await prisma.vehicle.create({
      data: {
        userId: driver1Id,
        categoryId: testCategoryId,
        licensePlate: `RACE-${Date.now()}-01`,
      },
    });
    vehicle1Id = v1.id;

    const v2 = await prisma.vehicle.create({
      data: {
        userId: driver2Id,
        categoryId: testCategoryId,
        licensePlate: `RACE-${Date.now()}-02`,
      },
    });
    vehicle2Id = v2.id;
  }, 30000);

  afterAll(async () => {
    // Cleanup test data
    if (testAreaId) {
      await prisma.booking.deleteMany({
        where: { slot: { areaId: testAreaId } },
      });
      await prisma.waitingListEntry.deleteMany({
        where: { areaId: testAreaId },
      });
      await prisma.parkingSlot.deleteMany({
        where: { areaId: testAreaId },
      });
      await prisma.parkingArea.deleteMany({
        where: { id: testAreaId },
      });
    }
    if (driver1Id && driver2Id) {
      await prisma.vehicle.deleteMany({
        where: { id: { in: [vehicle1Id, vehicle2Id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [driver1Id, driver2Id] } },
      });
    }
    await prisma.$disconnect();
  }, 30000);

  it("CRITICAL: prevents double-booking under simultaneous race condition", async () => {
    // Fire two simultaneous reservation attempts for the exact same slot
    const results = await Promise.allSettled([
      BookingService.createBooking({
        userId: driver1Id,
        slotId: testSlotId,
        vehicleId: vehicle1Id,
      }),
      BookingService.createBooking({
        userId: driver2Id,
        slotId: testSlotId,
        vehicleId: vehicle2Id,
      }),
    ]);

    const successful = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    // Invariant: Exactly 1 succeeds, and exactly 1 fails
    expect(successful.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Verify rejection reason is ConflictError
    const failureReason = (rejected[0] as PromiseRejectedResult).reason;
    expect(failureReason).toBeInstanceOf(ConflictError);

    // Verify slot status in TiDB is RESERVED, not double-booked
    const slotInDb = await prisma.parkingSlot.findUnique({
      where: { id: testSlotId },
    });
    expect(slotInDb?.status).toBe(SlotStatus.RESERVED);

    // Verify only 1 active booking exists for this slot
    const activeBookings = await prisma.booking.count({
      where: { slotId: testSlotId, status: BookingStatus.PENDING_ARRIVAL },
    });
    expect(activeBookings).toBe(1);
  }, 30000);

  it("completes full lifecycle: PENDING_ARRIVAL -> ACTIVE -> COMPLETED", async () => {
    // Find the winning booking from the previous race condition test
    const booking = await prisma.booking.findFirst({
      where: { slotId: testSlotId, status: BookingStatus.PENDING_ARRIVAL },
    });
    expect(booking).toBeDefined();

    // 1. Attendant confirms physical arrival check-in
    const checkInResult = await BookingService.verifyArrival({
      bookingCode: booking!.bookingCode,
    });

    expect(checkInResult.booking.status).toBe(BookingStatus.ACTIVE);
    expect(checkInResult.booking.enteredAt).toBeDefined();
    expect(checkInResult.booking.parkingExpiresAt).toBeDefined();

    // Slot should now be OCCUPIED
    const occupiedSlot = await prisma.parkingSlot.findUnique({
      where: { id: testSlotId },
    });
    expect(occupiedSlot?.status).toBe(SlotStatus.OCCUPIED);

    // 2. Attendant confirms physical vehicle exit
    const checkOutResult = await BookingService.verifyExit({
      bookingCode: booking!.bookingCode,
    });

    expect(checkOutResult.booking.status).toBe(BookingStatus.COMPLETED);
    expect(checkOutResult.booking.exitedAt).toBeDefined();

    // Invariant: Slot is released to AVAILABLE only after verified departure!
    const releasedSlot = await prisma.parkingSlot.findUnique({
      where: { id: testSlotId },
    });
    expect(releasedSlot?.status).toBe(SlotStatus.AVAILABLE);
  }, 30000);

  it("fair FIFO waiting list allocates freed slot directly to waiting user", async () => {
    // 1. Reserve the slot with driver 1
    const booking1 = await BookingService.createBooking({
      userId: driver1Id,
      slotId: testSlotId,
      vehicleId: vehicle1Id,
    });

    // 2. Since slot is now RESERVED, Driver 2 joins the waiting list
    const waitEntry = await WaitingListService.joinQueue({
      userId: driver2Id,
      areaId: testAreaId,
      categoryId: testCategoryId,
      vehicleId: vehicle2Id,
    });
    expect(waitEntry.status).toBe("WAITING");

    // 3. Driver 1 enters -> ACTIVE
    await BookingService.verifyArrival({
      bookingCode: booking1.bookingCode,
    });

    // 4. Driver 1 exits -> verifyExit called!
    // Invariant: Slot must NOT go to AVAILABLE; it should auto-allocate to Driver 2!
    const exitResult = await BookingService.verifyExit({
      bookingCode: booking1.bookingCode,
    });

    expect(exitResult.reallocatedToWaitingUser).toBe(true);

    // Slot remains RESERVED for the waiting user
    const slotAfterExit = await prisma.parkingSlot.findUnique({
      where: { id: testSlotId },
    });
    expect(slotAfterExit?.status).toBe(SlotStatus.RESERVED);

    // Waiting list entry is marked ALLOCATED
    const updatedWaitEntry = await prisma.waitingListEntry.findUnique({
      where: { id: waitEntry.id },
    });
    expect(updatedWaitEntry?.status).toBe("ALLOCATED");
    expect(updatedWaitEntry?.allocatedBookingId).toBeDefined();

    // New booking created for Driver 2 in PENDING_ARRIVAL
    const driver2Booking = await prisma.booking.findUnique({
      where: { id: updatedWaitEntry!.allocatedBookingId! },
    });
    expect(driver2Booking?.userId).toBe(driver2Id);
    expect(driver2Booking?.status).toBe(BookingStatus.PENDING_ARRIVAL);
  }, 30000);
});
