export interface AuthIntent {
  path: string;
  action?: "star" | "share" | "report";
  designId?: string;
  createdAt: number;
}
const KEY = "css-pro-auth-intent";
export function rememberIntent(
  action?: AuthIntent["action"],
  designId?: string,
) {
  sessionStorage.setItem(
    KEY,
    JSON.stringify({
      path: location.pathname + location.search,
      action,
      designId,
      createdAt: Date.now(),
    }),
  );
}
export function consumeIntent(): AuthIntent | null {
  const raw = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  try {
    const i = JSON.parse(raw || "null");
    if (!i || Date.now() - i.createdAt > 30 * 60 * 1000) return null;
    const url = new URL(i.path, location.origin);
    if (url.origin !== location.origin || url.pathname !== location.pathname)
      return null;
    if (i.action && !["star", "share", "report"].includes(i.action))
      return null;
    return i;
  } catch {
    return null;
  }
}
