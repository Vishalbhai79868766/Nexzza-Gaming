import { PublicShell } from "@/components/public-shell";
export const metadata = { title: "TERMS OF USE" };
export default function Page() {
  return (
    <PublicShell>
      <article className="wrap legal">
        <p className="eyebrow blue">TERMS OF USE</p>
        <h1>The ground rules for playing together.</h1>
        <p>
          By creating an account, you agree to these terms and the community
          guidelines. Last updated September 20, 2026.
        </p>
        <section>
          <h2>Your account.</h2>
          <p>
            Use an email address you control, verify it, and keep your password
            private. You are responsible for activity on your account. Do not
            impersonate someone else, evade a restriction, or create accounts
            for abusive purposes. If you need a parent’s or guardian’s
            permission to use an online community where you live, obtain that
            permission.
          </p>
        </section>
        <section>
          <h2>Your content.</h2>
          <p>
            You remain responsible for the content you share. Only upload
            material you have the right to use. By posting, you allow NEXZZA to
            store and display that content to its intended audience and to
            review reported content for moderation. You can edit or remove your
            own content through the site’s controls, subject to moderation
            evidence retention.
          </p>
        </section>
        <section>
          <h2>Acceptable use.</h2>
          <p>
            Follow the community guidelines. Do not harass others, upload
            harmful or unlawful material, send spam or scams, probe other
            people’s private information, or attempt to bypass account and
            access controls. Do not exploit the service to disrupt it or
            impersonate staff.
          </p>
        </section>
        <section>
          <h2>Moderation.</h2>
          <p>
            Moderators and administrators may review reports, restrict content,
            suspend accounts, or remove access for violations. Only
            administrators can assign staff roles. Group owners control
            membership in their own groups. Reported content may be preserved to
            support a fair review.
          </p>
        </section>
        <section>
          <h2>Community stories and outside links.</h2>
          <p>
            Players submit news and opinions. Information may be incomplete or
            incorrect; check original sources before relying on it. External
            sites have their own terms and privacy practices. NEXZZA does not
            control those sites.
          </p>
        </section>
        <section>
          <h2>Availability and changes.</h2>
          <p>
            Features and availability may change. The service may be interrupted
            for maintenance, faults, or moderation. Keep your own copies of
            important content. These terms describe the community’s operating
            rules and do not remove any rights that apply to you under law.
          </p>
        </section>
      </article>
    </PublicShell>
  );
}
