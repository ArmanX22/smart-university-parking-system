import { requireAttendant, getAttendantAssignedArea } from "@/server/auth/guards";
import Link from "next/link";
import { Wrench, MapPin, QrCode, LogOut } from "lucide-react";

export default async function AttendantDashboardPage() {
  const user = await requireAttendant();

  let assignedArea = null;
  try {
    assignedArea = await getAttendantAssignedArea(user.id);
  } catch {
    // Unassigned attendant fallback
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 leading-none">Attendant Gate Portal</h1>
              <span className="text-xs text-slate-500">Smart University Parking</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
              {user.email} (ATTENDANT)
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
          <h2 className="text-2xl font-extrabold text-slate-900">Gate Verification &amp; Check-In</h2>
          <p className="text-sm text-slate-600 mt-1">
            Assigned Location:{" "}
            <strong>{assignedArea ? `${assignedArea.name} [${assignedArea.code}]` : "No area assigned yet"}</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Assigned Parking Lot</h3>
              <p className="text-sm text-slate-600 mt-1">
                {assignedArea ? assignedArea.description : "Please contact the Campus Admin to assign an active parking zone."}
              </p>
              <div className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded inline-block">
                Total Slots: {assignedArea?.slots.length || 0}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">QR Check-In / Search</h3>
              <p className="text-sm text-slate-600 mt-1">
                Scan arrival QR code or lookup booking reference to verify physical arrival and exit.
              </p>
              <div className="mt-3 text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded inline-block">
                Ready for Phase 5 (Booking Engine)
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
