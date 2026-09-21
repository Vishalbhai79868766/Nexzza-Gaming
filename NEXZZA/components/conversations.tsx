/* eslint-disable @next/next/no-img-element -- Private media uses authenticated, uncached endpoints. */
"use client";
import { useEffect, useState } from "react";
import { HardLink as Link } from "@/components/hard-link";
import {
  MessagesSquare,
  Users,
  Plus,
  Settings2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useCommunity } from "@/components/community-context";
import {
  Button,
  Input,
  Textarea,
  Field,
  PlayerLink,
  Loading,
  Empty,
  ErrorNotice,
  ConfirmButton,
  useAsyncData,
  useDebounced,
  stamp,
} from "@/components/common";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { UploadPicker } from "@/components/media";
import { command } from "@/lib/supabase/client";
import { hardNavigate } from "@/lib/hard-navigation";
import type { Conversation, Member, Profile } from "@/lib/types";
type Invite = {
  id: string;
  conversation_name: string;
  sender_id: string;
  profiles: Profile;
  created_at: string;
};
export function Conversations() {
  const { db, profile, unread } = useCommunity();
  const [search, setSearch] = useState("");
  const query = useAsyncData(async () => {
    const [c, i] = await Promise.all([
      db
        .from("conversations")
        .select("*")
        .neq("kind", "global")
        .order("updated_at", { ascending: false }),
      db
        .from("conversation_invites")
        .select("*,profiles!conversation_invites_sender_id_fkey(*)")
        .eq("recipient_id", profile.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    if (c.error) throw c.error;
    if (i.error) throw i.error;
    const convs = c.data as Conversation[];
    const directIds = convs.filter((v) => v.kind === "direct").map((v) => v.id);
    if (directIds.length) {
      const members = await db
        .from("conversation_members")
        .select("conversation_id,profiles!conversation_members_user_id_fkey(*)")
        .in("conversation_id", directIds)
        .neq("user_id", profile.id);
      for (const c of convs) {
        const other = members.data?.find((m) => m.conversation_id === c.id)
          ?.profiles as unknown as Profile | undefined;
        if (other) c.name = other.display_name + " · @" + other.username;
      }
    }
    return { convs, invites: i.data as unknown as Invite[] };
  }, profile.id);
  const reload = query.reload;
  useEffect(() => {
    const c = db
      .channel("invites:" + profile.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_invites" },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversation_members" },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void db.removeChannel(c);
    };
  }, [db, profile.id, reload]);
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow blue">KEEP YOUR SQUAD CLOSE</p>
          <h1>My conversations</h1>
          <p>Private chats, group hangouts, and your people.</p>
        </div>
        <NewConversation onCreated={reload} />
      </div>
      {query.data?.invites.length ? (
        <section className="panel mb-6">
          <h2 className="text-lg mb-4">Your invitations</h2>
          {query.data.invites.map((inv) => (
            <div className="row spread wrap-row py-3 border-b" key={inv.id}>
              <div>
                <strong className="text-sm">{inv.conversation_name}</strong>
                <p className="small muted">
                  From {inv.profiles.display_name} · @{inv.profiles.username}
                </p>
              </div>
              <div className="row">
                {[true, false].map((accept) => (
                  <Button
                    key={String(accept)}
                    size="sm"
                    variant={accept ? "default" : "outline"}
                    onClick={async () => {
                      try {
                        await command("invite_respond", { id: inv.id, accept });
                        await reload();
                        toast.success(
                          accept
                            ? "Invitation accepted."
                            : "Invitation declined.",
                        );
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Please try again.",
                        );
                      }
                    }}
                  >
                    {accept ? "Accept" : "Decline"}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
      <Input
        aria-label="Search conversations"
        placeholder="Find a conversation…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-5 max-w-md"
      />
      {query.loading ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={reload} />
      ) : !query.data?.convs.length ? (
        <Empty
          title="A space for your people."
          description="Start a private conversation or create a group for your squad."
        >
          <NewConversation onCreated={reload} />
        </Empty>
      ) : (
        <div className="conversation-list">
          {query.data.convs
            .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
            .map((c) => (
              <Link
                href={"/messages/" + c.id}
                key={c.id}
                className="conversation-card"
              >
                {c.icon_id ? (
                  <img
                    className="size-11 rounded-lg object-cover"
                    alt=""
                    src={"/api/media/" + c.icon_id}
                  />
                ) : c.kind === "group" ? (
                  <Users size={25} className="blue" />
                ) : (
                  <MessagesSquare size={25} className="blue" />
                )}
                <div className="min-w-0 flex-1">
                  <h3>{c.name}</h3>
                  <p>
                    {c.description ||
                      (c.kind === "group"
                        ? "Private group"
                        : "Private conversation")}{" "}
                    · {stamp(c.updated_at)}
                  </p>
                </div>
                {!!unread[c.id] && (
                  <span className="unread-pill">{unread[c.id]}</span>
                )}
                <ArrowRight size={16} className="muted" />
              </Link>
            ))}
        </div>
      )}
    </>
  );
}
function NewConversation({ onCreated }: { onCreated: () => Promise<void> }) {
  const { db, profile } = useCommunity();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState("direct");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [invitees, setInvitees] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const debounced = useDebounced(username);
  const [players, setPlayers] = useState<Profile[]>([]);
  useEffect(() => {
    let alive = true;
    if (debounced.length < 2) return;
    const safe = debounced.replace(/[^a-zA-Z0-9_.]/g, "").toLowerCase();
    void db
      .from("profiles")
      .select("*")
      .like("username", safe + "%")
      .neq("id", profile.id)
      .limit(5)
      .then(({ data }) => {
        if (alive) setPlayers(data || []);
      });
    return () => {
      alive = false;
    };
  }, [db, debounced, profile.id]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} />
          New conversation
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make room for your people.</DialogTitle>
          <DialogDescription>
            Players receive an invitation and choose whether to join.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={kind} onValueChange={setKind}>
          <TabsList className="w-full">
            <TabsTrigger value="direct">Private chat</TabsTrigger>
            <TabsTrigger value="group">Group</TabsTrigger>
          </TabsList>
          <form
            className="stack mt-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const created = await command<{ id: string }>(
                  "conversation_create",
                  { kind, username, name, description },
                );
                if (kind === "group") {
                  for (const u of [
                    ...new Set(
                      invitees
                        .split(",")
                        .map((v) => v.trim().replace(/^@/, "").toLowerCase())
                        .filter(Boolean),
                    ),
                  ].slice(0, 20)) {
                    try {
                      await command("invite", {
                        conversation_id: created.id,
                        username: u,
                      });
                    } catch (e) {
                      toast.error(
                        "@" +
                          u +
                          ": " +
                          (e instanceof Error
                            ? e.message
                            : "Could not invite."),
                      );
                    }
                  }
                }
                await onCreated();
                setOpen(false);
                hardNavigate("/messages/" + created.id);
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Could not create conversation.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <TabsContent value="direct" className="mt-0">
              <Field label="Player’s username">
                <Input
                  aria-label="Player username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/^@/, ""))
                  }
                  required={kind === "direct"}
                  placeholder="Search by unique username"
                  maxLength={24}
                />
              </Field>
              {username.length >= 2 && players.length > 0 && (
                <div className="stack mt-3">
                  {players.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className="row text-left p-2 rounded hover:bg-accent text-sm"
                      onClick={() => {
                        setUsername(p.username);
                        setPlayers([]);
                      }}
                    >
                      {p.display_name}
                      <span className="muted">@{p.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="group" className="stack mt-0">
              <Field label="Group name">
                <Input
                  aria-label="Group name"
                  required={kind === "group"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={60}
                />
              </Field>
              <Field label="Description">
                <Textarea
                  aria-label="Group description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={300}
                />
              </Field>
              <Field
                label="Invite players"
                hint="Separate usernames with commas. You can also invite people later."
              >
                <Input
                  aria-label="Invite usernames"
                  value={invitees}
                  onChange={(e) => setInvitees(e.target.value)}
                />
              </Field>
            </TabsContent>
            {error && <ErrorNotice error={error} />}
            <Button disabled={busy}>
              {busy
                ? "Creating…"
                : kind === "group"
                  ? "Create group"
                  : "Send chat request"}
            </Button>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
export function ConversationSettings({
  conversation: c,
}: {
  conversation: Conversation;
}) {
  const { db, profile } = useCommunity();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(c.name);
  const [description, setDescription] = useState(c.description);
  const [iconId, setIconId] = useState(c.icon_id);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useAsyncData(
    async () => {
      if (!open) return [];
      const { data, error } = await db
        .from("conversation_members")
        .select(
          "user_id,role,muted,profiles!conversation_members_user_id_fkey(*)",
        )
        .eq("conversation_id", c.id)
        .is("left_at", null);
      if (error) throw error;
      return data as unknown as Member[];
    },
    String(open) + c.id,
  );
  const own = query.data?.find((m) => m.user_id === profile.id);
  const isOwner = own?.role === "owner";
  const canManage = own && ["owner", "admin"].includes(own.role);
  async function act(
    action: string,
    p: Record<string, unknown>,
    leave = false,
  ) {
    setBusy(true);
    try {
      await command(action, { conversation_id: c.id, ...p });
      toast.success("Conversation updated.");
      await query.reload();
      if (leave) {
        setOpen(false);
        hardNavigate("/messages");
      } else {
        window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Conversation settings">
          <Settings2 size={18} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conversation settings</DialogTitle>
          <DialogDescription>
            Manage your membership and this private space.
          </DialogDescription>
        </DialogHeader>
        {query.loading ? (
          <Loading />
        ) : query.error ? (
          <ErrorNotice error={query.error} />
        ) : (
          <div className="stack">
            <div className="row spread">
              <span className="small">Mute notifications</span>
              <Switch
                aria-label="Mute conversation notifications"
                checked={own?.muted || false}
                disabled={busy}
                onCheckedChange={(muted) =>
                  act("conversation_mute", { muted }).catch((e) =>
                    toast.error(e.message),
                  )
                }
              />
            </div>
            {c.kind === "group" && isOwner && (
              <form
                className="stack border-t pt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act("group_manage", {
                    operation: "edit",
                    name,
                    description,
                    icon_id: iconId,
                  }).catch((e) => toast.error(e.message));
                }}
              >
                <Field label="Group name">
                  <Input
                    aria-label="Edit group name"
                    value={name}
                    required
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    aria-label="Edit group description"
                    value={description}
                    maxLength={300}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </Field>
                <div className="row">
                  {iconId && (
                    <img
                      alt="Group icon preview"
                      className="size-12 rounded"
                      src={"/api/media/" + iconId}
                    />
                  )}
                  <UploadPicker
                    scope="group"
                    conversationId={c.id}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    label="Group icon"
                    onUpload={(a) => setIconId(a.id)}
                  />
                </div>
                <Button disabled={busy}>Save group details</Button>
              </form>
            )}
            {c.kind === "group" && canManage && (
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act("invite", { username })
                    .then(() => setUsername(""))
                    .catch((e) => toast.error(e.message));
                }}
              >
                <Input
                  aria-label="Invite player username"
                  placeholder="Invite @username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.replace(/^@/, ""))
                  }
                  required
                />
                <Button disabled={busy}>Invite</Button>
              </form>
            )}
            <h3 className="font-semibold text-sm">Members</h3>
            {query.data?.map((m) => (
              <div key={m.user_id} className="border-b pb-3">
                <div className="row spread">
                  <PlayerLink profile={m.profiles} />
                  <span className="muted small">{m.role}</span>
                </div>
                {m.user_id !== profile.id && (
                  <div className="row wrap-row mt-2">
                    {c.kind === "group" && canManage && m.role !== "owner" && (
                      <>
                        <ConfirmButton
                          title="Remove this member?"
                          description="They will lose access to this group and its attachments."
                          onConfirm={() =>
                            act("group_manage", {
                              operation: "remove",
                              user_id: m.user_id,
                            })
                          }
                        >
                          Remove
                        </ConfirmButton>
                        {isOwner && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                act("group_manage", {
                                  operation:
                                    m.role === "admin" ? "demote" : "promote",
                                  user_id: m.user_id,
                                }).catch((e) => toast.error(e.message))
                              }
                            >
                              {m.role === "admin"
                                ? "Make member"
                                : "Make admin"}
                            </Button>
                            <ConfirmButton
                              title="Transfer group ownership?"
                              description="This player will become the owner. You will become a group admin."
                              onConfirm={() =>
                                act("group_manage", {
                                  operation: "transfer",
                                  user_id: m.user_id,
                                })
                              }
                            >
                              Transfer ownership
                            </ConfirmButton>
                          </>
                        )}
                      </>
                    )}
                    {c.kind === "direct" && (
                      <ConfirmButton
                        title="Block this player?"
                        description="This stops private messages and invitations between you."
                        onConfirm={() =>
                          act("block", { user_id: m.user_id, blocked: true })
                        }
                      >
                        Block player
                      </ConfirmButton>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="row wrap-row">
              {!(c.kind === "group" && isOwner) && (
                <ConfirmButton
                  title="Leave this conversation?"
                  description="You’ll need a new invitation to rejoin a group."
                  onConfirm={() => act("conversation_leave", {}, true)}
                >
                  Leave conversation
                </ConfirmButton>
              )}
              {c.kind === "group" && isOwner && (
                <ConfirmButton
                  variant="destructive"
                  title="Delete this group?"
                  description="All members will lose access to this conversation."
                  onConfirm={() =>
                    act("group_manage", { operation: "delete" }, true)
                  }
                >
                  Delete group
                </ConfirmButton>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
