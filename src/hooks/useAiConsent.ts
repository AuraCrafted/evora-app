import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import {
  AI_CONSENT_KEY,
  AI_CONSENT_VERSION,
  readLocalAiConsent,
  resolveAiConsent,
  writeLocalAiConsent,
  type AiConsentRecord,
  type AiConsentStatus,
} from "@/lib/aiConsent";

/**
 * AI consent gate. For signed-in users the server copy in user_state is
 * authoritative (edge functions enforce it); the local cache keeps the UI
 * instant and covers guests. Defaults to "unknown" = not granted.
 */
export function useAiConsent() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<AiConsentStatus>(() => resolveAiConsent(readLocalAiConsent()));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus(resolveAiConsent(readLocalAiConsent()));
      return;
    }
    let cancelled = false;
    supabase
      .from("user_state")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", AI_CONSENT_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const server = data?.value as AiConsentRecord | undefined;
        if (server && typeof server.granted === "boolean" && server.version === AI_CONSENT_VERSION) {
          writeLocalAiConsent(server.granted);
          setStatus(resolveAiConsent(server));
        } else if (server) {
          // Outdated disclosure version: treat as not yet asked.
          setStatus("unknown");
        } else {
          // No server record: push any local choice up, else unknown.
          const local = readLocalAiConsent();
          if (local) {
            void supabase.from("user_state").upsert(
              { user_id: user.id, key: AI_CONSENT_KEY, value: local as unknown as Json },
              { onConflict: "user_id,key" },
            );
            setStatus(resolveAiConsent(local));
          } else {
            setStatus("unknown");
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const setConsent = useCallback(
    (granted: boolean) => {
      const rec = writeLocalAiConsent(granted);
      setStatus(resolveAiConsent(rec));
      if (user) {
        void supabase.from("user_state").upsert(
          { user_id: user.id, key: AI_CONSENT_KEY, value: rec as unknown as Json },
          { onConflict: "user_id,key" },
        );
      }
    },
    [user],
  );

  const grant = useCallback(() => setConsent(true), [setConsent]);
  const decline = useCallback(() => setConsent(false), [setConsent]);

  return { status, granted: status === "granted", grant, decline };
}
