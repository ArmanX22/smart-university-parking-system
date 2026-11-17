import prisma from "@/lib/prisma";
import { SlotStatus } from "@prisma/client";
import { ConflictError, NotFoundError, ValidationError } from "@/server/errors/api-error";

export class InventoryService {
  // ===========================================================================
  // PARKING AREAS
  // ===========================================================================

  static async listAreas() {
    const areas = await prisma.parkingArea.findMany({
      orderBy: { name: "asc" },
      include: {
        slots: {
          select: {
            id: true,
            status: true,
            categoryId: true,
          },
        },
        _count: {
          select: {
            slots: true,
            attendantAssignments: true,
          },
        },
      },
    });

    return areas.map((area) => {
      const availableCount = area.slots.filter((s) => s.status === SlotStatus.AVAILABLE).length;
      const occupiedCount = area.slots.filter((s) => s.status === SlotStatus.OCCUPIED).length;
      const reservedCount = area.slots.filter((s) => s.status === SlotStatus.RESERVED).length;
      const maintenanceCount = area.slots.filter((s) => s.status === SlotStatus.MAINTENANCE).length;

      return {
        id: area.id,
        name: area.name,
        code: area.code,
        description: area.description,
        totalSlots: area.slots.length,
        availableSlots: availableCount,
        occupiedSlots: occupiedCount,
        reservedSlots: reservedCount,
        maintenanceSlots: maintenanceCount,
        isActive: area.isActive,
        createdAt: area.createdAt,
        updatedAt: area.updatedAt,
      };
    });
  }

  static async getAreaById(id: string) {
    const area = await prisma.parkingArea.findUnique({
      where: { id },
      include: {
        slots: {
          include: {
            category: {
              include: {
                durationPolicy: true,
              },
            },
          },
          orderBy: { slotNumber: "asc" },
        },
        attendantAssignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!area) {
      throw new NotFoundError(`Parking Area with ID ${id} not found.`);
    }

    return area;
  }

  static async createArea(data: { name: string; code: string; description?: string }) {
    const existing = await prisma.parkingArea.findUnique({
      where: { code: data.code.toUpperCase() },
    });

    if (existing) {
      throw new ConflictError(`Parking Area with code "${data.code}" already exists.`);
    }

    return await prisma.parkingArea.create({
      data: {
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description,
        totalSlots: 0,
      },
    });
  }

  static async updateArea(
    id: string,
    data: { name?: string; code?: string; description?: string; isActive?: boolean }
  ) {
    await this.getAreaById(id);

    if (data.code) {
      const codeDuplicate = await prisma.parkingArea.findFirst({
        where: {
          code: data.code.toUpperCase(),
          NOT: { id },
        },
      });
      if (codeDuplicate) {
        throw new ConflictError(`Parking Area code "${data.code}" is already in use.`);
      }
    }

    return await prisma.parkingArea.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.code && { code: data.code.toUpperCase() }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  static async deleteArea(id: string) {
    const area = await this.getAreaById(id);

    // Prevent deletion if active or pending bookings exist in this area
    const activeBookings = await prisma.booking.count({
      where: {
        slot: { areaId: id },
        status: { in: ["PENDING_ARRIVAL", "ACTIVE", "EXPIRED_AWAITING_EXIT"] },
      },
    });

    if (activeBookings > 0) {
      throw new ConflictError(
        `Cannot delete parking area "${area.name}". It contains ${activeBookings} active or pending reservations.`
      );
    }

    return await prisma.parkingArea.delete({
      where: { id },
    });
  }

  // ===========================================================================
  // VEHICLE CATEGORIES & DURATION POLICIES
  // ===========================================================================

  static async listCategories() {
    return await prisma.vehicleCategory.findMany({
      include: {
        durationPolicy: true,
        _count: {
          select: {
            slots: true,
            vehicles: true,
          },
        },
      },
      orderBy: { codePrefix: "asc" },
    });
  }

  static async createCategory(data: {
    name: string;
    codePrefix: string;
    description?: string;
    arrivalGraceMinutes?: number;
    parkingDurationMinutes?: number;
  }) {
    const nameUpper = data.name.toUpperCase();
    const prefixUpper = data.codePrefix.toUpperCase();

    const existingName = await prisma.vehicleCategory.findUnique({
      where: { name: nameUpper },
    });
    if (existingName) {
      throw new ConflictError(`Category name "${nameUpper}" already exists.`);
    }

    const existingPrefix = await prisma.vehicleCategory.findUnique({
      where: { codePrefix: prefixUpper },
    });
    if (existingPrefix) {
      throw new ConflictError(`Category code prefix "${prefixUpper}" already exists.`);
    }

    return await prisma.$transaction(async (tx) => {
      const category = await tx.vehicleCategory.create({
        data: {
          name: nameUpper,
          codePrefix: prefixUpper,
          description: data.description,
        },
      });

      const policy = await tx.durationPolicy.create({
        data: {
          categoryId: category.id,
          arrivalGraceMinutes: data.arrivalGraceMinutes ?? 15,
          parkingDurationMinutes: data.parkingDurationMinutes ?? 15,
          isActive: true,
        },
      });

      return { ...category, durationPolicy: policy };
    });
  }

  static async updatePolicy(
    categoryId: string,
    data: { arrivalGraceMinutes?: number; parkingDurationMinutes?: number; isActive?: boolean }
  ) {
    const category = await prisma.vehicleCategory.findUnique({
      where: { id: categoryId },
      include: { durationPolicy: true },
    });

    if (!category) {
      throw new NotFoundError(`Vehicle category with ID ${categoryId} not found.`);
    }

    return await prisma.durationPolicy.upsert({
      where: { categoryId },
      update: {
        ...(data.arrivalGraceMinutes !== undefined && { arrivalGraceMinutes: data.arrivalGraceMinutes }),
        ...(data.parkingDurationMinutes !== undefined && { parkingDurationMinutes: data.parkingDurationMinutes }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      create: {
        categoryId,
        arrivalGraceMinutes: data.arrivalGraceMinutes ?? 15,
        parkingDurationMinutes: data.parkingDurationMinutes ?? 15,
        isActive: data.isActive ?? true,
      },
    });
  }

  // ===========================================================================
  // PARKING SLOTS & SERIAL GENERATION
  // ===========================================================================

  static async listSlots(filters?: { areaId?: string; categoryId?: string; status?: SlotStatus }) {
    return await prisma.parkingSlot.findMany({
      where: {
        ...(filters?.areaId && { areaId: filters.areaId }),
        ...(filters?.categoryId && { categoryId: filters.categoryId }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        area: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        category: {
          include: {
            durationPolicy: true,
          },
        },
      },
      orderBy: [{ areaId: "asc" }, { slotNumber: "asc" }],
    });
  }

  static async createSlot(data: { areaId: string; categoryId: string; slotNumber: string }) {
    // Validate area exists
    await this.getAreaById(data.areaId);

    // Validate category exists
    const category = await prisma.vehicleCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new NotFoundError(`Category with ID ${data.categoryId} not found.`);
    }

    const cleanSlotNumber = data.slotNumber.toUpperCase();

    // Check duplicate slot number in the same area
    const existing = await prisma.parkingSlot.findUnique({
      where: {
        areaId_slotNumber: {
          areaId: data.areaId,
          slotNumber: cleanSlotNumber,
        },
      },
    });

    if (existing) {
      throw new ConflictError(
        `Slot "${cleanSlotNumber}" already exists in this parking area.`
      );
    }

    const slot = await prisma.parkingSlot.create({
      data: {
        areaId: data.areaId,
        categoryId: data.categoryId,
        slotNumber: cleanSlotNumber,
        status: SlotStatus.AVAILABLE,
      },
      include: {
        area: true,
        category: true,
      },
    });

    // Update totalSlots in area
    await prisma.parkingArea.update({
      where: { id: data.areaId },
      data: { totalSlots: { increment: 1 } },
    });

    return slot;
  }

  /**
   * Generates a batch of serial-numbered slots according to category prefix.
   * E.g., for Car (prefix C) -> C01, C02, C03...
   */
  static async batchGenerateSlots(data: {
    areaId: string;
    categoryId: string;
    count: number;
    startNumber?: number;
  }) {
    await this.getAreaById(data.areaId);

    const category = await prisma.vehicleCategory.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new NotFoundError(`Vehicle category with ID ${data.categoryId} not found.`);
    }

    const prefix = category.codePrefix;
    const start = data.startNumber ?? 1;
    const createdSlots = [];

    // Query existing slots in this area to avoid collision
    const existingSlots = await prisma.parkingSlot.findMany({
      where: { areaId: data.areaId },
      select: { slotNumber: true },
    });
    const existingSet = new Set(existingSlots.map((s) => s.slotNumber));

    let currentNum = start;
    let generated = 0;

    while (generated < data.count && currentNum < start + data.count + 500) {
      const padded = currentNum < 10 ? `0${currentNum}` : `${currentNum}`;
      const slotNumber = `${prefix}${padded}`;

      if (!existingSet.has(slotNumber)) {
        const slot = await prisma.parkingSlot.create({
          data: {
            areaId: data.areaId,
            categoryId: data.categoryId,
            slotNumber,
            status: SlotStatus.AVAILABLE,
          },
        });
        createdSlots.push(slot);
        existingSet.add(slotNumber);
        generated++;
      }
      currentNum++;
    }

    // Update total slots
    await prisma.parkingArea.update({
      where: { id: data.areaId },
      data: { totalSlots: { increment: createdSlots.length } },
    });

    return {
      success: true,
      generatedCount: createdSlots.length,
      slots: createdSlots,
    };
  }

  static async updateSlotStatus(slotId: string, status: SlotStatus) {
    const slot = await prisma.parkingSlot.findUnique({
      where: { id: slotId },
      include: {
        bookings: {
          where: { status: { in: ["PENDING_ARRIVAL", "ACTIVE", "EXPIRED_AWAITING_EXIT"] } },
        },
      },
    });

    if (!slot) {
      throw new NotFoundError(`Slot with ID ${slotId} not found.`);
    }

    // Safety rule: Cannot set to MAINTENANCE if physically occupied or reserved
    if (status === SlotStatus.MAINTENANCE && slot.bookings.length > 0) {
      throw new ConflictError(
        `Cannot place slot "${slot.slotNumber}" under maintenance while an active booking is in progress.`
      );
    }

    // Safety rule: Cannot set occupied slot to AVAILABLE if vehicle is still in EXPIRED_AWAITING_EXIT
    const overstayBooking = slot.bookings.find((b) => b.status === "EXPIRED_AWAITING_EXIT");
    if (overstayBooking && status === SlotStatus.AVAILABLE) {
      throw new ConflictError(
        `CRITICAL SAFETY VIOLATION: Cannot mark slot "${slot.slotNumber}" as AVAILABLE while vehicle is still physically present overstaying. Exit must be verified first.`
      );
    }

    return await prisma.parkingSlot.update({
      where: { id: slotId },
      data: {
        status,
        version: { increment: 1 },
      },
    });
  }
}
