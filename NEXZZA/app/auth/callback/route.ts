import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const db = await serverClient();
  let error: unknown;
  const next =
    url.searchParams.get("next") === "/reset-password"
      ? "/reset-password"
      : "/chat";
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (code) ({ error } = await db.auth.exchangeCodeForSession(code));
  else if (
    token_hash &&
    (type === "signup" || type === "recovery" || type === "email")
  )
    ({ error } = await db.auth.verifyOtp({ token_hash, type }));
  else error = true;
  return NextResponse.redirect(
    new URL(
      error
        ? "/login?error=expired"
        : type === "recovery"
          ? "/reset-password"
          : next,
      url.origin,
    ),
  );
}
