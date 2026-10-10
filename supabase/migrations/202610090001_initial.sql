-- Apply once to a fresh Supabase project. Never put service_role keys in Vite variables.
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 display_name text not null check (length(display_name) between 1 and 80),
 is_admin boolean not null default false, suspended boolean not null default false,
 created_at timestamptz not null default now()
);
create function public.bootstrap_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),nullif(new.raw_user_meta_data->>'user_name',''),'New maker'),80));return new;
end;$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.bootstrap_profile();
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$select exists(select 1 from public.profiles where id=auth.uid() and is_admin and not suspended);$$;
create function public.is_active() returns boolean language sql stable security definer set search_path = '' as $$select exists(select 1 from public.profiles where id=auth.uid() and not suspended);$$;
create table public.designs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles on delete cascade,
 title text not null check(length(title) between 1 and 100), description text not null default '' check(length(description)<=2000),
 type text not null check(type in ('code','prompt')), scope text not null check(scope in ('component','page')),
 tags text[] not null default '{}', html text not null default '' check(octet_length(html)<=204800), css text not null default '' check(octet_length(css)<=204800),
 prompt text not null default '' check(length(prompt)<=20000), instructions text not null default '' check(length(instructions)<=20000), attribution text not null default '' check(length(attribution)<=5000), tool text not null default '' check(length(tool)<=100),
 license_accepted boolean not null default false,
 assets jsonb not null default '[]' check(jsonb_typeof(assets)='array' and jsonb_array_length(assets)<=30),
 status text not null default 'draft' check(status in ('draft','published','hidden')), star_count integer not null default 0 check(star_count>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 search_document tsvector generated always as (setweight(to_tsvector('english',title),'A') || setweight(to_tsvector('english',description),'B')) stored
);
create index designs_search_idx on public.designs using gin(search_document);
create index designs_tags_idx on public.designs using gin(tags);
create index designs_public_idx on public.designs(status,created_at desc);
create index designs_owner_idx on public.designs(owner_id);
create table public.stars(user_id uuid references public.profiles on delete cascade,design_id uuid references public.designs on delete cascade,created_at timestamptz not null default now(),primary key(user_id,design_id));
create index stars_design_idx on public.stars(design_id);
create table public.reports(id uuid primary key default gen_random_uuid(),design_id uuid not null references public.designs on delete cascade,reporter_id uuid not null references public.profiles on delete cascade,reason text not null check(length(reason) between 10 and 1000),resolved boolean not null default false,created_at timestamptz not null default now());
create table public.moderation_actions(id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles,target_id uuid,operation text not null,created_at timestamptz not null default now());
create table public.rate_events(user_id uuid not null references public.profiles on delete cascade,action text not null,created_at timestamptz not null default now());
create index rate_events_idx on public.rate_events(user_id,action,created_at);
create function public.check_rate(action_name text, max_count int) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_active() then raise exception 'Sign in with an active account to continue.';end if;
 perform pg_advisory_xact_lock(hashtext(auth.uid()::text));
 if (select count(*) from public.rate_events where user_id=auth.uid() and action=action_name and created_at>now()-interval '1 hour')>=max_count then raise exception 'Too many requests. Please try again later.';end if;
 insert into public.rate_events(user_id,action) values(auth.uid(),action_name);
 delete from public.rate_events where user_id=auth.uid() and created_at<now()-interval '1 day';
end;$$;
alter table public.profiles enable row level security;
alter table public.designs enable row level security;
alter table public.stars enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.rate_events enable row level security;
create policy profiles_read on public.profiles for select using (true);
create policy designs_read on public.designs for select using(status='published' or owner_id=auth.uid() or public.is_admin());
create policy designs_delete on public.designs for delete using((owner_id=auth.uid() and public.is_active()) or public.is_admin());
create policy stars_read on public.stars for select using(user_id=auth.uid());
create policy reports_read on public.reports for select using(public.is_admin());
create policy moderation_read on public.moderation_actions for select using(public.is_admin());
-- No client insert/update grants. All writes below validate actor, limits and immutable fields.
revoke all on public.profiles,public.designs,public.stars,public.reports,public.moderation_actions,public.rate_events from anon,authenticated;
grant select(id,display_name,is_admin) on public.profiles to anon,authenticated;
grant select on public.designs to anon,authenticated;
grant delete on public.designs to authenticated;
grant select on public.stars,public.reports,public.moderation_actions to authenticated;
create view public.designs_public with (security_invoker=true) as
 select d.id,d.owner_id,p.display_name as creator,d.title,d.description,d.type,d.scope,d.tags,d.html,d.css,d.prompt,d.instructions,d.attribution,d.tool,d.license_accepted,d.assets,d.status,d.created_at,d.updated_at,d.star_count as stars from public.designs d join public.profiles p on p.id=d.owner_id;
grant select on public.designs_public to anon,authenticated;
create function public.save_design(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare target uuid := (payload->>'id')::uuid; old public.designs; next_status text:=payload->>'status'; next_tags text[]; item jsonb;
begin
 perform public.check_rate('save',60);
 select * into old from public.designs where id=target for update;
 if found and old.owner_id<>auth.uid() then raise exception 'You can only edit your own designs.';end if;
 if old.status='hidden' then raise exception 'A moderator must restore this design before it can be edited.';end if;
 if next_status not in ('draft','published') then raise exception 'Invalid visibility.';end if;
 select coalesce(array_agg(value),'{}') into next_tags from jsonb_array_elements_text(coalesce(payload->'tags','[]'));
 if cardinality(next_tags)>5 or not next_tags <@ array['Minimal','Editorial','Brutalist','Retro','Playful','Monochrome','Glass','Organic','Dark','Typography'] then raise exception 'Choose up to five supported style tags.';end if;
 if (select count(*) from jsonb_array_elements(coalesce(payload->'assets','[]')) a where a->>'kind'='screenshot')>5 then raise exception 'Use at most five screenshots.';end if;
 for item in select * from jsonb_array_elements(coalesce(payload->'assets','[]')) loop
  if item->>'kind' not in ('screenshot','asset') or item->>'path' is null or item->>'name' !~ '^[A-Za-z0-9._-]+$' or item->>'path' <> target::text||'/'||(item->>'name') then raise exception 'Invalid asset reference.';end if;
  if not exists(select 1 from storage.objects where bucket_id='design-assets' and name=item->>'path') then raise exception 'An uploaded image is missing. Upload it again.';end if;
 end loop;
 if next_status='published' then
  if coalesce((payload->>'license_accepted')::boolean,false)=false then raise exception 'Accept the MIT license and confirm asset redistribution rights.';end if;
  if length(trim(coalesce(payload->>'description','')))=0 or length(trim(coalesce(payload->>'instructions','')))=0 or cardinality(next_tags)=0 then raise exception 'Description, instructions and tags are required.';end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(payload->'assets','[]')) a where a->>'kind'='screenshot') then raise exception 'A screenshot is required.';end if;
  if payload->>'type'='code' and (length(trim(coalesce(payload->>'html','')))=0 or length(trim(coalesce(payload->>'css','')))=0) then raise exception 'HTML and CSS are required.';end if;
  if payload->>'type'='prompt' and length(trim(coalesce(payload->>'prompt','')))=0 then raise exception 'A prompt is required.';end if;
  if payload->>'type'='code' and ((payload->>'html') ~* '<(script|iframe|form|link)\y|\yon[a-z]+\s*=' or (payload->>'css') ~* '@import|url\(\s*["'']?(https?:|//)') then raise exception 'Remove scripts, forms and external resources.';end if;
 end if;
 insert into public.designs(id,owner_id,title,description,type,scope,tags,html,css,prompt,instructions,attribution,tool,assets,status,license_accepted)
 values(target,auth.uid(),trim(payload->>'title'),coalesce(payload->>'description',''),payload->>'type',payload->>'scope',next_tags,coalesce(payload->>'html',''),coalesce(payload->>'css',''),coalesce(payload->>'prompt',''),coalesce(payload->>'instructions',''),coalesce(payload->>'attribution',''),coalesce(payload->>'tool',''),coalesce(payload->'assets','[]'),next_status,coalesce((payload->>'license_accepted')::boolean,false))
 on conflict(id) do update set title=excluded.title,description=excluded.description,type=excluded.type,scope=excluded.scope,tags=excluded.tags,html=excluded.html,css=excluded.css,prompt=excluded.prompt,instructions=excluded.instructions,attribution=excluded.attribution,tool=excluded.tool,assets=excluded.assets,status=excluded.status,license_accepted=excluded.license_accepted,updated_at=now();
 return target;
end;$$;
create function public.set_star(target uuid,active boolean) returns void language plpgsql security definer set search_path='' as $$
declare n int;
begin
 perform public.check_rate('star',300);
 perform 1 from public.designs where id=target and status='published' for update;
 if not found then raise exception 'This design is unavailable.';end if;
 if active then insert into public.stars(user_id,design_id) values(auth.uid(),target) on conflict do nothing;
 else delete from public.stars where user_id=auth.uid() and design_id=target;end if;
end;$$;
create function public.report_design(target uuid,report_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.check_rate('report',10);
 if not exists(select 1 from public.designs where id=target and status='published') then raise exception 'This design is unavailable.';end if;
 insert into public.reports(design_id,reporter_id,reason) values(target,auth.uid(),trim(report_reason));
end;$$;
create function public.moderate_design(target uuid,operation text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator access required.';end if;
 if operation not in ('hide','restore') then raise exception 'Unsupported operation.';end if;
 update public.designs set status=case when operation='hide' then 'hidden' else 'published' end,updated_at=now() where id=target;
 if not found then raise exception 'Design not found.';end if;
 update public.reports set resolved=true where design_id=target;
 insert into public.moderation_actions(actor_id,target_id,operation) values(auth.uid(),target,operation);
end;$$;
create function public.suspend_creator(target uuid,active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() or target=auth.uid() then raise exception 'Not permitted.';end if;
 update public.profiles set suspended=active where id=target;
 if active then update public.designs set status='hidden' where owner_id=target;end if;
 insert into public.moderation_actions(actor_id,target_id,operation) values(auth.uid(),target,case when active then 'suspend' else 'unsuspend' end);
end;$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('design-assets','design-assets',false,10485760,array['image/png','image/jpeg','image/webp']);
create policy asset_read on storage.objects for select using(bucket_id='design-assets' and exists(select 1 from public.designs d where d.id::text=(storage.foldername(name))[1] and (d.status='published' or d.owner_id=auth.uid() or public.is_admin())));
create policy asset_delete on storage.objects for delete using(bucket_id='design-assets' and exists(select 1 from public.designs d where d.id::text=(storage.foldername(name))[1] and d.owner_id=auth.uid() and public.is_active()));
-- Uploads go through the upload-image Edge Function; clients cannot bypass byte validation or quota.
revoke execute on function public.bootstrap_profile(),public.check_rate(text,int) from public,anon,authenticated;
revoke execute on function public.save_design(jsonb),public.set_star(uuid,boolean),public.report_design(uuid,text),public.moderate_design(uuid,text),public.suspend_creator(uuid,boolean) from public,anon;
grant execute on function public.save_design(jsonb),public.set_star(uuid,boolean),public.report_design(uuid,text),public.moderate_design(uuid,text),public.suspend_creator(uuid,boolean) to authenticated;
-- These helpers reveal only the caller's own permission state.
revoke execute on function public.is_admin(),public.is_active() from public;
grant execute on function public.is_admin(),public.is_active() to anon,authenticated;
create table public.upload_reservations(path text primary key,design_id uuid not null references public.designs on delete cascade,bytes bigint not null check(bytes>0),created_at timestamptz not null default now());
alter table public.upload_reservations enable row level security;
revoke all on public.upload_reservations from anon,authenticated;
create function public.reserve_upload(target uuid,object_path text,byte_count bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.check_rate('upload',60);
 perform 1 from public.designs where id=target and owner_id=auth.uid() and status<>'hidden' for update;
 if not found then raise exception 'Upload not permitted.';end if;
 if byte_count<=0 or byte_count>10485760 or object_path not like target::text||'/%' then raise exception 'Invalid upload.';end if;
 -- Stale failed reservations expire; stored objects are measured separately.
 delete from public.upload_reservations r where r.design_id=target and r.created_at<now()-interval '10 minutes';
 if (select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects where bucket_id='design-assets' and (storage.foldername(name))[1]=target::text)
  +(select coalesce(sum(r.bytes),0) from public.upload_reservations r where r.design_id=target and not exists(select 1 from storage.objects o where o.bucket_id='design-assets' and o.name=r.path))+byte_count>10485760 then raise exception 'Keep all uploaded images under 10 MB per design.';end if;
 insert into public.upload_reservations(path,design_id,bytes) values(object_path,target,byte_count);
end;$$;
revoke execute on function public.reserve_upload(uuid,text,bigint) from public,anon;
grant execute on function public.reserve_upload(uuid,text,bigint) to authenticated;

create function public.adjust_star_count() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then update public.designs set star_count=star_count+1 where id=new.design_id;return new;
 else update public.designs set star_count=greatest(0,star_count-1) where id=old.design_id;return old;end if;
end;$$;
create trigger star_count_changed after insert or delete on public.stars for each row execute function public.adjust_star_count();
revoke execute on function public.adjust_star_count() from public,anon,authenticated;
