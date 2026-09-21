import {
  apiUser,
  assertOrigin,
  json,
  publicConfig,
} from "@/lib/supabase/server";
export async function POST(req: Request) {
  try {
    assertOrigin(req);
    const { db } = await apiUser();
    const {
      data: { session },
    } = await db.auth.getSession();
    if (!session) return json({ error: "Sign in to continue." }, 401);
    const { url, key } = publicConfig();
    const headers = new Headers({
      Authorization: "Bearer " + session.access_token,
      apikey: key,
    });
    for (const name of [
      "content-type",
      "x-file-name",
      "x-file-size",
      "x-file-scope",
      "x-conversation-id",
      "x-post-id",
    ]) {
      const value = req.headers.get(name);
      if (value) headers.set(name, value);
    }
    const result = await fetch(url + "/functions/v1/nexzza-media/upload", {
      method: "POST",
      headers,
      body: req.body,
      duplex: "half",
    } as RequestInit);
    return new Response(result.body, {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Upload failed." },
      400,
    );
  }
}
