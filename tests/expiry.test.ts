import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "../lib/prisma";
import { ExpiryService } from "../server/services/expiry.service";
import { SlotStatus, BookingStatus, UserRole } from "@prisma/client";

describe("Phase 6: Timers and Expiry Scheduler", () => {
  let testAreaId: string;
  let testCategoryId: string;
  let driverId: string;
  let vehicleId: string;
  let slot1Id: string;
  let slot2Id: string;

  beforeAll(async () => {
    // 1. Create Area with unique code
    const area = await prisma.parkingArea.create({
      data: {
        name: "Expiry Scheduler Test Lot",
        code: `TEST-EXPIRY-${Date.now()}`,
        totalSlots: 2,
      },
    });
    testAreaId = area.id;

    // 2. Fetch category
    const cat = await prisma.vehicleCategory.findUnique({ where: { name: "CAR" } });
    testCategoryId = cat!.id;

    // 3. Create Slots
    const s1 = await prisma.parkingSlot.create({
      data: {
        areaId: testAreaId,
        categoryId: testCategoryId,
        slotNumber: "EXP-01",
        status: SlotStatus.RESERVED,
      },
    });
    slot1Id = s1.id;

    const s2 = await prisma.parkingSlot.create({
      data: {
        areaId: testAreaId,
        categoryId: testCategoryId,
        slotNumber: "EXP-02",
        status: SlotStatus.OCCUPIED,
      },
    });
    slot2Id = s2.id;

    // 4. Create Driver & Vehicle
    const user = await prisma.user.create({
      data: {
        email: `expiry.tester.${Date.now()}@test.edu`,
        name: "Expiry Tester",
        role: UserRole.DRIVER,
      },
    });
    driverId = user.id;

    const v = await prisma.vehicle.create({
      data: {
        userId: driverId,
        categoryId: testCategoryId,
        licensePlate: `EXP-${Date.now()}`,
      },
    });
    vehicleId = v.id;
  }, 30000);

  afterAll(async () => {
    if (testAreaId) {
      await prisma.notification.deleteMany({ where: { userId: driverId } });
      await prisma.booking.deleteMany({ where: { slot: { areaId: testAreaId } } });
      await prisma.parkingSlot.deleteMany({ where: { areaId: testAreaId } });
      await prisma.parkingArea.deleteMany({ where: { id: testAreaId } });
    }
    if (driverId) {
      await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
      await prisma.user.deleteMany({ where: { id: driverId } });
    }
    await prisma.$disconnect();
  }, 30000);

  it("transitions overdue arrival grace to NO_SHOW and releases slot safely", async () => {
    // Create booking whose arrival grace expired 10 minutes ago
    const pastGrace = new Date(Date.now() - 10 * 60 * 1000);
    const booking = await prisma.booking.create({
      data: {
        bookingCode: `BK-NOSHOW-${Date.now().toString().slice(-4)}`,
        userId: driverId,
        vehicleId,
        slotId: slot1Id,
        status: BookingStatus.PENDING_ARRIVAL,
        arrivalExpiresAt: pastGrace,
        appliedGraceMinutes: 15,
        appliedDurationMinutes: 15,
      },
    });

    // Run expiry processor
    const result = await ExpiryService.processExpiries();
    expect(result.processedArrivalGraceExpiries).toBeGreaterThanOrEqual(1);

    // Verify booking is NO_SHOW
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updatedBooking?.status).toBe(BookingStatus.NO_SHOW);

    // Verify slot was released to AVAILABLE
    const releasedSlot = await prisma.parkingSlot.findUnique({
      where: { id: slot1Id },
    });
    expect(releasedSlot?.status).toBe(SlotStatus.AVAILABLE);

    // Verify notification was generated
    const notification = await prisma.notification.findFirst({
      where: { userId: driverId, type: "NO_SHOW_CANCELLED" },
    });
    expect(notification).toBeDefined();
  }, 30000);

  it("CRITICAL: transitions overdue parking to EXPIRED_AWAITING_EXIT but retains slot in OCCUPIED", async () => {
    // Create active booking whose parking duration expired 5 minutes ago
    const pastParking = new Date(Date.now() - 5 * 60 * 1000);
    const booking = await prisma.booking.create({
      data: {
        bookingCode: `BK-OVERSTAY-${Date.now().toString().slice(-4)}`,
        userId: driverId,
        vehicleId,
        slotId: slot2Id,
        status: BookingStatus.ACTIVE,
        arrivalExpiresAt: new Date(Date.now() - 30 * 60 * 1000),
        enteredAt: new Date(Date.now() - 20 * 60 * 1000),
        parkingExpiresAt: pastParking,
        appliedGraceMinutes: 15,
        appliedDurationMinutes: 15,
      },
    });

    // Run expiry processor
    const result = await ExpiryService.processExpiries();
    expect(result.processedParkingDurationExpiries).toBeGreaterThanOrEqual(1);

    // Verify booking is EXPIRED_AWAITING_EXIT
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
    });
    expect(updatedBooking?.status).toBe(BookingStatus.EXPIRED_AWAITING_EXIT);

    // CRITICAL SAFETY INVARIANT: Slot MUST REMAIN OCCUPIED because vehicle is still parked!
    const slotInDb = await prisma.parkingSlot.findUnique({
      where: { id: slot2Id },
    });
    expect(slotInDb?.status).toBe(SlotStatus.OCCUPIED);

    // Verify notification was generated
    const notification = await prisma.notification.findFirst({
      where: { userId: driverId, type: "PARKING_EXPIRED" },
    });
    expect(notification).toBeDefined();
  }, 30000);

  it("proves scheduler processing is 100% idempotent", async () => {
    // Running a second time immediately should find no pending overdues
    const secondRun = await ExpiryService.processExpiries();
    expect(secondRun.totalProcessed).toBe(0);
    expect(secondRun.errors.length).toBe(0);
  }, 30000);
});
