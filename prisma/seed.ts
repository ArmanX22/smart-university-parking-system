import { PrismaClient, UserRole, SlotStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Smart Parking database seeding...");

  // 1. Vehicle Categories and Duration Policies
  const categoriesData = [
    {
      name: "CAR",
      codePrefix: "C",
      description: "Standard 4-wheel passenger car, sedan, SUV",
      graceMinutes: 15,
      parkingMinutes: 15,
    },
    {
      name: "MOTORCYCLE",
      codePrefix: "M",
      description: "2-wheel motorcycle, scooter, or bike",
      graceMinutes: 15,
      parkingMinutes: 15,
    },
    {
      name: "BUS",
      codePrefix: "B",
      description: "University transit bus or chartered coach",
      graceMinutes: 15,
      parkingMinutes: 30,
    },
    {
      name: "OTHER",
      codePrefix: "O",
      description: "Delivery van, maintenance truck, emergency vehicle",
      graceMinutes: 15,
      parkingMinutes: 20,
    },
  ];

  const categories: Record<string, string> = {};

  for (const cat of categoriesData) {
    const category = await prisma.vehicleCategory.upsert({
      where: { name: cat.name },
      update: {
        codePrefix: cat.codePrefix,
        description: cat.description,
      },
      create: {
        name: cat.name,
        codePrefix: cat.codePrefix,
        description: cat.description,
      },
    });

    categories[cat.name] = category.id;

    await prisma.durationPolicy.upsert({
      where: { categoryId: category.id },
      update: {
        arrivalGraceMinutes: cat.graceMinutes,
        parkingDurationMinutes: cat.parkingMinutes,
        isActive: true,
      },
      create: {
        categoryId: category.id,
        arrivalGraceMinutes: cat.graceMinutes,
        parkingDurationMinutes: cat.parkingMinutes,
        isActive: true,
      },
    });

    console.log(`✓ Seeded category & policy: ${cat.name} (${cat.codePrefix}) -> Grace: ${cat.graceMinutes}m, Park: ${cat.parkingMinutes}m`);
  }

  // 2. Parking Areas
  const areasData = [
    {
      name: "North Campus Main Lot",
      code: "NORTH-LOT",
      description: "Primary student & faculty parking situated near the academic building",
    },
    {
      name: "South Terminal Lot",
      code: "SOUTH-LOT",
      description: "Transit terminal lot with large bays for buses and daily commuter vehicles",
    },
    {
      name: "Engineering Complex Lot",
      code: "ENG-LOT",
      description: "Dedicated parking adjacent to laboratories and tech center",
    },
  ];

  const areas: Record<string, string> = {};

  for (const area of areasData) {
    const createdArea = await prisma.parkingArea.upsert({
      where: { code: area.code },
      update: {
        name: area.name,
        description: area.description,
      },
      create: {
        name: area.name,
        code: area.code,
        description: area.description,
      },
    });
    areas[area.code] = createdArea.id;
    console.log(`✓ Seeded area: ${area.name} [${area.code}]`);
  }

  // 3. Serial Parking Slots for NORTH-LOT
  const northSlots = [
    // Cars (C01 - C05)
    { slotNumber: "C01", categoryName: "CAR" },
    { slotNumber: "C02", categoryName: "CAR" },
    { slotNumber: "C03", categoryName: "CAR" },
    { slotNumber: "C04", categoryName: "CAR" },
    { slotNumber: "C05", categoryName: "CAR" },
    // Motorcycles (M01 - M05)
    { slotNumber: "M01", categoryName: "MOTORCYCLE" },
    { slotNumber: "M02", categoryName: "MOTORCYCLE" },
    { slotNumber: "M03", categoryName: "MOTORCYCLE" },
    { slotNumber: "M04", categoryName: "MOTORCYCLE" },
    { slotNumber: "M05", categoryName: "MOTORCYCLE" },
    // Buses (B01 - B03)
    { slotNumber: "B01", categoryName: "BUS" },
    { slotNumber: "B02", categoryName: "BUS" },
    { slotNumber: "B03", categoryName: "BUS" },
    // Other (O01 - O02)
    { slotNumber: "O01", categoryName: "OTHER" },
    { slotNumber: "O02", categoryName: "OTHER" },
  ];

  for (const slot of northSlots) {
    await prisma.parkingSlot.upsert({
      where: {
        areaId_slotNumber: {
          areaId: areas["NORTH-LOT"],
          slotNumber: slot.slotNumber,
        },
      },
      update: {
        categoryId: categories[slot.categoryName],
        status: SlotStatus.AVAILABLE,
      },
      create: {
        areaId: areas["NORTH-LOT"],
        slotNumber: slot.slotNumber,
        categoryId: categories[slot.categoryName],
        status: SlotStatus.AVAILABLE,
      },
    });
  }
  console.log(`✓ Seeded ${northSlots.length} serial slots in NORTH-LOT`);

  // Update totalSlots count
  await prisma.parkingArea.update({
    where: { id: areas["NORTH-LOT"] },
    data: { totalSlots: northSlots.length },
  });

  // 4. Demo Accounts for Local/Academic Presentation
  const demoUsers = [
    {
      name: "Dr. Admin Controller",
      email: "admin@university.edu",
      role: UserRole.ADMIN,
      phone: "+1-555-0199",
    },
    {
      name: "Officer Farhan (Attendant)",
      email: "attendant@university.edu",
      role: UserRole.ATTENDANT,
      phone: "+1-555-0188",
    },
    {
      name: "Sabbir Ahmed (Student Driver)",
      email: "driver@university.edu",
      role: UserRole.DRIVER,
      phone: "+1-555-0177",
    },
  ];

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        phone: u.phone,
      },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
      },
    });

    // If attendant, assign to NORTH-LOT
    if (u.role === UserRole.ATTENDANT) {
      await prisma.attendantAssignment.upsert({
        where: {
          userId_areaId: {
            userId: user.id,
            areaId: areas["NORTH-LOT"],
          },
        },
        update: {},
        create: {
          userId: user.id,
          areaId: areas["NORTH-LOT"],
        },
      });
      console.log(`✓ Assigned attendant ${u.name} to NORTH-LOT`);
    }

    // If driver, register sample vehicle
    if (u.role === UserRole.DRIVER) {
      await prisma.vehicle.upsert({
        where: { licensePlate: "DHK-METRO-GA-1122" },
        update: {
          userId: user.id,
          categoryId: categories["CAR"],
        },
        create: {
          userId: user.id,
          categoryId: categories["CAR"],
          licensePlate: "DHK-METRO-GA-1122",
          makeModel: "Toyota Corolla Hybrid",
          color: "Pearl White",
        },
      });
      console.log(`✓ Registered demo vehicle DHK-METRO-GA-1122 for driver`);
    }

    console.log(`✓ Seeded user: ${u.name} (${u.email}) [Role: ${u.role}]`);
  }

  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
