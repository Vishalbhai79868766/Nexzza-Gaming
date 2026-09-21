import { HardLink as Link } from "@/components/hard-link";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
export const metadata = { title: "Account access" };
export default function Page() {
  return (
    <PublicShell>
      <div className="center-page">
        <div>
          <p className="eyebrow blue justify-center">ACCOUNT ACCESS</p>
          <h1>This space is unavailable.</h1>
          <p>
            Your account may need email verification, be under a moderation
            restriction, or lack permission for this page. Temporary suspensions
            expire automatically.
          </p>
          <div className="row justify-center">
            <Button asChild>
              <Link href="/verify-email">Verify email</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
