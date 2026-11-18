"use client";

import { useState, useEffect, useCallback } from "react";
import { Car, Bike, Bus, Clock, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, XCircle, MapPin } from "lucide-react";
import { CountdownTimer } from "@/components/booking/countdown-timer";
import { NotificationBell } from "@/components/notifications/notification-bell";
import Link from "next/link";
import { LogOut } from "lucide-react";

interface ParkingArea {
  id: string;
  name: string;
  code: string;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
}

interface ParkingSlot {
  id: string;
  slotNumber: string;
  status: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";
  category: {
    id: string;
    name: string;
    prefix: string;
  };
}

interface ActiveBooking {
  id: string;
  bookingReference: string;
  status: "PENDING_ARRIVAL" | "ACTIVE" | "EXPIRED_AWAITING_EXIT" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  arrivalGraceExpiresAt: string;
  parkingExpiresAt: string | null;
  slot: {
    slotNumber: string;
    area: {
      name: string;
      code: string;
    };
  };
  vehicle: {
    licensePlate: string;
  };
}

interface DriverPortalProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  vehicles: Array<{
    id: string;
    licensePlate: string;
    categoryId: string;
    category: {
      name: string;
    };
  }>;
}

export default function DriverPortal({ user, vehicles }: DriverPortalProps) {
  const [areas, setAreas] = useState<ParkingArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || "");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchActiveBooking = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings/active");
      if (res.ok) {
        const data = await res.json();
        setActiveBooking(data.booking || null);
      }
    } catch {
      // quiet fail
    }
  }, []);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch("/api/areas");
      if (res.ok) {
        const data = await res.json();
        setAreas(data.areas || []);
        if (data.areas?.length > 0 && !selectedAreaId) {
          setSelectedAreaId(data.areas[0].id);
        }
      }
    } catch {
      // quiet fail
    }
  }, [selectedAreaId]);

  const fetchSlots = useCallback(async (areaId: string) => {
    if (!areaId) return;
    try {
      const res = await fetch(`/api/slots?areaId=${areaId}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch {
      // quiet fail
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchActiveBooking(), fetchAreas()]);
    setIsLoading(false);
  }, [fetchActiveBooking, fetchAreas]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedAreaId) {
      fetchSlots(selectedAreaId);
    }
  }, [selectedAreaId, fetchSlots]);

  async function handleBookSlot(slotId: string) {
    if (!selectedVehicleId) {
      setStatusMessage({ type: "error", text: "Please select a vehicle before booking." });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage(null);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          vehicleId: selectedVehicleId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.error || "Booking failed." });
      } else {
        setStatusMessage({
          type: "success",
          text: `Slot reserved successfully! Ref: ${data.booking.bookingReference}`,
        });
        await Promise.all([fetchActiveBooking(), fetchSlots(selectedAreaId), fetchAreas()]);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error occurred. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    if (!confirm("Are you sure you want to cancel this reservation?")) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "User cancelled from portal" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.error || "Failed to cancel booking." });
      } else {
        setStatusMessage({ type: "success", text: "Booking cancelled successfully." });
        setActiveBooking(null);
        await Promise.all([fetchSlots(selectedAreaId), fetchAreas()]);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to cancel booking." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoinWaitingList() {
    if (!selectedAreaId || !selectedVehicleId) {
      setStatusMessage({ type: "error", text: "Please select an area and vehicle." });
      return;
    }

    const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!selectedVehicle) return;

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/waiting-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          areaId: selectedAreaId,
          categoryId: selectedVehicle.categoryId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.error || "Failed to join waiting list." });
      } else {
        setStatusMessage({
          type: "success",
          text: `You have been added to the waiting list! Position: #${data.entry.position}`,
        });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to join waiting list." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedArea = areas.find((a) => a.id === selectedAreaId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation Header */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-sm">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none flex items-center gap-2">
                Driver Portal
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Live
                </span>
              </h1>
              <span className="text-xs text-slate-500">Smart Campus Reservation System</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{user.name || "Student Driver"}</span>
              <span className="text-[11px] text-slate-500">{user.email}</span>
            </div>
            <Link
              href="/api/auth/signout"
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container mx-auto px-4 sm:px-8 py-8 flex-1 max-w-6xl">
        {/* Status Toast / Alert */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between shadow-sm border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active Booking HUD (If User Has An Active Reservation) */}
        {activeBooking && (
          <div className="mb-8 overflow-hidden rounded-2xl border-2 border-blue-500 bg-white shadow-lg">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">Active Reservation</span>
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                  Slot {activeBooking.slot.slotNumber}
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white text-blue-800">
                    {activeBooking.status}
                  </span>
                </h2>
                <p className="text-xs text-blue-100 mt-0.5">
                  Reference: <span className="font-mono font-bold text-white">{activeBooking.bookingReference}</span> • {activeBooking.slot.area.name}
                </p>
              </div>

              {/* Countdown Component */}
              <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20">
                <CountdownTimer
                  targetDate={
                    activeBooking.status === "PENDING_ARRIVAL"
                      ? activeBooking.arrivalGraceExpiresAt
                      : activeBooking.parkingExpiresAt || activeBooking.arrivalGraceExpiresAt
                  }
                  label={
                    activeBooking.status === "PENDING_ARRIVAL"
                      ? "Arrival Grace Remaining"
                      : "Parking Time Remaining"
                  }
                  onExpire={() => {
                    fetchActiveBooking();
                    fetchSlots(selectedAreaId);
                  }}
                />
              </div>
            </div>

            <div className="p-6 flex flex-wrap items-center justify-between gap-4 bg-slate-50 border-t border-slate-200">
              <div className="flex items-center gap-6 text-sm text-slate-700">
                <div>
                  <span className="text-xs text-slate-500 block">Vehicle</span>
                  <span className="font-semibold">{activeBooking.vehicle.licensePlate}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Gate Status</span>
                  <span className="font-semibold text-blue-700">
                    {activeBooking.status === "PENDING_ARRIVAL"
                      ? "Proceed to entry gate (Attendant will verify)"
                      : activeBooking.status === "ACTIVE"
                      ? "Vehicle Parked (Proceed to exit when done)"
                      : "Overstay Alert: Proceed to Exit Immediately"}
                  </span>
                </div>
              </div>

              {activeBooking.status === "PENDING_ARRIVAL" && (
                <button
                  onClick={() => handleCancelBooking(activeBooking.id)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-rose-300 bg-white text-rose-700 text-xs font-semibold hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Reservation
                </button>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Control Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Vehicle Selector Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Select Your Vehicle
            </span>
            {vehicles.length > 0 ? (
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} ({v.category.name})
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-slate-500">No registered vehicles found.</div>
            )}
          </div>

          {/* Area Selector Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Select Parking Area
            </span>
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.availableSlots}/{a.totalSlots} Free)
                </option>
              ))}
            </select>
          </div>

          {/* Quick Metrics Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Selected Lot Availability
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {selectedArea ? `${selectedArea.availableSlots} / ${selectedArea.totalSlots}` : "0"}
              </div>
              <span className="text-xs text-emerald-600 font-medium">Slots currently free</span>
            </div>
            <button
              onClick={() => {
                fetchSlots(selectedAreaId);
                fetchAreas();
                fetchActiveBooking();
              }}
              title="Refresh Slots"
              className="h-10 w-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Interactive Parking Slot Grid */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                {selectedArea ? selectedArea.name : "Parking Lot"} Slots
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any Available slot to instantly reserve your university parking space.
              </p>
            </div>

            {/* Status Legend */}
            <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500"></span> Reserved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500"></span> Occupied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-slate-400"></span> Maintenance
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading real-time parking inventory from TiDB...
            </div>
          ) : slots.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No slots configured in this area yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {slots.map((slot) => {
                const isAvailable = slot.status === "AVAILABLE";
                const isReserved = slot.status === "RESERVED";
                const isOccupied = slot.status === "OCCUPIED";

                return (
                  <div
                    key={slot.id}
                    className={`relative rounded-xl border p-4 transition-all ${
                      isAvailable
                        ? "border-emerald-300 bg-emerald-50/50 hover:border-emerald-500 hover:shadow-md"
                        : isReserved
                        ? "border-amber-300 bg-amber-50/40 opacity-90"
                        : isOccupied
                        ? "border-rose-200 bg-rose-50/40 opacity-80"
                        : "border-slate-200 bg-slate-100 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-lg font-black tracking-tight text-slate-900">
                        {slot.slotNumber}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAvailable
                            ? "bg-emerald-100 text-emerald-800"
                            : isReserved
                            ? "bg-amber-100 text-amber-800"
                            : isOccupied
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {slot.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                      {slot.category.name === "CAR" && <Car className="h-3.5 w-3.5 text-blue-600" />}
                      {slot.category.name === "BIKE" && <Bike className="h-3.5 w-3.5 text-emerald-600" />}
                      {slot.category.name === "BUS" && <Bus className="h-3.5 w-3.5 text-purple-600" />}
                      <span>{slot.category.name}</span>
                    </div>

                    {isAvailable && (
                      <button
                        onClick={() => handleBookSlot(slot.id)}
                        disabled={isSubmitting || activeBooking !== null}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {activeBooking ? "Has Active Booking" : "Reserve Slot"}
                      </button>
                    )}

                    {!isAvailable && (
                      <div className="text-center py-1.5 text-[11px] font-medium text-slate-500">
                        {slot.status}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Waiting List Callout If All Slots Full */}
          {selectedArea && selectedArea.availableSlots === 0 && (
            <div className="mt-8 p-6 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-amber-900">All slots currently occupied in this lot</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Join the FIFO waiting list. As soon as an attendant verifies a departure, the next slot will be automatically assigned to you.
                </p>
              </div>
              <button
                onClick={handleJoinWaitingList}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow transition-colors"
              >
                Join Waiting List
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
