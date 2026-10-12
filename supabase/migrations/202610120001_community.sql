-- Private working copies and explicit, revision-checked publication.
alter table public.designs add column revision integer not null default 0;
alter table public.designs add column hidden_from_status text not null default 'draft';
create table public.design_drafts (
 design_id uuid primary key references public.designs on delete cascade,
 owner_id uuid not null references public.profiles on delete cascade,
 content jsonb not null, revision integer not null default 1,
 base_revision integer not null, updated_at timestamptz not null default now()
);
alter table public.design_drafts enable row level security;
create policy draft_read on public.design_drafts for select using(owner_id=auth.uid() and public.is_active());
grant select on public.design_drafts to authenticated;
revoke all on public.design_drafts from anon;
-- Existing published records stay in place; no local demo data is imported.
create or replace view public.designs_public with (security_invoker=true) as
 select d.id,d.owner_id,p.display_name as creator,d.title,d.description,d.type,d.scope,d.tags,d.html,d.css,d.prompt,d.instructions,d.attribution,d.tool,d.license_accepted,d.assets,d.status,d.created_at,d.updated_at,d.star_count as stars,d.revision from public.designs d join public.profiles p on p.id=d.owner_id;

create function public.validate_working_content(p jsonb, target uuid, publishing boolean) returns void language plpgsql security definer set search_path='' as $$
declare a jsonb; k text; screenshots integer := 0; names text[] := '{}'; paths text[] := '{}';
begin
 if p is null or jsonb_typeof(p)<>'object' then raise exception 'Invalid design content.';end if;
 foreach k in array array['title','description','type','scope','html','css','prompt','instructions','attribution'] loop
  if jsonb_typeof(p->k) is distinct from 'string' then raise exception 'Missing or invalid field: %',k;end if;
 end loop;
 if length(trim(p->>'title')) not between 1 and 100 or length(p->>'description')>2000 or length(p->>'instructions')>20000 or length(p->>'attribution')>5000 or length(coalesce(p->>'tool',''))>100 or length(p->>'prompt')>20000 or octet_length(p->>'html')>204800 or octet_length(p->>'css')>204800 then raise exception 'A content field exceeds its limit.';end if;
 if p->>'type' not in ('code','prompt') or p->>'scope' not in ('component','page') then raise exception 'Invalid design type or format.';end if;
 if jsonb_typeof(p->'tags') is distinct from 'array' or jsonb_array_length(p->'tags')>5 then raise exception 'Choose up to five style tags.';end if;
 if exists(select 1 from jsonb_array_elements(p->'tags') t where jsonb_typeof(t)<>'string' or t#>>'{}' not in ('Minimal','Editorial','Brutalist','Retro','Playful','Monochrome','Glass','Organic','Dark','Typography')) then raise exception 'Unsupported style tag.';end if;
 if jsonb_typeof(p->'assets') is distinct from 'array' or jsonb_array_length(p->'assets')>30 then raise exception 'Invalid asset list.';end if;
 for a in select * from jsonb_array_elements(p->'assets') loop
  foreach k in array array['id','name','path','kind'] loop
   if jsonb_typeof(a->k) is distinct from 'string' or length(a->>k)=0 then raise exception 'Invalid asset field: %',k;end if;
  end loop;
  if a->>'kind' not in ('screenshot','asset') or a->>'name' !~ '^[A-Za-z0-9._-]+$' or a->>'path'<>target::text||'/'||(a->>'name') or a->>'name'=any(names) or a->>'path'=any(paths) then raise exception 'Invalid or duplicate asset reference.';end if;
  names:=array_append(names,a->>'name');paths:=array_append(paths,a->>'path');
  if not exists(select 1 from storage.objects where bucket_id='design-assets' and name=a->>'path') then raise exception 'An uploaded image is missing.';end if;
  if a->>'kind'='screenshot' then screenshots:=screenshots+1;end if;
 end loop;
 if screenshots>5 then raise exception 'Use at most five screenshots.';end if;
 if publishing then
  if jsonb_typeof(p->'license_accepted') is distinct from 'boolean' or p->>'license_accepted'<>'true' then raise exception 'Accept the MIT license and asset redistribution rights.';end if;
  if screenshots=0 or jsonb_array_length(p->'tags')=0 or length(trim(p->>'description'))=0 or length(trim(p->>'instructions'))=0 then raise exception 'Screenshot, tags, description and instructions are required.';end if;
  if p->>'type'='prompt' and length(trim(p->>'prompt'))=0 then raise exception 'A prompt is required.';end if;
  if p->>'type'='code' and (length(trim(p->>'html'))=0 or length(trim(p->>'css'))=0) then raise exception 'HTML and CSS are required.';end if;
  if (p->>'html') ~* '<(script|iframe|object|embed|form|link|meta|base)\y|\yon[a-z]+\s*=|javascript\s*:' or (p->>'css') ~* '@import|url\(\s*["'']?(https?:|//)|expression\s*\(' then raise exception 'Remove scripts, embeds, forms and external resources.';end if;
 end if;
end;$$;
create function public.save_working_draft(payload jsonb, expected_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid:=(payload->>'id')::uuid; parent public.designs; draft public.design_drafts; clean jsonb;
begin
 perform public.check_rate('save',120);
 if target is null then raise exception 'Design ID required.';end if;
 perform public.validate_working_content(payload,target,false);
 insert into public.designs(id,owner_id,title,type,scope) values(target,auth.uid(),payload->>'title',payload->>'type',payload->>'scope') on conflict(id) do nothing;
 select * into parent from public.designs where id=target for update;
 if parent.owner_id<>auth.uid() then raise exception 'You can only edit your own designs.';end if;
 if parent.status='hidden' then raise exception 'A moderator must restore this design.';end if;
 if (payload->>'base_revision')::integer is distinct from parent.revision then raise exception 'Published version changed. Reload before saving.';end if;
 select * into draft from public.design_drafts where design_id=target for update;
 if coalesce(draft.revision,0) is distinct from expected_revision then raise exception 'This draft changed in another session. Reload before saving.';end if;
 clean:=payload-array['owner_id','creator','status','stars','revision','draft_revision','base_revision','created_at','updated_at','sample'];
 insert into public.design_drafts(design_id,owner_id,content,base_revision) values(target,auth.uid(),clean,parent.revision)
 on conflict(design_id) do update set content=excluded.content,base_revision=excluded.base_revision,revision=public.design_drafts.revision+1,updated_at=now();
 select * into draft from public.design_drafts where design_id=target;
 return jsonb_build_object('draft_revision',draft.revision,'base_revision',draft.base_revision,'published',parent.status='published');
end;$$;
create function public.publish_working_draft(target uuid,expected_revision integer) returns integer language plpgsql security definer set search_path='' as $$
declare parent public.designs; draft public.design_drafts; next_revision int;
begin
 perform public.check_rate('publish',30);
 select * into parent from public.designs where id=target for update;
 if parent.id is null or parent.owner_id<>auth.uid() then raise exception 'You can only publish your own designs.';end if;
 if parent.status='hidden' then raise exception 'A moderator must restore this design.';end if;
 select * into draft from public.design_drafts where design_id=target for update;
 if draft.design_id is null or draft.revision is distinct from expected_revision or draft.base_revision<>parent.revision then raise exception 'The draft or published version changed. Reload before publishing.';end if;
 perform public.validate_working_content(draft.content,target,true);
 -- Existing validation/write function is now callable only inside trusted functions.
 perform public.save_design(draft.content||jsonb_build_object('id',target,'status','published'));
 update public.designs set revision=revision+1 where id=target returning revision into next_revision;
 update public.design_drafts set base_revision=next_revision,revision=revision+1 where design_id=target;
 return next_revision;
end;$$;
create function public.get_editor_draft(target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare parent public.designs; draft public.design_drafts; content jsonb;
begin
 if not public.is_active() then raise exception 'Sign in with an active account.';end if;
 select * into parent from public.designs where id=target;
 if parent.id is null or parent.owner_id<>auth.uid() then raise exception 'Design not found.';end if;
 select * into draft from public.design_drafts where design_id=target;
 content:=coalesce(draft.content,to_jsonb(parent));
 return content||jsonb_build_object('id',parent.id,'owner_id',parent.owner_id,'creator',(select display_name from public.profiles where id=parent.owner_id),'status',parent.status,'stars',parent.star_count,'created_at',parent.created_at,'updated_at',coalesce(draft.updated_at,parent.updated_at),'revision',parent.revision,'draft_revision',coalesce(draft.revision,0),'base_revision',parent.revision,'published',parent.status='published');
end;$$;
create function public.unpublish_design(target uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.check_rate('save',120);
 perform 1 from public.designs where id=target and owner_id=auth.uid() and status<>'hidden' for update;
 if not found then raise exception 'Design unavailable.';end if;
 update public.designs set status='draft',revision=revision+1,updated_at=now() where id=target;
 -- Existing draft can be resumed after the explicit unpublish.
 update public.design_drafts set base_revision=(select revision from public.designs where id=target),revision=revision+1 where design_id=target;
end;$$;
create function public.update_display_name(display_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform public.check_rate('profile',20);
 if display_name is null or length(trim(display_name)) not between 1 and 80 then raise exception 'Use a name of 1–80 characters.';end if;
 update public.profiles set display_name=trim(update_display_name.display_name) where id=auth.uid();
end;$$;
create function public.get_viewer() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',id,'name',display_name,'admin',is_admin and not suspended,'suspended',suspended) from public.profiles where id=auth.uid();$$;

-- Only assets in the current published manifest are publicly readable.
drop policy asset_read on storage.objects;
create policy asset_read on storage.objects for select using(bucket_id='design-assets' and exists(
 select 1 from public.designs d where d.id::text=(storage.foldername(name))[1] and
 ((d.owner_id=auth.uid() and public.is_active()) or public.is_admin() or (d.status='published' and exists(select 1 from jsonb_array_elements(d.assets) a where a->>'path'=storage.objects.name)))
));
-- Deleting a still-referenced object could break an otherwise valid publication.
drop policy asset_delete on storage.objects;
create policy asset_delete on storage.objects for delete using(bucket_id='design-assets' and exists(
 select 1 from public.designs d where d.id::text=(storage.foldername(name))[1] and d.owner_id=auth.uid() and public.is_active() and
 (d.status<>'published' or not exists(select 1 from jsonb_array_elements(d.assets) a where a->>'path'=storage.objects.name))
));
revoke execute on function public.save_design(jsonb) from authenticated;
revoke execute on function public.validate_working_content(jsonb,uuid,boolean) from public,anon,authenticated;
revoke execute on function public.save_working_draft(jsonb,integer),public.publish_working_draft(uuid,integer),public.get_editor_draft(uuid),public.unpublish_design(uuid),public.update_display_name(text),public.get_viewer() from public,anon;
grant execute on function public.save_working_draft(jsonb,integer),public.publish_working_draft(uuid,integer),public.get_editor_draft(uuid),public.unpublish_design(uuid),public.update_display_name(text),public.get_viewer() to authenticated;

-- Safe, summary-only discovery. Every caller is restricted by the underlying RLS.
create function public.browse_designs(query_text text default '', selected_tags text[] default '{}', content_type text default 'all', design_scope text default 'all', sort_order text default 'newest', page_number integer default 1, collection text default 'explore', creator_id uuid default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if length(query_text)>200 or page_number<1 or page_number>100000 or collection not in ('explore','mine','stars','hidden') or sort_order not in ('newest','stars','relevance') then raise exception 'Invalid search.';end if;
 if collection='hidden' and not public.is_admin() then raise exception 'Administrator access required.';end if;
 with candidates as (
 select d.*,p.display_name as creator,
 case when collection='mine' then coalesce(w.content,to_jsonb(d)) else to_jsonb(d) end as content,
 to_tsvector('english',d.title||' '||d.description||' '||array_to_string(d.tags,' ')||' '||p.display_name) as document
 from public.designs d join public.profiles p on p.id=d.owner_id
 left join public.design_drafts w on w.design_id=d.id and collection='mine'
 where case collection when 'mine' then d.owner_id=auth.uid() when 'hidden' then d.status='hidden' when 'stars' then d.status='published' and exists(select 1 from public.stars s where s.design_id=d.id and s.user_id=auth.uid()) else d.status='published' end
 and (creator_id is null or d.owner_id=creator_id)
 ), filtered as (
 select *,ts_rank(document,plainto_tsquery('english',query_text)) as rank from candidates
 where (query_text='' or document@@plainto_tsquery('english',query_text))
 and (content_type='all' or content->>'type'=content_type) and (design_scope='all' or content->>'scope'=design_scope)
 and (cardinality(selected_tags)=0 or exists(select 1 from jsonb_array_elements_text(content->'tags') t where t=any(selected_tags)))
 ), page as (
 select jsonb_build_object('id',id,'owner_id',owner_id,'creator',creator,'title',content->>'title','description',content->>'description','type',content->>'type','scope',content->>'scope','tags',content->'tags','status',status,'created_at',created_at,'updated_at',updated_at,'stars',star_count,'revision',revision,'assets',coalesce((select jsonb_build_array(a) from jsonb_array_elements(content->'assets') a where a->>'kind'='screenshot' limit 1),'[]'::jsonb)) as summary
 from filtered order by case when sort_order='relevance' and query_text<>'' then rank end desc nulls last,case when sort_order='stars' then star_count end desc nulls last,created_at desc,id limit 9 offset (page_number-1)*9
 ) select jsonb_build_object('items',coalesce((select jsonb_agg(summary) from page),'[]'::jsonb),'total',(select count(*) from filtered)) into result;
 return result;
end;$$;
grant select on public.stars to anon;
grant select on public.design_drafts to anon; -- RLS returns no draft rows for anonymous discovery joins.
revoke execute on function public.browse_designs(text,text[],text,text,text,integer,text,uuid) from public;
grant execute on function public.browse_designs(text,text[],text,text,text,integer,text,uuid) to anon,authenticated;

create or replace function public.moderate_design(target uuid,operation text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Administrator access required.';end if;
 if operation not in ('hide','restore','resolve') then raise exception 'Unsupported operation.';end if;
 if operation='hide' then update public.designs set hidden_from_status=status,status='hidden',revision=revision+1,updated_at=now() where id=target and status<>'hidden';
 elsif operation='restore' then update public.designs set status=hidden_from_status,revision=revision+1,updated_at=now() where id=target and status='hidden' and exists(select 1 from public.profiles p where p.id=owner_id and not p.suspended);end if;
 update public.reports set resolved=true where design_id=target;
 insert into public.moderation_actions(actor_id,target_id,operation) values(auth.uid(),target,operation);
end;$$;

create or replace function public.suspend_creator(target uuid,active boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() or target=auth.uid() then raise exception 'Not permitted.';end if;
 update public.profiles set suspended=active where id=target;
 if active then update public.designs set hidden_from_status=status,status='hidden',revision=revision+1 where owner_id=target and status<>'hidden';end if;
 insert into public.moderation_actions(actor_id,target_id,operation) values(auth.uid(),target,case when active then 'suspend' else 'unsuspend' end);
end;$$;
