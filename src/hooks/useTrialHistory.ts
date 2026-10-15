import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Whether this Evora account has ever redeemed an Apple free trial, from the
 * server-written trial_redemptions record. null = unknown (loading, signed out
 * or error), which callers must treat as "don't promise a trial".
 */
export function useTrialHistory() {
  const { user } = useAuth();
  const [used, setUsed] = useState<boolean | null>(null);

  const refetch = useCallback(async () => {
    if (!user) return setUsed(null);
    const { data, error } = await supabase
      .from("trial_redemptions")
      .select("apple_original_transaction_id")
      .eq("user_id", user.id)
      .limit(1);
    setUsed(error ? null : (data?.length ?? 0) > 0);
  }, [user]);

  useEffect(() => {
    refetch();
    const on = () => refetch();
    window.addEventListener("evora:subscription-changed", on);
    return () => window.removeEventListener("evora:subscription-changed", on);
  }, [refetch]);

  return used;
}
