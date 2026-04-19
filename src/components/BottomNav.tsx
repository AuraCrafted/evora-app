import { NavLink } from "react-router-dom";
import { Dices, Flame, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { isMuted, setMuted, sfx } from "@/lib/feedback";

interface Props {
  streak: number;
}

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
    <nav className="sticky bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-md rounded-full bg-card/90 backdrop-blur-md soft-shadow border border-border/60 px-2 py-2 flex items-center justify-between">
        <NavLink
          to="/"
          end
          onClick={() => sfx.tap()}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "gradient-primary text-primary-foreground soft-shadow"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          <Dices className="h-4 w-4" />
          Roll
        </NavLink>
        <NavLink
          to="/history"
          onClick={() => sfx.tap()}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
              isActive
                ? "gradient-primary text-primary-foreground soft-shadow"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          <Flame className="h-4 w-4" />
          Streak
          {streak > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-background/30 px-1.5 text-[11px] font-semibold">
              {streak}
            </span>
          )}
        </NavLink>
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </nav>
  );
};
