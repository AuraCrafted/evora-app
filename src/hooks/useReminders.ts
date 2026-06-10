import { useCallback, useEffect, useState } from "react";

const TIME_KEY = "nudge.reminderTime.v1"; // "HH:MM" or ""
const ENABLED_KEY = "nudge.reminderEnabled.v1";
const LAST_FIRED_KEY = "nudge.reminderLastFired.v1"; // YYYY-MM-DD

export type ReminderPermission = NotificationPermission | "unsupported";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function supportsNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function useReminders(streak: number, hasNudgedToday: boolean) {
  const [time, setTimeState] = useState<string>(
    () => (typeof window !== "undefined" && localStorage.getItem(TIME_KEY)) || "19:00",
  );
  const [enabled, setEnabledState] = useState<boolean>(
    () => typeof window !== "undefined" && localStorage.getItem(ENABLED_KEY) === "true",
  );
  const [permission, setPermission] = useState<ReminderPermission>(
    () => (supportsNotifications() ? Notification.permission : "unsupported"),
  );

  const setTime = useCallback((t: string) => {
    setTimeState(t);
    localStorage.setItem(TIME_KEY, t);
  }, []);

  const requestEnable = useCallback(async () => {
    if (!supportsNotifications()) {
      setPermission("unsupported");
      return false;
    }
    let perm = Notification.permission;
    if (perm === "default") {
      perm = await Notification.requestPermission();
    }
    setPermission(perm);
    if (perm === "granted") {
      setEnabledState(true);
      localStorage.setItem(ENABLED_KEY, "true");
      return true;
    }
    return false;
  }, []);

  const disable = useCallback(() => {
    setEnabledState(false);
    localStorage.setItem(ENABLED_KEY, "false");
  }, []);

  // Poll once a minute; fire once per day at/after the chosen time if streak is at risk
  useEffect(() => {
    if (!enabled || permission !== "granted") return;

    const check = () => {
      if (hasNudgedToday) return; // nothing to remind about
      const now = new Date();
      const [h, m] = time.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return;
      const target = new Date();
      target.setHours(h, m, 0, 0);
      if (now < target) return;

      const last = localStorage.getItem(LAST_FIRED_KEY);
      const today = todayKey();
      if (last === today) return;

      const title = streak > 0 ? `🔥 Keep your ${streak}-day streak alive` : "🎲 Time for a tiny evora";
      const body =
        streak > 0
          ? "One small action today and your streak rolls on."
          : "Two minutes is enough. Roll the dice and see what comes up.";
      try {
        new Notification(title, { body, icon: "/favicon.ico", tag: "nudge-daily" });
        localStorage.setItem(LAST_FIRED_KEY, today);
      } catch {
        // ignore
      }
    };

    check();
    const id = window.setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [enabled, permission, time, streak, hasNudgedToday]);

  return {
    time,
    setTime,
    enabled,
    permission,
    requestEnable,
    disable,
    supported: supportsNotifications(),
  };
}
