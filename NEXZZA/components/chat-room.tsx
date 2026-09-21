"use client";
import { useEffect, useRef, useState } from "react";
import { HardLink as Link } from "@/components/hard-link";
import { Send, Reply, CheckCheck, Radio, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useCommunity } from "@/components/community-context";
import {
  Button,
  Textarea,
  PlayerAvatar,
  Loading,
  ErrorNotice,
  Empty,
  ConfirmButton,
  ReportButton,
  useAsyncData,
  stamp,
} from "@/components/common";
import {
  Media,
  UploadPicker,
  UploadedList,
  VoiceRecorder,
} from "@/components/media";
import { ConversationSettings } from "@/components/conversations";
import { command } from "@/lib/supabase/client";
import type { Asset, ChatMessage, Conversation } from "@/lib/types";
export function ChatRoom({ conversation }: { conversation: Conversation }) {
  const { db, online, refreshCounts } = useCommunity();
  const [limit, setLimit] = useState(40);
  const [content, setContent] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [connection, setConnection] = useState("Connecting…");
  const [typing, setTyping] = useState(false);
  const [typingUntil, setTypingUntil] = useState(0);
  const clientId = useRef<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const lastTyping = useRef(0);
  const query = useAsyncData(
    async () => {
      const access = await db
        .from("conversations")
        .select("id")
        .eq("id", conversation.id)
        .single();
      if (access.error)
        throw new Error("You no longer have access to this conversation.");
      const { data, error } = await db
        .from("messages")
        .select(
          "*,profiles!messages_author_id_fkey(*),message_attachments(media_assets(id,mime,filename,size)),message_reactions(emoji,user_id),message_receipts(user_id,read_at)",
        )
        .eq("conversation_id", conversation.id)
        .eq("hidden", false)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as unknown as ChatMessage[]).reverse();
    },
    conversation.id + ":" + limit,
  );
  const reload = query.reload;
  const channel = useRef<ReturnType<typeof db.channel> | null>(null);
  useEffect(() => {
    const c = db
      .channel("room:" + conversation.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: "conversation_id=eq." + conversation.id,
        },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_receipts" },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_members",
          filter: "conversation_id=eq." + conversation.id,
        },
        () => void reload(),
      )
      .subscribe((status) =>
        setConnection(
          status === "SUBSCRIBED"
            ? "Live"
            : status === "CHANNEL_ERROR" || status === "TIMED_OUT"
              ? "Reconnecting…"
              : "Connecting…",
        ),
      );
    const t = db
      .channel("typing:" + conversation.id, {
        config: { private: true, broadcast: { self: false } },
      })
      .on("broadcast", { event: "typing" }, () => {
        setTyping(true);
        setTypingUntil(Date.now() + 4500);
      })
      .subscribe();
    channel.current = t;
    const fallback = setInterval(() => void reload(), 30000);
    return () => {
      clearInterval(fallback);
      void db.removeChannel(c);
      void db.removeChannel(t);
    };
  }, [db, conversation.id, reload]);
  useEffect(() => {
    if (!typingUntil) return;
    const timer = setTimeout(() => setTyping(false), 4500);
    return () => clearTimeout(timer);
  }, [typingUntil]);
  const latestId = query.data?.at(-1)?.id;
  useEffect(() => {
    if (!latestId) return;
    const read = () => {
      void command("receipt", {
        conversation_id: conversation.id,
        read: document.visibilityState === "visible",
      })
        .then(refreshCounts)
        .catch(() => {});
    };
    read();
    document.addEventListener("visibilitychange", read);
    return () => document.removeEventListener("visibilitychange", read);
  }, [latestId, conversation.id, refreshCounts]);
  useEffect(() => {
    if (atBottom.current && scroll.current)
      scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [query.data]);
  async function send() {
    if (sending) return;
    setSendError("");
    setSending(true);
    clientId.current ??= crypto.randomUUID();
    try {
      await command("message_send", {
        conversation_id: conversation.id,
        content,
        attachments: assets.map((a) => a.id),
        reply_to: reply?.id || null,
        client_id: clientId.current,
      });
      setContent("");
      setAssets([]);
      setReply(null);
      clientId.current = null;
      atBottom.current = true;
      await reload();
    } catch (e) {
      setSendError(
        e instanceof Error
          ? e.message
          : "Message failed. Your draft is saved here.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow blue">
            {conversation.kind === "global"
              ? "THE HEART OF NEXZZA"
              : "YOUR PRIVATE SPACE"}
          </p>
          <h1>{conversation.name}</h1>
          <p>
            {conversation.description ||
              (conversation.kind === "global"
                ? "Good games. New people. One conversation at a time."
                : "Only invited members can join this conversation.")}
          </p>
        </div>
        {conversation.kind !== "global" && (
          <Button asChild variant="ghost">
            <Link href="/messages">
              <ArrowLeft size={15} />
              Conversations
            </Link>
          </Button>
        )}
      </div>
      <div className="chat-layout">
        <div className="chat-room">
          <div className="chat-room-top">
            <div className="row">
              <Radio size={17} className="blue" />
              <strong className="text-sm">
                {conversation.kind === "global"
                  ? "Global lobby"
                  : conversation.kind === "group"
                    ? "Group conversation"
                    : "Private conversation"}
              </strong>
            </div>
            <div className="row">
              <span className="small muted" role="status">
                {connection}
              </span>
              {conversation.kind !== "global" && (
                <ConversationSettings conversation={conversation} />
              )}
            </div>
          </div>
          <div
            className="chat-scroll"
            ref={scroll}
            onScroll={() => {
              if (scroll.current)
                atBottom.current =
                  scroll.current.scrollHeight -
                    scroll.current.scrollTop -
                    scroll.current.clientHeight <
                  100;
            }}
          >
            {query.loading ? (
              <Loading />
            ) : query.error ? (
              <ErrorNotice error={query.error} retry={reload} />
            ) : (
              <>
                {query.data?.length === limit && (
                  <div className="text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        atBottom.current = false;
                        setLimit((v) => v + 40);
                      }}
                    >
                      Load older messages
                    </Button>
                  </div>
                )}
                {!query.data?.length && (
                  <Empty
                    title="Start a good conversation."
                    description={
                      conversation.kind === "direct"
                        ? "The recipient must accept your request before you can send messages."
                        : "Introduce yourself, share what you’re playing, or just say hello."
                    }
                  />
                )}{" "}
                {query.data?.map((message) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    onReply={() => setReply(message)}
                    onChange={reload}
                    replyText={
                      query.data?.find((m) => m.id === message.reply_to)
                        ?.content
                    }
                  />
                ))}
              </>
            )}
          </div>
          <div className="composer">
            {reply && (
              <div className="row spread reply-quote">
                <span>
                  Replying to {reply.profiles.display_name}:{" "}
                  {reply.content.slice(0, 80)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReply(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
            <div className="typing" aria-live="polite">
              {typing ? "Someone is typing…" : ""}
            </div>
            <Textarea
              aria-label="Message"
              placeholder={
                conversation.kind === "global"
                  ? "Say hello to the lobby…"
                  : "Message your people…"
              }
              maxLength={4000}
              value={content}
              disabled={sending}
              onChange={(e) => {
                setContent(e.target.value);
                clientId.current = null;
                if (Date.now() - lastTyping.current > 1500) {
                  lastTyping.current = Date.now();
                  void channel.current?.send({
                    type: "broadcast",
                    event: "typing",
                    payload: { active: true },
                  });
                }
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing
                ) {
                  e.preventDefault();
                  if (content.trim() || assets.length) void send();
                }
              }}
            />
            <div className="mt-2">
              <UploadedList
                assets={assets}
                onRemove={(id) => {
                  setAssets((a) => a.filter((v) => v.id !== id));
                  clientId.current = null;
                }}
              />
            </div>
            {sendError && (
              <div className="mt-2">
                <ErrorNotice error={sendError} />
              </div>
            )}
            <div className="composer-bottom">
              <div className="row wrap-row">
                <UploadPicker
                  scope="chat"
                  conversationId={conversation.id}
                  disabled={sending || assets.length >= 4}
                  onUpload={(a) => {
                    setAssets((v) => [...v, a].slice(0, 4));
                    clientId.current = null;
                  }}
                />
                <VoiceRecorder
                  conversationId={conversation.id}
                  disabled={sending || assets.length >= 4}
                  onUpload={(a) => {
                    setAssets((v) => [...v, a].slice(0, 4));
                    clientId.current = null;
                  }}
                />
              </div>
              <Button
                disabled={
                  sending ||
                  (!content.trim() && !assets.length) ||
                  !!query.error
                }
                onClick={send}
              >
                <Send size={15} />
                {sending ? "Sending…" : sendError ? "Retry" : "Send"}
              </Button>
            </div>
            <p className="field-hint mt-2">
              Enter to send · Shift + Enter for a new line · Up to 4 attachments
            </p>
          </div>
        </div>
        <aside className="online-panel panel">
          <h3>
            IN THE LOBBY <span className="blue">{online.length}</span>
          </h3>
          {online.slice(0, 30).map((p) => (
            <Link
              key={p.id}
              className="online-player"
              href={"/profile/" + p.username}
            >
              <PlayerAvatar profile={p} className="size-7" />
              <span className="truncate">{p.display_name}</span>
              <span className={"status-dot ml-auto status-" + p.status} />
            </Link>
          ))}
          {!online.length && (
            <p className="small muted">
              Players appear here while they’re active.
            </p>
          )}
          <p className="field-hint mt-6">
            Presence respects each player’s privacy setting.
          </p>
        </aside>
      </div>
    </>
  );
}
function MessageItem({
  message: m,
  onReply,
  onChange,
  replyText,
}: {
  message: ChatMessage;
  onReply: () => void;
  onChange: () => Promise<void>;
  replyText?: string;
}) {
  const { profile } = useCommunity();
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(m.content);
  const [busy, setBusy] = useState(false);
  async function act(action: string, p: Record<string, unknown>) {
    try {
      await command(action, { id: m.id, ...p });
      await onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    }
  }
  return (
    <article className="message">
      <Link href={"/profile/" + m.profiles.username}>
        <PlayerAvatar profile={m.profiles} />
      </Link>
      <div className="message-main">
        <div className="message-meta">
          <Link href={"/profile/" + m.profiles.username}>
            <strong>{m.profiles.display_name}</strong>
          </Link>
          <span className="muted">@{m.profiles.username}</span>
          <time dateTime={m.created_at}>{stamp(m.created_at)}</time>
          {m.edited_at && <span className="muted text-[10px]">edited</span>}
        </div>
        {m.reply_to && (
          <div className="reply-quote">
            {replyText?.slice(0, 140) || "Reply to an earlier message"}
          </div>
        )}
        {m.deleted_at ? (
          <p className="message-text muted italic">This message was deleted.</p>
        ) : (
          <>
            {edit ? (
              <div className="stack mt-2">
                <Textarea
                  aria-label="Edit message"
                  maxLength={4000}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                <div className="row">
                  <Button
                    size="sm"
                    disabled={busy || !value.trim()}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await command("message_edit", {
                          id: m.id,
                          content: value,
                        });
                        setEdit(false);
                        await onChange();
                      } catch (e) {
                        toast.error(
                          e instanceof Error ? e.message : "Could not save.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEdit(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="message-text">{m.content}</p>
            )}
            <div className="attachment-grid">
              {m.message_attachments?.map((a) => (
                <Media key={a.media_assets.id} asset={a.media_assets} />
              ))}
            </div>
            <div className="message-tools">
              {["👍", "❤️", "🔥", "😂", "🎮", "👀"].map((emoji) => (
                <Button
                  key={emoji}
                  aria-label={"React " + emoji}
                  variant={
                    m.message_reactions.some(
                      (r) => r.emoji === emoji && r.user_id === profile.id,
                    )
                      ? "secondary"
                      : "ghost"
                  }
                  onClick={() => act("message_react", { emoji })}
                >
                  {emoji}
                  {m.message_reactions.filter((r) => r.emoji === emoji)
                    .length || ""}
                </Button>
              ))}
              <Button variant="ghost" onClick={onReply}>
                <Reply size={12} />
                Reply
              </Button>
              {m.author_id === profile.id ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setValue(m.content);
                      setEdit(true);
                    }}
                  >
                    Edit
                  </Button>
                  <ConfirmButton
                    title="Delete this message?"
                    description="The message will be removed from the conversation. Reported content may be retained for moderation."
                    onConfirm={() => act("message_delete", {})}
                  >
                    Delete
                  </ConfirmButton>
                  {m.message_receipts.length > 0 && (
                    <span className="muted text-[10px] row">
                      <CheckCheck size={12} />
                      {m.message_receipts.some((r) => r.read_at)
                        ? "Read"
                        : "Delivered"}
                    </span>
                  )}
                </>
              ) : (
                <ReportButton type="message" id={m.id} />
              )}
            </div>
          </>
        )}
      </div>
    </article>
  );
}
