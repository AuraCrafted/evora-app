import { NavLink } from "react-router-dom";
import {
  Dices,
  Dumbbell,
  Flame,
  Home,
  MessageCircle,
  Settings as SettingsIcon,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { isMuted, setMuted, sfx } from "@/lib/feedback";
import { haptic } from "@/lib/native";

interface Props {
  streak: number;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const items: NavItem[] = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/roll", label: "Roll", icon: Dices },
  { to: "/coach", label: "Coach", icon: Dumbbell },
  { to: "/history", label: "Streak", icon: Flame },
  { to: "/plans", label: "Plans", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export const BottomNav = ({ streak }: Props) => {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    setMutedState(isMuted());
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    haptic("selection");
    if (!next) sfx.tap();
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pb-safe bg-background/80 backdrop-blur-xl border-t border-border/60">
      <div className="mx-auto max-w-md px-2 pt-1.5 pb-1.5 flex items-center justify-between gap-0.5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => {
              sfx.tap();
              haptic("selection");
            }}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors min-w-0",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <div className="relative">
              <Icon className="h-[22px] w-[22px]" />
              {label === "Streak" && streak > 0 && (
                <span className="absolute -top-1 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground">
                  {streak}
                </span>
              )}
            </div>
            <span className="leading-none truncate max-w-full">{label}</span>
          </NavLink>
        ))}
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          className="flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {muted ? <VolumeX className="h-[22px] w-[22px]" /> : <Volume2 className="h-[22px] w-[22px]" />}
          <span className="leading-none">{muted ? "Muted" : "Sound"}</span>
        </button>
      </div>
    </nav>
  );
};
