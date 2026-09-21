import { requireUser } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ChatRoom } from "@/components/chat-room";
export const metadata = { title: "Conversation" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { db, user } = await requireUser();
  const { data, error } = await db
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) notFound();
  if (data.kind === "direct") {
    const members = await db
      .from("conversation_members")
      .select(
        "profiles!conversation_members_user_id_fkey(display_name,username)",
      )
      .eq("conversation_id", id)
      .neq("user_id", user.id)
      .limit(1);
    const other = members.data?.[0]?.profiles as unknown as
      | { display_name: string; username: string }
      | undefined;
    if (other) data.name = other.display_name + " · @" + other.username;
  }
  return <ChatRoom conversation={data} />;
}
