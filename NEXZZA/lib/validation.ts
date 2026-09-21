import { z } from "zod";
export const GLOBAL_ROOM = "00000000-0000-4000-8000-000000000001";
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(24)
  .regex(/^[a-z0-9][a-z0-9_.]*$/, "Use letters, numbers, dots, or underscores.")
  .refine(
    (v) =>
      ![
        "admin",
        "administrator",
        "moderator",
        "support",
        "nexzza",
        "system",
        "staff",
      ].includes(v),
    "This username is reserved.",
  );
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128)
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");
export const emailSchema = z.string().trim().email().max(254);
export const categories = [
  "PC",
  "PlayStation",
  "Xbox",
  "Nintendo",
  "Mobile",
  "Esports",
  "Game Updates",
  "Leaks and Rumours",
  "Community News",
] as const;
export const platforms = [
  "PC",
  "PlayStation",
  "Xbox",
  "Nintendo",
  "Mobile",
  "Multi-platform",
] as const;
export const sources = [
  "External News",
  "Original Reporting",
  "Opinion",
  "Community Announcement",
  "Leak or Rumour",
] as const;
export const profileSchema = z.object({
  display_name: z.string().trim().min(2).max(40),
  bio: z.string().max(300),
  games: z.array(z.string().trim().min(1).max(60)).max(10),
  status: z.enum(["online", "idle", "dnd", "offline"]),
  avatar_id: z.string().uuid().nullable(),
});
export const newsSchema = z
  .object({
    id: z.string().uuid(),
    headline: z.string().trim().min(8).max(160),
    body: z.string().trim().min(40).max(30000),
    game: z.string().trim().min(1).max(60),
    platform: z.enum(platforms),
    category: z.enum(categories),
    tags: z.array(z.string().trim().min(1).max(24)).max(8),
    source_type: z.enum(sources),
    source_url: z
      .string()
      .max(2048)
      .refine(
        (s) => s === "" || /^https?:\/\/[^\s]+$/.test(s),
        "Use an http or https URL.",
      ),
    cover_id: z.string().uuid("Add a cover image."),
    video_id: z.string().uuid().nullable(),
  })
  .refine((p) => p.source_type !== "External News" || p.source_url.length > 0, {
    path: ["source_url"],
    message: "External news needs a source link.",
  });
export const messageSchema = z
  .object({
    conversation_id: z.string().uuid(),
    content: z.string().max(4000),
    attachments: z.array(z.string().uuid()).max(4),
    client_id: z.string().uuid(),
    reply_to: z.string().uuid().nullable(),
  })
  .refine(
    (p) => p.content.trim().length > 0 || p.attachments.length > 0,
    "Write a message or add an attachment.",
  );
export function localDayRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
export function safeHref(href: string) {
  return /^\/(?!\/)[a-zA-Z0-9/_?=&#.-]*$/.test(href) ? href : "/notifications";
}
