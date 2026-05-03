import { useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SwipeToRollProps {
  rolling: boolean;
  onRoll: () => void;
  children: ReactNode;
  /** Minimum swipe distance in px to trigger a roll. */
  threshold?: number;
}

/**
 * Wraps the dice in a swipe-aware surface. The user drags in any
 * direction; releasing past the threshold (or a fast flick) triggers a roll.
 * While dragging, the dice follows the finger for tactile feedback.
 */
export const SwipeToRoll = ({
  rolling,
  onRoll,
  children,
  threshold = 60,
}: SwipeToRollProps) => {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const startRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const triggeredRef = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (rolling) return;
    triggeredRef.current = false;
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setDrag({ x: 0, y: 0 });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!startRef.current || rolling) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    setDrag({ x: dx, y: dy });
    const dist = Math.hypot(dx, dy);
    const elapsed = Date.now() - startRef.current.t;
    const velocity = dist / Math.max(elapsed, 1); // px/ms
    if (!triggeredRef.current && (dist > threshold || velocity > 0.6)) {
      triggeredRef.current = true;
      onRoll();
    }
  };

  const reset = () => {
    startRef.current = null;
    setDrag(null);
  };

  const dx = drag?.x ?? 0;
  const dy = drag?.y ?? 0;
  // Cap visual translate so the dice doesn't fly off-screen.
  const cap = 80;
  const tx = Math.max(-cap, Math.min(cap, dx));
  const ty = Math.max(-cap, Math.min(cap, dy));
  const rot = Math.max(-20, Math.min(20, dx / 4));

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={reset}
      onPointerCancel={reset}
      className={cn(
        "w-full flex items-center justify-center touch-none cursor-grab active:cursor-grabbing select-none",
      )}
      style={{ touchAction: "none" }}
      role="button"
      aria-label="Swipe to roll the dice"
    >
      <div
        className="w-full flex items-center justify-center"
        style={{
          transform: drag && !rolling ? `translate(${tx}px, ${ty}px) rotate(${rot}deg)` : undefined,
          transition: drag ? "none" : "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {children}
      </div>
    </div>
  );
};
