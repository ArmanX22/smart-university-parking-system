import { EventEmitter } from "events";

export interface SseSlotUpdateEvent {
  slotId: string;
  areaId: string;
  slotNumber: string;
  status: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";
  category: string;
}

export interface SseBookingUpdateEvent {
  bookingId: string;
  slotId: string;
  status: string;
  slotNumber: string;
  vehiclePlate?: string;
}

export interface SseMetricsUpdateEvent {
  areaId: string;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __sseEventBus: EventEmitter | undefined;
}

export class SseService {
  private static getBus(): EventEmitter {
    if (!globalThis.__sseEventBus) {
      globalThis.__sseEventBus = new EventEmitter();
      globalThis.__sseEventBus.setMaxListeners(200);
    }
    return globalThis.__sseEventBus;
  }

  static broadcastSlotUpdate(event: SseSlotUpdateEvent) {
    this.getBus().emit("slot-update", event);
  }

  static broadcastBookingUpdate(event: SseBookingUpdateEvent) {
    this.getBus().emit("booking-update", event);
  }

  static broadcastMetricsUpdate(event: SseMetricsUpdateEvent) {
    this.getBus().emit("metrics-update", event);
  }

  static onSlotUpdate(listener: (event: SseSlotUpdateEvent) => void) {
    const bus = this.getBus();
    bus.on("slot-update", listener);
    return () => bus.off("slot-update", listener);
  }

  static onBookingUpdate(listener: (event: SseBookingUpdateEvent) => void) {
    const bus = this.getBus();
    bus.on("booking-update", listener);
    return () => bus.off("booking-update", listener);
  }

  static onMetricsUpdate(listener: (event: SseMetricsUpdateEvent) => void) {
    const bus = this.getBus();
    bus.on("metrics-update", listener);
    return () => bus.off("metrics-update", listener);
  }
}
