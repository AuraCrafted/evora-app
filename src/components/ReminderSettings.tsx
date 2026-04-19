import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReminders } from "@/hooks/useReminders";
import { sfx } from "@/lib/feedback";

interface Props {
  streak: number;
  hasNudgedToday: boolean;
}

export const ReminderSettings = ({ streak, hasNudgedToday }: Props) => {
  const { time, setTime, enabled, permission, requestEnable, disable, supported } = useReminders(
    streak,
    hasNudgedToday,
  );

  if (!supported) {
    return (
      <div className="rounded-3xl bg-card p-5 soft-shadow">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-muted flex items-center justify-center">
            <BellOff className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="text-sm text-muted-foreground">
            Daily reminders aren't supported in this browser.
          </div>
        </div>
      </div>
    );
  }

  const blocked = permission === "denied";

  return (
    <div className="rounded-3xl bg-card p-5 soft-shadow">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-base font-semibold">Daily reminder</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            A gentle nudge so your streak doesn't slip.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="reminder-time">
              Remind me at
            </label>
            <input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="mt-4">
            {enabled && permission === "granted" ? (
              <Button
                variant="soft"
                size="sm"
                onClick={() => {
                  sfx.tap();
                  disable();
                }}
              >
                <BellOff className="h-4 w-4" />
                Turn off reminders
              </Button>
            ) : (
              <Button
                variant="hero"
                size="sm"
                disabled={blocked}
                onClick={async () => {
                  sfx.tap();
                  await requestEnable();
                }}
              >
                <Bell className="h-4 w-4" />
                {blocked ? "Notifications blocked" : "Enable reminders"}
              </Button>
            )}
            {blocked && (
              <p className="text-[11px] text-muted-foreground mt-2">
                Allow notifications in your browser settings to enable reminders.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
