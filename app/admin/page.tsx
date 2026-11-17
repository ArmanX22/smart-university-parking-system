import { requireAdmin } from "@/server/auth/guards";
import Link from "next/link";
import { Shield, Users, Layers, Car, LogOut } from "lucide-react";

export default async function AdminDashboardPage() {
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none">Admin Console</h1>
              <span className="text-xs text-slate-500">Smart University Parking</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
              {user.email} (ADMIN)
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
          <h2 className="text-2xl font-extrabold text-slate-900">System Overview</h2>
          <p className="text-sm text-slate-600 mt-1">
            Welcome back, {user.name || "Administrator"}. Manage parking areas, duration policies, and attendants.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Role Guard</span>
              <Shield className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">RBAC Verified</div>
            <p className="text-xs text-emerald-600 font-medium mt-1">Server authenticated: {user.role}</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Parking Lots</span>
              <Layers className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">3 Areas</div>
            <p className="text-xs text-slate-500 mt-1">NORTH-LOT, SOUTH-LOT, ENG-LOT</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Attendants</span>
              <Users className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">1 Assigned</div>
            <p className="text-xs text-slate-500 mt-1">Officer Farhan (NORTH-LOT)</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Inventory</span>
              <Car className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">15 Slots</div>
            <p className="text-xs text-slate-500 mt-1">Car, Bike, Bus, Other</p>
          </div>
        </div>
      </main>
    </div>
  );
}
