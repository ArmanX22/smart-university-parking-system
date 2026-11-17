import { z } from "zod";
import { SlotStatus } from "@prisma/client";

// Parking Area Schemas
export const createAreaSchema = z.object({
  name: z.string().min(2, "Area name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Area code must be at least 2 characters")
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, "Code must contain only uppercase letters, numbers, hyphens, and underscores"),
  description: z.string().max(500).optional(),
});

export const updateAreaSchema = createAreaSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Vehicle Category Schemas
export const createCategorySchema = z.object({
  name: z.string().min(2).max(50).toUpperCase(),
  codePrefix: z
    .string()
    .min(1)
    .max(5)
    .regex(/^[A-Z0-9]+$/, "Code prefix must contain only uppercase letters and numbers"),
  description: z.string().max(255).optional(),
  arrivalGraceMinutes: z.number().int().min(1).max(120).default(15),
  parkingDurationMinutes: z.number().int().min(1).max(1440).default(15),
});

export const updateCategorySchema = z.object({
  description: z.string().max(255).optional(),
});

// Duration Policy Schema
export const updatePolicySchema = z.object({
  arrivalGraceMinutes: z.number().int().min(1, "Grace period must be at least 1 minute").max(120),
  parkingDurationMinutes: z.number().int().min(1, "Parking duration must be at least 1 minute").max(1440),
  isActive: z.boolean().optional(),
});

// Slot Schemas
export const createSlotSchema = z.object({
  areaId: z.string().min(1, "Area ID is required"),
  categoryId: z.string().min(1, "Category ID is required"),
  slotNumber: z
    .string()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, "Slot number must be alphanumeric (e.g. C01, B02)"),
});

export const batchGenerateSlotsSchema = z.object({
  areaId: z.string().min(1, "Area ID is required"),
  categoryId: z.string().min(1, "Category ID is required"),
  count: z.number().int().min(1, "Must generate at least 1 slot").max(100, "Maximum 100 slots per batch"),
  startNumber: z.number().int().min(1).default(1),
});

export const updateSlotStatusSchema = z.object({
  status: z.nativeEnum(SlotStatus),
});
