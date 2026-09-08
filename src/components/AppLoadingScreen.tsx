import { useEffect, useState } from "react";
import sunsetAsset from "@/assets/evora-sunset.webp";
import diceAsset from "@/assets/evora-dice.webp";

const MINIMUM_DISPLAY_MS = 1800;
const FADE_DURATION_MS = 700;

export function AppLoadingScreen() {
  const [phase, setPhase] = useState<"visible" | "leaving" | "hidden">("visible");
  const [artworkReady, setArtworkReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = performance.now();

    const preload = (src: string) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = src;
        if (image.complete) resolve();
      });

    Promise.all([preload(sunsetAsset), preload(diceAsset)]).then(() => {
      if (!cancelled) setArtworkReady(true);
      const remaining = Math.max(0, MINIMUM_DISPLAY_MS - (performance.now() - startedAt));
      window.setTimeout(() => {
        if (!cancelled) setPhase("leaving");
      }, remaining);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "leaving") return;
    const timeout = window.setTimeout(() => setPhase("hidden"), FADE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`app-loading-screen ${artworkReady ? "app-loading-screen--ready" : ""} ${phase === "leaving" ? "app-loading-screen--leaving" : ""}`}
      role="status"
      aria-label="Evora is loading"
      aria-live="polite"
    >
      <img
        className="app-loading-background"
        src={sunsetAsset}
        alt=""
        aria-hidden="true"
      />
      <div className="app-loading-dice-wrap" aria-hidden="true">
        <img className="app-loading-dice" src={diceAsset} alt="" />
      </div>
      <span className="sr-only">Loading Evora</span>
    </div>
  );
}