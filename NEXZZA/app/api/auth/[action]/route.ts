import { cookies } from "next/headers";
import { z } from "zod";
import { serverClient, assertOrigin, json } from "@/lib/supabase/server";
import { emailSchema, passwordSchema, usernameSchema } from "@/lib/validation";
const allowed = new Set([
  "register",
  "login",
  "forgot",
  "reset",
  "logout",
  "username",
  "resend",
]);
export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    assertOrigin(req);
    const { action } = await params;
    if (!allowed.has(action)) return json({ error: "Not found." }, 404);
    const raw = await req.text();
    if (raw.length > 12000)
      return json({ error: "Request is too large." }, 413);
    const p = JSON.parse(raw);
    const db = await serverClient();
    if (action === "logout") {
      await db.auth.signOut();
      return json({ ok: true });
    }
    const subject = String(p.email || p.username || "password-reset")
      .trim()
      .toLowerCase();
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(subject),
    );
    const subject_hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const quota = await db.rpc("auth_attempt", {
      subject: subject_hash,
      operation: action,
    });
    if (quota.error || !quota.data)
      return json(
        { error: "Too many attempts. Please wait a minute and try again." },
        429,
      );
    const origin = new URL(req.url).origin;
    if (action === "username") {
      const name = usernameSchema.parse(p.username);
      const { data, error } = await db.rpc("username_available", {
        candidate: name,
      });
      if (error) throw new Error("Could not check that username.");
      return json({ available: data });
    }
    if (action === "register") {
      const data = z
        .object({
          display_name: z.string().trim().min(2).max(40),
          username: usernameSchema,
          email: emailSchema,
          password: passwordSchema,
          confirm: z.string(),
          terms: z.literal(true),
        })
        .refine((v) => v.password === v.confirm, {
          message: "Passwords do not match.",
        })
        .parse(p);
      const { error } = await db.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: origin + "/auth/callback",
          data: {
            username: data.username,
            display_name: data.display_name,
            terms_accepted_at: new Date().toISOString(),
          },
        },
      });
      if (error)
        throw new Error(
          error.message.includes("Database")
            ? "That username may be taken. Try another."
            : error.message,
        );
      return json({
        ok: true,
        message: "Check your inbox for a verification link before signing in.",
      });
    }
    if (action === "login") {
      const data = z
        .object({
          email: emailSchema,
          password: z.string().min(1).max(128),
          remember: z.boolean().default(false),
        })
        .parse(p);
      (await cookies()).set("nexzza-remember", data.remember ? "yes" : "no", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: origin.startsWith("https:"),
        ...(data.remember ? { maxAge: 31536000 } : {}),
      });
      const { error } = await db.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error)
        throw new Error(
          "Could not sign in. Check your email and password, and verify your email first.",
        );
      return json({ ok: true });
    }
    if (action === "reset") {
      const data = z
        .object({ password: passwordSchema, confirm: z.string() })
        .refine((v) => v.password === v.confirm, {
          message: "Passwords do not match.",
        })
        .parse(p);
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user)
        throw new Error("Open the password reset link from your email first.");
      const { error } = await db.auth.updateUser({ password: data.password });
      if (error) throw new Error(error.message);
      await db.auth.signOut();
      return json({
        ok: true,
        message: "Password updated. You can now sign in.",
      });
    }
    const email = emailSchema.parse(p.email);
    if (action === "forgot")
      await db.auth.resetPasswordForEmail(email, {
        redirectTo: origin + "/auth/callback?next=/reset-password",
      });
    if (action === "resend")
      await db.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: origin + "/auth/callback" },
      });
    return json({
      ok: true,
      message:
        "If this email can receive this request, a link is on its way. Check your spam folder too.",
    });
  } catch (e) {
    return json(
      {
        error:
          e instanceof z.ZodError
            ? e.issues[0].message
            : e instanceof Error
              ? e.message
              : "Unable to complete this request.",
      },
      400,
    );
  }
}
