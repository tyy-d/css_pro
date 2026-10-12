import type { Viewer } from "./types";

export function routeAccess(
  route: string,
  viewer: Viewer | null,
  loading: boolean,
) {
  if (!["submit", "mine", "stars", "admin"].includes(route)) return "public";
  if (loading) return "loading";
  if (!viewer) return "login";
  if (route === "admin" && !viewer.admin) return "denied";
  return "allowed";
}

/** Return only to this app's query-based routes, never a supplied external URL. */
export function oauthRedirect(href: string): string {
  const url = new URL(href);
  for (const key of ["code", "error", "error_code", "error_description"])
    url.searchParams.delete(key);
  url.hash = "";
  url.search = "";
  return url.href;
}

export function consumeAuthError(): string | null {
  const url = new URL(location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  if (!url.searchParams.has("error") && !hash.has("error")) return null;
  for (const key of ["code", "error", "error_code", "error_description"])
    url.searchParams.delete(key);
  url.hash = "";
  history.replaceState({}, "", url.pathname + url.search);
  return "Sign-in could not be completed. Please try again.";
}
