"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Wrench, Car, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

function SignInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");

  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState("");
  const [customRole, setCustomRole] = useState("DRIVER");
  const [errorMsg, setErrorMsg] = useState<string | null>(
    errorParam ? "Authentication failed. Please verify your credentials or select a demo role." : null
  );

  async function handleDemoSignIn(email: string, role: string, redirectPath: string) {
    try {
      setLoadingRole(role);
      setErrorMsg(null);
      const res = await signIn("demo-credentials", {
        email,
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
      setErrorMsg("An unexpected error occurred during sign-in.");
    } finally {
      setLoadingRole(null);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setLoadingRole("google");
      setErrorMsg(null);
      await signIn("google", { callbackUrl });
    } catch {
      setErrorMsg("Google sign-in could not be initiated.");
      setLoadingRole(null);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Homepage
      </Link>

      {/* Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xl shadow-sm mb-3">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to UniParking</h1>
          <p className="text-sm text-slate-500 mt-1">Smart University Parking &amp; Reservation Platform</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Sign In */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loadingRole !== null}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-60"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loadingRole === "google" ? "Connecting Google..." : "Continue with Google"}</span>
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500 font-medium">Or select demo role</span>
            </div>
          </div>

          {/* Quick Demo Role Switcher */}
          <div className="space-y-2.5">
            {/* Admin */}
            <button
              onClick={() => handleDemoSignIn("admin@university.edu", "ADMIN", "/admin")}
              disabled={loadingRole !== null}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Campus Administrator</div>
                  <div className="text-xs text-slate-500">admin@university.edu</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  ADMIN
                </span>
                {loadingRole === "ADMIN" && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
              </div>
            </button>

            {/* Attendant */}
            <button
              onClick={() => handleDemoSignIn("attendant@university.edu", "ATTENDANT", "/attendant")}
              disabled={loadingRole !== null}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50/60 hover:border-emerald-300 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Parking Attendant</div>
                  <div className="text-xs text-slate-500">attendant@university.edu</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  ATTENDANT
                </span>
                {loadingRole === "ATTENDANT" && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
              </div>
            </button>

            {/* Driver */}
            <button
              onClick={() => handleDemoSignIn("driver@university.edu", "DRIVER", "/driver")}
              disabled={loadingRole !== null}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50/60 hover:border-blue-300 transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Car className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 text-sm">Student / Faculty Driver</div>
                  <div className="text-xs text-slate-500">driver@university.edu</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  DRIVER
                </span>
                {loadingRole === "DRIVER" && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              </div>
            </button>
          </div>

          {/* Custom Email Form */}
          <details className="mt-4 text-xs text-slate-500 cursor-pointer">
            <summary className="hover:text-slate-800 font-medium">Custom User / Testing Login</summary>
            <div className="mt-3 p-3 bg-slate-100 rounded-lg space-y-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="user@university.edu"
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-800 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="DRIVER">DRIVER</option>
                  <option value="ATTENDANT">ATTENDANT</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => customEmail && handleDemoSignIn(customEmail, customRole, `/${customRole.toLowerCase()}`)}
                disabled={!customEmail || loadingRole !== null}
                className="w-full mt-2 py-1.5 bg-slate-800 text-white rounded font-semibold text-xs hover:bg-slate-900 disabled:opacity-50"
              >
                Sign in with Custom Email
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Loading authentication portal...</span>
          </div>
        }
      >
        <SignInContent />
      </Suspense>
    </div>
  );
}
