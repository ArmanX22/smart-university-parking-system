import Link from "next/link";
import {
  Car,
  Bus,
  Bike,
  ShieldCheck,
  Clock,
  ArrowRight,
  Ticket,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Building2,
  Layers,
  HelpCircle,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-black text-xl tracking-tight text-blue-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xl shadow-sm">
              P
            </span>
            <div>
              <span className="leading-none block">UniParking</span>
              <span className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase block">
                Smart Campus Reservation
              </span>
            </div>
          </Link>

          {/* Quick Nav Tabs */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/driver"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              🎓 Student / Faculty Booking
            </Link>
            <Link
              href="/admin"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
            >
              🛡️ Admin Management
            </Link>
            <Link
              href="/attendant"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              🚪 Gate Staff
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700"
            >
              Sign In / Access Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-14 md:py-20 bg-gradient-to-b from-blue-100/60 via-white to-slate-50 border-b border-slate-200">
          <div className="container mx-auto px-4 sm:px-8 max-w-5xl text-center">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-800 mb-6 shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Intuitive 3-Step Parking Reservation • Digital Railway-Style Seat Allocation</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
              Smart University Parking <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Management &amp; Reservation System
              </span>
            </h1>

            <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Reserve your guaranteed parking slot <strong>up to 15 minutes before arrival</strong>. Select your car, motorcycle, or bus slot from an interactive seat map, receive your digital e-ticket, and check in at the campus gate.
            </p>

            {/* How It Works - Railway Style 3 Steps */}
            <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-black text-sm flex-shrink-0">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Select Vehicle &amp; Slot</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Browse the visual lot layout and click any green Available slot to instantly reserve.
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 font-black text-sm flex-shrink-0">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">15-Min Digital E-Ticket</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Receive your confirmed booking reference with an active 15-minute arrival countdown.
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-start gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-black text-sm flex-shrink-0">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Gate Verification &amp; Entry</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Show your booking reference at the gate within 15 minutes. Attendant verifies and opens gate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The 2 Primary Portal Choices (Student/Teacher vs Admin) */}
        <section className="py-14 bg-slate-50">
          <div className="container mx-auto px-4 sm:px-8 max-w-5xl">
            <div className="text-center mb-10">
              <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-100 px-3 py-1 rounded-full inline-block mb-2">
                User Portals • Select Your Role
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Choose Your Dedicated University Portal
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Fast, seamless booking for Students &amp; Faculty, and full inventory control for Administrators.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Option 1: Student & Teacher Portal */}
              <div className="rounded-3xl border-2 border-blue-500/30 bg-white p-8 shadow-md hover:shadow-xl hover:border-blue-500 transition-all flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-bl-xl shadow-xs">
                  For Drivers
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 font-black text-2xl group-hover:scale-105 transition-transform">
                      🎓
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        Student &amp; Faculty Portal
                      </h3>
                      <span className="text-xs text-blue-600 font-semibold block">
                        Campus Driver &amp; Reservation Console
                      </span>
                    </div>
                  </div>

                  {/* What Student/Teacher will do */}
                  <div className="mt-5 space-y-3 bg-blue-50/60 p-4 rounded-2xl border border-blue-100 text-xs">
                    <div className="font-bold text-blue-950 flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span>What you can do here:</span>
                    </div>
                    <ul className="space-y-2 text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                        <span><strong>Vehicle Selection:</strong> Choose registered Motorcycle, Car, or Bus.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                        <span><strong>Interactive Seat/Slot Map:</strong> Real-time visual availability layout (Green = Available).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                        <span><strong>15-Minute Digital E-Ticket:</strong> Live countdown timer HUD with verified booking code.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                        <span><strong>Smart Waiting List:</strong> Automatic FIFO allocation when occupied slots are freed.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    href="/driver"
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all group-hover:bg-blue-700"
                  >
                    <span>Enter Student &amp; Faculty Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-[11px] text-slate-400 text-center block mt-2">
                    Book your slot up to 15 minutes before reaching campus
                  </span>
                </div>
              </div>

              {/* Option 2: Admin Management Console */}
              <div className="rounded-3xl border-2 border-indigo-500/30 bg-white p-8 shadow-md hover:shadow-xl hover:border-indigo-500 transition-all flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-4 py-1.5 rounded-bl-xl shadow-xs">
                  For Administration
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 font-black text-2xl group-hover:scale-105 transition-transform">
                      🛡️
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">
                        Campus Admin Console
                      </h3>
                      <span className="text-xs text-indigo-600 font-semibold block">
                        Full Parking Inventory &amp; Policy Control
                      </span>
                    </div>
                  </div>

                  {/* What Admin will do */}
                  <div className="mt-5 space-y-3 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 text-xs">
                    <div className="font-bold text-indigo-950 flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                      <span>What administrators can do here:</span>
                    </div>
                    <ul className="space-y-2 text-slate-700">
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                        <span><strong>Live KPI Dashboard:</strong> Real-time counts of total slots, active parkings, and vacancies.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                        <span><strong>Batch Slot Generator:</strong> Instant generation of Motorcycle (Mxx), Car (Cxx), and Bus (Bxx) bays.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                        <span><strong>Fulbaria Route Bus Planner:</strong> Pre-allocate bus bays &amp; receive overflow capacity alerts.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 flex-shrink-0" />
                        <span><strong>Automated Expiry Scheduler:</strong> One-click trigger to auto-cancel 15-min overdue no-shows.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-8">
                  <Link
                    href="/admin"
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all group-hover:bg-indigo-700"
                  >
                    <span>Enter Admin Console</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-[11px] text-slate-400 text-center block mt-2">
                    Manage parking capacity, duration policies, and serial inventory
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Gate Staff Card */}
            <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                  🚪
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">
                    For Gate Staff: Attendant Gate Verification Portal
                  </h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Verify arriving driver booking references to open the in-gate (Occupied), and confirm vehicle departures to release slots back to Available.
                  </p>
                </div>
              </div>

              <Link
                href="/attendant"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex-shrink-0 shadow-xs transition-colors"
              >
                Gate Staff Portal ➔
              </Link>
            </div>
          </div>
        </section>

        {/* Railway-Style Color Code Guide */}
        <section className="py-12 bg-white border-y border-slate-200">
          <div className="container mx-auto px-4 sm:px-8 max-w-5xl">
            <h3 className="text-center font-bold text-sm uppercase tracking-wider text-slate-500 mb-6">
              Visual Slot Status Color Key
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="h-4 w-4 rounded-full bg-emerald-500 inline-block mb-1"></span>
                <div className="font-black text-sm text-emerald-900">AVAILABLE</div>
                <p className="text-[11px] text-emerald-700 mt-0.5">Free slot ready for immediate 15-minute booking.</p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="h-4 w-4 rounded-full bg-amber-500 inline-block mb-1"></span>
                <div className="font-black text-sm text-amber-900">RESERVED (15m Active)</div>
                <p className="text-[11px] text-amber-700 mt-0.5">Driver is currently en route with active grace timer.</p>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <span className="h-4 w-4 rounded-full bg-rose-500 inline-block mb-1"></span>
                <div className="font-black text-sm text-rose-900">OCCUPIED</div>
                <p className="text-[11px] text-rose-700 mt-0.5">Vehicle checked in by gate staff and parked.</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200">
                <span className="h-4 w-4 rounded-full bg-slate-400 inline-block mb-1"></span>
                <div className="font-black text-sm text-slate-900">MAINTENANCE</div>
                <p className="text-[11px] text-slate-700 mt-0.5">Temporarily offline or reserved for campus events.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        <p>Smart University Parking Management &amp; Reservation System &bull; Next.js 14 &bull; TiDB Cloud &bull; Prisma &bull; Auth.js</p>
      </footer>
    </div>
  );
}
