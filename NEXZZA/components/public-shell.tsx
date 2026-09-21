"use client";
import { HardLink as Link } from "@/components/hard-link";
import { Menu, Moon, Sun, ArrowUpRight } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
export function Logo() {
  return (
    <Link className="brand" href="/" aria-label="NEXZZA home">
      <span className="brand-icon">N</span>NEXZZA
      <span className="brand-dot">.</span>
    </Link>
  );
}
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle color theme"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="dark:block hidden" size={19} />
      <Moon className="dark:hidden" size={19} />
    </Button>
  );
}
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="public-header wrap">
        <Logo />
        <nav className="desktop-nav">
          <Link href="/#discover">Discover NEXZZA</Link>
          <Link href="/news">Gaming news</Link>
          <Link href="/guidelines">
            Our community <ArrowUpRight size={13} />
          </Link>
        </nav>
        <div className="row header-actions">
          <ThemeToggle />
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild className="desktop-join">
            <Link href="/register">Join NEXZZA</Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                className="mobile-menu"
                variant="outline"
                size="icon"
                aria-label="Open navigation"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetTitle>NEXZZA</SheetTitle>
              <SheetDescription>Your game. Your people.</SheetDescription>
              <nav className="stack p-6">
                <Link href="/#discover">Discover NEXZZA</Link>
                <Link href="/news">Gaming news</Link>
                <Link href="/guidelines">Community guidelines</Link>
                <Button asChild>
                  <Link href="/register">Join NEXZZA</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="public-footer wrap">
        <div>
          <Logo />
          <p>A little less solo. A lot more together.</p>
        </div>
        <div className="row wrap-row">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/guidelines">Guidelines</Link>
          <span>© {new Date().getFullYear()} NEXZZA</span>
        </div>
      </footer>
    </>
  );
}
