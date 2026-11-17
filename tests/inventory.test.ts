import { describe, it, expect, afterAll } from "vitest";
import prisma from "../lib/prisma";
import { InventoryService } from "../server/services/inventory.service";
import { SlotStatus } from "@prisma/client";
import { ConflictError, NotFoundError } from "../server/errors/api-error";

describe("Phase 4: Parking Inventory Management", () => {
  let createdAreaId: string;
  let carCategoryId: string;

  afterAll(async () => {
    // Clean up test area if created
    if (createdAreaId) {
      await prisma.parkingSlot.deleteMany({ where: { areaId: createdAreaId } });
      await prisma.parkingArea.deleteMany({ where: { id: createdAreaId } });
    }
    await prisma.$disconnect();
  });

  it("lists all parking areas with accurate inventory metrics", async () => {
    const areas = await InventoryService.listAreas();
    expect(areas.length).toBeGreaterThanOrEqual(1);

    const northLot = areas.find((a) => a.code === "NORTH-LOT");
    expect(northLot).toBeDefined();
    expect(northLot?.totalSlots).toBe(15);
    expect(northLot?.availableSlots).toBe(15);
    expect(northLot?.occupiedSlots).toBe(0);
  });

  it("creates a new parking area with unique code validation", async () => {
    const newArea = await InventoryService.createArea({
      name: "West Science Quad Lot",
      code: "TEST-WEST-LOT",
      description: "Temporary test lot for inventory verification",
    });

    createdAreaId = newArea.id;
    expect(newArea.id).toBeDefined();
    expect(newArea.code).toBe("TEST-WEST-LOT");

    // Attempting duplicate code must fail with ConflictError
    await expect(
      InventoryService.createArea({
        name: "Duplicate Lot",
        code: "TEST-WEST-LOT",
      })
    ).rejects.toThrow(ConflictError);
  });

  it("generates a batch of serial slots matching the category prefix", async () => {
    const categories = await InventoryService.listCategories();
    const carCat = categories.find((c) => c.codePrefix === "C");
    expect(carCat).toBeDefined();
    carCategoryId = carCat!.id;

    // Batch generate 3 car slots in the new area (should generate C01, C02, C03)
    const result = await InventoryService.batchGenerateSlots({
      areaId: createdAreaId,
      categoryId: carCategoryId,
      count: 3,
      startNumber: 1,
    });

    expect(result.success).toBe(true);
    expect(result.generatedCount).toBe(3);

    const slotCodes = result.slots.map((s) => s.slotNumber);
    expect(slotCodes).toEqual(["C01", "C02", "C03"]);

    // Verify slots exist in database
    const slotsInDb = await InventoryService.listSlots({ areaId: createdAreaId });
    expect(slotsInDb.length).toBe(3);
  });

  it("updates category duration policies accurately in TiDB", async () => {
    const updatedPolicy = await InventoryService.updatePolicy(carCategoryId, {
      arrivalGraceMinutes: 20,
      parkingDurationMinutes: 25,
    });

    expect(updatedPolicy.arrivalGraceMinutes).toBe(20);
    expect(updatedPolicy.parkingDurationMinutes).toBe(25);

    // Restore to default (15m, 15m)
    const restored = await InventoryService.updatePolicy(carCategoryId, {
      arrivalGraceMinutes: 15,
      parkingDurationMinutes: 15,
    });
    expect(restored.arrivalGraceMinutes).toBe(15);
  });

  it("updates slot status to MAINTENANCE and restores to AVAILABLE", async () => {
    const slots = await InventoryService.listSlots({ areaId: createdAreaId });
    const testSlot = slots[0];

    const maintenanceSlot = await InventoryService.updateSlotStatus(testSlot.id, SlotStatus.MAINTENANCE);
    expect(maintenanceSlot.status).toBe(SlotStatus.MAINTENANCE);

    const availableSlot = await InventoryService.updateSlotStatus(testSlot.id, SlotStatus.AVAILABLE);
    expect(availableSlot.status).toBe(SlotStatus.AVAILABLE);
  });
});
