import { z } from "zod";

export const createBookingSchema = z.object({
  slotId: z.string().min(1, "Slot ID is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  reason: z.string().max(255).optional(),
});

export const verifyArrivalSchema = z.object({
  bookingCode: z.string().min(1, "Booking code is required").toUpperCase(),
  qrSecret: z.string().optional(),
});

export const verifyExitSchema = z.object({
  bookingCode: z.string().min(1, "Booking code is required").toUpperCase(),
  qrSecret: z.string().optional(),
});

export const joinWaitingListSchema = z.object({
  areaId: z.string().min(1, "Parking area ID is required"),
  categoryId: z.string().min(1, "Vehicle category ID is required"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
});

export const cancelWaitingListSchema = z.object({
  entryId: z.string().min(1, "Waiting list entry ID is required"),
});
