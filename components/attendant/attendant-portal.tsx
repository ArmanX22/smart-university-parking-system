"use client";

import { useState, useEffect, useCallback } from "react";
import { Wrench, MapPin, CheckCircle2, AlertTriangle, ArrowRightCircle, LogOut, RefreshCw, Car, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-bell";

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
    prefix: string;
  };
}

export default function AttendantPortal({ user, assignedArea }: AttendantPortalProps) {
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [currentAreaId, setCurrentAreaId] = useState<string>(assignedArea?.id || "");
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch("/api/areas");
      if (res.ok) {
        const data = await res.json();
        setAreas(data.areas || []);
        if (!currentAreaId && data.areas?.length > 0) {
          setCurrentAreaId(data.areas[0].id);
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
        setSlots(data.slots || []);
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

  async function handleVerifyArrival() {
    if (!searchQuery.trim()) {
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
          bookingReference: searchQuery.toUpperCase().trim(),
          attendantId: user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({ type: "error", message: data.error || "Arrival verification failed." });
      } else {
        setActionFeedback({
          type: "success",
          message: `Gate Opened! Arrival verified for slot ${data.booking.slot.slotNumber}. Parking duration timer active.`,
        });
        setSearchQuery("");
        fetchSlots(currentAreaId);
      }
    } catch {
      setActionFeedback({ type: "error", message: "Failed to communicate with server." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyExit() {
    if (!searchQuery.trim()) {
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
          bookingReference: searchQuery.toUpperCase().trim(),
          attendantId: user.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({ type: "error", message: data.error || "Exit verification failed." });
      } else {
        setActionFeedback({
          type: "success",
          message: `Exit Confirmed! Slot ${data.booking.slot.slotNumber} has been safely released to AVAILABLE.`,
        });
        setSearchQuery("");
        fetchSlots(currentAreaId);
      }
    } catch {
      setActionFeedback({ type: "error", message: "Failed to communicate with server." });
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeLot = areas.find((a) => a.id === currentAreaId);

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
              <span className="text-xs text-slate-500">Live Campus Entry &amp; Exit Verification</span>
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

        {/* Gate Actions Card */}
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
              <button
                onClick={handleVerifyArrival}
                disabled={isSubmitting || !searchQuery.trim()}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
              >
                Verify Arrival (Open In-Gate)
              </button>
              <button
                onClick={handleVerifyExit}
                disabled={isSubmitting || !searchQuery.trim()}
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
                {activeLot ? activeLot.name : "Assigned Parking Lot"} Live Slot Map
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitoring physical slot occupancy and reservations in real-time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={currentAreaId}
                onChange={(e) => setCurrentAreaId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>

              <button
                onClick={() => fetchSlots(currentAreaId)}
                title="Refresh Slots"
                className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {isLoadingSlots ? (
            <div className="py-16 text-center text-slate-500 text-sm">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
              Loading lot slots...
            </div>
          ) : slots.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-sm">No slots in this lot.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {slots.map((slot) => {
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
                    <div className="text-[10px] text-slate-500 mt-0.5">{slot.category.name}</div>
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
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
