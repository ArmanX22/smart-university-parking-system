import Link from "next/link";
import { Car, Bus, Bike, ShieldCheck, Clock, Bell, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-blue-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-lg">P</span>
            <span>UniParking</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/auth/signin"
              className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50 via-white to-slate-50">
          <div className="container px-4 md:px-8 text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-100/60 px-3 py-1 text-xs font-semibold text-blue-800 mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Smart Campus Parking Platform - Phase 1 Initialized
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-slate-900">
              Smart University Parking <br />
              <span className="text-blue-600">Management &amp; Reservation</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 md:text-xl max-w-2xl mx-auto leading-relaxed">
              High-concurrency slot reservations, verified vehicle arrivals &amp; exits, real-time SSE telemetry, and smart queue allocation for modern university campuses.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/auth/signin"
                className="inline-flex h-11 items-center justify-center rounded-md bg-blue-600 px-8 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition-colors gap-2"
              >
                Access Portal
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-8 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Explore Features
              </a>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section id="features" className="w-full py-16 bg-white border-y border-slate-200">
          <div className="container px-4 md:px-8 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-center text-slate-900 mb-12">
              Supported Vehicle Categories &amp; Serial Numbering
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-6 bg-slate-50/50 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                  <Car className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900">Car</h3>
                <p className="text-sm text-slate-600 mt-1">Serials: C01, C02, C03...</p>
                <div className="mt-3 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded inline-block">
                  Default: 15 min limit
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-6 bg-slate-50/50 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <Bike className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900">Motorcycle / Bike</h3>
                <p className="text-sm text-slate-600 mt-1">Serials: M01, M02, M03...</p>
                <div className="mt-3 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block">
                  Default: 15 min limit
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-6 bg-slate-50/50 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
                  <Bus className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900">University Bus</h3>
                <p className="text-sm text-slate-600 mt-1">Serials: B01, B02, B03...</p>
                <div className="mt-3 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded inline-block">
                  Default: 30 min limit
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-6 bg-slate-50/50 hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900">Other / Service</h3>
                <p className="text-sm text-slate-600 mt-1">Serials: O01, O02, O03...</p>
                <div className="mt-3 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block">
                  Admin configurable
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Invariants & Highlights */}
        <section className="w-full py-16 bg-slate-50">
          <div className="container px-4 md:px-8 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-center text-slate-900 mb-12">
              Core Safety &amp; Reliability Invariants
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Dual-Timer Precision</h3>
                <p className="text-sm text-slate-600">
                  Strict separation of <strong>Arrival Grace Period</strong> and <strong>Parking Duration</strong>. Parking clock only starts upon verified arrival.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mb-4">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Verified Exit Invariant</h3>
                <p className="text-sm text-slate-600">
                  A slot is <em>never</em> automatically marked available upon timer expiration. Overstaying vehicles remain occupied until physical exit verification.
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <Bell className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Live SSE &amp; Push Alerts</h3>
                <p className="text-sm text-slate-600">
                  Real-time slot telemetry via Server-Sent Events with fallback polling, paired with Web Push notifications powered by Firebase Cloud Messaging.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 py-6 bg-white text-center text-xs text-slate-500">
        <p>Smart University Parking Management &amp; Reservation System &bull; Next.js &bull; TiDB Cloud &bull; Prisma &bull; Auth.js</p>
      </footer>
    </div>
  );
}
