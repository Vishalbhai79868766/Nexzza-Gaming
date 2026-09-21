import { PublicShell } from "@/components/public-shell";
export const metadata = { title: "PRIVACY POLICY" };
export default function Page() {
  return (
    <PublicShell>
      <article className="wrap legal">
        <p className="eyebrow blue">PRIVACY POLICY</p>
        <h1>Your space. Your privacy.</h1>
        <p>
          This page explains how NEXZZA’s community features handle your
          information. Last updated September 20, 2026.
        </p>
        <section>
          <h2>Information you provide.</h2>
          <p>
            Your account uses an email address and password. Your profile
            contains a permanent account ID, unique username, display name,
            avatar, bio, favourite games, and chosen status. We also store the
            messages, uploads, stories, comments, reactions, bookmarks, reports,
            and settings you create.
          </p>
        </section>
        <section>
          <h2>What other players can see.</h2>
          <p>
            Verified members can see your profile and public community content.
            Conversation content is limited to current members. Your bookmark
            list, block list, and notifications are visible only to you. You can
            hide your activity and last-seen information in Settings.
          </p>
        </section>
        <section>
          <h2>Private conversations and moderation.</h2>
          <p>
            Private conversations are protected by membership controls; they are
            not end-to-end encrypted. If a participant reports content,
            moderators can review that specific content and its retained report
            snapshot. Moderation records support community safety and
            accountability.
          </p>
        </section>
        <section>
          <h2>Files and service providers.</h2>
          <p>
            NEXZZA uses Supabase for authentication, database records, realtime
            updates, and file storage, and Sites for hosting. Uploads are stored
            in private buckets. The application checks your access before
            issuing a short-lived file link. Anyone you share a downloaded file
            with may retain it.
          </p>
        </section>
        <section>
          <h2>Cookies and preferences.</h2>
          <p>
            Authentication cookies keep you signed in. The remember-me choice
            controls whether your login cookie persists after the browser
            session. A local preference stores your color theme. This version
            does not add advertising trackers or third-party analytics.
          </p>
        </section>
        <section>
          <h2>Retention and your choices.</h2>
          <p>
            You can edit your profile, delete your own messages and comments,
            remove your stories, change activity visibility, and block players.
            Deletion in community views can be a soft deletion. Report snapshots
            and moderation evidence may be retained separately. Contact the site
            operator for account or data-deletion requests; automated account
            deletion is not currently available.
          </p>
        </section>
        <section>
          <h2>Security and changes.</h2>
          <p>
            Access controls, file checks, and moderation help protect the
            community, but no online system can guarantee complete security. Use
            a unique password and share personal information thoughtfully. This
            policy may be updated when the site’s features or data practices
            change.
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
