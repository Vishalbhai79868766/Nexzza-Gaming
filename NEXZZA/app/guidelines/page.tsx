import { PublicShell } from "@/components/public-shell";
export const metadata = { title: "COMMUNITY GUIDELINES" };
export default function Page() {
  return (
    <PublicShell>
      <article className="wrap legal">
        <p className="eyebrow blue">COMMUNITY GUIDELINES</p>
        <h1>A community worth coming back to.</h1>
        <p>
          All games. All players. One shared responsibility: make this a
          welcoming place to play and talk.
        </p>
        <section>
          <h2>Respect the person behind the username.</h2>
          <p>
            Be kind, even when you disagree. Harassment, threats, hate speech,
            targeted abuse, and sharing someone’s private information have no
            place here. Respect people’s boundaries and their choice not to
            reply.
          </p>
        </section>
        <section>
          <h2>Keep the lobby useful.</h2>
          <p>
            Talk about games, share ideas, and help each other. Avoid spam,
            impersonation, scams, malicious files, cheating services, and
            repeated unwanted invitations. Keep graphic, sexual, and
            exploitative content out of the community.
          </p>
        </section>
        <section>
          <h2>Share stories responsibly.</h2>
          <p>
            Credit original reporting and link to sources. Label opinions,
            community announcements, and rumours accurately. Don’t present a
            leak as a confirmed fact. Upload only media you own or are allowed
            to share. A verified badge means a moderator reviewed the story; it
            is not a guarantee that every detail is correct.
          </p>
        </section>
        <section>
          <h2>Keep private spaces private.</h2>
          <p>
            Invite people who want to be there. Don’t share private
            conversations or recordings without permission. Group owners and
            admins manage membership. Blocking prevents private messages and
            invitations; public content may still be visible.
          </p>
        </section>
        <section>
          <h2>Report problems; don’t escalate them.</h2>
          <p>
            Use Report on a profile, message, comment, or article. Include
            enough context for moderators to understand the issue. Moderators
            can review the specific reported content, including a retained
            snapshot, and act on community rules.
          </p>
        </section>
        <section>
          <h2>What happens when rules are broken?</h2>
          <p>
            Moderators can hide public content and review reports. Depending on
            the community settings, they can temporarily suspend accounts.
            Administrators manage permanent bans and staff roles. Decisions are
            logged. Serious or repeated abuse may lead to loss of access.
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
