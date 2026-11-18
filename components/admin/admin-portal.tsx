"use client";

import { useState, useEffect, useCallback } from "react";
import { Shield, Layers, Clock, AlertOctagon, RefreshCw, CheckCircle2, Play, LogOut, Car, Bike, Bus } from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-bell";

interface AdminPortalProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface ParkingAreaMetric {
  id: string;
  name: string;
  code: string;
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
}

interface VehicleCategoryMetric {
  id: string;
  name: string;
  prefix: string;
  policy: {
    arrivalGraceMinutes: number;
    maxParkingMinutes: number;
  } | null;
}

export default function AdminPortal({ user }: AdminPortalProps) {
  const [areas, setAreas] = useState<ParkingAreaMetric[]>([]);
  const [categories, setCategories] = useState<VehicleCategoryMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningExpiry, setIsRunningExpiry] = useState(false);
  const [expiryResult, setExpiryResult] = useState<{
    noShowsProcessed: number;
    overstaysProcessed: number;
    slotsFreed: number;
    timestamp: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [areasRes, catRes] = await Promise.all([
        fetch("/api/areas"),
        fetch("/api/categories"),
      ]);

      if (areasRes.ok) {
        const aData = await areasRes.json();
        setAreas(aData.areas || []);
      }

      if (catRes.ok) {
        const cData = await catRes.json();
        setCategories(cData.categories || []);
      }
    } catch {
      // quiet fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleTriggerExpiry() {
    try {
      setIsRunningExpiry(true);
      const res = await fetch("/api/admin/run-expiry", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setExpiryResult(data.summary);
        loadData();
      }
    } catch {
      // quiet fail
    } finally {
      setIsRunningExpiry(false);
    }
  }

  const totalSlots = areas.reduce((acc, a) => acc + a.totalSlots, 0);
  const availableSlots = areas.reduce((acc, a) => acc + a.availableSlots, 0);
  const occupiedSlots = areas.reduce((acc, a) => acc + a.occupiedSlots, 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none flex items-center gap-2">
                Admin Console
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Campus Admin
                </span>
              </h1>
              <span className="text-xs text-slate-500">System Inventory, Policies &amp; Expiry Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{user.name || "Administrator"}</span>
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

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-8 py-8 flex-1 max-w-6xl">
        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Campus Lots</span>
            <div className="text-3xl font-black text-slate-900 mt-2">{areas.length} Areas</div>
            <span className="text-xs text-slate-500 mt-1 block">Configured in TiDB</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Capacity</span>
            <div className="text-3xl font-black text-slate-900 mt-2">{totalSlots} Slots</div>
            <span className="text-xs text-slate-500 mt-1 block">Across all lots</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Available Now</span>
            <div className="text-3xl font-black text-emerald-600 mt-2">{availableSlots} Free</div>
            <span className="text-xs text-emerald-600 font-medium mt-1 block">Ready for driver booking</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Occupied / Reserved</span>
            <div className="text-3xl font-black text-blue-600 mt-2">{occupiedSlots} In-Use</div>
            <span className="text-xs text-blue-600 font-medium mt-1 block">Physical or active hold</span>
          </div>
        </div>

        {/* Expiry Engine Scheduler Box */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Clock className="h-6 w-6 text-indigo-600" />
                Automated Expiry Scheduler
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Runs idempotent background job to transition overdue grace reservations to NO_SHOW, and overdue parking vehicles to EXPIRED_AWAITING_EXIT (retaining slots in OCCUPIED until physical exit).
              </p>
            </div>

            <button
              onClick={handleTriggerExpiry}
              disabled={isRunningExpiry}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {isRunningExpiry ? "Processing Job..." : "Trigger Expiry Check Now"}
            </button>
          </div>

          {expiryResult && (
            <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
              <div>
                <strong>Job Run Completed at {new Date(expiryResult.timestamp).toLocaleTimeString()}:</strong>
                <span className="ml-2">
                  No-Shows: {expiryResult.noShowsProcessed} • Overstays Flagged: {expiryResult.overstaysProcessed} • Slots Safely Freed: {expiryResult.slotsFreed}
                </span>
              </div>
              <CheckCircle2 className="h-5 w-5 text-indigo-600 flex-shrink-0" />
            </div>
          )}
        </div>

        {/* Parking Lot Status Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
          <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            Campus Parking Areas Inventory
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Area Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4 text-center">Total Slots</th>
                  <th className="py-3 px-4 text-center">Available</th>
                  <th className="py-3 px-4 text-center">Occupied</th>
                  <th className="py-3 px-4 text-right">Occupancy Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {areas.map((a) => {
                  const rate = a.totalSlots > 0 ? Math.round((a.occupiedSlots / a.totalSlots) * 100) : 0;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{a.name}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-500">{a.code}</td>
                      <td className="py-3.5 px-4 text-center font-semibold">{a.totalSlots}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{a.availableSlots}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-blue-600">{a.occupiedSlots}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100">
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Policies */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Vehicle Category Duration Policies
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
                  {c.name === "CAR" && <Car className="h-4 w-4 text-blue-600" />}
                  {c.name === "BIKE" && <Bike className="h-4 w-4 text-emerald-600" />}
                  {c.name === "BUS" && <Bus className="h-4 w-4 text-purple-600" />}
                  <span>{c.name} ({c.prefix}xx)</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>Arrival Grace: <strong>{c.policy?.arrivalGraceMinutes || 15} mins</strong></div>
                  <div>Max Parking: <strong>{c.policy?.maxParkingMinutes || 15} mins</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
