import { test } from "node:test";
import assert from "node:assert/strict";
import {
  usernameSchema,
  passwordSchema,
  messageSchema,
  newsSchema,
  localDayRange,
  safeHref,
} from "../lib/validation";
import { validateFile, validSignature } from "../lib/files";
test("username, password and message validation", () => {
  assert.equal(usernameSchema.parse("Player.One"), "player.one");
  for (const v of ["admin", "a b", "aa", "<script>"])
    assert.equal(usernameSchema.safeParse(v).success, false);
  assert.equal(passwordSchema.safeParse("weak").success, false);
  assert.equal(passwordSchema.safeParse("StrongPassword123!").success, true);
  assert.equal(
    messageSchema.safeParse({
      conversation_id: crypto.randomUUID(),
      client_id: crypto.randomUUID(),
      reply_to: null,
      content: "",
      attachments: [],
    }).success,
    false,
  );
});
test("uploads require matching extension, size, scope and signature", () => {
  validateFile("image.png", "image/png", 20, "avatar");
  assert.throws(() =>
    validateFile("attack.svg", "image/svg+xml", 100, "avatar"),
  );
  assert.throws(() =>
    validateFile("image.png", "image/png", 11 * 1024 * 1024, "avatar"),
  );
  assert.throws(() =>
    validateFile("document.pdf", "application/pdf", 20, "news"),
  );
  assert.equal(
    validSignature(
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      "image/png",
    ),
    true,
  );
  assert.equal(
    validSignature(
      new TextEncoder().encode("<script>alert(1)</script>"),
      "image/png",
    ),
    false,
  );
  assert.equal(
    validSignature(
      new TextEncoder().encode("<html>unsafe</html>"),
      "text/plain",
    ),
    false,
  );
});
test("local-day boundaries and notification links", () => {
  const { start, end } = localDayRange(new Date("2026-09-20T15:00:00Z"));
  assert.equal(new Date(start).getHours(), 0);
  assert.equal(new Date(end).getDate(), new Date(start).getDate() + 1);
  for (const href of [
    "//evil.example",
    "javascript:alert(1)",
    "https://evil.example",
    "/\\evil.example",
  ])
    assert.equal(safeHref(href), "/notifications");
  assert.equal(safeHref("/news/abc-def"), "/news/abc-def");
});
test("news cover and external source requirements", () => {
  const p = {
    id: crypto.randomUUID(),
    headline: "News headline",
    body: "This is a long enough body for the article input validation.",
    game: "Minecraft",
    platform: "PC",
    category: "PC",
    tags: [],
    source_type: "External News",
    source_url: "",
    cover_id: crypto.randomUUID(),
    video_id: null,
  };
  assert.equal(newsSchema.safeParse(p).success, false);
  assert.equal(
    newsSchema.safeParse({ ...p, source_url: "https://example.com/story" })
      .success,
    true,
  );
  assert.equal(
    newsSchema.safeParse({ ...p, source_url: "javascript:alert(1)" }).success,
    false,
  );
});
