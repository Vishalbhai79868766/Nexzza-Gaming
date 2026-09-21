begin;
revoke create on schema public from public,anon,authenticated;
alter table public.media_assets add column post_id uuid;
create index media_post on public.media_assets(post_id);
alter table public.profiles add column show_last_seen boolean not null default true;
create table private.report_snapshots(report_id uuid primary key references public.reports(id) on delete cascade,snapshot jsonb not null,created_at timestamptz not null default now());
alter table private.report_snapshots enable row level security;
revoke all on private.report_snapshots from public,anon,authenticated;
create function private.snapshot_report() returns trigger language plpgsql security definer set search_path='' as $$
declare content jsonb;begin
case new.target_type
 when 'message' then select to_jsonb(m) into content from public.messages m where m.id=new.target_id;
 when 'news' then select to_jsonb(n) into content from public.news_posts n where n.id=new.target_id;
 when 'comment' then select to_jsonb(c) into content from public.news_comments c where c.id=new.target_id;
 else select to_jsonb(p) into content from public.profiles p where p.id=new.target_id;end case;
insert into private.report_snapshots(report_id,snapshot) values(new.id,coalesce(content,'{}'));
return new;end $$;
revoke all on function private.snapshot_report() from public,anon,authenticated;
create trigger snapshot_report after insert on public.reports for each row execute function private.snapshot_report();
create or replace function private.can_read_asset(aid uuid) returns boolean language sql stable security definer set search_path='' as $$
select public.active_player() and exists(select 1 from public.media_assets a where a.id=aid and (
(a.owner_id=auth.uid() and not a.attached and (a.conversation_id is null or public.can_converse(a.conversation_id)))
or exists(select 1 from public.profiles p where p.avatar_id=a.id)
or exists(select 1 from public.conversations c where c.icon_id=a.id and public.can_converse(c.id))
or exists(select 1 from public.message_attachments ma join public.messages m on m.id=ma.message_id where ma.asset_id=a.id and m.deleted_at is null and not m.hidden and public.can_converse(m.conversation_id))
or exists(select 1 from public.news_posts n where(a.id=n.cover_id or a.id=n.video_id) and public.can_read_news(n.id))
or (public.staff() and exists(select 1 from public.message_attachments ma join public.reports r on r.target_id=ma.message_id and r.target_type='message' where ma.asset_id=a.id and r.status in ('open','under_review')))
))$$;
drop policy presence_read on public.user_presence;
create policy presence_read on public.user_presence for select to authenticated using(public.active_player() and (user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=user_id and p.show_last_seen)));
-- Storage remains server-only. User-issued long-lived signed links cannot bypass removal.
-- Pending media is only committed by validated commands. No account may overwrite it.
alter table public.message_reactions replica identity full;
alter table public.news_likes replica identity full;
commit;

