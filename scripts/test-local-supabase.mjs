import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
const status = JSON.parse(
  execFileSync("npx", ["supabase", "status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
const url = status.API_URL;
if (new URL(url).hostname !== "127.0.0.1")
  throw new Error("Integration tests require disposable local Supabase.");
const admin = createClient(url, status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anon = createClient(url, status.ANON_KEY, {
  auth: { persistSession: false },
});
const users = [];
async function ok(request) {
  const result = await request;
  if (result.error) throw result.error;
  return result.data;
}
async function account() {
  const email = `integration-${crypto.randomUUID()}@example.test`,
    password = crypto.randomUUID();
  const { user } = await ok(
    admin.auth.admin.createUser({ email, password, email_confirm: true }),
  );
  users.push(user.id);
  const client = createClient(url, status.ANON_KEY, {
    auth: { persistSession: false },
  });
  await ok(client.auth.signInWithPassword({ email, password }));
  return client;
}
const id = crypto.randomUUID();
try {
  const owner = await account(),
    other = await account();
  const draft = {
    id,
    title: "Integration sample",
    description: "Original test",
    type: "code",
    scope: "component",
    tags: ["Minimal"],
    html: "<h1>Hello</h1>",
    css: "h1{color:red}",
    prompt: "",
    instructions: "Copy the code",
    attribution: "Original",
    assets: [],
    license_accepted: true,
    base_revision: 0,
  };
  await ok(
    owner.rpc("save_working_draft", { payload: draft, expected_revision: 0 }),
  );
  assert((await other.rpc("get_editor_draft", { target: id })).error);
  assert.equal(
    (await ok(anon.from("designs_public").select("*").eq("id", id))).length,
    0,
  );
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0WQAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  async function upload(client, name, bytes = png, type = "image/png") {
    const {
      data: { session },
    } = await client.auth.getSession();
    const form = new FormData();
    form.append("designId", id);
    form.append("file", new Blob([bytes], { type }), name);
    const response = await fetch(`${url}/functions/v1/upload-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: status.ANON_KEY,
      },
      body: form,
    });
    return { status: response.status, body: await response.json() };
  }
  assert.equal((await upload(other, "forbidden.png")).status, 400);
  assert.equal(
    (await upload(owner, "fake.png", new Uint8Array([1, 2, 3]))).status,
    400,
  );
  const cover = await upload(owner, "cover.png");
  assert.equal(cover.status, 200, JSON.stringify(cover.body));
  const privateImage = await upload(owner, "private.png");
  assert.equal(privateImage.status, 200);
  const assets = [{ ...cover.body, kind: "screenshot" }];
  await ok(
    owner.rpc("save_working_draft", {
      payload: { ...draft, assets },
      expected_revision: 1,
    }),
  );
  await ok(
    owner.rpc("publish_working_draft", { target: id, expected_revision: 2 }),
  );
  assert.equal((await ok(anon.rpc("browse_designs", {}))).total, 1);
  await ok(anon.storage.from("design-assets").download(cover.body.path));
  assert(
    (await anon.storage.from("design-assets").download(privateImage.body.path))
      .error,
  );
  await ok(
    owner.rpc("save_working_draft", {
      payload: {
        ...draft,
        title: "Private revision",
        base_revision: 1,
        assets: [{ ...privateImage.body, kind: "screenshot" }],
      },
      expected_revision: 3,
    }),
  );
  assert.equal(
    (
      await ok(
        anon.from("designs_public").select("title").eq("id", id).single(),
      )
    ).title,
    draft.title,
  );
  assert(
    (
      await owner.rpc("publish_working_draft", {
        target: id,
        expected_revision: 3,
      })
    ).error,
  );
  await Promise.all(
    Array.from({ length: 5 }, () =>
      ok(other.rpc("set_star", { target: id, active: true })),
    ),
  );
  assert.equal(
    (
      await ok(
        anon.from("designs_public").select("stars").eq("id", id).single(),
      )
    ).stars,
    1,
  );
  assert(
    (await other.from("profiles").update({ is_admin: true }).eq("id", users[1]))
      .error,
  );
  const publishResults = await Promise.all([
    owner.rpc("publish_working_draft", { target: id, expected_revision: 4 }),
    owner.rpc("publish_working_draft", { target: id, expected_revision: 4 }),
  ]);
  assert.equal(publishResults.filter((r) => !r.error).length, 1);
  const moderator = await account();
  await ok(
    admin.from("profiles").update({ is_admin: true }).eq("id", users[2]),
  );
  await ok(
    other.rpc("report_design", {
      target: id,
      report_reason: "Integration moderation report",
    }),
  );
  assert(
    (await other.rpc("moderate_design", { target: id, operation: "hide" }))
      .error,
  );
  await ok(moderator.rpc("moderate_design", { target: id, operation: "hide" }));
  assert.equal(
    (await ok(anon.from("designs_public").select("id").eq("id", id))).length,
    0,
  );
  assert(
    (await anon.storage.from("design-assets").download(privateImage.body.path))
      .error,
  );
  await ok(
    moderator.rpc("moderate_design", { target: id, operation: "restore" }),
  );
  assert.equal(
    (await ok(anon.from("designs_public").select("id").eq("id", id))).length,
    1,
  );
  await ok(
    owner.rpc("update_display_name", { display_name: "Integration owner" }),
  );
  assert.equal((await ok(owner.rpc("get_viewer"))).name, "Integration owner");
  await ok(owner.rpc("unpublish_design", { target: id }));
  assert.equal(
    (await ok(anon.from("designs_public").select("*").eq("id", id))).length,
    0,
  );
  assert(
    (await anon.storage.from("design-assets").download(cover.body.path)).error,
  );
  console.log(
    "PASS: real local Auth, Edge upload validation, ownership, Storage manifests, working drafts, atomic revisions, stars, unpublish and privilege boundaries.",
  );
} finally {
  const { data: objects } = await admin.storage.from("design-assets").list(id);
  if (objects?.length)
    await admin.storage
      .from("design-assets")
      .remove(objects.map((x) => `${id}/${x.name}`));
  for (const user of users) await admin.auth.admin.deleteUser(user);
}
