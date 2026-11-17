import { requireDriver } from "@/server/auth/guards";
import Link from "next/link";
import { Car, Clock, ShieldCheck, LogOut } from "lucide-react";

export default async function DriverDashboardPage() {
  const user = await requireDriver();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none">Driver Portal</h1>
              <span className="text-xs text-slate-500">Smart University Parking</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
              {user.email} (DRIVER)
            </span>
            <Link
              href="/api/auth/signout"
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-8 py-8 flex-1">
        <div className="mb-8">
          <h2 className="text-2xl font-extrabold text-slate-900">Welcome, {user.name || "Student Driver"}</h2>
          <p className="text-sm text-slate-600 mt-1">
            Browse available parking slots, make reservations, and monitor your parking countdown.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Account Status</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">Active Profile</div>
            <p className="text-xs text-slate-500 mt-1">Role: {user.role} verified in TiDB</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Registered Vehicle</span>
              <Car className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">DHK-METRO-GA-1122</div>
            <p className="text-xs text-slate-500 mt-1">Category: CAR (Toyota Corolla)</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Reservation</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">No Active Booking</div>
            <p className="text-xs text-slate-500 mt-1">Ready to book slots in Phase 5</p>
          </div>
        </div>
      </main>
    </div>
  );
}
