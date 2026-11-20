import { describe, it, expect, vi } from "vitest";
import { SseService, SseSlotUpdateEvent, SseBookingUpdateEvent, SseMetricsUpdateEvent } from "@/server/services/sse.service";

describe("Phase 8: SSE Real-Time Telemetry & Event Hub", () => {
  it("broadcasts and receives slot-update events across listeners", () => {
    const listener = vi.fn();
    const unsubscribe = SseService.onSlotUpdate(listener);

    const event: SseSlotUpdateEvent = {
      slotId: "slot-test-123",
      areaId: "area-test-456",
      slotNumber: "C01",
      status: "RESERVED",
      category: "CAR",
    };

    SseService.broadcastSlotUpdate(event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();

    // After unsubscribe, listener should not be called
    SseService.broadcastSlotUpdate(event);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("broadcasts and receives booking-update events", () => {
    const listener = vi.fn();
    const unsubscribe = SseService.onBookingUpdate(listener);

    const event: SseBookingUpdateEvent = {
      bookingId: "bk-test-789",
      slotId: "slot-test-123",
      status: "ACTIVE",
      slotNumber: "C01",
      vehiclePlate: "DHK-1234",
    };

    SseService.broadcastBookingUpdate(event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();
  });

  it("broadcasts and receives metrics-update events", () => {
    const listener = vi.fn();
    const unsubscribe = SseService.onMetricsUpdate(listener);

    const event: SseMetricsUpdateEvent = {
      areaId: "area-test-456",
      totalSlots: 50,
      availableSlots: 20,
      occupiedSlots: 30,
    };

    SseService.broadcastMetricsUpdate(event);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(event);

    unsubscribe();
  });
});
