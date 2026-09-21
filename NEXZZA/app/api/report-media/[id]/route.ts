import { apiUser, json, publicConfig } from "@/lib/supabase/server";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { db } = await apiUser();
    const {
      data: { session },
    } = await db.auth.getSession();
    const { url, key } = publicConfig();
    const response = await fetch(
      url + "/functions/v1/nexzza-media/report-media/" + encodeURIComponent(id),
      {
        headers: {
          Authorization: "Bearer " + session!.access_token,
          apikey: key,
        },
      },
    );
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return json({ error: "Report unavailable." }, 403);
  }
}
