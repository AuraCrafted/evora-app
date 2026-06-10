import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

declare global {
  interface Window {
    Paddle: any;
  }
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;
let paddleInitPromise: Promise<void> | null = null;

function waitForPaddle(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (typeof window !== "undefined" && (window as any).Paddle?.Environment) {
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        reject(new Error("Paddle.js failed to load"));
      } else {
        setTimeout(tick, 50);
      }
    };
    tick();
  });
}

export async function initializePaddle() {
  if (paddleInitialized) return;
  if (paddleInitPromise) return paddleInitPromise;

  if (!clientToken) {
    throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");
  }

  paddleInitPromise = (async () => {
    const existing = document.querySelector('script[data-paddle="true"]') as HTMLScriptElement | null;
    if (!existing) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
        script.dataset.paddle = "true";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Paddle.js"));
        document.head.appendChild(script);
      });
    }
    await waitForPaddle();
    const paddleJsEnvironment = getPaddleEnvironment() === "sandbox" ? "sandbox" : "production";
    window.Paddle.Environment.set(paddleJsEnvironment);
    window.Paddle.Initialize({ token: clientToken });
    paddleInitialized = true;
  })().catch((err) => {
    paddleInitPromise = null;
    throw err;
  });

  return paddleInitPromise;
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnvironment();
  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId, environment },
  });
  if (error || !data?.paddleId) {
    throw new Error(`Failed to resolve price: ${priceId}`);
  }
  return data.paddleId as string;
}
