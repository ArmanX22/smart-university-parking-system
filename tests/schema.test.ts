import { describe, it, expect } from "vitest";
import { UserRole, SlotStatus, BookingStatus, WaitingStatus, NotificationType } from "@prisma/client";

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
