export type AppMode = "demo" | "supabase";
export function readConfig(env: Record<string, string | undefined>) {
  const mode = env.VITE_DATA_MODE || "demo";
  const url = env.VITE_SUPABASE_URL || "";
  const key =
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || "";
  let error = "";
  if (!["demo", "supabase"].includes(mode))
    error = "Unknown application mode. Set VITE_DATA_MODE to demo or supabase.";
  if (mode === "supabase") {
    if (!url || !key)
      error =
        "Community service configuration is incomplete. The site administrator must set the Supabase URL and publishable key and rebuild.";
    else {
      try {
        const u = new URL(url);
        if (
          u.protocol !== "https:" &&
          !(
            u.protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(u.hostname)
          )
        )
          throw new Error();
      } catch {
        error = "The configured community service URL is invalid.";
      }
    }
    if (key.startsWith("sb_secret_"))
      error =
        "A server-only key was configured in the browser. Remove it and rotate the exposed credential before deployment.";
  }
  return { mode: mode as AppMode, url, key, error };
}
export const config = readConfig(
  (import.meta as unknown as { env: Record<string, string> }).env,
);
