import { apiUser, json, publicConfig } from "@/lib/supabase/server";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "Not found." }, 404);
    const { db } = await apiUser();
    const {
      data: { session },
    } = await db.auth.getSession();
    const { url, key } = publicConfig();
    const result = await fetch(url + "/functions/v1/nexzza-media/sign/" + id, {
      headers: {
        Authorization: "Bearer " + session!.access_token,
        apikey: key,
      },
    });
    const data = (await result.json()) as { url: string };
    if (!result.ok) return json({ error: "File unavailable." }, result.status);
    return new Response(null, {
      status: 302,
      headers: {
        Location: data.url,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return json({ error: "File unavailable." }, 404);
  }
}
