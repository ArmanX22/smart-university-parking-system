import { it, expect, afterAll } from "vitest";
import { describeDatabase } from "./test-database";
import prisma from "../lib/prisma";

describeDatabase("Live TiDB Cloud Database Integration", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("successfully connects to TiDB and verifies seeded vehicle categories", async () => {
    const categories = await prisma.vehicleCategory.findMany({
      include: { durationPolicy: true },
      orderBy: { codePrefix: "asc" },
    });

    expect(categories.length).toBeGreaterThanOrEqual(4);

    const carCategory = categories.find((c) => c.codePrefix === "C");
    expect(carCategory).toBeDefined();
    expect(carCategory?.name).toBe("CAR");
    expect(carCategory?.durationPolicy?.arrivalGraceMinutes).toBe(15);
    expect(carCategory?.durationPolicy?.parkingDurationMinutes).toBe(15);

    const busCategory = categories.find((c) => c.codePrefix === "B");
    expect(busCategory).toBeDefined();
    expect(busCategory?.durationPolicy?.parkingDurationMinutes).toBe(30);
  });

  it("verifies seeded parking areas and serial slots in TiDB", async () => {
    const northLot = await prisma.parkingArea.findUnique({
      where: { code: "NORTH-LOT" },
      include: { slots: true },
    });

    expect(northLot).toBeDefined();
    expect(northLot?.slots.length).toBe(15);

    const slotCodes = northLot?.slots.map((s) => s.slotNumber) || [];
    expect(slotCodes).toContain("C01");
    expect(slotCodes).toContain("M01");
    expect(slotCodes).toContain("B01");
    expect(slotCodes).toContain("O01");
  });

  it("verifies seeded demo users with proper RBAC roles", async () => {
    const admin = await prisma.user.findUnique({ where: { email: "admin@university.edu" } });
    const attendant = await prisma.user.findUnique({ where: { email: "attendant@university.edu" } });
    const driver = await prisma.user.findUnique({ where: { email: "driver@university.edu" } });

    expect(admin?.role).toBe("ADMIN");
    expect(attendant?.role).toBe("ATTENDANT");
    expect(driver?.role).toBe("DRIVER");
  });
});
