# NEXZZA operations

This is the recovered NEXZZA Site, with its existing Supabase schema preserved. Public pages are the landing, account access, authentication, and legal pages. Community routes require a confirmed email and an active database account.

## Configuration

Copy .env.example to .env for development. Supply the Supabase URL and publishable key. Hosted values are stored in Sites environment settings. No service-role key belongs in a browser or in this repository.

The nexzza-media Edge Function uses Supabase's built-in server credentials. Every request verifies the user, checks account state and row-level access, validates the upload type, size and magic bytes, then creates metadata only after storage succeeds. Private media links expire after 60 seconds. A link already issued can remain usable for up to that interval after membership removal. PDF/text files download rather than render inline.

## Email authentication setup

In Supabase Authentication, enable email/password sign-up and email confirmation. Set Site URL to the deployed NEXZZA URL. Allow the exact /auth/callback URL and /auth/callback?next=/reset-password redirect. Use a production SMTP provider before inviting the public; provider quotas and email delivery are separate from the app.

Recommended confirmation template link: {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup (ensure the configured confirmation RedirectTo has no query).
Recommended recovery template: use the Site URL followed by /auth/callback?token_hash={{ .TokenHash }}&type=recovery. This verifies tokens across browsers. PKCE code callbacks are also supported when opened in the initiating browser.

The API applies atomic database quotas to authentication operations. Supabase's own password/email policies also apply. Rate-limit counters are internal and cannot be read by players.

## First administrator

Register and verify the operator account normally. A trusted Supabase project owner must then assign the first administrator in the SQL editor, using the verified account UUID:

```sql
update public.user_roles r
set role = 'administrator', updated_at = now()
from auth.users u
where r.user_id = u.id
  and u.id = 'REPLACE_WITH_VERIFIED_OPERATOR_UUID'::uuid
  and u.email_confirmed_at is not null;
```

Do not automatically promote the first signup. From then on, an administrator can assign and remove moderator roles in the protected dashboard. User-editable metadata never controls permissions. Moderators can suspend players only when allowed in community settings; bans and staff assignments remain administrator-only.

## Privacy and retention

Provide the operator's support/privacy contact before opening the Site to the public. Current audience remains owner-private. Private messages are access-controlled, not end-to-end encrypted. Moderation retains snapshots of reported content and evidence of deleted text. Soft-deleted content is excluded from the normal UI. Set an operational retention period and implement scheduled cleanup of old rate counters and unused unattached uploads according to that policy. No cleanup of existing user content is performed by this restoration.

## Source and deployment

Run pnpm install, pnpm exec tsc --noEmit, pnpm test, and pnpm build. The established Sites scripts build a Cloudflare-compatible Vinext Worker from Next.js App Router source. Persist exact code to the linked Site Git before packaging and deploying. Keep migrations in order; the first three were recovered verbatim from the deployed database's migration history and must not be replayed on the same database.

## QA boundaries

Database tests use isolated embedded Postgres roles and transactions to verify real SQL policies and commands. They do not deliver email, grant microphone permission, or exercise a physical mobile device. Live verification/reset email delivery requires the operator's mail configuration and a real inbox. Browser playback and recording depend on browser format support and user permission. See QA.md for the checks actually completed.

