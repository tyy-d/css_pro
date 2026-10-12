import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error(
    "Set private SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.",
  );
const client = createClient(url, key, { auth: { persistSession: false } });
const referenced = new Set();
for (let offset = 0; ; offset += 500) {
  const { data, error } = await client
    .from("designs")
    .select("assets")
    .range(offset, offset + 499);
  if (error) throw error;
  for (const d of data)
    for (const a of d.assets) if (a.path) referenced.add(a.path);
  if (data.length < 500) break;
}
for (let offset = 0; ; offset += 500) {
  const { data, error } = await client
    .from("design_drafts")
    .select("content")
    .range(offset, offset + 499);
  if (error) throw error;
  for (const draft of data)
    for (const asset of draft.content.assets || [])
      if (asset.path) referenced.add(asset.path);
  if (data.length < 500) break;
}
async function list(prefix) {
  const all = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.storage
      .from("design-assets")
      .list(prefix, { limit: 500, offset });
    if (error) throw error;
    all.push(...data);
    if (data.length < 500) break;
  }
  return all;
}
const orphaned = [];
const cutoff = Date.now() - 24 * 60 * 60 * 1000;
for (const folder of await list("")) {
  if (folder.id) continue;
  for (const object of await list(folder.name)) {
    const path = `${folder.name}/${object.name}`;
    if (
      object.id &&
      !referenced.has(path) &&
      new Date(object.created_at).getTime() < cutoff
    )
      orphaned.push(path);
  }
}
console.log(`${orphaned.length} unreferenced objects older than 24 hours.`);
for (const path of orphaned) console.log(path);
if (process.argv.includes("--apply")) {
  for (let i = 0; i < orphaned.length; i += 100) {
    const { error } = await client.storage
      .from("design-assets")
      .remove(orphaned.slice(i, i + 100));
    if (error) throw error;
  }
  console.log("Cleanup complete.");
} else
  console.log("Dry run only. Review paths, then pass --apply to remove them.");
