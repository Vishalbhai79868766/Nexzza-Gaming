import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { ProfileView } from "@/components/account";
export const metadata = { title: "Player profile" };
export default async function Page({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { db } = await requireUser();
  const { data: player, error } = await db
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .single();
  if (error || !player) notFound();
  const [r, p] = await Promise.all([
    db.from("user_roles").select("*").eq("user_id", player.id).single(),
    db
      .from("user_presence")
      .select("last_seen_at")
      .eq("user_id", player.id)
      .maybeSingle(),
  ]);
  if (!r.data) notFound();
  return (
    <ProfileView
      player={player}
      playerRole={r.data}
      lastSeen={p.data?.last_seen_at || null}
    />
  );
}
