"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Wrench, Car, ArrowLeft, Loader2, AlertCircle, Lock, Mail, ChevronRight, ArrowRight, UserCheck } from "lucide-react";

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("DRIVER");
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(
    errorParam ? "Authentication failed. Please verify your credentials." : null
  );

  async function handleCredentialsSignIn(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setErrorMsg("অনুগ্রহ করে আপনার বিশ্ববিদ্যালয়ের ইমেইল ঠিকানা দিন।");
      return;
    }

    try {
      setLoadingRole("credentials");
      setErrorMsg(null);
      const redirectPath = `/${role.toLowerCase()}`;
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        role,
        redirect: false,
        callbackUrl: redirectPath,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        router.push(redirectPath);
        router.refresh();
      }
    } catch {
      setErrorMsg("লগইন করার সময় একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।");
    } finally {
      setLoadingRole(null);
    }
  }

  async function handleFastRoleSignIn(targetEmail: string, targetRole: string, redirectPath: string) {
    try {
      setLoadingRole(targetRole);
      setErrorMsg(null);
      const res = await signIn("credentials", {
        email: targetEmail,
        password: "password123",
        role: targetRole,
        redirect: false,
        callbackUrl: redirectPath,
      });

      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        router.push(redirectPath);
        router.refresh();
      }
    } catch {
      setErrorMsg("লগইন করার সময় একটি অপ্রত্যাশিত ত্রুটি ঘটেছে।");
    } finally {
      setLoadingRole(null);
    }
  }

  return (
    <div className="w-full max-w-lg">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        হোমপেজে ফিরে যান (Back to Homepage)
      </Link>

      {/* Main Card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-2xl shadow-sm mb-3">
            P
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">UniParking লগইন পোর্টাল</h1>
          <p className="text-xs text-slate-500 mt-1">Smart University Parking Management &amp; Reservation Platform</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1-CLICK FAST PORTAL ACCESS (২টি প্রধান অপশন) */}
        <div className="mb-6">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-3 text-center">
            সরাসরি প্রবেশ করুন (1-Click Instant Access)
          </span>

          <div className="space-y-3">
            {/* Option 1: Student / Teacher */}
            <button
              type="button"
              onClick={() => handleFastRoleSignIn("driver@university.edu", "DRIVER", "/driver")}
              disabled={loadingRole !== null}
              className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 hover:border-blue-400 transition-all text-left group disabled:opacity-60"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white text-xl font-bold shadow-xs">
                  🎓
                </div>
                <div>
                  <div className="font-black text-slate-900 text-sm">শিক্ষার্থী ও শিক্ষক পোর্টাল</div>
                  <div className="text-xs text-slate-500">Student &amp; Faculty Booking</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white">
                  প্রবেশ ➔
                </span>
                {loadingRole === "DRIVER" && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              </div>
            </button>

            {/* Option 2: Admin */}
            <button
              type="button"
              onClick={() => handleFastRoleSignIn("admin@university.edu", "ADMIN", "/admin")}
              disabled={loadingRole !== null}
              className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/70 hover:border-indigo-400 transition-all text-left group disabled:opacity-60"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white text-xl font-bold shadow-xs">
                  🛡️
                </div>
                <div>
                  <div className="font-black text-slate-900 text-sm">অ্যাডমিন ম্যানেজমেন্ট কনসোল</div>
                  <div className="text-xs text-slate-500">Campus Admin Control</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-600 text-white">
                  প্রবেশ ➔
                </span>
                {loadingRole === "ADMIN" && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
              </div>
            </button>

            {/* Option 3: Gate Attendant */}
            <button
              type="button"
              onClick={() => handleFastRoleSignIn("attendant@university.edu", "ATTENDANT", "/attendant")}
              disabled={loadingRole !== null}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 hover:border-emerald-300 transition-all text-left group disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white text-base font-bold shadow-xs">
                  🚪
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">গেট সিকিউরিটি ও স্টাফ পোর্টাল</div>
                  <div className="text-[11px] text-slate-500">Gate Verification Staff</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-700">
                  গেট স্টাফ ➔
                </span>
                {loadingRole === "ATTENDANT" && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
              </div>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-bold tracking-wider text-[10px]">
              অথবা কাস্টম ইমেইল দিয়ে লগইন করুন
            </span>
          </div>
        </div>

        {/* Primary University Credentials Form */}
        <form onSubmit={handleCredentialsSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              বিশ্ববিদ্যালয়ের ইমেইল ঠিকানা (University Email)
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="driver@university.edu"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              পাসওয়ার্ড (Password)
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              পোর্টাল রোল (Role)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="DRIVER">Student / Faculty Driver (শিক্ষার্থী ও শিক্ষক)</option>
              <option value="ADMIN">Campus Administrator (বিশ্ববিদ্যালয় অ্যাডমিন)</option>
              <option value="ATTENDANT">Parking Gate Attendant (গেট সিকিউরিটি স্টাফ)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loadingRole !== null}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider shadow transition-colors disabled:opacity-60"
          >
            {loadingRole === "credentials" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>লগইন হচ্ছে...</span>
              </>
            ) : (
              <span>ইমেইল দিয়ে লগইন করুন</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            পোর্টাল লোড হচ্ছে...
          </div>
        }
      >
        <SignInContent />
      </Suspense>
    </div>
  );
}
