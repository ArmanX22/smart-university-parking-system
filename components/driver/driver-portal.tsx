"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Car,
  Bike,
  Bus,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  XCircle,
  MapPin,
  ArrowRight,
  LogOut,
  Navigation,
  Info,
} from "lucide-react";
import { CountdownTimer } from "@/components/booking/countdown-timer";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useParkingStream } from "@/hooks/use-parking-stream";
import Link from "next/link";

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
    prefix?: string;
    codePrefix?: string;
  };
}

interface ActiveBooking {
  id: string;
  bookingReference: string;
  status: "PENDING_ARRIVAL" | "ACTIVE" | "EXPIRED_AWAITING_EXIT" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  arrivalExpiresAt?: string;
  arrivalGraceExpiresAt?: string;
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
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchActiveBooking = useCallback(async () => {
    try {
      const res = await fetch("/api/bookings/active");
      if (res.ok) {
        const data = await res.json();
        setActiveBooking(data.booking || data.data || null);
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
        const areaList = data.areas || data.data || [];
        setAreas(areaList);
        if (areaList.length > 0) {
          setSelectedAreaId((prev) => prev || areaList[0].id);
        }
      }
    } catch {
      // quiet fail
    }
  }, []);

  const fetchSlots = useCallback(async (areaId: string) => {
    if (!areaId) return;
    try {
      const res = await fetch(`/api/slots?areaId=${areaId}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || data.data || []);
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

  // Phase 8: Real-Time SSE Telemetry Stream with Polling Fallback
  const { isConnected, isFallbackMode } = useParkingStream({
    onSlotUpdate: (evt) => {
      setSlots((prev) =>
        prev.map((s) => (s.id === evt.slotId ? { ...s, status: evt.status } : s))
      );
      fetchAreas();
    },
    onBookingUpdate: () => {
      fetchActiveBooking();
      fetchAreas();
      if (selectedAreaId) fetchSlots(selectedAreaId);
    },
    onPollFallback: () => {
      fetchActiveBooking();
      fetchAreas();
      if (selectedAreaId) fetchSlots(selectedAreaId);
    },
  });

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const selectedArea = areas.find((a) => a.id === selectedAreaId);

  // Sync category filter with selected vehicle if vehicle changes
  useEffect(() => {
    if (selectedVehicle?.category.name) {
      setCategoryFilter(selectedVehicle.category.name);
    }
  }, [selectedVehicle]);

  // Filter slots
  const filteredSlots = useMemo(() => {
    if (categoryFilter === "ALL") return slots;
    return slots.filter((s) => s.category.name === categoryFilter);
  }, [slots, categoryFilter]);

  // Two-Sided Motorcycle Slots Calculation (Field Visit Specification)
  const motorcycleSlots = useMemo(() => {
    return slots.filter((s) => s.category.name === "BIKE");
  }, [slots]);

  const { sideASlots, sideBSlots } = useMemo(() => {
    // Sort naturally by slot number
    const sorted = [...motorcycleSlots].sort((a, b) =>
      a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true })
    );

    const a: ParkingSlot[] = [];
    const b: ParkingSlot[] = [];

    sorted.forEach((slot, index) => {
      // Split into two parallel rows: Side A (odds/left) and Side B (evens/right)
      if (index % 2 === 0) {
        a.push(slot);
      } else {
        b.push(slot);
      }
    });

    return { sideASlots: a, sideBSlots: b };
  }, [motorcycleSlots]);

  // Handle Slot Booking
  async function handleBookSlot(slotId: string) {
    if (!selectedVehicleId) {
      setStatusMessage({ type: "error", text: "Please select a vehicle before reserving a slot." });
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
        setStatusMessage({ type: "error", text: data.error || "Reservation failed." });
      } else {
        setStatusMessage({
          type: "success",
          text: `Slot reserved successfully! Booking reference: ${data.data.bookingCode}. 15-minute countdown is active.`,
        });
        await Promise.all([fetchActiveBooking(), fetchSlots(selectedAreaId), fetchAreas()]);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to communicate with server." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Cancel Booking
  async function handleCancelBooking(bookingId: string) {
    try {
      setIsSubmitting(true);
      setStatusMessage(null);

      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setStatusMessage({ type: "error", text: data.error || "Cancellation failed." });
      } else {
        setStatusMessage({
          type: "success",
          text: "Reservation cancelled. The parking slot has been released back to Available.",
        });
        await Promise.all([fetchActiveBooking(), fetchSlots(selectedAreaId), fetchAreas()]);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to communicate with server." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Join Waiting List
  async function handleJoinWaitingList() {
    if (!selectedAreaId || !selectedVehicle) return;

    try {
      setIsSubmitting(true);
      setStatusMessage(null);

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
          text: `You have joined the FIFO waiting list (Queue Position: #${data.data.position || 1}). You will be automatically assigned a slot as soon as one is freed!`,
        });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Network error joining waiting list." });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Render Single Slot Card
  const renderSlotCard = (slot: ParkingSlot) => {
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

        <div className="text-xs text-slate-500 mb-3 flex items-center gap-1 font-medium">
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
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold shadow-sm">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none flex items-center gap-2">
                Driver Parking Portal
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Campus Driver
                </span>
              </h1>
              <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-pulse" : isFallbackMode ? "bg-amber-500" : "bg-slate-400"
                  }`}
                />
                {isConnected ? "Real-Time Live Sync (SSE Active)" : isFallbackMode ? "Polling Sync (10s)" : "Connecting..."}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{user.name || "University Driver"}</span>
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
        {/* Status Feedback Banner */}
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

        {/* University Field Visit Standard 15-Minute Protocol Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white mb-8 shadow-sm border border-blue-800/40">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold mb-2 border border-blue-400/20">
                <Clock className="h-3.5 w-3.5 text-blue-300" />
                <span>15-Minute Pre-Arrival Rule &amp; Automatic Cancellation Protocol</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">Smart Campus Parking System</h2>
              <p className="text-xs text-blue-200 mt-1 leading-relaxed">
                Drivers can book a slot up to <strong>15 minutes before arrival</strong>. An active countdown timer guarantees your slot. You must arrive and have the gate attendant verify entry before the timer expires. If you fail to arrive within 15 minutes, the reservation is <strong>automatically canceled (NO_SHOW)</strong>, and the slot is immediately released for the next user on the FIFO waiting list.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 p-3.5 rounded-xl backdrop-blur-sm text-xs font-semibold self-stretch lg:self-auto justify-center">
              <div className="text-center px-2">
                <span className="block text-emerald-400 font-bold">1. Book Slot</span>
                <span className="text-[10px] text-slate-300">15m Timer Starts</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <div className="text-center px-2">
                <span className="block text-amber-300 font-bold">2. Arrive at Gate</span>
                <span className="text-[10px] text-slate-300">Within 15 Mins</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <div className="text-center px-2">
                <span className="block text-blue-300 font-bold">3. Attendant Verified</span>
                <span className="text-[10px] text-slate-300">Status: Occupied</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Reservation HUD / Timer Banner */}
        {activeBooking && (
          <div className="bg-white rounded-2xl border border-blue-200 shadow-md overflow-hidden mb-8">
            <div className="bg-blue-600 text-white p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-blue-200 block">
                  Active University Reservation
                </span>
                <div className="text-2xl font-black mt-1 flex items-center gap-3">
                  <span>Slot: {activeBooking.slot.slotNumber}</span>
                  <span className="text-base font-normal text-blue-100">
                    ({activeBooking.slot.area.name})
                  </span>
                </div>
                <div className="text-xs text-blue-200 mt-1 font-mono">
                  Ref: {activeBooking.bookingReference}
                </div>
              </div>

              {/* Countdown Component */}
              <div className="bg-blue-700/60 p-4 rounded-xl border border-blue-500/40 text-center min-w-[200px]">
                <CountdownTimer
                  targetDate={
                    activeBooking.status === "PENDING_ARRIVAL"
                      ? (activeBooking.arrivalExpiresAt || activeBooking.arrivalGraceExpiresAt || new Date().toISOString())
                      : (activeBooking.parkingExpiresAt || activeBooking.arrivalExpiresAt || activeBooking.arrivalGraceExpiresAt || new Date().toISOString())
                  }
                  label={
                    activeBooking.status === "PENDING_ARRIVAL"
                      ? "15-Min Arrival Grace Remaining"
                      : "Parking Time Remaining"
                  }
                  onExpire={async () => {
                    await fetch("/api/admin/run-expiry", { method: "POST" }).catch(() => {});
                    await Promise.all([fetchActiveBooking(), fetchSlots(selectedAreaId), fetchAreas()]);
                    setStatusMessage({
                      type: "error",
                      text: "15-minute arrival time expired! Your reservation was automatically canceled and the slot has been released for the next user.",
                    });
                  }}
                />
              </div>
            </div>

            {/* Workflow Guidance Bar */}
            <div className="bg-blue-800/40 border-t border-white/10 px-6 py-2.5 text-xs text-blue-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Rule:</span>
                <span>Booking (15m Countdown) ➔ Gate Check-in ➔ Confirmed Occupied.</span>
              </div>
              <span className="text-[11px] text-amber-200 font-semibold">
                ⚠️ If user does not arrive within 15 minutes, system auto-cancels and frees slot.
              </span>
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
                      ? "Proceed to entry gate (Attendant will verify check-in)"
                      : activeBooking.status === "ACTIVE"
                      ? "Vehicle Parked (Proceed to exit gate when done)"
                      : "Overstay Alert: Proceed to Exit Gate Immediately"}
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

        {/* Dashboard Controls: Vehicle & Area Selection */}
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

        {/* Fulbaria Route Bus Shuttle Notice Card (Field Visit Report Specification) */}
        <div className="bg-purple-50 rounded-2xl border border-purple-200 p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-purple-900 text-sm">Fulbaria Route Campus Bus Shuttle</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                  Priority Route
                </span>
              </div>
              <p className="text-xs text-purple-700 mt-0.5">
                The Fulbaria route bus is scheduled for arrival. Dedicated bus parking bays (B01, B02...) are managed in advance to prevent campus congestion.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              type="button"
              onClick={() => setCategoryFilter("BUS")}
              className="text-xs font-bold text-purple-800 hover:text-purple-900 bg-white border border-purple-300 px-3.5 py-1.5 rounded-lg shadow-2xs hover:bg-purple-100/50 transition-colors"
            >
              View Bus Bays
            </button>
          </div>
        </div>

        {/* Slot Map Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                {selectedArea ? selectedArea.name : "Parking Lot"} Slots ({filteredSlots.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any Available slot to instantly reserve your university parking space.
              </p>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setCategoryFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  categoryFilter === "ALL" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
                }`}
              >
                All Slots
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("CAR")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  categoryFilter === "CAR" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
                }`}
              >
                <Car className="h-3.5 w-3.5" /> Car
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("BIKE")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  categoryFilter === "BIKE" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
                }`}
              >
                <Bike className="h-3.5 w-3.5" /> Motorcycle (2-Side Lane)
              </button>
              <button
                type="button"
                onClick={() => setCategoryFilter("BUS")}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  categoryFilter === "BUS" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600"
                }`}
              >
                <Bus className="h-3.5 w-3.5" /> Bus
              </button>
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
          ) : filteredSlots.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              No slots configured in this area for category &quot;{categoryFilter}&quot;.
            </div>
          ) : categoryFilter === "BIKE" && motorcycleSlots.length > 0 ? (
            /* SPECIAL TWO-SIDED MOTORCYCLE PARKING SYSTEM WITH CENTRAL PASSAGE (Field Visit Report Specification) */
            <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="mb-4 text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full inline-block">
                  🏍️ Two-Sided Serial Motorcycle Bay System
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Serial-allocated parking on Side A and Side B with an unobstructed central driveway for easy maneuvering and exit.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-stretch">
                {/* Side A (Left Row) */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded-xl text-center shadow-2xs">
                    SIDE A (Serial Bays)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sideASlots.map((slot) => renderSlotCard(slot))}
                  </div>
                </div>

                {/* Central Maneuvering Passage / Driveway */}
                <div className="lg:col-span-1 bg-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center text-white border-2 border-dashed border-amber-400/80 shadow-inner min-h-[160px]">
                  <Navigation className="h-6 w-6 text-amber-400 animate-bounce mb-2" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 block">
                    Central Driveway
                  </span>
                  <span className="text-[9px] text-slate-300 mt-1 leading-tight font-medium">
                    Empty Maneuvering Passage (Free Entry / Exit Lane ➡️)
                  </span>
                </div>

                {/* Side B (Right Row) */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded-xl text-center shadow-2xs">
                    SIDE B (Serial Bays)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sideBSlots.map((slot) => renderSlotCard(slot))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Grid for Car, Bus, or All */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredSlots.map((slot) => renderSlotCard(slot))}
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
