# NEXZZA verification — September 20, 2026

## Completed

- Strict TypeScript check passed.
- Application ESLint check passed with zero errors and zero warnings.
- Cloudflare-compatible Sites production build passed.
- 20 automated tests passed using the recovered SQL migrations in isolated Postgres and input/file validation tests.
- Browser inspected landing design, public navigation, guidelines, and signed-out redirect from Gaming news to login.
- 14 live checks passed against the connected Supabase project:

- Real email/password sign-in for two players and a moderator
- Live invitations, acceptance, profile relationship and private access
- Live messages, embedded media query and read receipts
- Presence profile relationship
- Staff profile-role relationship
- News feed
- Community settings visibility
- Unread message aggregate
- Live realtime delivery between two authenticated players
- Validated upload through the deployed media function
- Private signed file can be retrieved by its owner
- Another player cannot open a pending private upload
- Spoofed image bytes are rejected
- Unused test upload removed from storage

Temporary accounts and conversations were removed after signing out. The test upload was deleted through the authenticated media service before its test account was removed. No test credentials or test content ship with the application.

## Remaining operator checks

- Email verification/reset delivery and redirect configuration could not be checked: the connected database tools do not expose Auth URL/SMTP settings, and the Supabase dashboard requires sign-in in the testing browser. Set the deployed Site URL and allowed callback URLs in Supabase before inviting players. See OPERATIONS.md.
- Microphone permission, audio recording/playback across browsers, and physical mobile devices require a device check. Recording format detection and fallback/error states are implemented.
- Authenticated UI pages were typechecked and their live data queries tested; this browser was not signed into a community account.
- The existing Site audience remains owner-private. No custom domain or broader audience was requested.

## Running tests

Run `pnpm test`, `pnpm typecheck`, and `pnpm lint`. `tests/live-smoke.mjs` is an operator-run integration harness requiring deliberately provisioned, disposable test accounts in `/tmp/nexzza-live-test.json`; it does not create or retain accounts by itself. Do not use real players as test fixtures.
