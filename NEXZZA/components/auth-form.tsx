"use client";
import { useState } from "react";
import { HardLink as Link } from "@/components/hard-link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, MailCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PublicShell } from "@/components/public-shell";
import { Button, Input, Label, ErrorNotice } from "@/components/common";
import { hardNavigate } from "@/lib/hard-navigation";
import { authAction } from "@/lib/supabase/client";
type Mode =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "verify-email";
const titles: Record<Mode, string> = {
  login: "Welcome back, player.",
  register: "Your next chapter starts here.",
  "forgot-password": "Forgot your password?",
  "reset-password": "Choose a new password.",
  "verify-email": "One last step. Check your inbox.",
};
export function AuthForm({ mode }: { mode: Mode }) {
  const search = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    search.get("error")
      ? "That link has expired or was already used. Please request a new one."
      : "",
  );
  const [message, setMessage] = useState("");
  const [show, setShow] = useState(false);
  const [terms, setTerms] = useState(false);
  const [remember, setRemember] = useState(false);
  const [availability, setAvailability] = useState("");
  const emailNeeded = mode !== "reset-password";
  const passwordNeeded = ["login", "register", "reset-password"].includes(mode);
  return (
    <PublicShell>
      <div className="auth-layout">
        <aside className="auth-art">
          <div>
            <p className="eyebrow">YOUR GAME. YOUR PEOPLE.</p>
            <h2>Every great adventure starts together.</h2>
            <p>A whole community is waiting on the other side.</p>
          </div>
        </aside>
        <section className="auth-panel">
          <p className="eyebrow blue mb-4">WELCOME TO NEXZZA</p>
          <h1>{titles[mode]}</h1>
          <p className="muted small">
            {mode === "register"
              ? "One account. Every game. No phone number required."
              : mode === "login"
                ? "Your squad, your stories, your space."
                : mode === "verify-email"
                  ? "Open the verification link we emailed you, then sign in."
                  : "We’ll help you get back to your people."}
          </p>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setMessage("");
              const data = Object.fromEntries(new FormData(e.currentTarget));
              try {
                const result = await authAction(
                  mode === "forgot-password"
                    ? "forgot"
                    : mode === "reset-password"
                      ? "reset"
                      : mode === "verify-email"
                        ? "resend"
                        : mode,
                  { ...data, terms, remember },
                );
                if (mode === "login") {
                  hardNavigate("/chat");
                } else if (mode === "register") {
                  hardNavigate("/verify-email");
                } else setMessage(result.message || "Request completed.");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Please try again.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {mode === "register" && (
              <>
                <div className="field">
                  <Label htmlFor="display_name">Display name</Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    required
                    minLength={2}
                    maxLength={40}
                    autoComplete="nickname"
                    placeholder="What should we call you?"
                  />
                </div>
                <div className="field">
                  <Label htmlFor="username">Unique username</Label>
                  <Input
                    id="username"
                    name="username"
                    required
                    minLength={3}
                    maxLength={24}
                    autoComplete="username"
                    placeholder="your_player_name"
                    onBlur={async (e) => {
                      const name = e.target.value;
                      setAvailability("");
                      if (name.length >= 3)
                        try {
                          const r = await authAction("username", {
                            username: name,
                          });
                          setAvailability(
                            r.available
                              ? "Username is available."
                              : "This username is already taken.",
                          );
                        } catch (e) {
                          setAvailability(
                            e instanceof Error
                              ? e.message
                              : "Could not check username.",
                          );
                        }
                    }}
                  />
                  <p className="field-hint" aria-live="polite">
                    {availability ||
                      "3–24 characters. Letters, numbers, dots, and underscores."}
                  </p>
                </div>
              </>
            )}
            {emailNeeded && (
              <div className="field">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
            )}
            {passwordNeeded && (
              <div className="field">
                <div className="row spread">
                  <Label htmlFor="password">Password</Label>
                  {mode === "login" && (
                    <Link className="text-link small" href="/forgot-password">
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={show ? "text" : "password"}
                    required
                    minLength={mode === "login" ? 1 : 12}
                    maxLength={128}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    className="pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    aria-label={show ? "Hide password" : "Show password"}
                    onClick={() => setShow(!show)}
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
                {mode !== "login" && (
                  <p className="field-hint">
                    At least 12 characters, including uppercase, lowercase, and
                    a number.
                  </p>
                )}
              </div>
            )}
            {["register", "reset-password"].includes(mode) && (
              <div className="field">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="new-password"
                />
              </div>
            )}
            {mode === "register" && (
              <div className="row items-start small">
                <Checkbox
                  id="terms"
                  checked={terms}
                  onCheckedChange={(v) => setTerms(v === true)}
                  required
                />
                <Label htmlFor="terms" className="inline leading-5 text-xs">
                  I agree to the{" "}
                  <Link className="blue" href="/terms">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link className="blue" href="/privacy">
                    Privacy Policy
                  </Link>
                  , and I’ll follow the{" "}
                  <Link className="blue" href="/guidelines">
                    community guidelines
                  </Link>
                  .
                </Label>
              </div>
            )}
            {mode === "login" && (
              <div className="row">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <Label htmlFor="remember" className="text-xs">
                  Keep me signed in on this device
                </Label>
              </div>
            )}
            {error && <ErrorNotice error={error} />}{" "}
            {message && (
              <div className="notice row" role="status">
                <MailCheck size={22} />
                {message}
              </div>
            )}
            <Button
              size="lg"
              disabled={busy || (mode === "register" && !terms)}
            >
              {busy
                ? "One moment…"
                : mode === "login"
                  ? "Log in"
                  : mode === "register"
                    ? "Create your account"
                    : mode === "forgot-password"
                      ? "Send reset link"
                      : mode === "reset-password"
                        ? "Update password"
                        : "Resend verification email"}
              <ArrowRight size={16} />
            </Button>
          </form>
          <p className="small muted mt-6">
            {mode === "login" ? (
              <>
                New here?{" "}
                <Link className="text-link" href="/register">
                  Join NEXZZA
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link className="text-link" href="/login">
                  Log in
                </Link>
              </>
            )}
          </p>
        </section>
      </div>
    </PublicShell>
  );
}
