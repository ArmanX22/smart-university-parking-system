"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-600">
          You do not have the required permissions to view this section of the system.
        </p>

        {session?.user && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
            <div className="text-xs text-slate-500 font-medium">Logged in as:</div>
            <div className="font-semibold text-slate-800 text-sm">{session.user.name || session.user.email}</div>
            <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
              Current Role: {session.user.role}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Homepage
          </Link>

          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign in with Another Account
          </button>
        </div>
      </div>
    </div>
  );
}
