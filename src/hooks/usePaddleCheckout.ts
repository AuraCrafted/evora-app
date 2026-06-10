import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { useAuth } from "@/hooks/useAuth";

export function usePaddleCheckout() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const openCheckout = async (priceId: string) => {
    if (!user) throw new Error("Not signed in");
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(priceId);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: { email: user.email! },
        customData: { userId: user.id },
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}/plans?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
