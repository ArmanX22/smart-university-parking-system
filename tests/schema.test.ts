import { describe, it, expect } from "vitest";
import { UserRole, SlotStatus, BookingStatus, WaitingStatus, NotificationType } from "@prisma/client";
import { verifyArrivalSchema, verifyExitSchema } from "../schemas/booking.schema";
import { canManageParkingArea } from "../server/auth/gate-policy";
import { formatGateCredential } from "../lib/booking-view";

describe("Phase 2: Database Schema & Entity Definitions", () => {
  it("exports all expected UserRole enums", () => {
    expect(UserRole.DRIVER).toBe("DRIVER");
    expect(UserRole.ATTENDANT).toBe("ATTENDANT");
    expect(UserRole.ADMIN).toBe("ADMIN");
  });

  it("exports all required SlotStatus enums", () => {
    expect(SlotStatus.AVAILABLE).toBe("AVAILABLE");
    expect(SlotStatus.RESERVED).toBe("RESERVED");
    expect(SlotStatus.OCCUPIED).toBe("OCCUPIED");
    expect(SlotStatus.MAINTENANCE).toBe("MAINTENANCE");
  });

  it("exports the full Booking lifecycle state machine enums", () => {
    expect(BookingStatus.PENDING_ARRIVAL).toBe("PENDING_ARRIVAL");
    expect(BookingStatus.ACTIVE).toBe("ACTIVE");
    expect(BookingStatus.EXPIRED_AWAITING_EXIT).toBe("EXPIRED_AWAITING_EXIT");
    expect(BookingStatus.COMPLETED).toBe("COMPLETED");
    expect(BookingStatus.CANCELLED).toBe("CANCELLED");
    expect(BookingStatus.NO_SHOW).toBe("NO_SHOW");
  });

  it("exports all WaitingStatus enums for the FIFO queue", () => {
    expect(WaitingStatus.WAITING).toBe("WAITING");
    expect(WaitingStatus.ALLOCATED).toBe("ALLOCATED");
    expect(WaitingStatus.CANCELLED).toBe("CANCELLED");
    expect(WaitingStatus.EXPIRED).toBe("EXPIRED");
  });

  it("includes the QR gate secret in active booking data", () => {
    expect(formatGateCredential("BK-123", "qr-secret")).toBe("BK-123 / qr-secret");
  });

  it("requires bookingCode and qrSecret for gate arrival and exit", () => {
    expect(verifyArrivalSchema.safeParse({ bookingReference: "BK-123", attendantId: "x" }).success).toBe(false);
    expect(verifyArrivalSchema.safeParse({ bookingCode: "BK-123" }).success).toBe(false);
    expect(verifyArrivalSchema.safeParse({ bookingCode: "BK-123", qrSecret: "qr-secret" }).success).toBe(true);
    expect(verifyExitSchema.safeParse({ bookingCode: "BK-123" }).success).toBe(false);
    expect(verifyExitSchema.safeParse({ bookingCode: "BK-123", qrSecret: "qr-secret" }).success).toBe(true);
  });

  it("allows admins across areas but limits attendants to assigned areas", () => {
    expect(canManageParkingArea(UserRole.ADMIN, null, "lot-b")).toBe(true);
    expect(canManageParkingArea(UserRole.ATTENDANT, "lot-a", "lot-a")).toBe(true);
    expect(canManageParkingArea(UserRole.ATTENDANT, "lot-a", "lot-b")).toBe(false);
    expect(canManageParkingArea(UserRole.DRIVER, "lot-a", "lot-a")).toBe(false);
  });

  it("exports all required NotificationType enums", () => {
    expect(NotificationType.BOOKING_CONFIRMED).toBe("BOOKING_CONFIRMED");
    expect(NotificationType.ARRIVAL_REMINDER).toBe("ARRIVAL_REMINDER");
    expect(NotificationType.NO_SHOW_CANCELLED).toBe("NO_SHOW_CANCELLED");
    expect(NotificationType.VEHICLE_ARRIVED).toBe("VEHICLE_ARRIVED");
    expect(NotificationType.PARKING_WARNING).toBe("PARKING_WARNING");
    expect(NotificationType.PARKING_EXPIRED).toBe("PARKING_EXPIRED");
    expect(NotificationType.VEHICLE_EXIT).toBe("VEHICLE_EXIT");
    expect(NotificationType.WAITING_ALLOCATED).toBe("WAITING_ALLOCATED");
  });
});
