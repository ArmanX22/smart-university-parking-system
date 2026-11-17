"use client";

import { useState, useEffect } from "react";
import { Bell, Check, Loader2, Volume2, ShieldAlert } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushStatus, setPushStatus] = useState<"default" | "granted" | "denied" | "unsupported">("default");
  const [isRegistering, setIsRegistering] = useState(false);

  // Check browser Notification support
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        setPushStatus("unsupported");
      } else {
        setPushStatus(Notification.permission);
      }
    }
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch {
      // Offline or network error
    }
  }

  async function handleEnablePush() {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    try {
      setIsRegistering(true);
      const permission = await Notification.requestPermission();
      setPushStatus(permission);

      if (permission === "granted") {
        // Register Service Worker
        const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        console.log("FCM Service Worker registered:", registration.scope);

        // Generate synthetic mock device token for local testing if VAPID key is pending
        const dummyToken = `web-push-token-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
        await fetch("/api/notifications/push-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: dummyToken, platform: "web" }),
        });
      }
    } catch (err) {
      console.error("Failed to enable Web Push:", err);
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch {
      // Ignored
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl z-50">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Web Push Banner */}
          {pushStatus === "default" && (
            <div className="mt-3 p-2.5 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-between">
              <div className="text-xs text-blue-800 font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>Enable web push alerts?</span>
              </div>
              <button
                onClick={handleEnablePush}
                disabled={isRegistering}
                className="px-2.5 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
              >
                {isRegistering ? <Loader2 className="h-3 w-3 animate-spin" /> : "Enable"}
              </button>
            </div>
          )}

          {pushStatus === "denied" && (
            <div className="mt-3 p-2 rounded-lg bg-amber-50 text-[11px] text-amber-800 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
              <span>Browser notifications blocked in site permissions.</span>
            </div>
          )}

          {/* Notification List */}
          <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No notifications yet.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-2.5 rounded-xl text-xs transition-colors border ${
                    n.readAt
                      ? "bg-white border-slate-100 text-slate-600"
                      : "bg-blue-50/50 border-blue-100 font-medium text-slate-900"
                  }`}
                >
                  <div className="font-semibold text-slate-800">{n.title}</div>
                  <div className="mt-0.5 text-slate-600 leading-relaxed">{n.body}</div>
                  <div className="mt-1.5 text-[10px] text-slate-400">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
