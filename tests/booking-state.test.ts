import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingStatus, UserRole } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  bookingFindFirst: vi.fn(),
  bookingFindUnique: vi.fn(),
  bookingUpdate: vi.fn(),
  bookingUpdateMany: vi.fn(),
  auditCreate: vi.fn(),
  allocateNext: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: mocks.transaction,
    booking: { findFirst: mocks.bookingFindFirst },
  },
}));

vi.mock("@/server/services/waiting-list.service", () => ({
  WaitingListService: { allocateNext: mocks.allocateNext },
}));

import { BookingService } from "@/server/services/booking.service";
import { ConflictError } from "@/server/errors/api-error";

const expiredBooking = {
  id: "booking-1",
  bookingCode: "BK-EXPIRED",
  qrCodeSecret: "qr-secret",
  userId: "driver-1",
  vehicleId: "vehicle-1",
  slotId: "slot-1",
  status: BookingStatus.PENDING_ARRIVAL,
  arrivalExpiresAt: new Date(Date.now() - 60_000),
  appliedDurationMinutes: 15,
  slot: {
    id: "slot-1",
    areaId: "area-1",
    categoryId: "category-1",
    slotNumber: "C01",
    area: { id: "area-1" },
    category: { id: "category-1" },
  },
  vehicle: { licensePlate: "TEST-1" },
};

function fakeTransaction() {
  return {
    booking: {
      findUnique: mocks.bookingFindUnique,
      update: mocks.bookingUpdate,
      updateMany: mocks.bookingUpdateMany,
    },
    auditLog: { create: mocks.auditCreate },
  };
}

describe("booking expiry state transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.bookingFindUnique.mockResolvedValue(expiredBooking);
    mocks.bookingUpdate.mockResolvedValue({ ...expiredBooking, status: BookingStatus.NO_SHOW });
    mocks.bookingUpdateMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({});
    mocks.allocateNext.mockResolvedValue(null);
  });

  it("commits NO_SHOW before reporting a late arrival conflict", async () => {
    let committed = false;
    mocks.transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) => {
      const result = await callback(fakeTransaction());
      committed = true;
      return result;
    });

    await expect(
      BookingService.verifyArrival({
        actorId: "admin-1",
        actorRole: UserRole.ADMIN,
        assignedAreaId: null,
        bookingCode: expiredBooking.bookingCode,
        qrSecret: expiredBooking.qrCodeSecret,
      })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(committed).toBe(true);
    expect(mocks.bookingUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: expiredBooking.id,
          status: BookingStatus.PENDING_ARRIVAL,
        }),
        data: { status: BookingStatus.NO_SHOW },
      })
    );
    expect(mocks.allocateNext).toHaveBeenCalledTimes(1);
  });

  it("does not reallocate a late arrival when another request wins", async () => {
    mocks.bookingUpdateMany.mockResolvedValue({ count: 0 });
    mocks.transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) =>
      callback(fakeTransaction())
    );

    await expect(
      BookingService.verifyArrival({
        actorId: "admin-1",
        actorRole: UserRole.ADMIN,
        assignedAreaId: null,
        bookingCode: expiredBooking.bookingCode,
        qrSecret: expiredBooking.qrCodeSecret,
      })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(mocks.allocateNext).not.toHaveBeenCalled();
  });

  it("does not reallocate when another request already expired the booking", async () => {
    mocks.bookingFindFirst.mockResolvedValue(expiredBooking);
    mocks.bookingUpdateMany.mockResolvedValue({ count: 0 });
    mocks.transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) =>
      callback(fakeTransaction())
    );

    await BookingService.getActiveBooking(expiredBooking.userId);

    expect(mocks.bookingUpdateMany).toHaveBeenCalledTimes(1);
    expect(mocks.allocateNext).not.toHaveBeenCalled();
  });

  it("reallocates once when this request wins the expiry transition", async () => {
    mocks.bookingFindFirst.mockResolvedValue(expiredBooking);
    mocks.bookingUpdateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback: (tx: any) => Promise<any>) =>
      callback(fakeTransaction())
    );

    await BookingService.getActiveBooking(expiredBooking.userId);

    expect(mocks.allocateNext).toHaveBeenCalledTimes(1);
  });
});
