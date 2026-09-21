"use client";
import { HardLink as Link } from "@/components/hard-link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main id="main-content" className="center-page">
      <div>
        <p className="eyebrow blue justify-center">A SMALL DETOUR</p>
        <h1>We couldn’t load this page.</h1>
        <p>Please try again. Your saved community content is still there.</p>
        <div className="row justify-center">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
