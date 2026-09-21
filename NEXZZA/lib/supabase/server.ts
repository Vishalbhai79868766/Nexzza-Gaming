import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile, Role } from "@/lib/types";
export function publicConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
  };
}
export async function serverClient() {
  const jar = await cookies();
  const { url, key } = publicConfig();
  if (!url || !key) throw new Error("Community connection is not configured.");
  return createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, {
              ...options,
              ...(jar.get("nexzza-remember")?.value === "no"
                ? { maxAge: undefined, expires: undefined }
                : {}),
            }),
          );
        } catch {
          /* Server components refresh through middleware. */
        }
      },
    },
  });
}
export async function requireUser() {
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  if (!user.email_confirmed_at) redirect("/verify-email");
  const [p, r, a] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).single(),
    db.from("user_roles").select("*").eq("user_id", user.id).single(),
    db.rpc("active_player"),
  ]);
  if (!a.data || p.error || r.error) redirect("/403");
  return {
    db,
    user,
    profile: p.data as Profile,
    role: r.data as Role,
    remember: (await cookies()).get("nexzza-remember")?.value !== "no",
    ...publicConfig(),
  };
}
export async function apiUser() {
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || !user.email_confirmed_at)
    throw new Error("Sign in with a verified email to continue.");
  const { data } = await db.rpc("active_player");
  if (!data) throw new Error("Your account is currently unavailable.");
  return { db, user };
}
export function assertOrigin(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    throw new Error("Invalid request origin.");
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
