// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const admin = "33333333-3333-4333-8333-333333333333";
const id = "44444444-4444-4444-8444-444444444444";
async function actor(uid: string | null, role = "authenticated") {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${uid || ""}',false); set role ${role};`,
  );
}
const payload = {
  id,
  title: "Test design",
  description: "A useful test design",
  type: "code",
  scope: "component",
  tags: ["Minimal"],
  html: "<h1>Hello</h1>",
  css: "h1{color:red}",
  instructions: "Use the source",
  prompt: "",
  attribution: "Original",
  assets: [],
  status: "draft",
  license_accepted: true,
};
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create schema storage;create table auth.users(id uuid primary key,raw_user_meta_data jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);alter table storage.objects enable row level security;grant select,delete on storage.objects to anon,authenticated;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`,
  );
  // gen_random_uuid is built into Postgres; the hosted project's optional extension is unnecessary here.
  const sql = readFileSync(
    "supabase/migrations/202610090001_initial.sql",
    "utf8",
  ).replace("create extension if not exists pgcrypto;", "");
  await db.exec(sql);
  await db.exec(
    readFileSync("supabase/migrations/202610120001_community.sql", "utf8"),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/202610120002_dashboard_rls_helper.sql",
      "utf8",
    ),
  );
  await db.exec(
    `insert into auth.users values('${owner}','{"full_name":"Owner"}'),('${other}','{"full_name":"Other"}'),('${admin}','{"full_name":"Admin"}');update public.profiles set is_admin=true where id='${admin}';`,
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("private working copies", () => {
  it("keeps unpublished edits and assets private with atomic revision checks", async () => {
    await actor(owner);
    const draft = { ...payload, base_revision: 0 };
    await db.query("select save_working_draft($1::jsonb,0)", [
      JSON.stringify(draft),
    ]);
    await actor(null, "anon");
    expect((await db.query("select * from design_drafts")).rows).toHaveLength(
      0,
    );
    expect(
      (
        await db.query<{ browse_designs: { total: number } }>(
          "select browse_designs()",
        )
      ).rows[0].browse_designs.total,
    ).toBe(0);
    await actor(other);
    await expect(db.query("select get_editor_draft($1)", [id])).rejects.toThrow(
      "not found",
    );
    await expect(
      db.query("select save_working_draft($1::jsonb,1)", [
        JSON.stringify(draft),
      ]),
    ).rejects.toThrow("own designs");
    await actor(owner);
    await expect(
      db.query("select save_design($1::jsonb)", [JSON.stringify(draft)]),
    ).rejects.toThrow("permission denied");
    await expect(
      db.query("select save_working_draft($1::jsonb,0)", [
        JSON.stringify(draft),
      ]),
    ).rejects.toThrow("changed");
    await actor(null, "postgres");
    await db.query(
      "insert into storage.objects(bucket_id,name) values('design-assets',$1),('design-assets',$2)",
      [`${id}/cover.png`, `${id}/private.png`],
    );
    await actor(owner);
    const publicDraft = {
      ...draft,
      assets: [
        {
          id: "cover",
          name: "cover.png",
          path: `${id}/cover.png`,
          kind: "screenshot",
        },
      ],
    };
    await db.query("select save_working_draft($1::jsonb,1)", [
      JSON.stringify(publicDraft),
    ]);
    await db.query("select publish_working_draft($1,2)", [id]);
    await db.query("select save_working_draft($1::jsonb,3)", [
      JSON.stringify({
        ...publicDraft,
        base_revision: 1,
        title: "Private changes",
        assets: [
          {
            id: "private",
            name: "private.png",
            path: `${id}/private.png`,
            kind: "screenshot",
          },
        ],
      }),
    ]);
    await actor(null, "anon");
    expect(
      (await db.query<{ title: string }>("select title from designs_public"))
        .rows[0].title,
    ).toBe(payload.title);
    expect(
      (
        await db.query<{ name: string }>("select name from storage.objects")
      ).rows.map((x) => x.name),
    ).toEqual([`${id}/cover.png`]);
    expect(
      (
        await db.query<{ browse_designs: { total: number } }>(
          "select browse_designs()",
        )
      ).rows[0].browse_designs.total,
    ).toBe(1);
    await actor(owner);
    await expect(
      db.query("select publish_working_draft($1,3)", [id]),
    ).rejects.toThrow("changed");
    await db.query("select publish_working_draft($1,4)", [id]);
    await actor(null, "anon");
    expect(
      (await db.query<{ title: string }>("select title from designs_public"))
        .rows[0].title,
    ).toBe("Private changes");
    expect(
      (
        await db.query<{ name: string }>("select name from storage.objects")
      ).rows.map((x) => x.name),
    ).toEqual([`${id}/private.png`]);
  });
  it("rejects malformed fields and keeps restored private designs private", async () => {
    const fresh = "55555555-5555-4555-8555-555555555555";
    await actor(owner);
    for (const field of ["title", "html", "tags", "assets", "type"]) {
      await expect(
        db.query("select save_working_draft($1::jsonb,0)", [
          JSON.stringify({
            ...payload,
            id: fresh,
            base_revision: 0,
            [field]: null,
          }),
        ]),
      ).rejects.toThrow();
    }
    await db.query("select save_working_draft($1::jsonb,0)", [
      JSON.stringify({ ...payload, id: fresh, base_revision: 0 }),
    ]);
    await actor(admin);
    await db.query("select moderate_design($1,'hide')", [fresh]);
    await db.query("select moderate_design($1,'restore')", [fresh]);
    await actor(null, "anon");
    expect(
      (await db.query("select * from designs_public where id=$1", [fresh]))
        .rows,
    ).toHaveLength(0);
    await actor(admin);
    await db.query("select suspend_creator($1,true)", [owner]);
    await db.query("select moderate_design($1,'restore')", [id]);
    await actor(null, "anon");
    expect((await db.query("select * from designs_public")).rows).toHaveLength(
      0,
    );
    await actor(owner);
    await expect(db.query("select get_editor_draft($1)", [id])).rejects.toThrow(
      "active account",
    );
  });
});
