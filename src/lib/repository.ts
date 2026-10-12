import { createClient } from "@supabase/supabase-js";
import { config } from "./config";
import { oauthRedirect } from "./auth";
import type {
  Asset,
  Collection,
  Design,
  DesignDetail,
  DesignPage,
  DesignSummary,
  EditorDraft,
  Report,
  Viewer,
} from "./types";
import { SEEDS } from "./seeds";
import { searchDesigns, type Filters } from "./search";
import { validateDesign } from "./preview";
export const supabase =
  config.mode === "supabase" && !config.error
    ? createClient(config.url, config.key, {
        auth: { flowType: "pkce", detectSessionInUrl: true },
      })
    : null;
export const demo = config.mode === "demo";
export const configurationError = config.error;
export function message(e: unknown): string {
  return e && typeof e === "object" && "message" in e
    ? String(e.message)
    : typeof e === "string"
      ? e
      : "Something went wrong. Please try again.";
}
function check(error: unknown) {
  if (error) throw new Error(message(error));
}
function ready() {
  if (configurationError) throw new Error(configurationError);
  if (!demo && !supabase) throw new Error("Community service unavailable.");
}
const KEY = "css-pro-demo-v2";
interface Local {
  designs: Design[];
  drafts: Record<string, EditorDraft>;
  stars: string[];
  viewer: Viewer | null;
  reports: Report[];
}
function read(): Local {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s) return s;
  } catch {}
  return { designs: [], drafts: {}, stars: [], viewer: null, reports: [] };
}
function write(s: Local) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    throw new Error(
      "Browser storage is full. Remove unused uploads and retry.",
    );
  }
}
function active(s: Local) {
  if (!s.viewer) throw new Error("Please sign in to continue.");
  if (s.viewer.suspended)
    throw new Error("Your account is suspended. Contact the administrator.");
  return s.viewer;
}
function localDesigns() {
  const s = read();
  return [
    ...s.designs,
    ...SEEDS.filter((d) => !s.designs.some((x) => x.id === d.id)),
  ].map((d) => ({ ...d, stars: s.stars.includes(d.id) ? 1 : 0 }));
}
let assetCache = new Map<string, string>();
let identity: string | null = null;
let cacheEpoch = 0;
export function clearPrivateState() {
  cacheEpoch++;
  for (const url of assetCache.values()) URL.revokeObjectURL(url);
  assetCache = new Map();
}
export async function getViewer(): Promise<Viewer | null> {
  ready();
  if (demo) return read().viewer;
  const {
    data: { user },
    error,
  } = await supabase!.auth.getUser();
  if (error && !error.message.includes("Auth session missing")) check(error);
  if (!user) {
    if (identity) clearPrivateState();
    identity = null;
    return null;
  }
  if (identity !== user.id) {
    clearPrivateState();
    identity = user.id;
  }
  const { data, error: e } = await supabase!.rpc("get_viewer");
  check(e);
  if (!data)
    throw new Error("Your profile is not ready. Please sign out and retry.");
  return data;
}
export async function signIn(provider: "google" | "github") {
  ready();
  if (demo) {
    const s = read();
    s.viewer = { id: "local-viewer", name: "You", admin: true };
    write(s);
    return;
  }
  const { error } = await supabase!.auth.signInWithOAuth({
    provider,
    options: { redirectTo: oauthRedirect(location.href) },
  });
  check(error);
}
export async function signOut() {
  ready();
  if (demo) {
    const s = read();
    s.viewer = null;
    write(s);
  } else {
    const { error } = await supabase!.auth.signOut();
    check(error);
  }
  identity = null;
  clearPrivateState();
}
export async function updateProfile(name: string) {
  if (!name.trim() || name.trim().length > 80)
    throw new Error("Use a name of 1–80 characters.");
  ready();
  if (demo) {
    const s = read();
    const v = active(s);
    s.viewer = { ...v, name: name.trim() };
    s.designs = s.designs.map((d) =>
      d.owner_id === v.id ? { ...d, creator: name.trim() } : d,
    );
    for (const d of Object.values(s.drafts)) d.creator = name.trim();
    write(s);
  } else {
    const { error } = await supabase!.rpc("update_display_name", {
      display_name: name.trim(),
    });
    check(error);
  }
}
async function hydrateAsset(a: Asset): Promise<Asset> {
  if (!a.path || demo) return a;
  const epoch = cacheEpoch;
  try {
    const cached = assetCache.get(a.path);
    if (cached) return { ...a, url: cached };
    const { data, error } = await supabase!.storage
      .from("design-assets")
      .download(a.path);
    check(error);
    if (epoch !== cacheEpoch)
      throw new Error("Session changed. Reload this design.");
    const url = URL.createObjectURL(data!);
    assetCache.set(a.path, url);
    return { ...a, url };
  } catch (e) {
    return { ...a, url: "", error: message(e) };
  }
}
export async function hydrateAssets<T extends { assets: Asset[] }>(
  d: T,
): Promise<T> {
  return { ...d, assets: await Promise.all(d.assets.map(hydrateAsset)) };
}
const summary = (d: Design): DesignSummary => ({
  id: d.id,
  owner_id: d.owner_id,
  creator: d.creator,
  title: d.title,
  description: d.description,
  type: d.type,
  scope: d.scope,
  tags: d.tags,
  status: d.status,
  created_at: d.created_at,
  updated_at: d.updated_at,
  stars: d.stars,
  sample: d.sample,
  revision: d.revision,
  assets: d.assets.filter((a) => a.kind === "screenshot").slice(0, 1),
});
export async function browseDesigns(
  f: Filters,
  collection: Collection = "explore",
  creatorId?: string | null,
): Promise<DesignPage> {
  ready();
  if (demo) {
    const s = read();
    let rows = localDesigns();
    if (collection === "mine") {
      rows = rows
        .filter((d) => d.owner_id === s.viewer?.id)
        .map((d) =>
          s.drafts[d.id]
            ? { ...s.drafts[d.id], status: d.status, stars: d.stars }
            : d,
        );
    } else if (collection === "hidden") {
      rows = s.viewer?.admin ? rows.filter((d) => d.status === "hidden") : [];
    } else
      rows = rows.filter(
        (d) =>
          d.status === "published" &&
          (collection !== "stars" || (!!s.viewer && s.stars.includes(d.id))),
      );
    if (creatorId) rows = rows.filter((d) => d.owner_id === creatorId);
    const filtered = searchDesigns(rows, f);
    return {
      items: filtered.slice((f.page - 1) * 9, f.page * 9).map(summary),
      total: filtered.length,
    };
  }
  const { data, error } = await supabase!.rpc("browse_designs", {
    query_text: f.q.trim(),
    selected_tags: f.tags,
    content_type: f.type,
    design_scope: f.scope,
    sort_order: f.sort,
    page_number: f.page,
    collection,
    creator_id: creatorId || null,
  });
  check(error);
  return {
    items: await Promise.all(
      (data.items as DesignSummary[]).map(hydrateAssets),
    ),
    total: data.total,
  };
}
export async function getDesign(id: string): Promise<DesignDetail | null> {
  ready();
  if (demo) {
    const s = read();
    return (
      localDesigns().find(
        (d) =>
          d.id === id &&
          (d.status === "published" ||
            d.owner_id === s.viewer?.id ||
            s.viewer?.admin),
      ) || null
    );
  }
  const { data, error } = await supabase!
    .from("designs_public")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  check(error);
  return data ? hydrateAssets(data as Design) : null;
}
export async function getEditorDraft(id: string): Promise<EditorDraft> {
  ready();
  if (demo) {
    const s = read();
    const v = active(s);
    const parent = localDesigns().find((d) => d.id === id);
    if (!parent || parent.owner_id !== v.id)
      throw new Error("Design unavailable.");
    return {
      ...(s.drafts[id] || parent),
      draft_revision: s.drafts[id]?.draft_revision || 0,
      base_revision: parent.revision || 0,
      published: parent.status === "published",
      status: parent.status,
    } as EditorDraft;
  }
  const { data, error } = await supabase!.rpc("get_editor_draft", {
    target: id,
  });
  check(error);
  return hydrateAssets(data as EditorDraft);
}
export async function saveDraft(d: EditorDraft): Promise<EditorDraft> {
  ready();
  const value = { ...d, title: d.title.trim() || "Untitled design" };
  if (demo) {
    const s = read();
    const v = active(s);
    const parent = s.designs.find((x) => x.id === d.id);
    if (d.owner_id !== v.id || (parent && parent.owner_id !== v.id))
      throw new Error("You can only edit your own designs.");
    if (parent?.status === "hidden")
      throw new Error("A moderator must restore this design.");
    if (
      (s.drafts[d.id]?.draft_revision || 0) !== d.draft_revision ||
      (parent?.revision || 0) !== d.base_revision
    )
      throw new Error(
        "This draft changed in another session. Reload before saving.",
      );
    const next = {
      ...value,
      draft_revision: d.draft_revision + 1,
      updated_at: new Date().toISOString(),
    };
    s.drafts[d.id] = next;
    if (!parent) s.designs.push({ ...value, status: "draft", revision: 0 });
    write(s);
    return next;
  }
  const assets = d.assets.map(({ url, error, ...a }) => ({ ...a, url: "" }));
  const { data, error } = await supabase!.rpc("save_working_draft", {
    payload: { ...value, assets },
    expected_revision: d.draft_revision,
  });
  check(error);
  return { ...value, ...data };
}
export async function publishDraft(d: EditorDraft) {
  ready();
  const errors = validateDesign(d);
  if (!d.license_accepted)
    errors.push("Accept the MIT license and asset rights.");
  if (errors.length) throw new Error(errors.join(" "));
  if (demo) {
    const s = read();
    const v = active(s);
    const draft = s.drafts[d.id];
    const parent = s.designs.find((x) => x.id === d.id);
    if (parent?.owner_id !== v.id)
      throw new Error("You can only publish your own designs.");
    if (parent.status === "hidden")
      throw new Error("A moderator must restore this design.");
    if (
      !draft ||
      draft.draft_revision !== d.draft_revision ||
      draft.base_revision !== (parent.revision || 0)
    )
      throw new Error("This design changed. Reload before publishing.");
    const nextRevision = (parent.revision || 0) + 1;
    s.designs = s.designs.map((x) =>
      x.id === d.id
        ? { ...draft, status: "published", revision: nextRevision }
        : x,
    );
    s.drafts[d.id] = {
      ...draft,
      draft_revision: draft.draft_revision + 1,
      base_revision: nextRevision,
      published: true,
    };
    write(s);
    return;
  }
  const { error } = await supabase!.rpc("publish_working_draft", {
    target: d.id,
    expected_revision: d.draft_revision,
  });
  check(error);
}
export async function unpublishDesign(id: string) {
  ready();
  if (demo) {
    const s = read();
    const v = active(s);
    const d = s.designs.find((x) => x.id === id);
    if (!d || d.owner_id !== v.id || d.status === "hidden")
      throw new Error("Design unavailable.");
    d.status = "draft";
    d.revision = (d.revision || 0) + 1;
    if (s.drafts[id])
      s.drafts[id] = {
        ...s.drafts[id],
        base_revision: d.revision,
        draft_revision: s.drafts[id].draft_revision + 1,
        published: false,
      };
    write(s);
    return;
  }
  const { error } = await supabase!.rpc("unpublish_design", { target: id });
  check(error);
  clearPrivateState();
}
export async function deleteDesign(id: string) {
  ready();
  if (demo) {
    const s = read();
    const v = active(s);
    if (s.designs.find((x) => x.id === id)?.owner_id !== v.id)
      throw new Error("Not allowed.");
    s.designs = s.designs.filter((x) => x.id !== id);
    delete s.drafts[id];
    s.stars = s.stars.filter((x) => x !== id);
    write(s);
    return;
  }
  await unpublishDesign(id);
  const { data, error: readError } = await supabase!.storage
    .from("design-assets")
    .list(id, { limit: 1000 });
  check(readError);
  if (data?.length) {
    const { error } = await supabase!.storage
      .from("design-assets")
      .remove(data.map((a) => `${id}/${a.name}`));
    check(error);
  }
  const { error } = await supabase!.from("designs").delete().eq("id", id);
  check(error);
  clearPrivateState();
}
export async function getStars(): Promise<string[]> {
  ready();
  if (demo) return read().viewer ? read().stars : [];
  const v = await getViewer();
  if (!v) return [];
  const { data, error } = await supabase!
    .from("stars")
    .select("design_id")
    .eq("user_id", v.id);
  check(error);
  return data!.map((s) => s.design_id);
}
export async function toggleStar(id: string, value: boolean) {
  ready();
  if (demo) {
    const s = read();
    active(s);
    if (!localDesigns().some((d) => d.id === id && d.status === "published"))
      throw new Error("Design unavailable.");
    s.stars = value
      ? [...new Set([...s.stars, id])]
      : s.stars.filter((x) => x !== id);
    write(s);
    return;
  }
  const { error } = await supabase!.rpc("set_star", {
    target: id,
    active: value,
  });
  check(error);
}
export async function reportDesign(id: string, reason: string) {
  ready();
  if (demo) {
    const s = read();
    const v = active(s);
    s.reports.push({
      id: crypto.randomUUID(),
      design_id: id,
      reporter_id: v.id,
      reason,
      created_at: new Date().toISOString(),
      resolved: false,
    });
    write(s);
    return;
  }
  const { error } = await supabase!.rpc("report_design", {
    target: id,
    report_reason: reason,
  });
  check(error);
}
export async function listReports(): Promise<Report[]> {
  ready();
  if (demo)
    return read().viewer?.admin
      ? read().reports.filter((r) => !r.resolved)
      : [];
  const { data, error } = await supabase!
    .from("reports")
    .select("*")
    .eq("resolved", false);
  check(error);
  return data as Report[];
}
export async function moderate(
  id: string,
  action: "hide" | "restore" | "resolve",
) {
  ready();
  if (demo) {
    const s = read();
    if (!s.viewer?.admin) throw new Error("Administrator access required.");
    const d = localDesigns().find((x) => x.id === id);
    if (!d) throw new Error("Design unavailable.");
    if (action !== "resolve")
      s.designs = [
        {
          ...d,
          status: action === "hide" ? "hidden" : "published",
          revision: (d.revision || 0) + 1,
        },
        ...s.designs.filter((x) => x.id !== id),
      ];
    s.reports = s.reports.map((r) =>
      r.design_id === id ? { ...r, resolved: true } : r,
    );
    write(s);
    return;
  }
  const { error } = await supabase!.rpc("moderate_design", {
    target: id,
    operation: action,
  });
  check(error);
  clearPrivateState();
}
export async function uploadImage(
  file: File,
  designId: string,
  kind: Asset["kind"],
  progress?: (n: number) => void,
): Promise<Asset> {
  ready();
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("Use PNG, JPEG, or WebP under 10 MB.");
  const image = await createImageBitmap(file);
  const valid = image.width <= 8000 && image.height <= 8000;
  image.close();
  if (!valid) throw new Error("Images may be at most 8,000 pixels per side.");
  if (demo) {
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error("Could not read image."));
      r.readAsDataURL(file);
    });
    progress?.(100);
    return {
      id: crypto.randomUUID(),
      name: `${crypto.randomUUID().slice(0, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      url,
      kind,
      bytes: file.size,
    };
  }
  const {
    data: { session },
  } = await supabase!.auth.getSession();
  if (!session) throw new Error("Your session expired. Sign in and retry.");
  const body = new FormData();
  body.append("file", file);
  body.append("designId", designId);
  const data = await new Promise<{ id: string; name: string; path: string }>(
    (resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${config.url}/functions/v1/upload-image`);
      xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
      xhr.setRequestHeader("apikey", config.key);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          progress?.(Math.round((e.loaded / e.total) * 100));
      };
      xhr.timeout = 60000;
      xhr.onerror = () =>
        reject(new Error("Upload interrupted. Retry this file."));
      xhr.ontimeout = () =>
        reject(new Error("Upload timed out. Retry this file."));
      xhr.onload = () => {
        try {
          const result = JSON.parse(xhr.responseText);
          if (xhr.status >= 400)
            throw new Error(result.error || "Upload failed.");
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };
      xhr.send(body);
    },
  );
  const objectUrl = URL.createObjectURL(file);
  assetCache.set(data.path, objectUrl);
  return { ...data, url: objectUrl, kind, bytes: file.size };
}
// Compatibility for existing tests and export consumers; application flows use explicit draft/publication methods.
export async function listDesigns() {
  if (!demo) throw new Error("Use paginated browsing.");
  return localDesigns();
}
export async function saveDesign(d: Design) {
  const existing = demo ? read().drafts[d.id] : undefined;
  const draft = await saveDraft({
    ...d,
    draft_revision: existing?.draft_revision || 0,
    base_revision: existing?.base_revision || 0,
    published: d.status === "published",
  });
  if (d.status === "published") await publishDraft(draft);
}
