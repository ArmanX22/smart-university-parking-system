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

  if (vehicles.length === 0) {
    // Auto-register a default vehicle for demo driver
    const carCategory = await prisma.vehicleCategory.findFirst({
      where: { name: "CAR" },
    });

    if (carCategory) {
      const newVehicle = await prisma.vehicle.create({
        data: {
          userId: user.id,
          categoryId: carCategory.id,
          licensePlate: `UNI-${user.id.slice(-4).toUpperCase()}-CAR`,
        },
        include: { category: true },
      });
      vehicles = [newVehicle];
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
