import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookingStatus, SlotStatus, UserRole } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    parkingSlot: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));

import { InventoryService } from "@/server/services/inventory.service";
import { ConflictError, ForbiddenError, ValidationError } from "@/server/errors/api-error";

function slot(status: SlotStatus, bookingStatus?: BookingStatus) {
  return {
    id: "slot-1",
    areaId: "area-1",
    slotNumber: "C01",
    status,
    bookings: bookingStatus ? [{ id: "booking-1", status: bookingStatus }] : [],
  };
}

const admin = { role: UserRole.ADMIN, assignedAreaId: null };
const attendant = { role: UserRole.ATTENDANT, assignedAreaId: "area-1" };

describe("manual slot state safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockImplementation(async ({ data }: any) => ({ id: "slot-1", ...data }));
  });

  it.each([
    BookingStatus.PENDING_ARRIVAL,
    BookingStatus.ACTIVE,
    BookingStatus.EXPIRED_AWAITING_EXIT,
  ])("rejects manual changes while a %s booking exists", async (bookingStatus) => {
    mocks.findUnique.mockResolvedValue(slot(SlotStatus.OCCUPIED, bookingStatus));

    await expect(
      InventoryService.updateSlotStatus("slot-1", SlotStatus.AVAILABLE, admin)
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects direct manual transitions to RESERVED or OCCUPIED", async () => {
    mocks.findUnique.mockResolvedValue(slot(SlotStatus.AVAILABLE));

    await expect(
      InventoryService.updateSlotStatus("slot-1", SlotStatus.RESERVED, admin)
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      InventoryService.updateSlotStatus("slot-1", SlotStatus.OCCUPIED, admin)
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("allows AVAILABLE to MAINTENANCE and MAINTENANCE to AVAILABLE", async () => {
    mocks.findUnique
      .mockResolvedValueOnce(slot(SlotStatus.AVAILABLE))
      .mockResolvedValueOnce(slot(SlotStatus.MAINTENANCE));

    await expect(
      InventoryService.updateSlotStatus("slot-1", SlotStatus.MAINTENANCE, admin)
    ).resolves.toBeDefined();
    await expect(
      InventoryService.updateSlotStatus("slot-1", SlotStatus.AVAILABLE, admin)
    ).resolves.toBeDefined();
  });

  it("rejects an attendant assigned to another area", async () => {
    mocks.findUnique.mockResolvedValue(slot(SlotStatus.AVAILABLE));

    await expect(
      InventoryService.updateSlotStatus("slot-1", SlotStatus.MAINTENANCE, {
        role: UserRole.ATTENDANT,
        assignedAreaId: "area-2",
      })
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows an attendant to manage an unbooked slot in the assigned area", async () => {
    mocks.findUnique.mockResolvedValue(slot(SlotStatus.AVAILABLE));

    await expect(
      InventoryService.updateSlotStatus("slot-1", SlotStatus.MAINTENANCE, attendant)
    ).resolves.toBeDefined();
  });
});
