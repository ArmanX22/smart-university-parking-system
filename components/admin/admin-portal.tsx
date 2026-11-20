"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Shield,
  Layers,
  Clock,
  RefreshCw,
  CheckCircle2,
  Play,
  LogOut,
  Car,
  Bike,
  Bus,
  PlusCircle,
  Wrench,
  AlertCircle,
  Filter,
  Check,
  Navigation,
  ArrowRight,
  AlertTriangle,
  FileText,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useParkingStream } from "@/hooks/use-parking-stream";

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
  codePrefix: string;
  description: string | null;
  durationPolicy: {
    arrivalGraceMinutes: number;
    parkingDurationMinutes: number;
  } | null;
}

interface SlotRecord {
  id: string;
  slotNumber: string;
  status: "AVAILABLE" | "RESERVED" | "OCCUPIED" | "MAINTENANCE";
  areaId: string;
  categoryId: string;
  area: {
    name: string;
    code: string;
  };
  category: {
    name: string;
    codePrefix: string;
  };
}

export default function AdminPortal({ user }: AdminPortalProps) {
  const [areas, setAreas] = useState<ParkingAreaMetric[]>([]);
  const [categories, setCategories] = useState<VehicleCategoryMetric[]>([]);
  const [slots, setSlots] = useState<SlotRecord[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // Registration Form State
  const [regAreaId, setRegAreaId] = useState<string>("");
  const [regCategoryId, setRegCategoryId] = useState<string>("");
  const [regMode, setRegMode] = useState<"batch" | "single">("batch");
  const [batchCount, setBatchCount] = useState<number>(5);
  const [startNumber, setStartNumber] = useState<number>(1);
  const [singleSlotNumber, setSingleSlotNumber] = useState<string>("");
  const [isSubmittingSlot, setIsSubmittingSlot] = useState(false);

  // Status & Expiry States
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningExpiry, setIsRunningExpiry] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expiryResult, setExpiryResult] = useState<{
    noShowsProcessed: number;
    overstaysProcessed: number;
    slotsFreed: number;
    timestamp: string;
  } | null>(null);

  const loadAreasAndCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const [areasRes, catRes] = await Promise.all([
        fetch("/api/areas"),
        fetch("/api/categories"),
      ]);

      if (areasRes.ok) {
        const aData = await areasRes.json();
        const areaList: ParkingAreaMetric[] = aData.areas || aData.data || [];
        setAreas(areaList);
        if (areaList.length > 0) {
          setSelectedAreaId((prev) => prev || areaList[0].id);
          setRegAreaId((prev) => prev || areaList[0].id);
        }
      }

      if (catRes.ok) {
        const cData = await catRes.json();
        const catList: VehicleCategoryMetric[] = cData.categories || cData.data || [];
        setCategories(catList);
        if (catList.length > 0) {
          setRegCategoryId((prev) => prev || catList[0].id);
        }
      }
    } catch {
      // quiet fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadSlots = useCallback(async (areaId: string) => {
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

  useEffect(() => {
    loadAreasAndCategories();
  }, [loadAreasAndCategories]);

  useEffect(() => {
    if (selectedAreaId) {
      loadSlots(selectedAreaId);
    }
  }, [selectedAreaId, loadSlots]);

  // Phase 8: Real-Time SSE Telemetry Stream with Polling Fallback
  const { isConnected, isFallbackMode } = useParkingStream({
    onSlotUpdate: (evt) => {
      setSlots((prev) =>
        prev.map((s) => (s.id === evt.slotId ? { ...s, status: evt.status } : s))
      );
      loadAreasAndCategories();
    },
    onBookingUpdate: () => {
      loadAreasAndCategories();
      if (selectedAreaId) loadSlots(selectedAreaId);
    },
    onPollFallback: () => {
      loadAreasAndCategories();
      if (selectedAreaId) loadSlots(selectedAreaId);
    },
  });

  // Handle Slot Registration (Batch or Single)
  async function handleRegisterSlots(e: React.FormEvent) {
    e.preventDefault();
    if (!regAreaId || !regCategoryId) {
      setStatusMessage({ type: "error", text: "অনুগ্রহ করে একটি পার্কিং এরিয়া ও গাড়ির ক্যাটাগরি সিলেক্ট করুন।" });
      return;
    }

    try {
      setIsSubmittingSlot(true);
      setStatusMessage(null);

      if (regMode === "batch") {
        const res = await fetch("/api/slots/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            areaId: regAreaId,
            categoryId: regCategoryId,
            count: Number(batchCount),
            startNumber: Number(startNumber),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setStatusMessage({ type: "error", text: data.error || "ব্যাচ স্লট তৈরি ব্যর্থ হয়েছে।" });
        } else {
          setStatusMessage({
            type: "success",
            text: `সফলভাবে ${data.generatedCount} টি নতুন পার্কিং স্লট ডাটাবেজে তৈরি করা হয়েছে!`,
          });
          await Promise.all([loadAreasAndCategories(), loadSlots(regAreaId)]);
        }
      } else {
        if (!singleSlotNumber.trim()) {
          setStatusMessage({ type: "error", text: "অনুগ্রহ করে স্লট নম্বর লিখুন (যেমন: C16, M05, B03)।" });
          return;
        }

        const res = await fetch("/api/slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            areaId: regAreaId,
            categoryId: regCategoryId,
            slotNumber: singleSlotNumber.trim().toUpperCase(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setStatusMessage({ type: "error", text: data.error || "স্লট রেজিস্ট্রেশন ব্যর্থ হয়েছে।" });
        } else {
          setStatusMessage({
            type: "success",
            text: `স্লট "${data.data?.slotNumber || singleSlotNumber}" সফলভাবে ডাটাবেজে রেজিস্টার করা হয়েছে!`,
          });
          setSingleSlotNumber("");
          await Promise.all([loadAreasAndCategories(), loadSlots(regAreaId)]);
        }
      }
    } catch {
      setStatusMessage({ type: "error", text: "সার্ভারের সাথে যোগাযোগ করতে ব্যর্থ হয়েছে।" });
    } finally {
      setIsSubmittingSlot(false);
    }
  }

  // Handle Toggle Maintenance Status
  async function handleToggleStatus(slotId: string, currentStatus: string) {
    const newStatus = currentStatus === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";
    try {
      const res = await fetch(`/api/slots/${slotId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: `স্লটের স্ট্যাটাস পরিবর্তন করে "${newStatus}" করা হয়েছে।`,
        });
        loadSlots(selectedAreaId);
        loadAreasAndCategories();
      } else {
        const data = await res.json();
        setStatusMessage({ type: "error", text: data.error || "স্লট স্ট্যাটাস আপডেট ব্যর্থ হয়েছে।" });
      }
    } catch {
      setStatusMessage({ type: "error", text: "নেটওয়ার্ক এরর হয়েছে।" });
    }
  }

  // Handle Manual Trigger Expiry Engine
  async function handleTriggerExpiry() {
    try {
      setIsRunningExpiry(true);
      const res = await fetch("/api/admin/run-expiry", {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setExpiryResult(data.summary);
        loadAreasAndCategories();
        if (selectedAreaId) loadSlots(selectedAreaId);
        setStatusMessage({
          type: "success",
          text: `এক্সপায়ারি চেকার সম্পন্ন হয়েছে। নো-শো বাতিল: ${data.summary.noShowsProcessed}, মুক্ত স্লট: ${data.summary.slotsFreed}`,
        });
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

  const selectedCategoryObj = categories.find((c) => c.id === regCategoryId);

  // Filter slots for table/grid
  const filteredSlots = useMemo(() => {
    if (selectedCategoryFilter === "ALL") return slots;
    return slots.filter((s) => s.category.name === selectedCategoryFilter);
  }, [slots, selectedCategoryFilter]);

  // Motorcycle two-sided layout calculations
  const motorcycleSlots = useMemo(() => {
    return slots.filter((s) => s.category.name === "BIKE");
  }, [slots]);

  const { sideASlots, sideBSlots } = useMemo(() => {
    const sorted = [...motorcycleSlots].sort((a, b) =>
      a.slotNumber.localeCompare(b.slotNumber, undefined, { numeric: true })
    );

    const a: SlotRecord[] = [];
    const b: SlotRecord[] = [];

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

  // Render Slot Admin Card
  const renderSlotAdminCard = (slot: SlotRecord) => {
    const isAvailable = slot.status === "AVAILABLE";
    const isReserved = slot.status === "RESERVED";
    const isOccupied = slot.status === "OCCUPIED";
    const isMaintenance = slot.status === "MAINTENANCE";

    return (
      <div
        key={slot.id}
        className={`rounded-2xl border-2 p-3.5 transition-all text-center relative ${
          isAvailable
            ? "border-emerald-300 bg-emerald-50/50"
            : isReserved
            ? "border-amber-300 bg-amber-50/40"
            : isOccupied
            ? "border-rose-200 bg-rose-50/40"
            : "border-slate-300 bg-slate-100 opacity-70"
        }`}
      >
        <div className="font-mono text-base font-black text-slate-900">
          {slot.slotNumber}
        </div>

        <div className="text-[11px] font-semibold text-slate-600 mt-0.5 flex items-center justify-center gap-1">
          {slot.category.name === "CAR" && <Car className="h-3 w-3 text-blue-600" />}
          {slot.category.name === "BIKE" && <Bike className="h-3 w-3 text-emerald-600" />}
          {slot.category.name === "BUS" && <Bus className="h-3 w-3 text-purple-600" />}
          <span>{slot.category.name === "BIKE" ? "Motorcycle" : slot.category.name}</span>
        </div>

        <div
          className={`mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
            isAvailable
              ? "bg-emerald-100 text-emerald-800"
              : isReserved
              ? "bg-amber-100 text-amber-800"
              : isOccupied
              ? "bg-rose-100 text-rose-800"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          {isAvailable ? "ফাঁকা (Available)" : isReserved ? "১৫মি বুকড (Reserved)" : isOccupied ? "পার্ক করা (Occupied)" : "বন্ধ (Maintenance)"}
        </div>

        {/* Maintenance Toggle */}
        <div className="mt-2 pt-2 border-t border-slate-200/60">
          <button
            type="button"
            onClick={() => handleToggleStatus(slot.id, slot.status)}
            disabled={isOccupied || isReserved}
            title={
              isMaintenance
                ? "Re-enable slot to AVAILABLE"
                : isOccupied || isReserved
                ? "চলমান গাড়ি থাকায় পরিবর্তন সম্ভব নয়"
                : "Set slot to MAINTENANCE"
            }
            className={`w-full py-1 rounded-lg text-[10px] font-bold transition-colors ${
              isMaintenance
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-slate-200 hover:bg-slate-300 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {isMaintenance ? "চালু করুন (Restore)" : "বন্ধ করুন (Maintenance)"}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-30">
        <div className="container mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-sm">
              <Shield className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-bold text-slate-900 leading-none flex items-center gap-2">
                Admin Management Console
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  বিশ্ববিদ্যালয় প্রশাসন
                </span>
              </h1>
              <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isConnected ? "bg-emerald-500 animate-pulse" : isFallbackMode ? "bg-amber-500" : "bg-slate-400"
                  }`}
                />
                {isConnected ? "রিয়েল-টাইম কন্ট্রোল সক্রিয় (SSE)" : "পোলিং মোড (১০ সেকেন্ড)"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{user.name || "University Admin"}</span>
              <span className="text-[11px] text-slate-500">{user.email}</span>
            </div>
            <Link
              href="/api/auth/signout"
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              লগআউট
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="container mx-auto px-4 sm:px-8 py-8 flex-1 max-w-6xl">
        {/* Status Feedback Banner */}
        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center justify-between shadow-sm border ${
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

        {/* ========================================================================= */}
        {/* ADMIN RESPONSIBILITIES & CONTROL CENTER BANNER (অ্যাডমিনের দায়িত্ব ও কাজ) */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-6 sm:p-8 text-white mb-8 shadow-md border border-indigo-800/40">
          <div className="max-w-3xl mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-full inline-block mb-2 border border-indigo-400/20">
              Admin Operations Center &bull; অ্যাডমিনের মূল দায়িত্ব ও কন্ট্রোল
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              বিশ্ববিদ্যালয় পার্কিং প্রশাসন ড্যাশবোর্ড
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1 leading-relaxed">
              এই অ্যাডমিন প্যানেল থেকে আপনি পুরো বিশ্ববিদ্যালয়ের পার্কিং সিস্টেম পরিচালনা করতে পারবেন। নিচে আপনার ৪টি প্রধান কাজ সাজিয়ে দেওয়া হলো:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <span className="text-xl mb-2 block">📊</span>
              <h4 className="font-bold text-sm text-white">১. লাইভ মনিটরিং</h4>
              <p className="text-[11px] text-indigo-200 mt-1">কতটি গাড়ি অবস্থান করছে, কতটি সিট খালি তা সরাসরি পর্যবেক্ষণ করা।</p>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <span className="text-xl mb-2 block">➕</span>
              <h4 className="font-bold text-sm text-white">২. স্লট তৈরি ও ব্যাচ</h4>
              <p className="text-[11px] text-indigo-200 mt-1">এক ক্লিকে নতুন মোটরসাইকেল (Mxx), কার (Cxx), বাসের স্লট তৈরি করা।</p>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <span className="text-xl mb-2 block">🚌</span>
              <h4 className="font-bold text-sm text-white">৩. ফুলবাড়িয়া বাস প্ল্যান</h4>
              <p className="text-[11px] text-indigo-200 mt-1">ফুলবাড়িয়া রুটের বাসের জন্য স্পেস প্রস্তুত রাখা ও ওভারফ্লো অ্যালার্ট পাওয়া।</p>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <span className="text-xl mb-2 block">⏱️</span>
              <h4 className="font-bold text-sm text-white">৪. ১৫-মি এক্সপায়ারি</h4>
              <p className="text-[11px] text-indigo-200 mt-1">১৫ মিনিটে গেটে না আসা নো-শো গাড়ি ক্যানসেল করে স্লট মুক্ত করা।</p>
            </div>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">ক্যাম্পাস পার্কিং লট</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{areas.length} টি</div>
            <span className="text-xs text-slate-400 font-medium">নিবন্ধিত জোন</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">মোট সিট/স্লট সংখ্যা</span>
            <div className="text-3xl font-black text-slate-900 mt-1">{totalSlots} টি</div>
            <span className="text-xs text-slate-400 font-medium">সব লট মিলিয়ে মোট স্পেস</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">ফাঁকা স্লট (Available)</span>
            <div className="text-3xl font-black text-emerald-700 mt-1">{availableSlots} টি</div>
            <span className="text-xs text-emerald-600 font-semibold">বুকিংয়ের জন্য প্রস্তুত</span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 block">পার্ক করা গাড়ি (Occupied)</span>
            <div className="text-3xl font-black text-rose-700 mt-1">{occupiedSlots} টি</div>
            <span className="text-xs text-rose-600 font-semibold">গাড়ি বর্তমানে অবস্থান করছে</span>
          </div>
        </div>

        {/* Fulbaria Route Bus Planner & Capacity Management Card */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white mb-8 shadow-sm border border-purple-800/40">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold mb-2 border border-purple-400/20">
                <Bus className="h-3.5 w-3.5 text-purple-300" />
                <span>আসন্ন ফুলবাড়িয়া রুট বাস • ক্যাপাসিটি প্ল্যানার (Field Visit Requirement)</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                ফুলবাড়িয়া ক্যাম্পাস বাস শাটল বে ম্যানেজমেন্ট
              </h2>
              <p className="text-xs text-purple-200 mt-1 leading-relaxed">
                বিশ্ববিদ্যালয়ের ফিল্ড ভিজিট রিপোর্ট অনুযায়ী আসন্ন <strong>ফুলবাড়িয়া রুটের বাসের</strong> জন্য নিবেদিত বাস বে (B01, B02...) প্রস্তুত রাখা হয়েছে। যদি ক্যাম্পাসের বাস বে পূর্ণ হয়ে যায়, সাথে সাথে অ্যাটেনডেন্টদের সেকেন্ডারি লট খোলার নির্দেশনা পাঠানো হয়।
              </p>
            </div>

            <div className="bg-white/10 p-5 rounded-2xl backdrop-blur-sm self-stretch lg:self-auto min-w-[280px]">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-purple-200">ক্যাম্পাস বাস বে স্ট্যাটাস:</span>
                <span className="text-white font-mono">{availableBusSlots.length} / {busSlots.length} টি খালি</span>
              </div>
              {availableBusSlots.length > 0 ? (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>বাস বে {availableBusSlots[0]?.slotNumber} ফুলবাড়িয়া বাসের জন্য বরাদ্দ।</span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                  <span>CAPACITY ALERT: সব বাস বে পূর্ণ! সেকেন্ডারি লট খুলুন।</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Slot Registration & Batch Generator Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <PlusCircle className="h-6 w-6 text-indigo-600" />
                পার্কিং স্লট তৈরি ও ব্যাচ জেনারেটর (Slot Creator)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                মোটরসাইকেল (Mxx), কার (Cxx), বাস (Bxx) এর জন্য নতুন স্লট তৈরি করুন অথবা এক ক্লিকে ৫-৫০টি স্লট স্বয়ংক্রিয়ভাবে জেনারেট করুন।
              </p>
            </div>

            {/* Mode Toggle: Batch vs Single */}
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRegMode("batch")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  regMode === "batch"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ব্যাচ অটো-জেনারেটর (Batch)
              </button>
              <button
                type="button"
                onClick={() => setRegMode("single")}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  regMode === "single"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                একটি সিঙ্গেল স্লট (Single)
              </button>
            </div>
          </div>

          <form onSubmit={handleRegisterSlots} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Target Lot Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                টার্গেট পার্কিং লট (Target Lot)
              </label>
              <select
                value={regAreaId}
                onChange={(e) => setRegAreaId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Category Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                গাড়ির ক্যাটাগরি (Vehicle Category)
              </label>
              <select
                value={regCategoryId}
                onChange={(e) => setRegCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name === "BIKE" ? "Motorcycle" : c.name} (সিরিয়াল: {c.codePrefix}xx)
                  </option>
                ))}
              </select>
            </div>

            {/* Conditional Mode Inputs */}
            {regMode === "batch" ? (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    স্লটের পরিমাণ (Quantity)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={batchCount}
                    onChange={(e) => setBatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    অটোমেটিক {selectedCategoryObj?.codePrefix || "C"}01, {selectedCategoryObj?.codePrefix || "C"}02 নামে তৈরি হবে
                  </span>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSubmittingSlot}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow transition-colors disabled:opacity-50"
                  >
                    {isSubmittingSlot ? "তৈরি হচ্ছে..." : "ব্যাচ স্লট জেনারেট করুন"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                    স্লট কোড (Slot Identifier)
                  </label>
                  <input
                    type="text"
                    value={singleSlotNumber}
                    onChange={(e) => setSingleSlotNumber(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 uppercase focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    placeholder={`e.g. ${selectedCategoryObj?.codePrefix || "C"}15`}
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    কাস্টম আলফানামেরিক স্লট কোড লিখুন
                  </span>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSubmittingSlot || !singleSlotNumber.trim()}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow transition-colors disabled:opacity-50"
                  >
                    {isSubmittingSlot ? "রেজিস্টার হচ্ছে..." : "একটি স্লট রেজিস্টার করুন"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Registered Slots Interactive Grid & Filter */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                লাইভ স্লট ইনভেন্টরি ও ম্যাপ ({filteredSlots.length} Slots)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ক্যাম্পাসের প্রতিটি স্লটের বর্তমান অবস্থা দেখুন এবং প্রয়োজনে রক্ষণাবেক্ষণ (Maintenance) বন্ধ/চালু করুন।
              </p>
            </div>

            {/* Controls: Area Selector & Category Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.availableSlots}/{a.totalSlots} Free)
                  </option>
                ))}
              </select>

              {/* Category Pills Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    selectedCategoryFilter === "ALL" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600"
                  }`}
                >
                  সব
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("CAR")}
                  className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    selectedCategoryFilter === "CAR" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600"
                  }`}
                >
                  <Car className="h-3 w-3" /> কার
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("BIKE")}
                  className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    selectedCategoryFilter === "BIKE" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600"
                  }`}
                >
                  <Bike className="h-3 w-3" /> মোটরসাইকেল
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("BUS")}
                  className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                    selectedCategoryFilter === "BUS" ? "bg-white text-purple-700 shadow-xs" : "text-slate-600"
                  }`}
                >
                  <Bus className="h-3 w-3" /> বাস
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  loadAreasAndCategories();
                  if (selectedAreaId) loadSlots(selectedAreaId);
                }}
                className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors"
                title="রিফ্রেশ করুন"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Slot Cards Grid */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-600" />
              TiDB ক্লাউড থেকে স্লট ডাটা লোড হচ্ছে...
            </div>
          ) : filteredSlots.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              এই ফিল্টারে কোনো স্লট রেজিস্টার করা নেই। উপরের ফর্ম ব্যবহার করে স্লট যোগ করুন।
            </div>
          ) : selectedCategoryFilter === "BIKE" && motorcycleSlots.length > 0 ? (
            /* Special Two-Sided Motorcycle Bay Architecture */
            <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="mb-4 text-center">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full inline-block">
                  🏍️ ২-পাশের মোটরসাইকেল বে আর্কিটেকচার (Two-Sided Bay)
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  মাঝখানে ফাঁকা রাস্তা রাখা হয়েছে যাতে বাইক সহজে বের হতে পারে এবং ব্লকেজ তৈরি না হয়।
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-stretch">
                {/* Side A */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded-xl text-center shadow-2xs">
                    SIDE A (বাম পাশের স্লট)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sideASlots.map((slot) => renderSlotAdminCard(slot))}
                  </div>
                </div>

                {/* Central Driveway */}
                <div className="lg:col-span-1 bg-slate-800 rounded-2xl p-3 flex flex-col items-center justify-center text-center text-white border-2 border-dashed border-amber-400/80 shadow-inner min-h-[160px]">
                  <Navigation className="h-6 w-6 text-amber-400 animate-bounce mb-2" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 block">
                    Central Road
                  </span>
                  <span className="text-[9px] text-slate-300 mt-1 leading-tight font-medium">
                    মাঝখানের খোলা রাস্তা (সহজ এন্ট্রি ও এক্সিট লেন ➡️)
                  </span>
                </div>

                {/* Side B */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="bg-emerald-600 text-white font-bold text-xs py-2 px-3 rounded-xl text-center shadow-2xs">
                    SIDE B (ডান পাশের স্লট)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sideBSlots.map((slot) => renderSlotAdminCard(slot))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Grid for Car, Bus, or All */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredSlots.map((slot) => renderSlotAdminCard(slot))}
            </div>
          )}
        </div>

        {/* Expiry Engine Scheduler Box */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Clock className="h-6 w-6 text-indigo-600" />
                ১৫-মিনিট অটোমেটেড এক্সপায়ারি চেকার (Automated Expiry Engine)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                যেসব ড্রাইভার বুক করার ১৫ মিনিটের মধ্যে গেটে আসেনি, এই ইঞ্জিন তাদের রিজার্ভেশন নো-শো (`NO_SHOW`) হিসেবে বাতিল করে স্লট তাৎক্ষণিক মুক্ত করে।
              </p>
            </div>

            <button
              type="button"
              onClick={handleTriggerExpiry}
              disabled={isRunningExpiry}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {isRunningExpiry ? "প্রসেস হচ্ছে..." : "এখনই এক্সপায়ারি চেক চালান"}
            </button>
          </div>

          {expiryResult && (
            <div className="mt-4 p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-center justify-between">
              <div>
                <strong>চেক সম্পন্ন হয়েছে {new Date(expiryResult.timestamp).toLocaleTimeString()}-এ:</strong>
                <span className="ml-2">
                  নো-শো বাতিল: {expiryResult.noShowsProcessed} • ওভারস্টে চিহ্নিত: {expiryResult.overstaysProcessed} • মুক্ত করা স্লট: {expiryResult.slotsFreed}
                </span>
              </div>
              <CheckCircle2 className="h-5 w-5 text-indigo-600 flex-shrink-0" />
            </div>
          )}
        </div>

        {/* Vehicle Category Duration Policies */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            গাড়ির ক্যাটাগরিভিত্তিক পার্কিং সময়সীমা পলিসি (Duration Policies)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
                  {c.name === "CAR" && <Car className="h-4 w-4 text-blue-600" />}
                  {c.name === "BIKE" && <Bike className="h-4 w-4 text-emerald-600" />}
                  {c.name === "BUS" && <Bus className="h-4 w-4 text-purple-600" />}
                  <span>{c.name === "BIKE" ? "Motorcycle" : c.name} ({c.codePrefix}xx)</span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>গেটে পৌঁছানোর সময়: <strong>{c.durationPolicy?.arrivalGraceMinutes || 15} মিনিট</strong></div>
                  <div>সর্বোচ্চ পার্কিং সময়: <strong>{c.durationPolicy?.parkingDurationMinutes || 15} মিনিট</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
