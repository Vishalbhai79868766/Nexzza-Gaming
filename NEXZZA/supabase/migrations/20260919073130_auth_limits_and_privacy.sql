begin;
-- Deliberately anonymous: returns a quota boolean, never account or credential data.
create function private.auth_attempt(subject text,operation text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer; maximum integer; network text;begin
 if subject !~ '^[a-f0-9]{64}$' or operation not in ('register','login','forgot','reset','username','resend') then raise exception 'Invalid request';end if;
 maximum:=case operation when 'username' then 60 when 'login' then 10 else 5 end;
 insert into private.auth_rate_limits values(subject,operation,date_trunc('minute',now()),1)
 on conflict(actor_hash,action,window_start) do update set hits=private.auth_rate_limits.hits+1 returning hits into n;
 if n>maximum then return false;end if;
 -- Additional shared ingress quota bounds callers who rotate identity hashes.
 network:=md5(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for','local'))||md5('nexzza');
 insert into private.auth_rate_limits values(network,'ingress',date_trunc('minute',now()),1)
 on conflict(actor_hash,action,window_start) do update set hits=private.auth_rate_limits.hits+1 returning hits into n;
 return n<=120;
end $$;
revoke all on function private.auth_attempt(text,text) from public;
grant execute on function private.auth_attempt(text,text) to anon,authenticated;
create function public.auth_attempt(subject text,operation text) returns boolean language sql security invoker set search_path='' as $$select private.auth_attempt(subject,operation)$$;
revoke all on function public.auth_attempt(text,text) from public;
grant execute on function public.auth_attempt(text,text) to anon,authenticated;
alter function public.username_available(text) set schema private;
create function public.username_available(candidate text) returns boolean language sql stable security invoker set search_path='' as $$select private.username_available(candidate)$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon,authenticated;
-- Only the command implementation may invoke mutation helpers.
revoke all on public.rate_limits from anon,authenticated;
-- Index remaining commonly traversed foreign keys.
create index likes_user on public.news_likes(user_id);
create index views_user on public.news_views(user_id);
create index comments_author on public.news_comments(author_id);
create index audit_actor on public.moderation_actions(actor_id);
create index notes_report on public.report_notes(report_id);
create index notes_author on public.report_notes(moderator_id);
create index notification_actor on public.notifications(actor_id);
commit;

