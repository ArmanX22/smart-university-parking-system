import prisma from "@/lib/prisma";
import { Prisma, SlotStatus, UserRole } from "@prisma/client";

const categories = [
  { name: "CAR", codePrefix: "C", description: "Standard passenger car", grace: 15, duration: 15 },
  { name: "MOTORCYCLE", codePrefix: "M", description: "Motorcycle or scooter", grace: 15, duration: 15 },
  { name: "BUS", codePrefix: "B", description: "University transit bus", grace: 15, duration: 30 },
  { name: "OTHER", codePrefix: "O", description: "Other approved vehicle", grace: 15, duration: 20 },
] as const;

const areas = [
  { name: "North Campus Main Lot", code: "NORTH-LOT", description: "Primary student and faculty parking" },
  { name: "South Terminal Lot", code: "SOUTH-LOT", description: "Transit terminal and commuter parking" },
  { name: "Engineering Complex Lot", code: "ENG-LOT", description: "Parking beside the engineering complex" },
] as const;

const northSlots = [
  ...Array.from({ length: 5 }, (_, index) => ({ slotNumber: `C0${index + 1}`, category: "CAR" })),
  ...Array.from({ length: 5 }, (_, index) => ({ slotNumber: `M0${index + 1}`, category: "MOTORCYCLE" })),
  ...Array.from({ length: 3 }, (_, index) => ({ slotNumber: `B0${index + 1}`, category: "BUS" })),
  ...Array.from({ length: 2 }, (_, index) => ({ slotNumber: `O0${index + 1}`, category: "OTHER" })),
] as const;

const users = [
  { email: "admin@university.edu", name: "Demo Administrator", role: UserRole.ADMIN },
  { email: "attendant@university.edu", name: "Demo Gate Attendant", role: UserRole.ATTENDANT },
  { email: "driver@university.edu", name: "Demo Student Driver", role: UserRole.DRIVER },
] as const;

async function clearDemoData(tx: Prisma.TransactionClient) {
  await tx.auditLog.deleteMany();
  await tx.notification.deleteMany();
  await tx.devicePushToken.deleteMany();
  await tx.waitingListEntry.deleteMany();
  await tx.booking.deleteMany();
  await tx.attendantAssignment.deleteMany();
  await tx.session.deleteMany();
  await tx.account.deleteMany();
  await tx.verificationToken.deleteMany();
  await tx.vehicle.deleteMany();
  await tx.parkingSlot.deleteMany();
  await tx.durationPolicy.deleteMany();
  await tx.vehicleCategory.deleteMany();
  await tx.parkingArea.deleteMany();
  await tx.user.deleteMany();
}

async function seedDemoData(tx: Prisma.TransactionClient) {
  const categoryIds = new Map<string, string>();
  for (const item of categories) {
    const category = await tx.vehicleCategory.create({
      data: {
        name: item.name,
        codePrefix: item.codePrefix,
        description: item.description,
        durationPolicy: {
          create: {
            arrivalGraceMinutes: item.grace,
            parkingDurationMinutes: item.duration,
            isActive: true,
          },
        },
      },
    });
    categoryIds.set(item.name, category.id);
  }

  const areaIds = new Map<string, string>();
  for (const item of areas) {
    const area = await tx.parkingArea.create({ data: item });
    areaIds.set(item.code, area.id);
  }

  const northAreaId = areaIds.get("NORTH-LOT")!;
  await tx.parkingSlot.createMany({
    data: northSlots.map((item) => ({
      areaId: northAreaId,
      categoryId: categoryIds.get(item.category)!,
      slotNumber: item.slotNumber,
      status: SlotStatus.AVAILABLE,
    })),
  });
  await tx.parkingArea.update({
    where: { id: northAreaId },
    data: { totalSlots: northSlots.length },
  });

  const createdUsers = new Map<UserRole, string>();
  for (const item of users) {
    const user = await tx.user.create({ data: item });
    createdUsers.set(item.role, user.id);
  }

  await tx.attendantAssignment.create({
    data: {
      userId: createdUsers.get(UserRole.ATTENDANT)!,
      areaId: northAreaId,
    },
  });
  await tx.vehicle.create({
    data: {
      userId: createdUsers.get(UserRole.DRIVER)!,
      categoryId: categoryIds.get("CAR")!,
      licensePlate: "DHK-METRO-GA-1122",
      makeModel: "Toyota Corolla Hybrid",
      color: "Pearl White",
    },
  });

  return { users: users.length, areas: areas.length, slots: northSlots.length };
}

export class DemoResetService {
  static async reset() {
    return prisma.$transaction(
      async (tx) => {
        await clearDemoData(tx);
        return seedDemoData(tx);
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
  }
}
