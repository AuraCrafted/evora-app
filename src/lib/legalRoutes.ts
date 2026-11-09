/**
 * Pages that must be readable by anyone who opens a link to them — from a
 * website, an email, or App Review — with no sign-in prompt and no onboarding.
 */
export const PUBLIC_DOC_ROUTES = ["/privacy", "/terms", "/refunds", "/feedback"] as const;

/** True when a pathname is one of the public document pages (or a child of one). */
export function isPublicDocRoute(pathname: string): boolean {
  return PUBLIC_DOC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
