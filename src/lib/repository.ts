import { appUrl } from "./urls";
import { createClient } from "@supabase/supabase-js";
import type { Asset, Design, Report, Viewer } from "./types";
import { SEEDS } from "./seeds";
const env = (import.meta as unknown as { env: Record<string, string> }).env;
export const supabase =
  env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY
    ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
    : null;
export const demo = !supabase;
const KEY = "css-pro-demo-v1";
interface Local {
  designs: Design[];
  stars: string[];
  viewer: Viewer | null;
  reports: Report[];
}
function read(): Local {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v) return v;
  } catch {
    /* recover corrupt local state */
  }
  return { designs: [], stars: [], viewer: null, reports: [] };
}
function write(v: Local) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    throw new Error(
      "Your browser storage is full. Remove some local uploads or connect Supabase to continue.",
    );
  }
}
function check(error: unknown) {
  if (error) throw error;
}
export async function getViewer(): Promise<Viewer | null> {
  if (!supabase) return read().viewer;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id,display_name,is_admin")
    .eq("id", user.id)
    .single();
  check(error);
  return { id: user.id, name: data!.display_name, admin: data!.is_admin };
}
export async function signIn(provider: "github" | "google") {
  if (!supabase) {
    const s = read();
    s.viewer = { id: "local-viewer", name: "You", admin: true };
    write(s);
    return;
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: appUrl() },
  });
  check(error);
}
export async function signOut() {
  if (!supabase) {
    const s = read();
    s.viewer = null;
    write(s);
    return;
  }
  const { error } = await supabase.auth.signOut();
  check(error);
}
const assetCache = new Map<string, string>();
async function hydrate(d: Design): Promise<Design> {
  if (!supabase) return d;
  const assets = await Promise.all(
    d.assets.map(async (a) => {
      if (!a.path) return a;
      const cached = assetCache.get(a.path);
      if (cached) return { ...a, url: cached };
      const { data, error } = await supabase!.storage
        .from("design-assets")
        .download(a.path);
      check(error);
      const url = URL.createObjectURL(data!);
      assetCache.set(a.path, url);
      return { ...a, url };
    }),
  );
  return { ...d, assets };
}
export async function listDesigns(): Promise<Design[]> {
  if (!supabase) {
    const s = read();
    return [
      ...s.designs,
      ...SEEDS.filter((d) => !s.designs.some((x) => x.id === d.id)),
    ].map((d) => ({ ...d, stars: d.stars + (s.stars.includes(d.id) ? 1 : 0) }));
  }
  const all: Design[] = [];
  for (let offset = 0; ; offset += 250) {
    const { data, error } = await supabase
      .from("designs_public")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 249);
    check(error);
    all.push(...(data as Design[]));
    if (data!.length < 250) break;
  }
  const activePaths = new Set(all.flatMap((d) => d.assets.map((a) => a.path)));
  for (const [path, url] of assetCache)
    if (!activePaths.has(path)) {
      URL.revokeObjectURL(url);
      assetCache.delete(path);
    }
  return Promise.all(all.map(hydrate));
}
export async function getStars(): Promise<string[]> {
  if (!supabase) return read().stars;
  const v = await getViewer();
  if (!v) return [];
  const { data, error } = await supabase
    .from("stars")
    .select("design_id")
    .eq("user_id", v.id);
  check(error);
  return data!.map((s) => s.design_id);
}
export async function toggleStar(id: string, active: boolean) {
  if (!supabase) {
    const s = read();
    if (!s.viewer) throw new Error("Please sign in.");
    s.stars = active
      ? [...new Set([...s.stars, id])]
      : s.stars.filter((x) => x !== id);
    write(s);
    return;
  }
  const { error } = await supabase.rpc("set_star", { target: id, active });
  check(error);
}
export async function saveDesign(d: Design) {
  if (!supabase) {
    const s = read();
    if (!s.viewer || d.owner_id !== s.viewer.id)
      throw new Error("You can only edit your own designs.");
    const old = s.designs.find((x) => x.id === d.id);
    if (old?.status === "hidden")
      throw new Error("A hidden design must be restored by a moderator.");
    s.designs = [{ ...d, stars: 0 }, ...s.designs.filter((x) => x.id !== d.id)];
    write(s);
    return;
  }
  const { data: previous, error: readError } = await supabase
    .from("designs")
    .select("assets")
    .eq("id", d.id)
    .maybeSingle();
  check(readError);
  const assets = d.assets.map(({ url, ...a }) => ({ ...a, url: "" }));
  const { error } = await supabase.rpc("save_design", {
    payload: { ...d, assets },
  });
  check(error);
  const removed =
    (previous?.assets as Asset[] | undefined)
      ?.filter((a) => a.path && !d.assets.some((n) => n.path === a.path))
      .map((a) => a.path!) || [];
  if (removed.length) {
    const { error: cleanupError } = await supabase.storage
      .from("design-assets")
      .remove(removed);
    if (cleanupError) console.warn("Asset cleanup deferred to maintenance.");
  }
}
export async function deleteDesign(id: string) {
  if (!supabase) {
    const s = read();
    if (s.designs.find((d) => d.id === id)?.owner_id !== s.viewer?.id)
      throw new Error("Not allowed.");
    s.designs = s.designs.filter((d) => d.id !== id);
    s.stars = s.stars.filter((x) => x !== id);
    write(s);
    return;
  }
  // Remove objects while the parent row still exists so storage ownership policies can authorize it.
  const { data, error: readError } = await supabase.storage
    .from("design-assets")
    .list(id);
  check(readError);
  if (data?.length) {
    const { error } = await supabase.storage
      .from("design-assets")
      .remove(data.map((a) => `${id}/${a.name}`));
    check(error);
  }
  const { error } = await supabase.from("designs").delete().eq("id", id);
  check(error);
}
export async function uploadImage(
  file: File,
  designId: string,
  kind: Asset["kind"],
): Promise<Asset> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Please use PNG, JPEG, or WebP images.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Images must be smaller than 10 MB.");
  const buffer = await file.arrayBuffer();
  const b = new Uint8Array(buffer);
  const valid =
    (file.type === "image/png" &&
      b[0] === 137 &&
      b[1] === 80 &&
      b[2] === 78 &&
      b[3] === 71) ||
    (file.type === "image/jpeg" &&
      b[0] === 255 &&
      b[1] === 216 &&
      b[2] === 255) ||
    (file.type === "image/webp" &&
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...b.slice(8, 12)) === "WEBP");
  if (!valid) throw new Error("The file contents do not match its image type.");
  const img = await createImageBitmap(file);
  if (img.width > 8000 || img.height > 8000) {
    img.close();
    throw new Error("Images may be at most 8,000 pixels per side.");
  }
  img.close();
  const id = crypto.randomUUID();
  const name = `${id.slice(0, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  if (!supabase) {
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    return { id, name, url, kind };
  }
  const body = new FormData();
  body.append("file", file);
  body.append("designId", designId);
  const { data, error } = await supabase.functions.invoke("upload-image", {
    body,
  });
  check(error);
  if (data.error) throw new Error(data.error);
  return { ...data, url: URL.createObjectURL(file), kind };
}
export async function reportDesign(id: string, reason: string) {
  if (!supabase) {
    const s = read();
    if (!s.viewer) throw new Error("Please sign in.");
    s.reports.push({
      id: crypto.randomUUID(),
      design_id: id,
      reporter_id: s.viewer.id,
      reason,
      created_at: new Date().toISOString(),
      resolved: false,
    });
    write(s);
    return;
  }
  const { error } = await supabase.rpc("report_design", {
    target: id,
    report_reason: reason,
  });
  check(error);
}
export async function listReports(): Promise<Report[]> {
  if (!supabase) return read().reports;
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("resolved", false);
  check(error);
  return data as Report[];
}
export async function moderate(id: string, action: "hide" | "restore") {
  if (!supabase) {
    const s = read();
    if (!s.viewer?.admin) throw new Error("Not allowed.");
    const existing =
      s.designs.find((d) => d.id === id) || SEEDS.find((d) => d.id === id);
    if (!existing) throw new Error("Design not found.");
    s.designs = [
      { ...existing, status: action === "hide" ? "hidden" : "published" },
      ...s.designs.filter((d) => d.id !== id),
    ];
    s.reports = s.reports.map((r) =>
      r.design_id === id ? { ...r, resolved: true } : r,
    );
    write(s);
    return;
  }
  const { error } = await supabase.rpc("moderate_design", {
    target: id,
    operation: action,
  });
  check(error);
}
