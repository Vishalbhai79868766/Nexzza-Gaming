import { z } from "zod";
import { apiUser, assertOrigin, json } from "@/lib/supabase/server";
import { messageSchema, newsSchema, profileSchema } from "@/lib/validation";
const actions = new Set([
  "profile_update",
  "privacy",
  "theme",
  "presence",
  "conversation_create",
  "invite",
  "invite_respond",
  "group_manage",
  "conversation_mute",
  "conversation_leave",
  "message_send",
  "message_edit",
  "message_delete",
  "message_react",
  "receipt",
  "block",
  "news_save",
  "news_delete",
  "news_like",
  "news_bookmark",
  "news_view",
  "comment_save",
  "comment_delete",
  "report",
  "notification_read",
  "admin_stats",
  "report_context",
  "moderate",
  "settings",
]);
export async function POST(req: Request) {
  try {
    assertOrigin(req);
    const raw = await req.text();
    if (raw.length > 70000)
      return json({ error: "Request is too large." }, 413);
    const input = z
      .object({ action: z.string(), p: z.record(z.unknown()).default({}) })
      .parse(JSON.parse(raw));
    if (!actions.has(input.action))
      return json({ error: "Unknown action." }, 400);
    if (input.action === "message_send") input.p = messageSchema.parse(input.p);
    if (input.action === "news_save") input.p = newsSchema.parse(input.p);
    if (input.action === "profile_update")
      input.p = profileSchema.parse(input.p);
    const { db } = await apiUser();
    const { data, error } = await db.rpc("nexzza", input);
    if (error)
      return json(
        {
          error:
            error.code === "P0001"
              ? error.message
              : "This action could not be completed. Check your entries and permissions.",
        },
        400,
      );
    return json(data);
  } catch (e) {
    return json(
      {
        error:
          e instanceof z.ZodError
            ? e.issues[0].message
            : e instanceof Error
              ? e.message
              : "Unable to complete request.",
      },
      400,
    );
  }
}
