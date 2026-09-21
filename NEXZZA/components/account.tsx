"use client";
import { useEffect, useState } from "react";
import { HardLink as Link } from "@/components/hard-link";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  Calendar,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useCommunity } from "@/components/community-context";
import {
  Button,
  Input,
  Textarea,
  Field,
  SelectField,
  PlayerAvatar,
  PlayerLink,
  Loading,
  Empty,
  ErrorNotice,
  ConfirmButton,
  ReportButton,
  useAsyncData,
  stamp,
} from "@/components/common";
import { UploadPicker } from "@/components/media";
import { NewsCard } from "@/components/news";
import { command } from "@/lib/supabase/client";
import { hardNavigate } from "@/lib/hard-navigation";
import { profileSchema, safeHref } from "@/lib/validation";
import type { Profile, Role, NewsPost } from "@/lib/types";
export function ProfileView({
  player,
  playerRole,
  lastSeen,
}: {
  player: Profile;
  playerRole: Role;
  lastSeen: string | null;
}) {
  const { db, profile, online } = useCommunity();
  const own = player.id === profile.id;
  const present = online.some((p) => p.id === player.id);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(12);
  const posts = useAsyncData(async () => {
    const { data, error } = await db
      .from("news_posts")
      .select("*,profiles!news_posts_author_id_fkey(*)")
      .eq("author_id", player.id)
      .eq("state", "published")
      .order("published_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as unknown as NewsPost[];
  }, player.id + limit);
  return (
    <>
      <div className="profile-banner" />
      <section className="profile-detail">
        <PlayerAvatar profile={player} />
        <div className="row spread wrap-row">
          <div>
            <h1>{player.display_name}</h1>
            <span className="muted text-sm">@{player.username}</span>
          </div>
          <div className="row wrap-row">
            {own ? (
              <Button asChild>
                <Link href="/profile/edit">Edit profile</Link>
              </Button>
            ) : (
              <>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await command<{ id: string }>(
                        "conversation_create",
                        { kind: "direct", username: player.username },
                      );
                      hardNavigate("/messages/" + r.id);
                    } catch (e) {
                      toast.error(
                        e instanceof Error
                          ? e.message
                          : "Could not start conversation.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <MessagesSquare size={15} />
                  Message
                </Button>
                <ReportButton type="user" id={player.id} />
                <ConfirmButton
                  title="Block this player?"
                  description="Private messages and invitations between you will stop. You can unblock them in Settings."
                  onConfirm={async () => {
                    await command("block", {
                      user_id: player.id,
                      blocked: true,
                    });
                    toast.success("Player blocked.");
                  }}
                >
                  Block
                </ConfirmButton>
              </>
            )}
          </div>
        </div>
        <div className="row wrap-row mt-4">
          <Badge variant="secondary">
            {playerRole.role === "player" ? (
              "Player"
            ) : (
              <>
                <ShieldCheck size={12} />
                {playerRole.role === "administrator"
                  ? "Administrator"
                  : "Moderator"}
              </>
            )}
          </Badge>
          <span className="row small">
            <span
              className={
                "status-dot status-" + (present ? player.status : "offline")
              }
            />
            {present
              ? player.status === "dnd"
                ? "Do not disturb"
                : player.status === "idle"
                  ? "Idle"
                  : "Online"
              : "Offline"}
          </span>
          <span className="row muted small">
            <Calendar size={13} />
            Joined{" "}
            {new Date(player.created_at).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
        {!present && lastSeen && player.show_last_seen && (
          <p className="field-hint">Last seen {stamp(lastSeen)}</p>
        )}
        <p className="text-sm max-w-2xl">
          {player.bio || "This player is still writing their story."}
        </p>
        {player.games.length > 0 && (
          <div className="row wrap-row mt-5">
            {player.games.map((g) => (
              <Badge key={g} variant="outline">
                {g}
              </Badge>
            ))}
          </div>
        )}
        <p className="field-hint break-all">Player ID: {player.id}</p>
      </section>
      <section className="mt-10">
        <h2 className="text-2xl mb-6">
          {own ? "Your stories." : "Stories from " + player.display_name + "."}
        </h2>
        {posts.loading ? (
          <Loading />
        ) : posts.error ? (
          <ErrorNotice error={posts.error} retry={posts.reload} />
        ) : posts.data?.length ? (
          <>
            <div className="feed-grid">
              {posts.data.map((p) => (
                <NewsCard key={p.id} post={p} />
              ))}
            </div>
            {posts.data.length === limit && (
              <Button
                variant="outline"
                className="mt-6"
                onClick={() => setLimit((v) => v + 12)}
              >
                Load more stories
              </Button>
            )}
          </>
        ) : (
          <Empty
            title="The story is still loading."
            description={
              own
                ? "Share your first gaming story with the community."
                : "This player hasn’t published a story yet."
            }
          />
        )}
      </section>
    </>
  );
}
export function ProfileEditor() {
  const { profile } = useCommunity();
  const [name, setName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio);
  const [games, setGames] = useState(profile.games.join(", "));
  const [status, setStatus] = useState(profile.status);
  const [avatar, setAvatar] = useState(profile.avatar_id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="max-w-2xl mx-auto">
      <div className="page-head">
        <div>
          <p className="eyebrow blue">MORE THAN A USERNAME</p>
          <h1>Your player profile.</h1>
          <p>Let the community get to know you.</p>
        </div>
      </div>
      <form
        className="panel stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const data = profileSchema.safeParse({
            display_name: name,
            bio,
            games: [
              ...new Set(
                games
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              ),
            ],
            status,
            avatar_id: avatar,
          });
          if (!data.success) {
            setError(data.error.issues[0].message);
            setBusy(false);
            return;
          }
          try {
            await command("profile_update", data.data);
            toast.success("Profile updated.");
            hardNavigate("/profile/" + profile.username);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not update profile.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="row">
          <PlayerAvatar
            profile={{ display_name: name, avatar_id: avatar }}
            className="size-20"
          />
          <UploadPicker
            scope="avatar"
            accept="image/jpeg,image/png,image/webp,image/gif"
            label="Change avatar"
            disabled={busy}
            onUpload={(a) => setAvatar(a.id)}
          />
          {avatar && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAvatar(null)}
            >
              Remove
            </Button>
          )}
        </div>
        <Field
          label="Display name"
          hint="Display names don’t need to be unique."
        >
          <Input
            aria-label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={40}
          />
        </Field>
        <Field
          label="Username"
          hint="Your unique username stays with your account."
        >
          <Input
            aria-label="Username"
            value={"@" + profile.username}
            disabled
          />
        </Field>
        <Field label="Bio">
          <Textarea
            aria-label="Bio"
            value={bio}
            maxLength={300}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What do you play? What are you here for?"
          />
          <span className="field-hint">{bio.length}/300</span>
        </Field>
        <Field
          label="Favourite games"
          hint="Up to 10 games, separated by commas."
        >
          <Input
            aria-label="Favourite games"
            value={games}
            onChange={(e) => setGames(e.target.value)}
          />
        </Field>
        <Field label="Status">
          <SelectField
            label="Player status"
            value={status}
            onChange={(v) => setStatus(v as Profile["status"])}
            options={["online", "idle", "dnd", "offline"]}
          />
        </Field>
        {error && <ErrorNotice error={error} />}
        <Button disabled={busy}>{busy ? "Saving…" : "Save profile"}</Button>
      </form>
    </div>
  );
}
type Notification = {
  id: string;
  title: string;
  href: string;
  kind: string;
  read_at: string | null;
  created_at: string;
};
export function Notifications() {
  const { db, profile, refreshCounts } = useCommunity();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all");
  const query = useAsyncData(
    async () => {
      let q = db
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(page * 30, page * 30 + 29);
      if (filter === "unread") q = q.is("read_at", null);
      const { data, error } = await q;
      if (error) throw error;
      return data as Notification[];
    },
    profile.id + page + filter,
  );
  const reload = query.reload;
  useEffect(() => {
    const c = db
      .channel("notifications-page:" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + profile.id,
        },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void db.removeChannel(c);
    };
  }, [db, profile.id, reload]);
  async function read(id?: string) {
    try {
      await command("notification_read", id ? { id } : {});
      await reload();
      await refreshCounts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow blue">STAY IN THE LOOP</p>
          <h1>Your notifications.</h1>
          <p>The conversations and moments that include you.</p>
        </div>
        <Button variant="outline" onClick={() => read()}>
          <CheckCheck size={15} />
          Mark all read
        </Button>
      </div>
      <Tabs
        value={filter}
        onValueChange={(v) => {
          setFilter(v);
          setPage(0);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="panel p-0 mt-5">
        {query.loading ? (
          <Loading />
        ) : query.error ? (
          <ErrorNotice error={query.error} retry={reload} />
        ) : query.data?.length ? (
          query.data.map((n) => (
            <div
              className={"notification " + (!n.read_at ? "unread" : "")}
              key={n.id}
            >
              <Bell size={20} className="blue shrink-0" />
              <Link
                className="flex-1 min-w-0"
                href={safeHref(n.href)}
                onClick={() => void read(n.id)}
              >
                <strong className="text-sm">{n.title}</strong>
                <span className="block muted text-[11px] mt-1">
                  {stamp(n.created_at)}
                </span>
              </Link>
              {!n.read_at && (
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Mark notification read"
                  onClick={() => read(n.id)}
                >
                  <CheckCheck size={15} />
                </Button>
              )}
            </div>
          ))
        ) : (
          <Empty
            title="You’re all caught up."
            description="New messages, invitations, and reactions will appear here."
          />
        )}
      </div>
      <div className="row spread mt-6">
        <Button
          variant="outline"
          disabled={page === 0}
          onClick={() => setPage((v) => v - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={!query.data || query.data.length < 30}
          onClick={() => setPage((v) => v + 1)}
        >
          Next
        </Button>
      </div>
    </>
  );
}
export function AccountSettings() {
  const { db, profile } = useCommunity();
  const { theme, setTheme } = useTheme();
  const [showSeen, setShowSeen] = useState(profile.show_last_seen);
  const [busy, setBusy] = useState(false);
  const blocks = useAsyncData(async () => {
    const { data, error } = await db
      .from("user_blocks")
      .select("id,blocked_id,profiles!user_blocks_blocked_id_fkey(*)");
    if (error) throw error;
    return data as unknown as {
      id: string;
      blocked_id: string;
      profiles: Profile;
    }[];
  }, profile.id);
  return (
    <div className="max-w-3xl mx-auto">
      <div className="page-head">
        <div>
          <p className="eyebrow blue">MAKE YOURSELF AT HOME</p>
          <h1>Settings.</h1>
          <p>Your account, your preferences, your space.</p>
        </div>
      </div>
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & blocks</TabsTrigger>
        </TabsList>
        <TabsContent value="account" className="panel stack mt-5">
          <h2 className="text-xl">Your account</h2>
          <PlayerLink profile={profile} />
          <div className="row wrap-row">
            <Button asChild variant="outline">
              <Link href="/profile/edit">Edit profile</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/forgot-password">Reset password by email</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/bookmarks">View bookmarks</Link>
            </Button>
          </div>
          <div className="row spread border-t pt-5">
            <div>
              <h3 className="text-sm font-semibold">Dark mode</h3>
              <p className="field-hint">
                A quieter view for late-night sessions.
              </p>
            </div>
            <Switch
              aria-label="Dark mode"
              checked={theme === "dark"}
              disabled={busy}
              onCheckedChange={async (dark) => {
                setBusy(true);
                try {
                  await command("theme", { theme: dark ? "dark" : "light" });
                  setTheme(dark ? "dark" : "light");
                } catch (e) {
                  toast.error(
                    e instanceof Error
                      ? e.message
                      : "Could not save preference.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
        </TabsContent>
        <TabsContent value="privacy" className="stack mt-5">
          <div className="panel row spread">
            <div>
              <h3 className="font-semibold text-sm">
                Show activity and last seen
              </h3>
              <p className="field-hint">
                Allow other players to see when you’re around.
              </p>
            </div>
            <Switch
              aria-label="Show activity and last seen"
              checked={showSeen}
              disabled={busy}
              onCheckedChange={async (value) => {
                setBusy(true);
                try {
                  await command("privacy", { show_last_seen: value });
                  setShowSeen(value);
                } catch (e) {
                  toast.error(
                    e instanceof Error
                      ? e.message
                      : "Could not save preference.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
          <div className="panel">
            <h2 className="text-xl mb-4">Blocked players</h2>
            <p className="small muted mb-4">
              Blocking stops private messages and invitations. Public community
              content may still be visible.
            </p>
            {blocks.loading ? (
              <Loading />
            ) : blocks.error ? (
              <ErrorNotice error={blocks.error} retry={blocks.reload} />
            ) : blocks.data?.length ? (
              blocks.data.map((b) => (
                <div className="row spread py-3 border-b" key={b.id}>
                  <PlayerLink profile={b.profiles} />
                  <ConfirmButton
                    title="Unblock this player?"
                    description="They’ll be able to send you conversation requests again."
                    onConfirm={async () => {
                      await command("block", {
                        user_id: b.blocked_id,
                        blocked: false,
                      });
                      await blocks.reload();
                    }}
                  >
                    Unblock
                  </ConfirmButton>
                </div>
              ))
            ) : (
              <p className="small muted">You haven’t blocked anyone.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <p className="muted small mt-8">
        <Link className="text-link" href="/privacy">
          Privacy policy
        </Link>{" "}
        ·{" "}
        <Link className="text-link" href="/terms">
          Terms
        </Link>{" "}
        ·{" "}
        <Link className="text-link" href="/guidelines">
          Community guidelines
        </Link>
      </p>
    </div>
  );
}
