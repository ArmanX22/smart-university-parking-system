"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Wrench, Car, ArrowLeft, Loader2, AlertCircle, Lock, Mail, ChevronRight } from "lucide-react";

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
      setErrorMsg("Please enter your university email address.");
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
      setErrorMsg("An unexpected error occurred during sign-in.");
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
      setErrorMsg("Google Workspace sign-in could not be initiated.");
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

      {/* Main Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-xl shadow-sm mb-3">
            P
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sign in to UniParking</h1>
          <p className="text-xs text-slate-500 mt-1">Smart University Parking Management &amp; Reservation Platform</p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Primary University Credentials Form */}
        <form onSubmit={handleCredentialsSignIn} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              University Email / Student ID
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Portal Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-sm font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            >
              <option value="DRIVER">Student / Faculty Driver</option>
              <option value="ATTENDANT">Parking Gate Attendant</option>
              <option value="ADMIN">Campus Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loadingRole !== null}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow transition-colors disabled:opacity-60"
          >
            {loadingRole === "credentials" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In to Campus Account</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-semibold tracking-wider">
              Or Fast Role Access
            </span>
          </div>
        </div>

        {/* Fast Role Access Cards */}
        <div className="space-y-2.5 mb-6">
          {/* Driver */}
          <button
            type="button"
            onClick={() => handleFastRoleSignIn("driver@university.edu", "DRIVER", "/driver")}
            disabled={loadingRole !== null}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-blue-50/70 hover:border-blue-300 transition-all text-left group"
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
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                DRIVER
              </span>
              {loadingRole === "DRIVER" ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              )}
            </div>
          </button>

          {/* Attendant */}
          <button
            type="button"
            onClick={() => handleFastRoleSignIn("attendant@university.edu", "ATTENDANT", "/attendant")}
            disabled={loadingRole !== null}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-emerald-50/70 hover:border-emerald-300 transition-all text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Wrench className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">Gate Attendant Portal</div>
                <div className="text-xs text-slate-500">attendant@university.edu</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                ATTENDANT
              </span>
              {loadingRole === "ATTENDANT" ? (
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              )}
            </div>
          </button>

          {/* Admin */}
          <button
            type="button"
            onClick={() => handleFastRoleSignIn("admin@university.edu", "ADMIN", "/admin")}
            disabled={loadingRole !== null}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-indigo-50/70 hover:border-indigo-300 transition-all text-left group"
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
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                ADMIN
              </span>
              {loadingRole === "ADMIN" ? (
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              )}
            </div>
          </button>
        </div>

        {/* Google Workspace */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loadingRole !== null}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-colors disabled:opacity-60"
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
          <span>{loadingRole === "google" ? "Connecting Google..." : "Continue with Google Workspace"}</span>
        </button>
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
