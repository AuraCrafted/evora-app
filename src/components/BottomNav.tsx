import { NavLink } from "react-router-dom";
import { Dices, Flame, Heart, Home, MessageCircle, Sparkles, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { isMuted, setMuted, sfx } from "@/lib/feedback";

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
  { to: "/coach", label: "Coach", icon: Heart },
  { to: "/history", label: "Streak", icon: Flame },
  { to: "/plans", label: "Plans", icon: Sparkles },
  { to: "/feedback", label: "Ideas", icon: MessageCircle },
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
    if (!next) sfx.tap();
  };

  return (
    <nav className="sticky bottom-0 left-0 right-0 z-30 px-3 pb-4 pt-2">
      <div className="mx-auto max-w-md rounded-full bg-card/90 backdrop-blur-md soft-shadow border border-border/60 px-1.5 py-1.5 flex items-center justify-between gap-0.5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => sfx.tap()}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all",
                isActive
                  ? "gradient-primary text-primary-foreground soft-shadow"
                  : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            <span className="hidden xs:inline">{label}</span>
            {label === "Streak" && streak > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-background/30 px-1 text-[10px] font-semibold">
                {streak}
              </span>
            )}
          </NavLink>
        ))}
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </nav>
  );
};
