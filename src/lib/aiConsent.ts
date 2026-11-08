// AI consent state (Apple 5.1.1(i)/5.1.2(i)).
// Server copy lives in user_state key "ai_consent" and is authoritative for
// signed-in users; this local cache mirrors it so the UI can gate instantly
// and so the choice survives offline. Version bumps re-ask everyone.

export const AI_CONSENT_VERSION = "2026-11-ai-v1";
export const AI_CONSENT_KEY = "ai_consent";
const LOCAL_KEY = "evora.aiConsent.v1";

export interface AiConsentRecord {
  granted: boolean;
  version: string;
  at: number;
}

export type AiConsentStatus = "granted" | "declined" | "unknown";

export function readLocalAiConsent(): AiConsentRecord | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as AiConsentRecord;
    if (typeof v?.granted !== "boolean" || typeof v?.version !== "string") return null;
    return v;
  } catch {
    return null;
  }
}

export function writeLocalAiConsent(granted: boolean): AiConsentRecord {
  const rec: AiConsentRecord = { granted, version: AI_CONSENT_VERSION, at: Date.now() };
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(rec));
  } catch {
    // ignore
  }
  return rec;
}

/** Resolve a stored record (local or server-shaped) into a status. */
export function resolveAiConsent(rec: AiConsentRecord | null | undefined): AiConsentStatus {
  if (!rec || rec.version !== AI_CONSENT_VERSION) return "unknown";
  return rec.granted ? "granted" : "declined";
}
