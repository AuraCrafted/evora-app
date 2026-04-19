import confetti from "canvas-confetti";

// Read HSL primary from CSS vars so confetti follows the theme
function themeColors(): string[] {
  if (typeof window === "undefined") return ["#ff8a5c", "#ffb37a", "#ffd1a8"];
  const styles = getComputedStyle(document.documentElement);
  const primary = styles.getPropertyValue("--primary").trim();
  const accent = styles.getPropertyValue("--accent").trim();
  const secondary = styles.getPropertyValue("--secondary").trim();
  const toHsl = (v: string, fallback: string) =>
    v ? `hsl(${v})` : fallback;
  return [
    toHsl(primary, "#ff8a5c"),
    toHsl(accent, "#ffb37a"),
    toHsl(secondary, "#ffd1a8"),
    "#ffffff",
  ];
}

export function celebrateAccept() {
  const colors = themeColors();
  confetti({
    particleCount: 80,
    spread: 70,
    startVelocity: 35,
    origin: { y: 0.7 },
    colors,
    scalar: 0.9,
    ticks: 180,
  });
}

export function celebrateMilestone() {
  const colors = themeColors();
  const duration = 1600;
  const end = Date.now() + duration;

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  // Big center burst
  confetti({
    particleCount: 140,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.6 },
    colors,
    scalar: 1.1,
  });
}
