import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingStatus, SlotStatus, WaitingStatus } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  vehicleFindFirst: vi.fn(),
  slotCount: vi.fn(),
  waitingFindFirst: vi.fn(),
  waitingCreate: vi.fn(),
  waitingCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    vehicle: { findFirst: mocks.vehicleFindFirst },
    parkingSlot: { count: mocks.slotCount },
    waitingListEntry: {
      findFirst: mocks.waitingFindFirst,
      create: mocks.waitingCreate,
      count: mocks.waitingCount,
    },
  },
}));

import { WaitingListService } from "@/server/services/waiting-list.service";
import { ValidationError } from "@/server/errors/api-error";

function queueEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "wait-1",
    userId: "user-1",
    areaId: "area-1",
    categoryId: "category-1",
    vehicleId: "vehicle-1",
    status: WaitingStatus.WAITING,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    vehicle: { id: "vehicle-1", userId: "user-1", categoryId: "category-1" },
    ...overrides,
  };
}

function fakeTx() {
  return {
    waitingListEntry: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    durationPolicy: { findUnique: vi.fn() },
    parkingSlot: { update: vi.fn() },
  };
}

describe("waiting-list vehicle and allocation invariants", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a selected vehicle whose category does not match the queue", async () => {
    mocks.vehicleFindFirst.mockResolvedValue({ id: "vehicle-1", categoryId: "bus" });

    await expect(
      WaitingListService.joinQueue({
        userId: "user-1",
        areaId: "area-1",
        categoryId: "car",
        vehicleId: "vehicle-1",
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("persists the selected vehicle on a new queue entry", async () => {
    mocks.vehicleFindFirst.mockResolvedValue({ id: "vehicle-1", categoryId: "car" });
    mocks.slotCount.mockResolvedValue(0);
    mocks.waitingFindFirst.mockResolvedValue(null);
    mocks.waitingCreate.mockImplementation(async ({ data }: any) => ({
      id: "wait-1",
      createdAt: new Date(),
      ...data,
    }));
    mocks.waitingCount.mockResolvedValue(1);

    await WaitingListService.joinQueue({
      userId: "user-1",
      areaId: "area-1",
      categoryId: "car",
      vehicleId: "vehicle-1",
    });

    expect(mocks.waitingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ vehicleId: "vehicle-1" }),
      })
    );
  });

  it("atomically claims the FIFO entry and books its selected vehicle", async () => {
    const tx = fakeTx();
    tx.waitingListEntry.findFirst.mockResolvedValueOnce(queueEntry());
    tx.waitingListEntry.updateMany.mockResolvedValue({ count: 1 });
    tx.booking.findFirst.mockResolvedValue(null);
    tx.durationPolicy.findUnique.mockResolvedValue({
      arrivalGraceMinutes: 15,
      parkingDurationMinutes: 30,
      isActive: true,
    });
    tx.booking.create.mockImplementation(async ({ data }: any) => ({ id: "booking-1", ...data }));

    await WaitingListService.allocateNext(tx as any, "area-1", "category-1", "slot-1");

    expect(tx.waitingListEntry.updateMany).toHaveBeenCalledWith({
      where: { id: "wait-1", status: WaitingStatus.WAITING },
      data: { status: WaitingStatus.ALLOCATED },
    });
    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          vehicleId: "vehicle-1",
          status: BookingStatus.PENDING_ARRIVAL,
        }),
      })
    );
  });

  it("does not allocate when another transaction wins the queue claim", async () => {
    const tx = fakeTx();
    tx.waitingListEntry.findFirst
      .mockResolvedValueOnce(queueEntry())
      .mockResolvedValueOnce(null);
    tx.waitingListEntry.updateMany.mockResolvedValue({ count: 0 });

    const result = await WaitingListService.allocateNext(
      tx as any,
      "area-1",
      "category-1",
      "slot-1"
    );

    expect(result).toBeNull();
    expect(tx.booking.create).not.toHaveBeenCalled();
    expect(tx.parkingSlot.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: SlotStatus.AVAILABLE }) })
    );
  });

  it("skips a queued vehicle that gained an overlapping booking", async () => {
    const tx = fakeTx();
    tx.waitingListEntry.findFirst
      .mockResolvedValueOnce(queueEntry())
      .mockResolvedValueOnce(null);
    tx.waitingListEntry.updateMany.mockResolvedValue({ count: 1 });
    tx.booking.findFirst.mockResolvedValue({ id: "other-booking" });

    await WaitingListService.allocateNext(tx as any, "area-1", "category-1", "slot-1");

    expect(tx.waitingListEntry.update).toHaveBeenCalledWith({
      where: { id: "wait-1" },
      data: { status: WaitingStatus.CANCELLED },
    });
    expect(tx.booking.create).not.toHaveBeenCalled();
  });
});
