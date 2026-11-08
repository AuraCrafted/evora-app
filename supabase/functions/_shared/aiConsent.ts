// Shared AI-consent enforcement. Apple 5.1.1(i)/5.1.2(i): no personal data
// may leave for a third-party AI provider before explicit, recorded opt-in.
// Consent is stored per account in user_state under key "ai_consent":
//   { granted: boolean, version: string, at: number }
// Fail closed: any error or missing/mismatched record means no consent.

export const AI_CONSENT_VERSION = "2026-11-ai-v1";

interface ConsentValue {
  granted?: boolean;
  version?: string;
  at?: number;
}

export async function hasAiConsent(
  serviceClient: { from: (t: string) => any },
  userId: string,
): Promise<boolean> {
  try {
    const { data, error } = await serviceClient
      .from("user_state")
      .select("value")
      .eq("user_id", userId)
      .eq("key", "ai_consent")
      .maybeSingle();
    if (error || !data) return false;
    const v = data.value as ConsentValue;
    return v?.granted === true && v?.version === AI_CONSENT_VERSION;
  } catch {
    return false;
  }
}
