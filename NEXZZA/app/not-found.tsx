import { HardLink as Link } from "@/components/hard-link";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <PublicShell>
      <div className="center-page">
        <div>
          <p className="eyebrow blue justify-center">OFF THE MAP</p>
          <h1>Page not found.</h1>
          <p>
            This page may have moved, been removed, or be outside your access.
            Your next adventure is still waiting.
          </p>
          <Button asChild>
            <Link href="/">Back to NEXZZA</Link>
          </Button>
        </div>
      </div>
    </PublicShell>
  );
}
