import { requireDriver } from "@/server/auth/guards";
import prisma from "@/lib/prisma";
import DriverPortal from "@/components/driver/driver-portal";

export const dynamic = "force-dynamic";

export default async function DriverDashboardPage() {
  const user = await requireDriver();

  // Fetch or ensure registered vehicle for driver
  let vehicles = await prisma.vehicle.findMany({
    where: { userId: user.id },
    include: { category: true },
  });

  // Ensure driver has demo vehicles for all active categories (Car, Motorcycle, Bus)
  const activeCategories = await prisma.vehicleCategory.findMany({
    where: { name: { in: ["CAR", "MOTORCYCLE", "BIKE", "BUS"] } },
  });

  for (const cat of activeCategories) {
    const hasVehicle = vehicles.some(
      (v) =>
        v.categoryId === cat.id ||
        v.category.name === cat.name ||
        ((cat.name === "MOTORCYCLE" || cat.name === "BIKE") &&
          (v.category.name === "MOTORCYCLE" || v.category.name === "BIKE"))
    );

    if (!hasVehicle) {
      const isMoto = cat.name === "MOTORCYCLE" || cat.name === "BIKE";
      const code = isMoto ? "MTR" : cat.name;
      const newVehicle = await prisma.vehicle.create({
        data: {
          userId: user.id,
          categoryId: cat.id,
          licensePlate: `UNI-${user.id.slice(-4).toUpperCase()}-${code}`,
        },
        include: { category: true },
      });
      vehicles.push(newVehicle);
    }
  }

  return (
    <DriverPortal
      user={{
        id: user.id,
        name: user.name || null,
        email: user.email,
        role: user.role,
      }}
      vehicles={vehicles}
    />
  );
}
