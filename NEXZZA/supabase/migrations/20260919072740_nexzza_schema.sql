-- NEXZZA: apply to a fresh Supabase project as the database owner.
begin;
create extension if not exists pgcrypto;
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,username text not null unique check(username=lower(username) and username ~ '^[a-z0-9][a-z0-9_.]{2,23}$' and username not in ('admin','administrator','moderator','support','nexzza','system','staff')),display_name text not null check(length(display_name) between 2 and 40),bio text not null default '' check(length(bio)<=300),games text[] not null default '{}' check(cardinality(games)<=10),avatar_id uuid,status text not null default 'online' check(status in ('online','idle','dnd','offline')),theme text not null default 'dark' check(theme in ('light','dark')),terms_accepted_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index profiles_username_ci on public.profiles(lower(username));
create table public.user_roles(user_id uuid primary key references profiles(id) on delete cascade,role text not null default 'player' check(role in ('player','moderator','administrator')),state text not null default 'active' check(state in ('active','suspended','banned')),suspended_until timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.user_presence(user_id uuid primary key references profiles(id) on delete cascade,last_seen_at timestamptz not null default now());
create table public.conversations(id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('global','direct','group')),name text not null check(length(name) between 1 and 60),description text not null default '' check(length(description)<=300),icon_id uuid,owner_id uuid references profiles(id) on delete set null,direct_key text unique,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),deleted_at timestamptz,check((kind='direct')=(direct_key is not null)));
create table public.conversation_members(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references conversations(id) on delete cascade,user_id uuid not null references profiles(id) on delete cascade,role text not null default 'member' check(role in ('owner','admin','member')),muted boolean not null default false,last_read_at timestamptz,joined_at timestamptz not null default now(),left_at timestamptz,unique(conversation_id,user_id));
create table public.conversation_invites(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references conversations(id) on delete cascade,sender_id uuid not null references profiles(id) on delete cascade,recipient_id uuid not null references profiles(id) on delete cascade,conversation_name text not null,status text not null default 'pending' check(status in ('pending','accepted','declined','revoked')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(conversation_id,recipient_id),check(sender_id<>recipient_id));
create table public.messages(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references conversations(id) on delete cascade,author_id uuid not null references profiles(id) on delete cascade,content text not null default '' check(length(content)<=4000),reply_to uuid references messages(id) on delete set null,client_id uuid not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),edited_at timestamptz,deleted_at timestamptz,hidden boolean not null default false,unique(author_id,client_id));
create table public.media_assets(id uuid primary key default gen_random_uuid(),owner_id uuid not null references profiles(id) on delete cascade,bucket text not null check(bucket in ('avatars','global-attachments','private-attachments','voice-recordings','news-media')),path text not null unique,mime text not null,filename text not null,size bigint not null check(size between 1 and 104857600),scope text not null check(scope in ('avatar','chat','news','group')),conversation_id uuid references conversations(id) on delete cascade,attached boolean not null default false,created_at timestamptz not null default now());
alter table profiles add constraint profile_avatar_fk foreign key(avatar_id) references media_assets(id) on delete set null;
alter table conversations add constraint conversation_icon_fk foreign key(icon_id) references media_assets(id) on delete set null;
create table public.message_attachments(id uuid primary key default gen_random_uuid(),message_id uuid not null references messages(id) on delete cascade,asset_id uuid not null unique references media_assets(id) on delete cascade,created_at timestamptz not null default now());
create table public.message_reactions(id uuid primary key default gen_random_uuid(),message_id uuid not null references messages(id) on delete cascade,user_id uuid not null references profiles(id) on delete cascade,emoji text not null check(emoji in ('👍','❤️','🔥','😂','🎮','👀')),created_at timestamptz not null default now(),unique(message_id,user_id,emoji));
create table public.message_receipts(id uuid primary key default gen_random_uuid(),message_id uuid not null references messages(id) on delete cascade,user_id uuid not null references profiles(id) on delete cascade,delivered_at timestamptz not null default now(),read_at timestamptz,unique(message_id,user_id));
create table public.user_blocks(id uuid primary key default gen_random_uuid(),blocker_id uuid not null references profiles(id) on delete cascade,blocked_id uuid not null references profiles(id) on delete cascade,created_at timestamptz not null default now(),unique(blocker_id,blocked_id),check(blocker_id<>blocked_id));
create table public.news_posts(id uuid primary key default gen_random_uuid(),author_id uuid not null references profiles(id) on delete cascade,headline text not null check(length(headline) between 8 and 160),body text not null check(length(body) between 40 and 30000),game text not null check(length(game) between 1 and 60),platform text not null check(platform in ('PC','PlayStation','Xbox','Nintendo','Mobile','Multi-platform')),category text not null check(category in ('PC','PlayStation','Xbox','Nintendo','Mobile','Esports','Game Updates','Leaks and Rumours','Community News')),tags text[] not null default '{}' check(cardinality(tags)<=8),source_type text not null check(source_type in ('External News','Original Reporting','Opinion','Community Announcement','Leak or Rumour')),source_url text not null default '' check(length(source_url)<=2048 and (source_url='' or source_url ~ '^https?://[^[:space:]]+$')),cover_id uuid references media_assets(id) on delete set null,video_id uuid references media_assets(id) on delete set null,state text not null default 'published' check(state in ('published','hidden','removed')),verified boolean not null default false,created_at timestamptz not null default now(),published_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(source_type<>'External News' or source_url<>''));
create table public.news_likes(id uuid primary key default gen_random_uuid(),post_id uuid not null references news_posts(id) on delete cascade,user_id uuid not null references profiles(id) on delete cascade,created_at timestamptz not null default now(),unique(post_id,user_id));
create table public.news_bookmarks(id uuid primary key default gen_random_uuid(),post_id uuid not null references news_posts(id) on delete cascade,user_id uuid not null references profiles(id) on delete cascade,created_at timestamptz not null default now(),unique(post_id,user_id));
create table public.news_views(id uuid primary key default gen_random_uuid(),post_id uuid not null references news_posts(id) on delete cascade,user_id uuid not null references profiles(id) on delete cascade,created_at timestamptz not null default now(),unique(post_id,user_id));
create table public.news_comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references news_posts(id) on delete cascade,author_id uuid not null references profiles(id) on delete cascade,parent_id uuid references news_comments(id) on delete cascade,content text not null check(length(content) between 1 and 2000),hidden boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),edited_at timestamptz,deleted_at timestamptz);
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid not null references profiles(id) on delete cascade,target_type text not null check(target_type in ('user','message','news','comment')),target_id uuid not null,reason text not null check(reason in ('Harassment','Spam','Hate speech','Unsafe content','Misinformation','Other')),explanation text not null default '' check(length(explanation)<=1000),status text not null default 'open' check(status in ('open','under_review','resolved','dismissed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(reporter_id,target_type,target_id));
create table public.report_notes(id uuid primary key default gen_random_uuid(),report_id uuid not null references reports(id) on delete cascade,moderator_id uuid not null references profiles(id) on delete cascade,content text not null check(length(content) between 1 and 2000),created_at timestamptz not null default now());
create table public.notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles(id) on delete cascade,actor_id uuid references profiles(id) on delete cascade,kind text not null,title text not null,href text not null check(href like '/%' and href not like '//%'),event_key text not null unique,read_at timestamptz,created_at timestamptz not null default now());
create table public.moderation_actions(id uuid primary key default gen_random_uuid(),actor_id uuid not null references profiles(id),action text not null,target_type text not null,target_id uuid not null,reason text not null check(length(reason) between 5 and 1000),created_at timestamptz not null default now());
create table public.rate_limits(actor_id uuid not null references profiles(id) on delete cascade,bucket text not null,window_start timestamptz not null,hits int not null default 1,primary key(actor_id,bucket,window_start));
create index messages_cursor on messages(conversation_id,created_at desc,id desc);
create index messages_author on messages(author_id,created_at desc);
create index members_user on conversation_members(user_id,conversation_id) where left_at is null;
create index invites_recipient on conversation_invites(recipient_id,status);
create index news_date on news_posts(published_at desc,id desc) where state='published';
create index news_search on news_posts using gin(to_tsvector('simple',headline||' '||game));
create index comments_post on news_comments(post_id,created_at);
create index notifications_unread on notifications(user_id,created_at desc) where read_at is null;
create index reports_queue on reports(status,created_at desc);
create index assets_pending on media_assets(created_at) where not attached;
create index blocks_reverse on user_blocks(blocked_id,blocker_id);
create index receipts_user on message_receipts(user_id,message_id);

create function public.active_player() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from auth.users u join public.user_roles r on r.user_id=u.id where u.id=auth.uid() and u.email_confirmed_at is not null and (r.state='active' or r.state='suspended' and r.suspended_until<=now()))$$;
create function public.staff() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.active_player() and exists(select 1 from public.user_roles where user_id=auth.uid() and role in ('moderator','administrator'))$$;
create function public.administrator() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.active_player() and exists(select 1 from public.user_roles where user_id=auth.uid() and role='administrator')$$;
create function public.blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.user_blocks where blocker_id=a and blocked_id=b or blocker_id=b and blocked_id=a)$$;
create function public.can_converse(cid uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.active_player() and exists(select 1 from public.conversations c where c.id=cid and c.deleted_at is null and (c.kind='global' or exists(select 1 from public.conversation_members m where m.conversation_id=cid and m.user_id=auth.uid() and m.left_at is null)))$$;
create function public.can_read_message(mid uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from public.messages m where m.id=mid and public.can_converse(m.conversation_id) and not m.hidden)$$;
create function public.can_read_news(nid uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.active_player() and exists(select 1 from public.news_posts n where n.id=nid and(n.state='published' or n.author_id=auth.uid() or public.staff()))$$;
create function public.can_read_asset(aid uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select public.active_player() and exists(select 1 from public.media_assets a where a.id=aid and ((a.owner_id=auth.uid() and not a.attached) or exists(select 1 from public.profiles p where p.avatar_id=a.id) or exists(select 1 from public.conversations c where c.icon_id=a.id and public.can_converse(c.id)) or exists(select 1 from public.message_attachments ma join public.messages m on m.id=ma.message_id where ma.asset_id=a.id and m.deleted_at is null and not m.hidden and public.can_converse(m.conversation_id)) or exists(select 1 from public.news_posts n where(a.id=n.cover_id or a.id=n.video_id) and public.can_read_news(n.id))))$$;
create function public.new_account() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin
insert into public.profiles(id,username,display_name,terms_accepted_at) values(new.id,lower(trim(new.raw_user_meta_data->>'username')),trim(new.raw_user_meta_data->>'display_name'),(new.raw_user_meta_data->>'terms_accepted_at')::timestamptz);
insert into public.user_roles(user_id) values(new.id);insert into public.user_presence(user_id) values(new.id);return new;end$$;
create trigger create_profile after insert on auth.users for each row execute function public.new_account();
create function public.username_available(candidate text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select lower(candidate) ~ '^[a-z0-9][a-z0-9_.]{2,23}$' and lower(candidate) not in ('admin','administrator','moderator','support','nexzza','system','staff') and not exists(select 1 from public.profiles where username=lower(candidate))$$;

-- No direct user writes. All writes pass the validated command function below.
do $$declare t text;begin foreach t in array array['profiles','user_roles','user_presence','conversations','conversation_members','conversation_invites','messages','media_assets','message_attachments','message_reactions','message_receipts','user_blocks','news_posts','news_likes','news_comments','news_bookmarks','news_views','reports','report_notes','notifications','moderation_actions','rate_limits'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon, authenticated',t);execute format('grant select on public.%I to authenticated',t);end loop;end$$;
create policy profiles_read on profiles for select to authenticated using(id=auth.uid() or public.active_player());
create policy roles_read on user_roles for select to authenticated using(user_id=auth.uid() or public.active_player());
create policy presence_read on user_presence for select to authenticated using(public.active_player());
create policy conversations_read on conversations for select to authenticated using(public.can_converse(id));
create policy members_read on conversation_members for select to authenticated using(public.can_converse(conversation_id));
create policy invites_read on conversation_invites for select to authenticated using(public.active_player() and (recipient_id=auth.uid() or sender_id=auth.uid()));
create policy messages_read on messages for select to authenticated using(public.can_converse(conversation_id) and(not hidden or public.staff() and conversation_id='00000000-0000-4000-8000-000000000001'));
create policy assets_read on media_assets for select to authenticated using(public.can_read_asset(id));
create policy attachments_read on message_attachments for select to authenticated using(public.can_read_message(message_id) and exists(select 1 from messages where id=message_id and deleted_at is null));
create policy reactions_read on message_reactions for select to authenticated using(public.can_read_message(message_id));
create policy receipts_read on message_receipts for select to authenticated using(public.can_read_message(message_id));
create policy blocks_read on user_blocks for select to authenticated using(public.active_player() and blocker_id=auth.uid());
create policy news_read on news_posts for select to authenticated using(public.can_read_news(id));
create policy likes_read on news_likes for select to authenticated using(public.can_read_news(post_id));
create policy comments_read on news_comments for select to authenticated using(public.can_read_news(post_id) and(not hidden or public.staff()));
create policy bookmarks_read on news_bookmarks for select to authenticated using(public.active_player() and user_id=auth.uid());
create policy views_read on news_views for select to authenticated using(public.active_player() and user_id=auth.uid());
create policy reports_read on reports for select to authenticated using(public.active_player() and(reporter_id=auth.uid() or public.staff()));
create policy notes_read on report_notes for select to authenticated using(public.staff());
create policy notifications_read on notifications for select to authenticated using(public.active_player() and user_id=auth.uid());
create policy audit_read on moderation_actions for select to authenticated using(public.staff());

create function public.rate_check(bucket_name text,max_hits int) returns void language plpgsql security definer set search_path=public,pg_temp as $$declare n int;begin insert into public.rate_limits(actor_id,bucket,window_start) values(auth.uid(),bucket_name,date_trunc('minute',now())) on conflict(actor_id,bucket,window_start) do update set hits=rate_limits.hits+1 returning hits into n;if n>max_hits then raise exception 'Rate limit reached. Please wait a minute.';end if;end$$;
create function public.notify_player(recipient uuid,actor uuid,kind_name text,title_text text,link text,event text) returns void language plpgsql security definer set search_path=public,pg_temp as $$begin if recipient<>actor and not public.blocked(recipient,actor) then insert into public.notifications(user_id,actor_id,kind,title,href,event_key) values(recipient,actor,kind_name,title_text,link,event) on conflict(event_key) do nothing;end if;end$$;
create function public.clean_text(v text,max_size int) returns text language plpgsql immutable set search_path=public,pg_temp as $$begin if length(trim(v))>max_size then raise exception 'Content is too long.';end if;if v ~* '\m(fuck|fucking|cunt)\M' then raise exception 'Content includes language blocked by community rules.';end if;return trim(v);end$$;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, anon, service_role;

create table public.community_settings (
  id boolean primary key default true check (id),
  moderators_can_suspend boolean not null default true,
  profanity_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
insert into public.community_settings default values;
alter table public.community_settings enable row level security;
revoke all on public.community_settings from public, anon, authenticated;
grant select on public.community_settings to authenticated;
create policy settings_read on public.community_settings for select to authenticated using ((select public.staff()));

create table private.content_evidence (
  target_type text not null,
  target_id uuid not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  primary key (target_type, target_id)
);
alter table private.content_evidence enable row level security;
revoke all on private.content_evidence from public, anon, authenticated;
create function private.preserve_deleted_content() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    insert into private.content_evidence(target_type,target_id,snapshot)
    values (case tg_table_name when 'messages' then 'message' else 'comment' end,old.id,to_jsonb(old))
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function private.preserve_deleted_content() from public,anon,authenticated;
create trigger retain_message_evidence before update on public.messages for each row execute function private.preserve_deleted_content();
create trigger retain_comment_evidence before update on public.news_comments for each row execute function private.preserve_deleted_content();

create or replace function public.clean_text(v text,max_size int) returns text
language plpgsql stable set search_path=public,pg_temp as $$
begin
  if v is null or length(trim(v)) > max_size then raise exception 'Content is missing or too long.'; end if;
  if (select profanity_enabled from community_settings where id=true)
     and regexp_split_to_array(lower(v),'[^[:alnum:]_]+') && array['fuck','fucking','cunt'] then
    raise exception 'Content includes language blocked by community rules.';
  end if;
  return trim(v);
end $$;

create function public.can_use_channel(topic text) returns boolean
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or not public.active_player() then return false; end if;
  if topic='presence:global' then return true; end if;
  if topic ~ '^typing:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return public.can_converse(substring(topic from 8)::uuid);
  end if;
  return false;
end $$;

-- Only a server credential can consume this atomic pre-authentication quota.
create table private.auth_rate_limits (
  actor_hash text not null,
  action text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (actor_hash,action,window_start)
);
alter table private.auth_rate_limits enable row level security;
revoke all on private.auth_rate_limits from public,anon,authenticated;
create function private.auth_rate_check(actor_hash text,action_name text,max_hits int) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Permission denied.'; end if;
  if max_hits not between 1 and 100 or length(actor_hash) <> 64 then raise exception 'Invalid rate limit.'; end if;
  insert into private.auth_rate_limits values(actor_hash,action_name,date_trunc('minute',now()),1)
  on conflict (actor_hash,action,window_start) do update set hits=private.auth_rate_limits.hits+1 returning hits into n;
  return n <= max_hits;
end $$;
revoke all on function private.auth_rate_check(text,text,int) from public,anon,authenticated;
grant execute on function private.auth_rate_check(text,text,int) to service_role;
create function public.auth_rate_check(actor_hash text,action_name text,max_hits int) returns boolean
language sql security invoker set search_path='' as $$select private.auth_rate_check(actor_hash,action_name,max_hits)$$;
revoke all on function public.auth_rate_check(text,text,int) from public,anon,authenticated;
grant execute on function public.auth_rate_check(text,text,int) to service_role;

create function public.news_feed(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb; tab text:=coalesce(p->>'tab','latest'); take int:=least(greatest(coalesce((p->>'limit')::int,18),1),50); skip int:=least(greatest(coalesce((p->>'offset')::int,0),0),10000);
begin
  if auth.uid() is null or not public.active_player() then raise exception 'Permission denied.'; end if;
  select coalesce(jsonb_agg(to_jsonb(page)), '[]'::jsonb) into result from (
    select n.*,to_jsonb(author) as profiles,
      counts.likes,counts.comments,counts.bookmarks,counts.views
    from news_posts n join profiles author on author.id=n.author_id
    cross join lateral (
      select (select count(*) from news_likes x where x.post_id=n.id) as likes,
        (select count(*) from news_comments x where x.post_id=n.id and not hidden and deleted_at is null) as comments,
        (select count(*) from news_bookmarks x where x.post_id=n.id) as bookmarks,
        (select count(*) from news_views x where x.post_id=n.id) as views
    ) counts
    where n.state='published'
      and (coalesce(p->>'category','') in ('','All categories') or n.category=p->>'category')
      and (coalesce(p->>'platform','') in ('','All platforms') or n.platform=p->>'platform')
      and (coalesce(p->>'query','')='' or strpos(lower(n.headline||' '||n.game||' '||n.category||' '||array_to_string(n.tags,' ')),lower(left(p->>'query',80)))>0)
      and (not coalesce((p->>'bookmarks')::boolean,false) or exists(select 1 from news_bookmarks b where b.post_id=n.id and b.user_id=auth.uid()))
      and (coalesce((p->>'bookmarks')::boolean,false) or
        case tab when 'today' then n.published_at >= (p->>'start')::timestamptz and n.published_at < (p->>'end')::timestamptz
          when 'archive' then n.published_at < (p->>'start')::timestamptz
          when 'trending' then n.published_at >= now()-interval '7 days' else true end)
    order by case when tab='trending' then (counts.likes*3+counts.comments*5+counts.bookmarks*4+counts.views*0.2)/power(1+greatest(0,extract(epoch from now()-n.published_at)/3600),1.2) else 0 end desc,
      n.published_at desc,n.id desc limit take offset skip
  ) page;
  return result;
end $$;
revoke all on function public.news_feed(jsonb),public.can_use_channel(text) from public,anon;
grant execute on function public.news_feed(jsonb),public.can_use_channel(text) to authenticated;

create index news_author_date on public.news_posts(author_id,published_at desc);
create index bookmarks_owner_date on public.news_bookmarks(user_id,created_at desc);
create index notifications_user_date on public.notifications(user_id,created_at desc);
create index assets_owner on public.media_assets(owner_id);
create index assets_conversation on public.media_assets(conversation_id);
create index members_conversation on public.conversation_members(conversation_id,user_id) where left_at is null;
create index invites_sender on public.conversation_invites(sender_id);
create index reactions_message on public.message_reactions(message_id);
create index receipts_message on public.message_receipts(message_id);
create index comment_parent on public.news_comments(parent_id);
create index report_reporter on public.reports(reporter_id);

-- Restrictive policy also protects these buckets from accidentally added broad policies.
create policy nexzza_server_only on storage.objects as restrictive for all to anon,authenticated
using (bucket_id not in ('avatars','global-attachments','private-attachments','voice-recordings','news-media'))
with check (bucket_id not in ('avatars','global-attachments','private-attachments','voice-recordings','news-media'));

create function public.nexzza(action text,p jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare me uuid:=auth.uid();target uuid;cid uuid;mid uuid;nid uuid;asset uuid;rid uuid;msg public.messages;conv public.conversations;post public.news_posts;comment public.news_comments;inv public.conversation_invites;role_name text;other_role text;txt text;op text;other uuid;r record;ids uuid[];key_text text;
begin
if me is null or not public.active_player() then raise exception 'Account unavailable. Verify your email and check your account status.';end if;
perform 1 from public.profiles where id=me for update;
perform public.rate_check(action,case when action='message_send' then 25 when action='report' then 5 when action='upload' then 12 when action in ('news_save','conversation_create','invite') then 8 else 90 end);
if action='profile_update' then
asset=nullif(p->>'avatar_id','')::uuid;if asset is not null and not exists(select 1 from media_assets where id=asset and owner_id=me and scope='avatar' and mime like 'image/%') then raise exception 'Attachment unavailable.';end if;
update profiles set display_name=public.clean_text(p->>'display_name',40),bio=public.clean_text(coalesce(p->>'bio',''),300),games=array(select jsonb_array_elements_text(coalesce(p->'games','[]'))),status=p->>'status',avatar_id=asset,updated_at=now() where id=me;update media_assets set attached=true where id=asset;return '{}'::jsonb;
elsif action='privacy' then update profiles set show_last_seen=(p->>'show_last_seen')::boolean where id=me;return '{}';
elsif action='theme' then update profiles set theme=p->>'theme' where id=me;return '{}';
elsif action='upload' then return '{}';
elsif action='settings' then
if not public.administrator() then raise exception 'Permission denied.';end if;
update community_settings set moderators_can_suspend=(p->>'moderators_can_suspend')::boolean,profanity_enabled=(p->>'profanity_enabled')::boolean,updated_at=now() where id=true;
insert into moderation_actions(actor_id,action,target_type,target_id,reason) values(me,'settings','platform',me,public.clean_text(p->>'reason',1000));return '{}';
elsif action='presence' then update user_presence set last_seen_at=now() where user_id=me;return '{}';
elsif action='conversation_create' then
op=p->>'kind';if op not in ('direct','group') then raise exception 'Invalid conversation type.';end if;
if op='direct' then select id into target from profiles where username=lower(trim(p->>'username'));if target is null or target=me or not exists(select 1 from user_roles where user_id=target and(state='active' or state='suspended' and suspended_until<=now())) then raise exception 'Choose another valid player.';end if;if public.blocked(me,target) then raise exception 'Blocked players cannot start a conversation.';end if;key_text=least(me::text,target::text)||':'||greatest(me::text,target::text);perform pg_advisory_xact_lock(hashtext(key_text));select id into cid from conversations where direct_key=key_text;if cid is not null then
insert into conversation_members(conversation_id,user_id,role) values(cid,me,'member') on conflict(conversation_id,user_id) do update set left_at=null;
update conversation_invites set status='accepted',updated_at=now() where conversation_id=cid and recipient_id=me and status='pending';
if not exists(select 1 from conversation_members where conversation_id=cid and user_id=target and left_at is null) then
insert into conversation_invites(conversation_id,sender_id,recipient_id,conversation_name) values(cid,me,target,'Private chat request') on conflict(conversation_id,recipient_id) do update set status='pending',sender_id=me,updated_at=now() returning id into rid;
perform public.notify_player(target,me,'invite','You have a private chat request','/messages','invite:'||rid||':'||now());end if;
return jsonb_build_object('id',cid);end if;select display_name into txt from profiles where id=target;else txt=public.clean_text(p->>'name',60);end if;
insert into conversations(kind,name,description,owner_id,direct_key) values(op,txt,public.clean_text(coalesce(p->>'description',''),300),me,key_text) returning id into cid;
insert into conversation_members(conversation_id,user_id,role) values(cid,me,'owner');
if op='direct' then insert into conversation_invites(conversation_id,sender_id,recipient_id,conversation_name) values(cid,me,target,'Private chat request') returning id into rid;perform public.notify_player(target,me,'invite','You have a private chat request','/messages','invite:'||rid);end if;return jsonb_build_object('id',cid);
elsif action='invite' then
cid=(p->>'conversation_id')::uuid;if not public.can_converse(cid) then raise exception 'Permission denied.';end if;select * into conv from conversations where id=cid for update;if conv.kind<>'group' or not exists(select 1 from conversation_members where conversation_id=cid and user_id=me and role in ('owner','admin') and left_at is null) then raise exception 'Permission denied.';end if;
select id into target from profiles where username=lower(trim(p->>'username'));if target is null or target=me or not exists(select 1 from user_roles where user_id=target and(state='active' or state='suspended' and suspended_until<=now())) then raise exception 'Choose another valid player.';end if;if public.blocked(me,target) then raise exception 'Blocked players cannot be invited.';end if;if exists(select 1 from conversation_members where conversation_id=cid and user_id=target and left_at is null) then raise exception 'Group member has already joined.';end if;
insert into conversation_invites(conversation_id,sender_id,recipient_id,conversation_name) values(cid,me,target,conv.name) on conflict(conversation_id,recipient_id) do update set sender_id=me,status='pending',updated_at=now() returning id into rid;perform public.notify_player(target,me,'invite','You are invited to '||conv.name,'/messages','invite:'||rid||':'||date_trunc('day',now()));return '{}';
elsif action='invite_respond' then
select * into inv from conversation_invites where id=(p->>'id')::uuid and recipient_id=me and status='pending' for update;if not found then raise exception 'Not found.';end if;if public.blocked(me,inv.sender_id) then raise exception 'Blocked players cannot accept this invitation.';end if;select * into conv from conversations where id=inv.conversation_id for update;if conv.deleted_at is not null or not exists(select 1 from conversation_members where conversation_id=inv.conversation_id and user_id=inv.sender_id and (conv.kind='direct' or role in ('owner','admin')) and left_at is null) then raise exception 'Group invitation is no longer valid.';end if;
update conversation_invites set status=case when(p->>'accept')::boolean then 'accepted' else 'declined' end,updated_at=now() where id=inv.id;if(p->>'accept')::boolean then insert into conversation_members(conversation_id,user_id) values(inv.conversation_id,me) on conflict(conversation_id,user_id) do update set left_at=null,role='member',joined_at=now();perform public.notify_player(inv.sender_id,me,'accepted','Your invitation was accepted','/messages/'||inv.conversation_id,'accepted:'||inv.id);end if;return jsonb_build_object('id',inv.conversation_id);
elsif action='group_manage' then
cid=(p->>'conversation_id')::uuid;op=p->>'operation';target=nullif(p->>'user_id','')::uuid;if not public.can_converse(cid) then raise exception 'Permission denied.';end if;select * into conv from conversations where id=cid for update;if conv.kind<>'group' then raise exception 'Group action unavailable.';end if;select role into role_name from conversation_members where conversation_id=cid and user_id=me and left_at is null;select role into other_role from conversation_members where conversation_id=cid and user_id=target and left_at is null;
if role_name='member' then raise exception 'Permission denied.';end if;
if op='remove' then if target=me or other_role='owner' or role_name='admin' and other_role<>'member' then raise exception 'Owner or administrator cannot be removed by this account.';end if;update conversation_members set left_at=now() where conversation_id=cid and user_id=target;
elsif role_name<>'owner' then raise exception 'Only the owner can perform this action.';
elsif op in ('promote','demote') then if target=me or other_role is null then raise exception 'Invalid member.';end if;update conversation_members set role=case when op='promote' then 'admin' else 'member' end where conversation_id=cid and user_id=target;
elsif op='transfer' then if target=me or other_role is null then raise exception 'Invalid member.';end if;update conversation_members set role=case when user_id=target then 'owner' else 'admin' end where conversation_id=cid and user_id in(me,target);update conversations set owner_id=target where id=cid;
elsif op='edit' then asset=nullif(p->>'icon_id','')::uuid;if asset is not null and not exists(select 1 from media_assets where id=asset and owner_id=me and scope='group' and conversation_id=cid and mime like 'image/%') then raise exception 'Attachment unavailable.';end if;update conversations set name=public.clean_text(p->>'name',60),description=public.clean_text(coalesce(p->>'description',''),300),icon_id=asset,updated_at=now() where id=cid;update media_assets set attached=true where id=asset;
elsif op='delete' then update conversations set deleted_at=now() where id=cid;else raise exception 'Invalid group action.';end if;return '{}';
elsif action in ('conversation_mute','conversation_leave') then cid=(p->>'conversation_id')::uuid;if not public.can_converse(cid) then raise exception 'Permission denied.';end if;if action='conversation_leave' then if exists(select 1 from conversations where id=cid and kind='group' and owner_id=me) then raise exception 'Owner must transfer ownership before leaving.';end if;update conversation_members set left_at=now() where conversation_id=cid and user_id=me;else update conversation_members set muted=(p->>'muted')::boolean where conversation_id=cid and user_id=me;end if;return '{}';
elsif action='message_send' then
cid=(p->>'conversation_id')::uuid;if not public.can_converse(cid) then raise exception 'Permission denied.';end if;select * into conv from conversations where id=cid for update;if not public.can_converse(cid) then raise exception 'Permission denied.';end if;if conv.kind='direct' and exists(select 1 from conversation_members where conversation_id=cid and public.blocked(me,user_id)) then raise exception 'Blocked players cannot send private messages.';end if;
if conv.kind='direct' and (select count(*) from conversation_members where conversation_id=cid and left_at is null)<2 then raise exception 'Message request must be accepted before sending.';end if;
txt=public.clean_text(coalesce(p->>'content',''),4000);ids=array(select value::uuid from jsonb_array_elements_text(coalesce(p->'attachments','[]')));if cardinality(ids)>4 or length(txt)=0 and cardinality(ids)=0 then raise exception 'Message requires text or an attachment.';end if;rid=nullif(p->>'reply_to','')::uuid;if rid is not null and not exists(select 1 from messages where id=rid and conversation_id=cid and not hidden and deleted_at is null) then raise exception 'Invalid reply.';end if;
select id into mid from messages where author_id=me and client_id=(p->>'client_id')::uuid;if mid is not null then return jsonb_build_object('id',mid);end if;
foreach asset in array ids loop if not exists(select 1 from media_assets where id=asset and owner_id=me and scope='chat' and conversation_id=cid and not attached) then raise exception 'Attachment unavailable.';end if;end loop;
insert into messages(conversation_id,author_id,content,reply_to,client_id) values(cid,me,txt,rid,(p->>'client_id')::uuid) returning id into mid;foreach asset in array ids loop insert into message_attachments(message_id,asset_id) values(mid,asset);update media_assets set attached=true where id=asset;end loop;update conversations set updated_at=now() where id=cid;
if conv.kind<>'global' then for r in select user_id from conversation_members where conversation_id=cid and left_at is null and not muted loop perform public.notify_player(r.user_id,me,'message','New private message','/messages/'||cid,'message:'||mid||':'||r.user_id);end loop;end if;return jsonb_build_object('id',mid);
elsif action in ('message_edit','message_delete','message_react') then
select * into msg from messages where id=(p->>'id')::uuid;if not found or not public.can_read_message(msg.id) then raise exception 'Not found.';end if;if action='message_react' then if msg.deleted_at is not null then raise exception 'Message was deleted.';end if;if exists(select 1 from message_reactions where message_id=msg.id and user_id=me and emoji=p->>'emoji') then delete from message_reactions where message_id=msg.id and user_id=me and emoji=p->>'emoji';else insert into message_reactions(message_id,user_id,emoji) values(msg.id,me,p->>'emoji');end if;
else if msg.author_id<>me then raise exception 'Permission denied.';end if;if msg.deleted_at is not null then raise exception 'Message was deleted.';end if;if action='message_delete' then update messages set content='',deleted_at=now(),updated_at=now() where id=msg.id;else txt=public.clean_text(p->>'content',4000);if txt='' then raise exception 'Message cannot be empty.';end if;update messages set content=txt,edited_at=now(),updated_at=now() where id=msg.id;end if;end if;return '{}';
elsif action='receipt' then
cid=(p->>'conversation_id')::uuid;if not public.can_converse(cid) then raise exception 'Permission denied.';end if;
insert into message_receipts(message_id,user_id,read_at) select id,me,case when coalesce((p->>'read')::boolean,true) then now() else null end from messages where conversation_id=cid and author_id<>me and deleted_at is null and not hidden and created_at>now()-interval '30 days' order by created_at desc limit 100 on conflict(message_id,user_id) do update set read_at=coalesce(message_receipts.read_at,excluded.read_at);
if coalesce((p->>'read')::boolean,true) then update conversation_members set last_read_at=now() where conversation_id=cid and user_id=me;update notifications set read_at=now() where user_id=me and kind='message' and href='/messages/'||cid and read_at is null;end if;return '{}';
elsif action='block' then target=(p->>'user_id')::uuid;if target=me then raise exception 'Invalid user.';end if;if coalesce((p->>'blocked')::boolean,true) then insert into user_blocks(blocker_id,blocked_id) values(me,target) on conflict do nothing;update conversation_invites set status='revoked' where status='pending' and(sender_id=target and recipient_id=me or sender_id=me and recipient_id=target);delete from notifications where user_id=me and actor_id=target;else delete from user_blocks where blocker_id=me and blocked_id=target;end if;return '{}';
elsif action='news_save' then
nid=coalesce(nullif(p->>'id','')::uuid,gen_random_uuid());select * into post from news_posts where id=nid for update;if found and (post.author_id<>me or post.state<>'published') then raise exception 'Permission denied.';end if;
foreach asset in array array[nullif(p->>'cover_id','')::uuid,nullif(p->>'video_id','')::uuid] loop if asset is not null and not exists(select 1 from media_assets where id=asset and owner_id=me and scope='news' and post_id=nid and mime~'^(image|video)/') then raise exception 'Attachment unavailable.';end if;end loop;
if nullif(p->>'cover_id','') is null or not exists(select 1 from media_assets where id=(p->>'cover_id')::uuid and mime like 'image/%') then raise exception 'News needs a cover image.';end if;if nullif(p->>'video_id','') is not null and not exists(select 1 from media_assets where id=(p->>'video_id')::uuid and mime like 'video/%') then raise exception 'Invalid article video.';end if;
if post.id is null then insert into news_posts(id,author_id,headline,body,game,platform,category,tags,source_type,source_url,cover_id,video_id) values(nid,me,public.clean_text(p->>'headline',160),public.clean_text(p->>'body',30000),p->>'game',p->>'platform',p->>'category',array(select jsonb_array_elements_text(coalesce(p->'tags','[]'))),p->>'source_type',coalesce(p->>'source_url',''),nullif(p->>'cover_id','')::uuid,nullif(p->>'video_id','')::uuid) returning id into nid;
else update news_posts set headline=public.clean_text(p->>'headline',160),body=public.clean_text(p->>'body',30000),game=p->>'game',platform=p->>'platform',category=p->>'category',tags=array(select jsonb_array_elements_text(coalesce(p->'tags','[]'))),source_type=p->>'source_type',source_url=coalesce(p->>'source_url',''),cover_id=nullif(p->>'cover_id','')::uuid,video_id=nullif(p->>'video_id','')::uuid,verified=false,updated_at=now() where id=nid;end if;
update media_assets set attached=true where id in(nullif(p->>'cover_id','')::uuid,nullif(p->>'video_id','')::uuid);return jsonb_build_object('id',nid);
elsif action='news_delete' then nid=(p->>'id')::uuid;update news_posts set state='removed',updated_at=now() where id=nid and author_id=me;if not found then raise exception 'Permission denied.';end if;return '{}';
elsif action in ('news_like','news_bookmark','news_view') then nid=(p->>'id')::uuid;select * into post from news_posts where id=nid and state='published';if not found then raise exception 'Not found.';end if;
if action='news_like' then if exists(select 1 from news_likes where post_id=nid and user_id=me) then delete from news_likes where post_id=nid and user_id=me;else insert into news_likes(post_id,user_id) values(nid,me);perform public.notify_player(post.author_id,me,'like','Someone liked your article','/news/'||nid,'like:'||nid||':'||me);end if;
elsif action='news_bookmark' then if exists(select 1 from news_bookmarks where post_id=nid and user_id=me) then delete from news_bookmarks where post_id=nid and user_id=me;else insert into news_bookmarks(post_id,user_id) values(nid,me);end if;
else insert into news_views(post_id,user_id) values(nid,me) on conflict do nothing;end if;return '{}';
elsif action='comment_save' then nid=(p->>'post_id')::uuid;if not exists(select 1 from news_posts where id=nid and state='published') then raise exception 'Not found.';end if;rid=nullif(p->>'parent_id','')::uuid;if rid is not null and not exists(select 1 from news_comments where id=rid and post_id=nid and parent_id is null and deleted_at is null and not hidden) then raise exception 'Invalid reply. Replies support one level.';end if;mid=nullif(p->>'id','')::uuid;txt=public.clean_text(p->>'content',2000);
if mid is not null then update news_comments set content=txt,edited_at=now(),updated_at=now() where id=mid and author_id=me and post_id=nid and deleted_at is null;if not found then raise exception 'Permission denied.';end if;else insert into news_comments(post_id,author_id,parent_id,content) values(nid,me,rid,txt) returning id into mid;select author_id into target from news_posts where id=nid;perform public.notify_player(target,me,'comment','New comment on your article','/news/'||nid,'comment:'||mid);if rid is not null then select author_id into target from news_comments where id=rid;perform public.notify_player(target,me,'reply','Someone replied to your comment','/news/'||nid,'reply:'||mid);end if;end if;return '{}';
elsif action='comment_delete' then update news_comments set content='This comment was deleted',deleted_at=now(),updated_at=now() where id=(p->>'id')::uuid and author_id=me;if not found then raise exception 'Permission denied.';end if;return '{}';
elsif action='report' then target=(p->>'target_id')::uuid;op=p->>'target_type';if not(case op when 'message' then public.can_read_message(target) when 'news' then public.can_read_news(target) when 'comment' then exists(select 1 from news_comments where id=target and not hidden and public.can_read_news(post_id)) when 'user' then exists(select 1 from profiles where id=target) else false end) then raise exception 'Permission denied.';end if;
insert into reports(reporter_id,target_type,target_id,reason,explanation) values(me,op,target,p->>'reason',coalesce(p->>'explanation','')) on conflict(reporter_id,target_type,target_id) do nothing;return '{}';
elsif action='notification_read' then update notifications set read_at=now() where user_id=me and read_at is null and(p->>'id' is null or id=(p->>'id')::uuid);return '{}';
elsif action='admin_stats' then if not public.staff() then raise exception 'Permission denied.';end if;return jsonb_build_object('users',(select count(*) from profiles),'active',(select count(*) from user_presence where last_seen_at>now()-interval '5 minutes'),'new_users',(select count(*) from profiles where created_at>now()-interval '1 day'),'messages',(select count(*) from messages),'news',(select count(*) from news_posts),'reports',(select count(*) from reports where status in ('open','under_review')),'suspended',(select count(*) from user_roles where state='suspended'),'banned',(select count(*) from user_roles where state='banned'));
elsif action='report_context' then if not public.staff() then raise exception 'Permission denied.';end if;select * into r from reports where id=(p->>'id')::uuid;if not found then raise exception 'Not found.';end if;if exists(select 1 from private.report_snapshots where report_id=r.id) then return(select snapshot from private.report_snapshots where report_id=r.id);end if;case r.target_type when 'message' then return coalesce((select snapshot from private.content_evidence where target_type='message' and target_id=r.target_id),(select to_jsonb(m) from messages m where id=r.target_id));when 'news' then return(select to_jsonb(n) from news_posts n where id=r.target_id);when 'comment' then return coalesce((select snapshot from private.content_evidence where target_type='comment' and target_id=r.target_id),(select to_jsonb(c) from news_comments c where id=r.target_id));else return(select to_jsonb(u) from profiles u where id=r.target_id);end case;
elsif action='moderate' then
if not public.staff() then raise exception 'Permission denied.';end if;target=(p->>'target_id')::uuid;op=p->>'operation';txt=public.clean_text(p->>'reason',1000);if length(txt)<5 then raise exception 'Invalid reason. Use at least five characters.';end if;
if op='suspend' and not public.administrator() and not(select moderators_can_suspend from community_settings where id=true) then raise exception 'Permission denied.';end if;
if op in ('ban','unban','role') and not public.administrator() then raise exception 'Only administrators can perform this action.';end if;
if op in ('ban','unban','suspend','role') then if target=me or exists(select 1 from user_roles where user_id=target and role='administrator') or not public.administrator() and exists(select 1 from user_roles where user_id=target and role='moderator') then raise exception 'Permission denied.';end if;
if op='role' then if p->>'role' not in ('player','moderator') then raise exception 'Invalid role.';end if;update user_roles set role=p->>'role',updated_at=now() where user_id=target;
else update user_roles set state=case op when 'ban' then 'banned' when 'unban' then 'active' else 'suspended' end,suspended_until=case when op='suspend' then now()+interval '24 hours' else null end,updated_at=now() where user_id=target;end if;
perform public.notify_player(target,me,'moderation','Account moderation decision: '||txt,'/settings','moderation:'||gen_random_uuid());
elsif op in ('news_hide','news_restore','news_remove','news_verify','news_unverify') then update news_posts set state=case op when 'news_hide' then 'hidden' when 'news_restore' then 'published' when 'news_remove' then 'removed' else state end,verified=case op when 'news_verify' then true when 'news_unverify' then false else verified end,updated_at=now() where id=target;select author_id into other from news_posts where id=target;perform public.notify_player(other,me,'moderation','Your article received a moderation decision: '||txt,'/news/'||target,'moderation:'||gen_random_uuid());
elsif op in ('message_hide','message_restore') then if not exists(select 1 from messages where id=target and conversation_id='00000000-0000-4000-8000-000000000001') then raise exception 'Only public messages can be moderated here.';end if;update messages set hidden=(op='message_hide'),updated_at=now() where id=target;
elsif op in ('comment_hide','comment_restore') then update news_comments set hidden=(op='comment_hide'),updated_at=now() where id=target;
elsif op='report_status' then update reports set status=p->>'status',updated_at=now() where id=target;insert into report_notes(report_id,moderator_id,content) values(target,me,txt);select reporter_id into other from reports where id=target;perform public.notify_player(other,me,'moderation','Your report was updated: '||txt,'/settings','report:'||target||':'||(p->>'status'));else raise exception 'Invalid moderation action.';end if;
insert into moderation_actions(actor_id,action,target_type,target_id,reason) values(me,op,coalesce(p->>'target_type','user'),target,txt);return '{}';
else raise exception 'Invalid command.';end if;
end$$;
-- Aggregate engagement without exposing who bookmarked an article.
create function public.news_engagement(nids uuid[]) returns table(post_id uuid,likes bigint,comments bigint,bookmarks bigint,views bigint) language sql stable security definer set search_path=public,pg_temp as $$select n.id,(select count(*) from news_likes where news_likes.post_id=n.id),(select count(*) from news_comments where news_comments.post_id=n.id and not hidden and deleted_at is null),(select count(*) from news_bookmarks where news_bookmarks.post_id=n.id),(select count(*) from news_views where news_views.post_id=n.id) from news_posts n where n.id=any(nids[1:100]) and public.can_read_news(n.id)$$;
-- Restrict helper invocation. Security-definer command code may still use them.
revoke all on function public.new_account(),public.rate_check(text,int),public.notify_player(uuid,uuid,text,text,text,text),public.clean_text(text,int),public.blocked(uuid,uuid) from public,anon,authenticated;
revoke all on function public.nexzza(text,jsonb),public.news_engagement(uuid[]),public.active_player(),public.staff(),public.administrator(),public.can_converse(uuid),public.can_read_message(uuid),public.can_read_news(uuid),public.can_read_asset(uuid) from public,anon;
grant execute on function public.nexzza(text,jsonb),public.news_engagement(uuid[]),public.active_player(),public.staff(),public.administrator(),public.can_converse(uuid),public.can_read_message(uuid),public.can_read_news(uuid),public.can_read_asset(uuid) to authenticated;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon,authenticated;
insert into conversations(id,kind,name) values('00000000-0000-4000-8000-000000000001','global','Global lobby');
-- Storage is private. Browser upload/read policies are intentionally absent: the
-- server validates bytes, ownership and membership before upload/signing.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('avatars','avatars',false,10485760,array['image/jpeg','image/png','image/webp','image/gif']),
('global-attachments','global-attachments',false,104857600,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf','text/plain']),
('private-attachments','private-attachments',false,104857600,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf','text/plain']),
('voice-recordings','voice-recordings',false,26214400,array['audio/webm','audio/ogg','audio/mp4']),
('news-media','news-media',false,104857600,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']) on conflict(id) do nothing;
-- Private Realtime broadcast and presence also use database membership.
create policy realtime_read on realtime.messages for select to authenticated using(public.can_use_channel(realtime.topic()));
create policy realtime_write on realtime.messages for insert to authenticated with check(public.can_use_channel(realtime.topic()));
alter publication supabase_realtime add table public.messages,public.message_reactions,public.message_receipts,public.notifications,public.conversation_members,public.conversation_invites,public.news_comments,public.user_roles,public.conversations,public.news_likes;


-- Unread messages remain counted even when a conversation is muted.
create function private.unread_counts() returns jsonb language sql stable security definer set search_path='' as $$
select case when public.active_player() then coalesce((select jsonb_object_agg(cid,n) from (
select m.conversation_id::text as cid,count(*)::int as n from public.messages m
join public.conversation_members cm on cm.conversation_id=m.conversation_id and cm.user_id=auth.uid() and cm.left_at is null
join public.conversations c on c.id=m.conversation_id and c.deleted_at is null
where m.author_id<>auth.uid() and not m.hidden and m.deleted_at is null and m.created_at>coalesce(cm.last_read_at,cm.joined_at)
group by m.conversation_id) counts),'{}'::jsonb) else '{}'::jsonb end $$;
revoke all on function private.unread_counts() from public,anon;
grant execute on function private.unread_counts() to authenticated;
create function public.unread_counts() returns jsonb language sql security invoker set search_path='' as $$select private.unread_counts()$$;
revoke all on function public.unread_counts() from public,anon;
grant execute on function public.unread_counts() to authenticated;
grant all on all tables in schema public to service_role;

-- Elevated implementations are never exposed as Data API RPCs.
alter function public.active_player() set schema private;
create function public.active_player() returns boolean language sql security invoker set search_path='' as $$ select private.active_player() $$;
revoke all on function public.active_player() from public,anon;
grant execute on function public.active_player() to authenticated;
alter function public.staff() set schema private;
create function public.staff() returns boolean language sql security invoker set search_path='' as $$ select private.staff() $$;
revoke all on function public.staff() from public,anon;
grant execute on function public.staff() to authenticated;
alter function public.administrator() set schema private;
create function public.administrator() returns boolean language sql security invoker set search_path='' as $$ select private.administrator() $$;
revoke all on function public.administrator() from public,anon;
grant execute on function public.administrator() to authenticated;
alter function public.can_converse(uuid) set schema private;
create function public.can_converse(cid uuid) returns boolean language sql security invoker set search_path='' as $$ select private.can_converse(cid) $$;
revoke all on function public.can_converse(uuid) from public,anon;
grant execute on function public.can_converse(uuid) to authenticated;
alter function public.can_read_message(uuid) set schema private;
create function public.can_read_message(mid uuid) returns boolean language sql security invoker set search_path='' as $$ select private.can_read_message(mid) $$;
revoke all on function public.can_read_message(uuid) from public,anon;
grant execute on function public.can_read_message(uuid) to authenticated;
alter function public.can_read_news(uuid) set schema private;
create function public.can_read_news(nid uuid) returns boolean language sql security invoker set search_path='' as $$ select private.can_read_news(nid) $$;
revoke all on function public.can_read_news(uuid) from public,anon;
grant execute on function public.can_read_news(uuid) to authenticated;
alter function public.can_read_asset(uuid) set schema private;
create function public.can_read_asset(aid uuid) returns boolean language sql security invoker set search_path='' as $$ select private.can_read_asset(aid) $$;
revoke all on function public.can_read_asset(uuid) from public,anon;
grant execute on function public.can_read_asset(uuid) to authenticated;
alter function public.can_use_channel(text) set schema private;
create function public.can_use_channel(topic text) returns boolean language sql security invoker set search_path='' as $$ select private.can_use_channel(topic) $$;
revoke all on function public.can_use_channel(text) from public,anon;
grant execute on function public.can_use_channel(text) to authenticated;
alter function public.nexzza(text,jsonb) set schema private;
create function public.nexzza(action text,p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.nexzza(action,p) $$;
revoke all on function public.nexzza(text,jsonb) from public,anon;
grant execute on function public.nexzza(text,jsonb) to authenticated;
alter function public.news_engagement(uuid[]) set schema private;
create function public.news_engagement(nids uuid[]) returns table(post_id uuid,likes bigint,comments bigint,bookmarks bigint,views bigint) language sql security invoker set search_path='' as $$ select * from private.news_engagement(nids) $$;
revoke all on function public.news_engagement(uuid[]) from public,anon;
grant execute on function public.news_engagement(uuid[]) to authenticated;
alter function public.news_feed(jsonb) set schema private;
create function public.news_feed(p jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$ select private.news_feed(p) $$;
revoke all on function public.news_feed(jsonb) from public,anon;
grant execute on function public.news_feed(jsonb) to authenticated;
commit;

