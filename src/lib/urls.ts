/** Keep links inside the app when hosted on a GitHub Pages project path. */
export function appUrl(): string {
  return new URL(location.pathname, location.origin).href;
}
export function designUrl(id: string): string {
  const url = new URL(appUrl());
  url.searchParams.set("design", id);
  return url.href;
}
