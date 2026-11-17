"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface CountdownTimerProps {
  targetDate: string; // ISO UTC string from server
  label?: string;
  onExpire?: () => void;
  className?: string;
}

export function CountdownTimer({ targetDate, label = "Time Remaining", onExpire, className }: CountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const diff = Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setSecondsLeft(0);
        clearInterval(interval);
        if (onExpire) onExpire();
      } else {
        setSecondsLeft(diff);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isUrgent = secondsLeft > 0 && secondsLeft <= 180; // Under 3 minutes
  const isExpired = secondsLeft === 0;

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isExpired
          ? "border-rose-300 bg-rose-50 text-rose-900"
          : isUrgent
          ? "border-amber-300 bg-amber-50 text-amber-900 animate-pulse"
          : "border-blue-200 bg-blue-50/70 text-blue-900"
      } ${className || ""}`}
    >
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-1">
        <span className="flex items-center gap-1.5">
          {isUrgent || isExpired ? (
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          ) : (
            <Clock className="h-4 w-4 text-blue-600" />
          )}
          {label}
        </span>
        {isExpired ? (
          <span className="rounded bg-rose-200 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
            EXPIRED
          </span>
        ) : isUrgent ? (
          <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
            URGENT
          </span>
        ) : (
          <span className="rounded bg-blue-200 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
            ACTIVE
          </span>
        )}
      </div>

      <div className="mt-2 flex items-baseline gap-1 font-mono text-3xl font-black">
        <span>{String(minutes).padStart(2, "0")}</span>
        <span className="text-xl opacity-60">:</span>
        <span>{String(seconds).padStart(2, "0")}</span>
      </div>

      <p className="mt-1 text-xs opacity-75">
        {isExpired
          ? "Allowed time has ended. Please proceed to the exit gate immediately."
          : "Derived from server UTC clock. Slot status is enforced by backend scheduler."}
      </p>
    </div>
  );
}
