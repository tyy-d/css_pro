import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
const url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_PUBLISHABLE_KEY,
  token = process.env.CSS_PRO_OWNER_JWT;
const ownerId = process.env.CSS_PRO_OWNER_ID,
  ref = process.env.CSS_PRO_TARGET_PROJECT_REF;
if (
  !url ||
  !key ||
  !token ||
  !ownerId ||
  !ref ||
  new URL(url).hostname !== `${ref}.supabase.co`
)
  throw new Error(
    "Supply the explicitly selected project URL/ref, publishable key, and verified owner ID/JWT in private environment variables.",
  );
const client = createClient(url, key, {
  global: { headers: { Authorization: `Bearer ${token}` } },
  auth: { persistSession: false, autoRefreshToken: false },
});
const {
  data: { user },
  error,
} = await client.auth.getUser(token);
if (error || user?.id !== ownerId)
  throw new Error("Owner identity does not match the supplied verified ID.");
async function ok(request) {
  const result = await request;
  if (result.error) throw result.error;
  return result.data;
}
const designs = JSON.parse(
  await readFile(
    new URL("../starter-designs/designs.json", import.meta.url),
    "utf8",
  ),
);
for (const original of designs) {
  const { screenshot, ...content } = original;
  const existing = await client.rpc("get_editor_draft", { target: content.id });
  if (!existing.error && existing.data.published) {
    console.log(`Already published: ${content.title}`);
    continue;
  }
  let draft = existing.error
    ? { ...content, base_revision: 0, draft_revision: 0 }
    : existing.data;
  let metadata = await ok(
    client.rpc("save_working_draft", {
      payload: draft,
      expected_revision: draft.draft_revision,
    }),
  );
  draft = { ...draft, ...metadata };
  if (!draft.assets.length) {
    const bytes = await readFile(
      new URL(`../starter-designs/${screenshot}`, import.meta.url),
    );
    const form = new FormData();
    form.append("designId", draft.id);
    form.append(
      "file",
      new Blob([bytes], { type: "image/jpeg" }),
      screenshot.split("/").pop(),
    );
    const response = await fetch(`${url}/functions/v1/upload-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, apikey: key },
      body: form,
    });
    const asset = await response.json();
    if (!response.ok) throw new Error(asset.error || "Upload failed");
    draft = {
      ...draft,
      assets: [{ ...asset, kind: "screenshot", bytes: bytes.length }],
    };
    metadata = await ok(
      client.rpc("save_working_draft", {
        payload: draft,
        expected_revision: draft.draft_revision,
      }),
    );
    draft = { ...draft, ...metadata };
  }
  if (process.argv.includes("--publish")) {
    await ok(
      client.rpc("publish_working_draft", {
        target: draft.id,
        expected_revision: draft.draft_revision,
      }),
    );
    console.log(`Published: ${draft.title}`);
  } else console.log(`Private draft prepared: ${draft.title}`);
}
