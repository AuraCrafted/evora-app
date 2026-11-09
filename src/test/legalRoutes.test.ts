import { describe, expect, it } from "vitest";
import { PUBLIC_DOC_ROUTES, isPublicDocRoute } from "@/lib/legalRoutes";

describe("isPublicDocRoute", () => {
  it("keeps the four policy/help pages readable by anyone", () => {
    expect(PUBLIC_DOC_ROUTES).toEqual(["/privacy", "/terms", "/refunds", "/feedback"]);
  });

  it("treats every document page as public", () => {
    for (const route of PUBLIC_DOC_ROUTES) {
      expect(isPublicDocRoute(route)).toBe(true);
    }
  });

  it("treats a child of a document page as public", () => {
    expect(isPublicDocRoute("/privacy/sections")).toBe(true);
  });

  it("does not treat app screens as public", () => {
    for (const path of ["/", "/roll", "/plans", "/coach", "/journeys", "/settings", "/onboarding"]) {
      expect(isPublicDocRoute(path)).toBe(false);
    }
  });

  it("does not match a look-alike prefix", () => {
    expect(isPublicDocRoute("/privacyish")).toBe(false);
    expect(isPublicDocRoute("/terms-and-conditions")).toBe(false);
  });
});
