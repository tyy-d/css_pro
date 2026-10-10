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
    `insert into auth.users values('${owner}','{"full_name":"Owner"}'),('${other}','{"full_name":"Other"}'),('${admin}','{"full_name":"Admin"}');update public.profiles set is_admin=true where id='${admin}';`,
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("PostgreSQL migration and access policies", () => {
  it("creates private drafts with server-owned attribution", async () => {
    await actor(owner);
    await db.query("select public.save_design($1::jsonb)", [
      JSON.stringify({ ...payload, owner_id: other }),
    ]);
    const rows = await db.query<{ owner_id: string }>(
      "select owner_id from public.designs",
    );
    expect(rows.rows[0].owner_id).toBe(owner);
    await actor(other);
    expect(
      (await db.query("select * from public.designs_public")).rows,
    ).toHaveLength(0);
    await expect(
      db.query("select public.save_design($1::jsonb)", [
        JSON.stringify(payload),
      ]),
    ).rejects.toThrow("own designs");
  });
  it("prevents direct writes and profile privilege escalation", async () => {
    await actor(owner);
    await expect(
      db.exec("update public.profiles set is_admin=true"),
    ).rejects.toThrow("permission denied");
    await expect(
      db.exec("update public.designs set status='published'"),
    ).rejects.toThrow("permission denied");
  });
  it("requires complete published designs and validates stored asset ownership", async () => {
    await actor(owner);
    await expect(
      db.query("select public.save_design($1::jsonb)", [
        JSON.stringify({ ...payload, status: "published" }),
      ]),
    ).rejects.toThrow("screenshot");
    await expect(
      db.query("select public.save_design($1::jsonb)", [
        JSON.stringify({
          ...payload,
          assets: [
            {
              name: "cover.png",
              path: `${other}/cover.png`,
              kind: "screenshot",
            },
          ],
        }),
      ]),
    ).rejects.toThrow("asset");
  });
  it("allows public reads only after successful publication", async () => {
    await actor(null, "postgres");
    await db.query(
      "insert into storage.objects(bucket_id,name,metadata) values('design-assets',$1,'{\"size\":100}')",
      [`${id}/cover.png`],
    );
    await actor(owner);
    await db.query("select public.save_design($1::jsonb)", [
      JSON.stringify({
        ...payload,
        status: "published",
        assets: [
          {
            id: "cover",
            name: "cover.png",
            path: `${id}/cover.png`,
            url: "",
            kind: "screenshot",
          },
        ],
      }),
    ]);
    await actor(null, "anon");
    expect(
      (await db.query("select * from public.designs_public")).rows,
    ).toHaveLength(1);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      1,
    );
  });
  it("makes star writes idempotent and keeps saved lists private", async () => {
    await actor(other);
    await db.query("select public.set_star($1,true)", [id]);
    await db.query("select public.set_star($1,true)", [id]);
    expect(
      (
        await db.query<{ stars: number }>(
          "select stars from public.designs_public",
        )
      ).rows[0].stars,
    ).toBe(1);
    expect((await db.query("select * from public.stars")).rows).toHaveLength(1);
    await actor(owner);
    expect((await db.query("select * from public.stars")).rows).toHaveLength(0);
  });
  it("enforces administrator moderation and prevents owner republishing", async () => {
    await actor(other);
    await expect(
      db.query("select public.moderate_design($1,'hide')", [id]),
    ).rejects.toThrow("Administrator");
    await db.query("select public.report_design($1,$2)", [
      id,
      "A test report for moderation",
    ]);
    await actor(admin);
    await db.query("select public.moderate_design($1,'hide')", [id]);
    await actor(null, "anon");
    expect(
      (await db.query("select * from public.designs_public")).rows,
    ).toHaveLength(0);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      0,
    );
    await actor(owner);
    await expect(
      db.query("select public.save_design($1::jsonb)", [
        JSON.stringify(payload),
      ]),
    ).rejects.toThrow("moderator");
    await actor(admin);
    await db.query("select public.moderate_design($1,'restore')", [id]);
  });
  it("reserves upload quota atomically and rejects non-owner uploads", async () => {
    await actor(other);
    await expect(
      db.query("select public.reserve_upload($1,$2,100)", [
        id,
        `${id}/other.png`,
      ]),
    ).rejects.toThrow("permitted");
    await actor(owner);
    await db.query("select public.reserve_upload($1,$2,9000000)", [
      id,
      `${id}/large.png`,
    ]);
    await expect(
      db.query("select public.reserve_upload($1,$2,2000000)", [
        id,
        `${id}/extra.png`,
      ]),
    ).rejects.toThrow("10 MB");
  });
  it("enforces rate limits through RPCs", async () => {
    await actor(null, "postgres");
    await db.exec(
      `insert into public.rate_events(user_id,action) select '${other}','report' from generate_series(1,10);`,
    );
    await actor(other);
    await expect(
      db.query("select public.report_design($1,$2)", [
        id,
        "Another test report",
      ]),
    ).rejects.toThrow("Too many");
  });
});
