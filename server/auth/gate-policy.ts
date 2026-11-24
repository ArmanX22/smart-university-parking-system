import { UserRole } from "@prisma/client";
import { ForbiddenError } from "@/server/errors/api-error";

export function canManageParkingArea(
  role: UserRole,
  assignedAreaId: string | null,
  bookingAreaId: string
): boolean {
  if (role === UserRole.ADMIN) return true;
  return role === UserRole.ATTENDANT && assignedAreaId === bookingAreaId;
}

export function assertCanManageParkingArea(
  role: UserRole,
  assignedAreaId: string | null,
  bookingAreaId: string
): void {
  if (!canManageParkingArea(role, assignedAreaId, bookingAreaId)) {
    throw new ForbiddenError("You may manage bookings only in your assigned parking area.");
  }
}
