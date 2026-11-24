"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wrench,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRightCircle,
  LogOut,
  RefreshCw,
  Car,
  Bike,
  Bus,
  ShieldAlert,
  Clock,
  ArrowRight,
  Navigation,
} from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useParkingStream } from "@/hooks/use-parking-stream";

interface AttendantPortalProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  assignedArea: {
    id: string;
    name: string;
    code: string;
    totalSlots: number;
    availableSlots?: number;
    occupiedSlots?: number;
  } | null;
}

interface AreaOption {
  id: string;
  name: string;
  code: string;
}

interface SlotItem {
  id: string;
  slotNumber: string;
  status: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";
  category: {
    name: string;
    prefix?: string;
  };
}

export default function AttendantPortal({ user, assignedArea }: AttendantPortalProps) {
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [currentAreaId, setCurrentAreaId] = useState<string>(assignedArea?.id || "");
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrSecret, setQrSecret] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch("/api/areas");
      if (res.ok) {
        const data = await res.json();
        const areaList = data.areas || data.data || [];
        setAreas(areaList);
        if (!currentAreaId && areaList.length > 0) {
          setCurrentAreaId(areaList[0].id);
        }
      }
    } catch {
      // quiet fail
    }
  }, [currentAreaId]);

  const fetchSlots = useCallback(async (areaId: string) => {
    if (!areaId) return;
    try {
      setIsLoadingSlots(true);
      const res = await fetch(`/api/slots?areaId=${areaId}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || data.data || []);
      }
    } catch {
      // quiet fail
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  useEffect(() => {
    if (currentAreaId) {
      fetchSlots(currentAreaId);
    }
  }, [currentAreaId, fetchSlots]);

  // Phase 8: Real-Time SSE Telemetry Stream with Polling Fallback
  const { isConnected, isFallbackMode } = useParkingStream({
    onSlotUpdate: (evt) => {
      setSlots((prev) =>
        prev.map((s) => (s.id === evt.slotId ? { ...s, status: evt.status } : s))
      );
      fetchAreas();
    },
    onBookingUpdate: () => {
      fetchAreas();
      if (currentAreaId) fetchSlots(currentAreaId);
    },
    onPollFallback: () => {
      fetchAreas();
      if (currentAreaId) fetchSlots(currentAreaId);
    },
  });

  async function handleVerifyArrival(codeToVerify?: string) {
    const code = (codeToVerify || searchQuery).trim().toUpperCase();
    if (!code) {
      setActionFeedback({ type: "error", message: "Enter booking reference (e.g. BK-...) or vehicle license plate." });
      return;
    }

    try {
      setIsSubmitting(true);
      setActionFeedback(null);

      const res = await fetch("/api/bookings/verify-arrival", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingCode: code,
          qrSecret: qrSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({ type: "error", message: data.error || "Arrival verification failed." });
      } else {
        setActionFeedback({
          type: "success",
          message: `Gate Opened! Arrival verified for slot ${data.data.booking.slot.slotNumber}. Status is now OCCUPIED.`,
        });
        setSearchQuery("");
        setQrSecret("");
        fetchSlots(currentAreaId);
      }
    } catch {
      setActionFeedback({ type: "error", message: "Failed to communicate with server." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyExit(codeToVerify?: string) {
    const code = (codeToVerify || searchQuery).trim().toUpperCase();
    if (!code) {
      setActionFeedback({ type: "error", message: "Enter booking reference (e.g. BK-...) or vehicle license plate." });
      return;
    }

    try {
      setIsSubmitting(true);
      setActionFeedback(null);

      const res = await fetch("/api/bookings/verify-exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingCode: code,
          qrSecret: qrSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({ type: "error", message: data.error || "Exit verification failed." });
      } else {
        setActionFeedback({
          type: "success",
          message: `Exit Confirmed! Slot ${data.data.booking.slot.slotNumber} has been safely released or reallocated.`,
        });
        setSearchQuery("");
        setQrSecret("");
        fetchSlots(currentAreaId);
      }
    } catch {
      setActionFeedback({ type: "error", message: "Failed to communicate with server." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeLot = areas.find((a) => a.id === currentAreaId);

  const isMotorcycle = (name?: string) => name === "MOTORCYCLE" || name === "BIKE";

  // Filter slots
  const filteredSlots = useMemo(() => {
    if (categoryFilter === "ALL") return slots;
    if (isMotorcycle(categoryFilter)) {
      return slots.filter((s) => isMotorcycle(s.category.name));
    }
    return slots.filter((s) => s.category.name === categoryFilter);
  }, [slots, categoryFilter]);

  // Two-Sided Motorcycle Slots
  const motorcycleSlots = useMemo(() => {
    return slots.filter((s) => isMotorcycle(s.category.name));
  }, [slots]);

  const { sideASlots, sideBSlots } = useMemo(() => {
    const sorted = [...motorcycleSlots].sort((a, b) =>
      a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true })
    );

    const a: SlotItem[] = [];
    const b: SlotItem[] = [];

    sorted.forEach((slot, index) => {
      if (index % 2 === 0) {
        a.push(slot);
      } else {
        b.push(slot);
      }
    });

    return { sideASlots: a, sideBSlots: b };
  }, [motorcycleSlots]);

  // Bus Slots Analysis for Fulbaria Route
  const busSlots = useMemo(() => {
    return slots.filter((s) => s.category.name === "BUS");
  }, [slots]);

  const availableBusSlots = busSlots.filter((b) => b.status === "AVAILABLE");

  // Render Slot Card
  const renderAttendantSlotCard = (slot: SlotItem) => {
    const isAvailable = slot.status === "AVAILABLE";
    const isReserved = slot.status === "RESERVED";
    const isOccupied = slot.status === "OCCUPIED";

    return (
      <div
        key={slot.id}
        className={`rounded-xl border p-3.5 transition-all text-center ${
          isAvailable
            ? "border-emerald-300 bg-emerald-50/50"
            : isReserved
            ? "border-amber-300 bg-amber-50/40"
            : isOccupied
            ? "border-rose-200 bg-rose-50/40"
            : "border-slate-200 bg-slate-100 opacity-60"
        }`}
      >
        <div className="font-mono text-base font-black text-slate-900">
          {slot.slotNumber}
        </div>
        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-center gap-1 font-semibold">
          {slot.category.name === "CAR" && <Car className="h-3 w-3 text-blue-600" />}
          {isMotorcycle(slot.category.name) && <Bike className="h-3 w-3 text-emerald-600" />}
          {slot.category.name === "BUS" && <Bus className="h-3 w-3 text-purple-600" />}
          <span>{isMotorcycle(slot.category.name) ? "Motorcycle" : slot.category.name}</span>
        </div>
        <div
          className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
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
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold shadow-sm">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none flex items-center gap-2">
                Attendant Gate Portal
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Gate Staff
                </span>
              </h1>
              <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-pulse" : isFallbackMode ? "bg-amber-500" : "bg-slate-400"
                  }`}
                />
                {isConnected ? "Real-Time Gate Telemetry (SSE)" : "Polling Mode (10s)"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{user.name || "Lot Attendant"}</span>
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
        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center justify-between shadow-sm border ${
              actionFeedback.type === "success"
                ? "bg-emerald-50 text-emerald-900 border-emerald-200"
                : "bg-rose-50 text-rose-900 border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {actionFeedback.type === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-xs opacity-60 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* 15-Minute Protocol Gate Operations Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-2xl p-6 text-white mb-8 shadow-sm border border-emerald-800/40">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold mb-2 border border-emerald-400/20">
                <Clock className="h-3.5 w-3.5 text-emerald-300" />
                <span>15-Minute Grace Protocol • Gate Staff Verification Guidelines</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white">Campus Gate Access Verification</h2>
              <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                When a driver arrives at the gate, enter their booking reference or scan their code. If they arrive within their <strong>15-minute window</strong>, click <strong>Verify Arrival</strong> to open the in-gate and transition the slot to <strong>OCCUPIED</strong>. When leaving, click <strong>Verify Exit</strong> to confirm departure and instantly free the slot for waiting vehicles.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 p-3.5 rounded-xl backdrop-blur-sm text-xs font-semibold self-stretch lg:self-auto justify-center">
              <div className="text-center px-2">
                <span className="block text-emerald-300 font-bold">1. Arrive</span>
                <span className="text-[10px] text-slate-300">Within 15 Mins</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <div className="text-center px-2">
                <span className="block text-white font-bold">2. Gate Open</span>
                <span className="text-[10px] text-slate-300">Slot Occupied</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <div className="text-center px-2">
                <span className="block text-blue-300 font-bold">3. Exit Verified</span>
                <span className="text-[10px] text-slate-300">Slot Freed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fulbaria Route Bus Gate Expedited Access Card */}
        <div className="bg-purple-50 rounded-2xl border border-purple-200 p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-purple-900 text-sm">Upcoming Shuttle: Fulbaria Route Bus</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                  Priority Gate Clearance
                </span>
              </div>
              <p className="text-xs text-purple-700 mt-0.5">
                Designated Bay: {availableBusSlots[0]?.slotNumber || "Bay B01"}. Ensure direct access through main gate to prevent campus bottleneck.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <span className="text-xs font-semibold text-purple-800 bg-purple-100 px-3 py-1.5 rounded-lg border border-purple-200">
              Bus Bays: {availableBusSlots.length}/{busSlots.length} Free
            </span>
          </div>
        </div>

        {/* Gate Operations Action Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
          <div className="max-w-2xl">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <ArrowRightCircle className="h-6 w-6 text-emerald-600" />
              Vehicle Gate Operations
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verify vehicles arriving within their 15-minute grace window or confirm physical departures to release slots.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Enter Booking Reference (e.g. BK-2026-001)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold tracking-wide uppercase placeholder:normal-case placeholder:font-normal focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="text"
                placeholder="QR Secret"
                value={qrSecret}
                onChange={(e) => setQrSecret(e.target.value)}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleVerifyArrival()}
                disabled={isSubmitting || !searchQuery.trim() || !qrSecret.trim()}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
              >
                Verify Arrival (Open In-Gate)
              </button>
              <button
                onClick={() => handleVerifyExit()}
                disabled={isSubmitting || !searchQuery.trim() || !qrSecret.trim()}
                className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
              >
                Verify Exit (Open Out-Gate)
              </button>
            </div>
          </div>
        </div>

        {/* Lot Selector & Live Status */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                {activeLot ? activeLot.name : "Assigned Parking Lot"} Live Slot Map ({filteredSlots.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring physical slot occupancy and reservations in real-time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={currentAreaId}
                onChange={(e) => setCurrentAreaId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>

              {/* Category Pills Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCategoryFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    categoryFilter === "ALL" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("CAR")}
                  className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    categoryFilter === "CAR" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
                  }`}
                >
                  <Car className="h-3 w-3" /> Car
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("MOTORCYCLE")}
                  className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    isMotorcycle(categoryFilter) ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
                  }`}
                >
                  <Bike className="h-3 w-3" /> Motorcycle (2-Side Lane)
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryFilter("BUS")}
                  className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    categoryFilter === "BUS" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600"
                  }`}
                >
                  <Bus className="h-3 w-3" /> Bus
                </button>
              </div>

              <button
                onClick={() => fetchSlots(currentAreaId)}
                title="Refresh Slots"
                className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {isLoadingSlots ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
              Loading lot slots...
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">No slots in this lot for &quot;{categoryFilter}&quot;.</div>
          ) : isMotorcycle(categoryFilter) && motorcycleSlots.length > 0 ? (
            /* Special Two-Sided Motorcycle View for Attendants */
            <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="mb-4 text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full inline-block">
                  🏍️ Two-Sided Serial Motorcycle Bay System
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Side A and Side B parallel parking with central aisle for zero-blocking entry and departure.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-stretch">
                {/* Side A */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded-xl text-center shadow-2xs">
                    SIDE A (Serial Bays)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sideASlots.map((slot) => renderAttendantSlotCard(slot))}
                  </div>
                </div>

                {/* Central Driveway */}
                <div className="lg:col-span-1 bg-slate-800 rounded-xl p-3 flex flex-col items-center justify-center text-center text-white border-2 border-dashed border-amber-400/80 shadow-inner min-h-[160px]">
                  <Navigation className="h-6 w-6 text-amber-400 animate-bounce mb-2" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 block">
                    Central Driveway
                  </span>
                  <span className="text-[9px] text-slate-300 mt-1 leading-tight font-medium">
                    Empty Maneuvering Passage (Free Entry / Exit Lane ➡️)
                  </span>
                </div>

                {/* Side B */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded-xl text-center shadow-2xs">
                    SIDE B (Serial Bays)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sideBSlots.map((slot) => renderAttendantSlotCard(slot))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Grid for Car, Bus, or All */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredSlots.map((slot) => renderAttendantSlotCard(slot))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
