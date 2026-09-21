import { apiUser, json, publicConfig } from "@/lib/supabase/server";
export async function GET() {
  try {
    const { user } = await apiUser();
    return json({ id: user.id, ...publicConfig() });
  } catch {
    return json({ error: "Sign in to continue." }, 401);
  }
}
