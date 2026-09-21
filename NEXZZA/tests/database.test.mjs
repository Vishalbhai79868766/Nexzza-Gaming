import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
test("NEXZZA database permissions and journeys", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(
    [
      "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;",
      "create schema auth; create schema storage; create schema realtime;",
      "create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb);",
      "create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;",
      "create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;",
      "create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
      "create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text); alter table storage.objects enable row level security;",
      "create table realtime.messages(id bigint,topic text); alter table realtime.messages enable row level security;",
      "create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;",
      "grant usage on schema public,auth,storage,realtime to anon,authenticated,service_role;",
      "grant execute on all functions in schema auth,realtime to anon,authenticated,service_role;",
      "create publication supabase_realtime;",
    ].join("\n"),
  );
  for (const name of (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
  const ids = {
    a: randomUUID(),
    b: randomUUID(),
    mod: randomUUID(),
    admin: randomUUID(),
    unverified: randomUUID(),
  };
  async function owner() {
    await db.exec("reset role");
  }
  async function asUser(id) {
    await owner();
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",
      [id],
    );
    await db.exec("set role authenticated");
  }
  async function rows(sql, args = []) {
    return (await db.query(sql, args)).rows;
  }
  async function rpc(action, p = {}) {
    return (
      await rows("select public.nexzza($1,$2::jsonb) as result", [
        action,
        JSON.stringify(p),
      ])
    )[0].result;
  }
  async function scalar(sql, args = []) {
    return Object.values((await rows(sql, args))[0])[0];
  }
  const global = "00000000-0000-4000-8000-000000000001";
  for (const [name, id] of Object.entries(ids))
    await db.query("insert into auth.users values($1,$2,$3,$4::jsonb)", [
      id,
      name + "@example.test",
      name === "unverified" ? null : new Date().toISOString(),
      JSON.stringify({
        username: "test_" + name,
        display_name: "Shared Player Name",
        terms_accepted_at: new Date().toISOString(),
      }),
    ]);
  await db.query(
    "update public.user_roles set role='moderator' where user_id=$1",
    [ids.mod],
  );
  await db.query(
    "update public.user_roles set role='administrator' where user_id=$1",
    [ids.admin],
  );
  let direct, group, message, news, comment, report, attachment;
  await t.test(
    "all application tables use RLS; elevated APIs are private",
    async () => {
      assert.equal(
        await scalar(
          "select count(*)::int from pg_tables t join pg_class c on c.relname=t.tablename join pg_namespace n on n.oid=c.relnamespace and n.nspname=t.schemaname where t.schemaname='public' and not c.relrowsecurity",
        ),
        0,
      );
      assert.equal(
        await scalar(
          "select count(*)::int from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'EXECUTE')",
        ),
        0,
      );
    },
  );
  await t.test(
    "display names repeat; usernames cannot be stolen or reserved",
    async () => {
      assert.equal(
        await scalar(
          "select count(*)::int from profiles where display_name='Shared Player Name'",
        ),
        5,
      );
      for (const username of ["TEST_A", "admin", "bad name"])
        await assert.rejects(() =>
          db.query(
            "insert into auth.users values($1,'duplicate@example.test',now(),$2::jsonb)",
            [
              randomUUID(),
              JSON.stringify({
                username,
                display_name: "Test Player",
                terms_accepted_at: new Date().toISOString(),
              }),
            ],
          ),
        );
      await db.exec("set role anon");
      assert.equal(await scalar("select username_available('test_a')"), false);
      await assert.rejects(() => db.query("select * from profiles"));
      await owner();
    },
  );
  await t.test(
    "verification and roles cannot be bypassed by API or table writes",
    async () => {
      await asUser(ids.unverified);
      assert.equal(await scalar("select active_player()"), false);
      await assert.rejects(() =>
        rpc("message_send", {
          conversation_id: global,
          content: "hello",
          client_id: randomUUID(),
        }),
      );
      await asUser(ids.a);
      await assert.rejects(() => rpc("admin_stats"));
      await assert.rejects(() =>
        db.query(
          "update user_roles set role='administrator' where user_id=$1",
          [ids.a],
        ),
      );
      await assert.rejects(() =>
        db.query(
          "insert into notifications(user_id,title,kind,href,event_key) values($1,'Injected','test','/chat','injected')",
          [ids.b],
        ),
      );
    },
  );
  await t.test(
    "global messages are idempotent and only the author can edit",
    async () => {
      await asUser(ids.a);
      const client_id = randomUUID();
      message = (
        await rpc("message_send", {
          conversation_id: global,
          content: "Hello from player A",
          client_id,
        })
      ).id;
      assert.equal(
        (
          await rpc("message_send", {
            conversation_id: global,
            content: "Hello from player A",
            client_id,
          })
        ).id,
        message,
      );
      await asUser(ids.b);
      assert.equal(
        await scalar("select count(*)::int from messages where id=$1", [
          message,
        ]),
        1,
      );
      await assert.rejects(() =>
        rpc("message_edit", { id: message, content: "Stolen edit" }),
      );
      await asUser(ids.a);
      await rpc("message_edit", { id: message, content: "Edited by author" });
      assert.equal(
        await scalar("select content from messages where id=$1", [message]),
        "Edited by author",
      );
    },
  );
  await t.test(
    "direct chats require acceptance and prevent duplicates",
    async () => {
      await asUser(ids.a);
      direct = (
        await rpc("conversation_create", { kind: "direct", username: "test_b" })
      ).id;
      assert.equal(
        (
          await rpc("conversation_create", {
            kind: "direct",
            username: "test_b",
          })
        ).id,
        direct,
      );
      await assert.rejects(() =>
        rpc("message_send", {
          conversation_id: direct,
          content: "Before acceptance",
          client_id: randomUUID(),
        }),
      );
      await asUser(ids.b);
      assert.equal(
        await scalar("select count(*)::int from conversations where id=$1", [
          direct,
        ]),
        0,
      );
      const inv = await scalar(
        "select id from conversation_invites where conversation_id=$1 and recipient_id=$2",
        [direct, ids.b],
      );
      await rpc("invite_respond", { id: inv, accept: true });
      await asUser(ids.a);
      await rpc("message_send", {
        conversation_id: direct,
        content: "Private hello",
        client_id: randomUUID(),
      });
      await asUser(ids.mod);
      assert.equal(
        await scalar(
          "select count(*)::int from messages where conversation_id=$1",
          [direct],
        ),
        0,
      );
      assert.equal(
        await scalar("select can_use_channel($1)", ["typing:" + direct]),
        false,
      );
    },
  );
  await t.test(
    "read receipts clear unread counts; muting does not hide unread messages",
    async () => {
      await asUser(ids.b);
      assert.equal((await scalar("select unread_counts()"))[direct], 1);
      await rpc("conversation_mute", { conversation_id: direct, muted: true });
      assert.equal((await scalar("select unread_counts()"))[direct], 1);
      await rpc("receipt", { conversation_id: direct, read: true });
      assert.equal((await scalar("select unread_counts()"))[direct], undefined);
      assert.equal(
        await scalar(
          "select count(*)::int from message_receipts where user_id=$1 and read_at is not null",
          [ids.b],
        ),
        1,
      );
    },
  );
  await t.test(
    "blocking prevents private messages and invitations",
    async () => {
      await asUser(ids.b);
      await rpc("block", { user_id: ids.a, blocked: true });
      await asUser(ids.a);
      await assert.rejects(() =>
        rpc("message_send", {
          conversation_id: direct,
          content: "Blocked message",
          client_id: randomUUID(),
        }),
      );
      await assert.rejects(() =>
        rpc("conversation_create", { kind: "direct", username: "test_b" }),
      );
      await asUser(ids.b);
      await rpc("block", { user_id: ids.a, blocked: false });
    },
  );
  await t.test(
    "group role hierarchy and removal revoke message and file access",
    async () => {
      await asUser(ids.a);
      group = (
        await rpc("conversation_create", { kind: "group", name: "Test squad" })
      ).id;
      await rpc("invite", { conversation_id: group, username: "test_b" });
      await asUser(ids.b);
      const inv = await scalar(
        "select id from conversation_invites where conversation_id=$1",
        [group],
      );
      await rpc("invite_respond", { id: inv, accept: true });
      await asUser(ids.a);
      await rpc("group_manage", {
        conversation_id: group,
        operation: "promote",
        user_id: ids.b,
      });
      await asUser(ids.b);
      await assert.rejects(() =>
        rpc("group_manage", {
          conversation_id: group,
          operation: "remove",
          user_id: ids.a,
        }),
      );
      await owner();
      attachment = randomUUID();
      await db.query(
        "insert into media_assets(id,owner_id,bucket,path,mime,filename,size,scope,conversation_id) values($1,$2,'private-attachments',$3,'image/png','sample.png',20,'chat',$4)",
        [attachment, ids.a, ids.a + "/" + attachment + ".png", group],
      );
      await asUser(ids.a);
      await rpc("message_send", {
        conversation_id: group,
        content: "File",
        attachments: [attachment],
        client_id: randomUUID(),
      });
      await asUser(ids.b);
      assert.equal(
        await scalar("select count(*)::int from media_assets where id=$1", [
          attachment,
        ]),
        1,
      );
      await asUser(ids.a);
      await rpc("group_manage", {
        conversation_id: group,
        operation: "remove",
        user_id: ids.b,
      });
      await asUser(ids.b);
      assert.equal(
        await scalar(
          "select count(*)::int from messages where conversation_id=$1",
          [group],
        ),
        0,
      );
      assert.equal(
        await scalar("select count(*)::int from media_assets where id=$1", [
          attachment,
        ]),
        0,
      );
      await assert.rejects(() =>
        rpc("message_send", {
          conversation_id: group,
          content: "Removed player",
          client_id: randomUUID(),
        }),
      );
    },
  );
  await t.test(
    "profile ownership and last-seen privacy are enforced",
    async () => {
      await asUser(ids.a);
      await rpc("profile_update", {
        display_name: "New Display",
        bio: "Hello gamers",
        games: ["Minecraft"],
        status: "dnd",
        avatar_id: null,
      });
      await rpc("privacy", { show_last_seen: false });
      await rpc("presence");
      await asUser(ids.b);
      assert.equal(
        await scalar(
          "select count(*)::int from user_presence where user_id=$1",
          [ids.a],
        ),
        0,
      );
      await assert.rejects(() =>
        db.query(
          "update profiles set display_name='Impersonation' where id=$1",
          [ids.a],
        ),
      );
    },
  );
  await t.test(
    "news requires an owned cover linked to the exact article",
    async () => {
      news = randomUUID();
      const cover = randomUUID();
      await owner();
      await db.query(
        "insert into media_assets(id,owner_id,bucket,path,mime,filename,size,scope,post_id) values($1,$2,'news-media',$3,'image/png','cover.png',20,'news',$4)",
        [cover, ids.a, ids.a + "/" + cover + ".png", news],
      );
      await asUser(ids.a);
      const p = {
        id: news,
        headline: "A community test story",
        body: "This test story has enough detail for the community news requirement.",
        game: "Minecraft",
        platform: "PC",
        category: "Community News",
        source_type: "Original Reporting",
        source_url: "",
        tags: ["test"],
        cover_id: cover,
        video_id: null,
      };
      await assert.rejects(() => rpc("news_save", { ...p, cover_id: null }));
      await assert.rejects(() => rpc("news_save", { ...p, id: randomUUID() }));
      await rpc("news_save", p);
      await asUser(ids.b);
      await assert.rejects(() =>
        rpc("news_save", { ...p, headline: "Stolen headline" }),
      );
      await assert.rejects(() =>
        rpc("moderate", {
          target_id: news,
          operation: "news_verify",
          reason: "Fake verification",
        }),
      );
    },
  );
  await t.test(
    "likes toggle, bookmarks stay private, views deduplicate, comments have owners",
    async () => {
      await asUser(ids.b);
      await rpc("news_like", { id: news });
      await rpc("news_bookmark", { id: news });
      await rpc("news_view", { id: news });
      await rpc("news_view", { id: news });
      assert.equal(
        await scalar("select count(*)::int from news_likes where post_id=$1", [
          news,
        ]),
        1,
      );
      await rpc("news_like", { id: news });
      assert.equal(
        await scalar("select count(*)::int from news_likes where post_id=$1", [
          news,
        ]),
        0,
      );
      await rpc("comment_save", {
        post_id: news,
        content: "Thanks for sharing.",
      });
      comment = await scalar("select id from news_comments where post_id=$1", [
        news,
      ]);
      await asUser(ids.a);
      assert.equal(await scalar("select count(*)::int from news_bookmarks"), 0);
      await assert.rejects(() =>
        rpc("comment_save", {
          id: comment,
          post_id: news,
          content: "Stolen comment",
        }),
      );
      const counts = await rows("select * from news_engagement($1::uuid[])", [
        [news],
      ]);
      assert.equal(Number(counts[0].views), 1);
      assert.equal(Number(counts[0].bookmarks), 1);
      const feed = await scalar("select news_feed($1::jsonb)", [
        JSON.stringify({ tab: "trending", query: "community", limit: 18 }),
      ]);
      assert.equal(feed.length, 1);
      assert.equal(feed[0].id, news);
    },
  );
  await t.test(
    "reports preserve the specific private content without exposing the chat",
    async () => {
      await asUser(ids.b);
      const mid = await scalar(
        "select id from messages where conversation_id=$1",
        [direct],
      );
      await rpc("report", {
        target_type: "message",
        target_id: mid,
        reason: "Other",
        explanation: "Test report",
      });
      report = await scalar("select id from reports where target_id=$1", [mid]);
      await asUser(ids.mod);
      assert.equal(
        await scalar(
          "select count(*)::int from messages where conversation_id=$1",
          [direct],
        ),
        0,
      );
      assert.equal(
        (await rpc("report_context", { id: report })).content,
        "Private hello",
      );
      await asUser(ids.a);
      await rpc("message_delete", { id: mid });
      await asUser(ids.mod);
      assert.equal(
        (await rpc("report_context", { id: report })).content,
        "Private hello",
      );
    },
  );
  await t.test(
    "moderators cannot ban or assign roles; suspension access is configurable",
    async () => {
      await asUser(ids.mod);
      await assert.rejects(() =>
        rpc("moderate", {
          target_id: ids.b,
          operation: "ban",
          reason: "Test reason",
        }),
      );
      await assert.rejects(() =>
        rpc("moderate", {
          target_id: ids.b,
          operation: "role",
          role: "moderator",
          reason: "Test reason",
        }),
      );
      await asUser(ids.admin);
      await rpc("settings", {
        moderators_can_suspend: true,
        profanity_enabled: true,
        reason: "Enable moderator suspensions for test",
      });
      await asUser(ids.mod);
      await rpc("moderate", {
        target_id: ids.b,
        operation: "suspend",
        reason: "Testing temporary suspension",
      });
      await asUser(ids.b);
      assert.equal(await scalar("select active_player()"), false);
      await assert.rejects(() =>
        rpc("message_send", {
          conversation_id: global,
          content: "Should not send",
          client_id: randomUUID(),
        }),
      );
      await asUser(ids.admin);
      await rpc("moderate", {
        target_id: ids.b,
        operation: "unban",
        reason: "Restore test account",
      });
    },
  );
  await t.test(
    "moderation decisions and report notes are audited",
    async () => {
      await asUser(ids.mod);
      await rpc("moderate", {
        target_id: news,
        target_type: "news",
        operation: "news_verify",
        reason: "Reviewed test story sources",
      });
      assert.equal(
        await scalar("select verified from news_posts where id=$1", [news]),
        true,
      );
      await rpc("moderate", {
        target_id: report,
        target_type: "report",
        operation: "report_status",
        status: "resolved",
        reason: "Reviewed report in automated test",
      });
      assert.equal(
        await scalar(
          "select count(*)::int from report_notes where report_id=$1",
          [report],
        ),
        1,
      );
      assert.ok(
        (await scalar("select count(*)::int from moderation_actions")) >= 5,
      );
      await asUser(ids.a);
      assert.equal(
        await scalar("select count(*)::int from moderation_actions"),
        0,
      );
    },
  );
  await t.test(
    "authentication quotas are bounded and counters cannot be read",
    async () => {
      await owner();
      await db.exec("set role anon");
      for (let i = 0; i < 5; i++)
        assert.equal(
          await scalar("select auth_attempt($1,$2)", [
            "a".repeat(64),
            "register",
          ]),
          true,
        );
      assert.equal(
        await scalar("select auth_attempt($1,$2)", [
          "a".repeat(64),
          "register",
        ]),
        false,
      );
      await assert.rejects(() =>
        db.query("select * from private.auth_rate_limits"),
      );
      await asUser(ids.a);
      await assert.rejects(() => db.query("select * from rate_limits"));
    },
  );
  await owner();
  await db.close();
});
