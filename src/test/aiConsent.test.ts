import { describe, it, expect, beforeEach } from "vitest";
import {
  AI_CONSENT_VERSION,
  readLocalAiConsent,
  resolveAiConsent,
  writeLocalAiConsent,
} from "@/lib/aiConsent";

describe("AI consent (Apple 5.1.1(i))", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to unknown (not granted) when nothing is stored", () => {
    expect(resolveAiConsent(readLocalAiConsent())).toBe("unknown");
    expect(resolveAiConsent(null)).toBe("unknown");
  });

  it("grants only when the record matches the current disclosure version", () => {
    expect(resolveAiConsent({ granted: true, version: AI_CONSENT_VERSION, at: 1 })).toBe("granted");
    expect(resolveAiConsent({ granted: true, version: "old-version", at: 1 })).toBe("unknown");
  });

  it("records an explicit decline as declined, not unknown", () => {
    expect(resolveAiConsent({ granted: false, version: AI_CONSENT_VERSION, at: 1 })).toBe("declined");
  });

  it("persists grant and decline to local storage", () => {
    writeLocalAiConsent(true);
    expect(resolveAiConsent(readLocalAiConsent())).toBe("granted");
    writeLocalAiConsent(false);
    expect(resolveAiConsent(readLocalAiConsent())).toBe("declined");
  });

  it("ignores malformed stored values (fail closed)", () => {
    localStorage.setItem("evora.aiConsent.v1", JSON.stringify({ granted: "yes" }));
    expect(resolveAiConsent(readLocalAiConsent())).toBe("unknown");
    localStorage.setItem("evora.aiConsent.v1", "not json");
    expect(resolveAiConsent(readLocalAiConsent())).toBe("unknown");
  });
});
