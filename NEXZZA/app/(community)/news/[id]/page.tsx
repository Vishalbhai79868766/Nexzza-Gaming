import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { Article } from "@/components/news";
import type { NewsPost } from "@/lib/types";
export const metadata = { title: "Community story" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db } = await requireUser();
  const { data, error } = await db
    .from("news_posts")
    .select("*,profiles!news_posts_author_id_fkey(*)")
    .eq("id", id)
    .eq("state", "published")
    .single();
  if (error || !data) notFound();
  return <Article initial={data as unknown as NewsPost} />;
}
