/* eslint-disable @next/next/no-img-element -- Private media uses authenticated, uncached endpoints. */
"use client";
import { useCallback, useEffect, useState } from "react";
import { HardLink as Link } from "@/components/hard-link";
import {
  Heart,
  Bookmark,
  MessageSquare,
  Eye,
  ArrowRight,
  PenLine,
  BadgeCheck,
  Share2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCommunity } from "@/components/community-context";
import {
  Button,
  Input,
  Textarea,
  Field,
  SelectField,
  PlayerLink,
  Loading,
  Empty,
  ErrorNotice,
  ConfirmButton,
  ReportButton,
  useAsyncData,
  useDebounced,
  stamp,
} from "@/components/common";
import { UploadPicker, UploadedList } from "@/components/media";
import { command } from "@/lib/supabase/client";
import { hardNavigate } from "@/lib/hard-navigation";
import {
  categories,
  platforms,
  sources,
  newsSchema,
  localDayRange,
} from "@/lib/validation";
import type { NewsPost, Asset, Comment } from "@/lib/types";
export function NewsCard({ post: p }: { post: NewsPost }) {
  return (
    <article className="news-card">
      <Link href={"/news/" + p.id}>
        <img
          className="news-card-cover"
          loading="lazy"
          src={"/api/media/" + p.cover_id}
          alt={p.headline}
        />
      </Link>
      <div className="news-card-body">
        <div className="row wrap-row">
          <Badge variant="secondary">{p.category}</Badge>
          {p.verified && (
            <span className="row blue text-[10px]">
              <BadgeCheck size={13} />
              Verified
            </span>
          )}
          <span className="muted text-[10px]">{p.source_type}</span>
        </div>
        <Link href={"/news/" + p.id}>
          <h2>{p.headline}</h2>
        </Link>
        <p className="line-clamp-2">{p.body}</p>
        <div className="row spread mt-5">
          <Link className="text-xs" href={"/profile/" + p.profiles.username}>
            {p.profiles.display_name}
            <span className="muted block text-[10px]">
              @{p.profiles.username}
            </span>
          </Link>
          <time className="muted text-[10px]" dateTime={p.published_at}>
            {stamp(p.published_at)}
          </time>
        </div>
        <div className="news-meta">
          <Heart size={13} />
          {p.likes || 0}
          <MessageSquare size={13} />
          {p.comments || 0}
          <span className="ml-auto">{p.game}</span>
        </div>
      </div>
    </article>
  );
}
export function NewsFeed({ bookmarks = false }: { bookmarks?: boolean }) {
  const { db } = useCommunity();
  const [tab, setTab] = useState("today");
  const [category, setCategory] = useState("All categories");
  const [platform, setPlatform] = useState("All platforms");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const queryText = useDebounced(search);
  const query = useAsyncData(async () => {
    const { data, error } = await db.rpc("news_feed", {
      p: {
        tab,
        category,
        platform,
        query: queryText,
        bookmarks,
        offset,
        limit: 18,
        ...localDayRange(),
      },
    });
    if (error) throw error;
    return data as NewsPost[];
  }, JSON.stringify({ tab, category, platform, queryText, bookmarks, offset }));

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow blue">
            {bookmarks ? "SAVE IT FOR LATER" : "STORIES FROM THE PLAYERS"}
          </p>
          <h1>{bookmarks ? "Your bookmarks." : "Gaming news."}</h1>
          <p>
            {bookmarks
              ? "The stories you want to come back to. Only you can see this list."
              : "The latest discoveries, updates, and opinions from your community."}
          </p>
        </div>
        <Button asChild>
          <Link href="/news/create">
            <PenLine size={15} />
            Share a story
          </Link>
        </Button>
      </div>
      {!bookmarks && (
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            setOffset(0);
          }}
        >
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="archive">Archive</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
      <div className="filters">
        <Input
          aria-label="Search gaming news"
          placeholder="Search stories, games, or tags…"
          maxLength={80}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
        />
        <SelectField
          label="Category"
          options={["All categories", ...categories]}
          value={category}
          onChange={(v) => {
            setCategory(v);
            setOffset(0);
          }}
        />
        <SelectField
          label="Platform"
          options={["All platforms", ...platforms]}
          value={platform}
          onChange={(v) => {
            setPlatform(v);
            setOffset(0);
          }}
        />
      </div>
      {!bookmarks && (
        <p className="field-hint mb-5">
          {tab === "today"
            ? "Today follows your local time zone."
            : tab === "trending"
              ? "Popular stories from the last seven days, weighted by recent engagement."
              : tab === "archive"
                ? "Earlier stories, before today in your local time zone."
                : "The newest stories across the community."}
        </p>
      )}
      {query.loading ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={query.reload} />
      ) : query.data?.length ? (
        <>
          <div className="feed-grid">
            {query.data.map((p) => (
              <NewsCard post={p} key={p.id} />
            ))}
          </div>
          <div className="row spread mt-8">
            <Button
              variant="outline"
              disabled={offset === 0}
              onClick={() => setOffset((v) => Math.max(0, v - 18))}
            >
              Previous
            </Button>
            <span className="small muted">Page {offset / 18 + 1}</span>
            <Button
              variant="outline"
              disabled={query.data.length < 18}
              onClick={() => setOffset((v) => v + 18)}
            >
              Next
            </Button>
          </div>
        </>
      ) : (
        <Empty
          title={
            bookmarks
              ? "Your reading list starts here."
              : search ||
                  category !== "All categories" ||
                  platform !== "All platforms"
                ? "No stories match those filters."
                : tab === "today"
                  ? "A new day. A new story."
                  : "The next story could be yours."
          }
          description={
            bookmarks
              ? "Bookmark any article to keep it close."
              : "Share something worth talking about, or explore the latest community stories."
          }
        >
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setCategory("All categories");
              setPlatform("All platforms");
              setTab("latest");
            }}
          >
            {bookmarks ? (
              <Link href="/news">Explore news</Link>
            ) : (
              "Explore latest stories"
            )}
          </Button>
        </Empty>
      )}
    </>
  );
}
export function NewsEditor({ initial }: { initial?: NewsPost }) {
  const [id] = useState(() => initial?.id || crypto.randomUUID());
  const [headline, setHeadline] = useState(initial?.headline || "");
  const [body, setBody] = useState(initial?.body || "");
  const [game, setGame] = useState(initial?.game || "");
  const [platform, setPlatform] = useState(
    initial?.platform || "Multi-platform",
  );
  const [category, setCategory] = useState(
    initial?.category || "Community News",
  );
  const [source, setSource] = useState(
    initial?.source_type || "Original Reporting",
  );
  const [sourceUrl, setSourceUrl] = useState(initial?.source_url || "");
  const [tags, setTags] = useState(initial?.tags.join(", ") || "");
  const [cover, setCover] = useState<Asset | null>(
    initial?.cover_id
      ? {
          id: initial.cover_id,
          mime: "image/jpeg",
          filename: "Cover image",
          size: 1,
        }
      : null,
  );
  const [video, setVideo] = useState<Asset | null>(
    initial?.video_id
      ? {
          id: initial.video_id,
          mime: "video/mp4",
          filename: "Article video",
          size: 1,
        }
      : null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function fieldError(name: string) {
    return (
      errors[name] && (
        <p role="alert" className="error-text">
          {errors[name]}
        </p>
      )
    );
  }
  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-head">
        <div>
          <p className="eyebrow blue">YOUR VOICE BELONGS HERE</p>
          <h1>{initial ? "Edit your story." : "Share a story."}</h1>
          <p>
            Give the community something worth talking about. Credit your
            sources.
          </p>
        </div>
      </div>
      <form
        className="panel stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setErrors({});
          const result = newsSchema.safeParse({
            id,
            headline,
            body,
            game,
            platform,
            category,
            source_type: source,
            source_url: sourceUrl,
            tags: [
              ...new Set(
                tags
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              ),
            ],
            cover_id: cover?.id || "",
            video_id: video?.id || null,
          });
          if (!result.success) {
            const fields: Record<string, string> = {};
            for (const issue of result.error.issues)
              fields[String(issue.path[0])] = issue.message;
            setErrors(fields);
            return;
          }
          setBusy(true);
          try {
            await command("news_save", result.data);
            toast.success(
              initial ? "Story updated." : "Your story is published.",
            );
            hardNavigate("/news/" + id);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not publish your story.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Headline">
          <Input
            aria-label="Headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            maxLength={160}
            required
            placeholder="What’s the story?"
          />
          {fieldError("headline")}
        </Field>
        <div className="form-grid">
          <Field label="Game">
            <Input
              aria-label="Game"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              required
              maxLength={60}
              placeholder="Game or gaming topic"
            />
            {fieldError("game")}
          </Field>
          <Field label="Platform">
            <SelectField
              label="Platform"
              options={platforms}
              value={platform}
              onChange={setPlatform}
            />
          </Field>
          <Field label="Category">
            <SelectField
              label="Category"
              options={categories}
              value={category}
              onChange={setCategory}
            />
          </Field>
          <Field label="Source type">
            <SelectField
              label="Source type"
              options={sources}
              value={source}
              onChange={setSource}
            />
          </Field>
        </div>
        <Field
          label="Source link"
          hint={
            source === "External News"
              ? "Required for external news. Link to the original reporting."
              : "Optional. Credit any reporting or references that informed your story."
          }
        >
          <Input
            aria-label="Source URL"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            maxLength={2048}
            placeholder="https://"
          />
          {fieldError("source_url")}
        </Field>
        <Field
          label="Cover image"
          hint="Required. JPG, PNG, WebP, or GIF, up to 10 MB. Only upload media you have permission to share."
        >
          {cover && (
            <img
              src={"/api/media/" + cover.id}
              className="w-full max-h-72 rounded-lg object-cover"
              alt="Cover preview"
            />
          )}
          <UploadPicker
            scope="news"
            postId={id}
            onUpload={setCover}
            accept="image/jpeg,image/png,image/webp,image/gif"
            label={cover ? "Replace cover" : "Choose cover image"}
            disabled={busy}
          />
          {fieldError("cover_id")}
        </Field>
        <Field
          label="Story"
          hint={
            body.length +
            " / 30,000 characters. Plain text; line breaks are preserved."
          }
        >
          <Textarea
            aria-label="Story body"
            className="min-h-72"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={30000}
            placeholder="Tell your story. Add context, details, and your perspective."
          />
          {fieldError("body")}
        </Field>
        <Field label="Video (optional)" hint="MP4 or WebM, up to 100 MB.">
          {video && (
            <UploadedList assets={[video]} onRemove={() => setVideo(null)} />
          )}
          <UploadPicker
            scope="news"
            postId={id}
            onUpload={setVideo}
            accept="video/mp4,video/webm"
            label="Add video"
            disabled={busy}
          />
        </Field>
        <Field label="Tags" hint="Up to 8 tags, separated by commas.">
          <Input
            aria-label="Tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="updates, strategy, multiplayer"
          />
          {fieldError("tags")}
        </Field>
        <div className="notice">
          Your post will be labeled community submitted. Only moderators can
          mark a story as verified. Editing a verified story removes that badge
          until it is reviewed again.
        </div>
        {error && <ErrorNotice error={error} />}
        <div className="row">
          <Button disabled={busy}>
            {busy ? "Publishing…" : initial ? "Save changes" : "Publish story"}
            <ArrowRight size={16} />
          </Button>
          <Button type="button" variant="ghost" asChild>
            <Link href={initial ? "/news/" + id : "/news"}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
export function Article({ initial }: { initial: NewsPost }) {
  const { db, profile } = useCommunity();
  const post = initial;
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [engagement, setEngagement] = useState({
    likes: 0,
    comments: 0,
    bookmarks: 0,
    views: 0,
  });
  const [busy, setBusy] = useState(false);
  const related = useAsyncData(async () => {
    const { data, error } = await db
      .from("news_posts")
      .select("*,profiles!news_posts_author_id_fkey(*)")
      .eq("state", "published")
      .eq("category", post.category)
      .neq("id", post.id)
      .order("published_at", { ascending: false })
      .limit(3);
    if (error) throw error;
    return data as unknown as NewsPost[];
  }, post.id);
  const refresh = useCallback(async () => {
    const [e, l, b] = await Promise.all([
      db.rpc("news_engagement", { nids: [post.id] }),
      db
        .from("news_likes")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", profile.id)
        .maybeSingle(),
      db
        .from("news_bookmarks")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", profile.id)
        .maybeSingle(),
    ]);
    if (e.data?.[0]) setEngagement(e.data[0]);
    setLiked(!!l.data);
    setBookmarked(!!b.data);
  }, [db, post.id, profile.id]);
  useEffect(() => {
    void command("news_view", { id: initial.id })
      .then(refresh)
      .catch(() => {});
    const c = db
      .channel("article:" + initial.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "news_likes",
          filter: "post_id=eq." + initial.id,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "news_comments",
          filter: "post_id=eq." + initial.id,
        },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      void db.removeChannel(c);
    };
  }, [db, initial.id, refresh]);
  async function toggle(action: string) {
    setBusy(true);
    try {
      await command(action, { id: post.id });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="article">
      <Link className="text-link" href="/news">
        ← Back to gaming news
      </Link>
      <div className="row wrap-row mt-7">
        <Badge variant="secondary">{post.category}</Badge>
        <Badge variant="outline">{post.platform}</Badge>
        <span className="small muted">
          Community submitted · {post.source_type}
        </span>
        {post.verified && (
          <span className="row blue small">
            <BadgeCheck size={15} />
            Moderator verified
          </span>
        )}
      </div>
      <h1>{post.headline}</h1>
      <div className="row spread wrap-row">
        <PlayerLink profile={post.profiles} />
        <div className="small muted">
          <time dateTime={post.published_at}>{stamp(post.published_at)}</time>
          {post.updated_at !== post.published_at && (
            <span className="block text-[10px]">
              Updated {stamp(post.updated_at)}
            </span>
          )}
        </div>
      </div>
      <img
        className="article-cover"
        src={"/api/media/" + post.cover_id}
        alt={post.headline}
      />
      <div className="article-body">{post.body}</div>
      {post.video_id && (
        <video
          className="w-full rounded-lg mt-6"
          controls
          preload="metadata"
          src={"/api/media/" + post.video_id}
        />
      )}
      <div className="row wrap-row mt-7">
        {post.tags.map((tag) => (
          <Badge variant="secondary" key={tag}>
            #{tag}
          </Badge>
        ))}
      </div>
      {post.source_url && (
        <a
          className="text-link mt-6"
          href={post.source_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read the original source <ExternalLink size={14} />
        </a>
      )}
      <div className="article-actions">
        <Button
          variant={liked ? "default" : "outline"}
          disabled={busy}
          onClick={() => toggle("news_like")}
        >
          <Heart size={16} />
          {engagement.likes} {liked ? "Liked" : "Like"}
        </Button>
        <Button
          variant={bookmarked ? "default" : "outline"}
          disabled={busy}
          onClick={() => toggle("news_bookmark")}
        >
          <Bookmark size={16} />
          {bookmarked ? "Saved" : "Bookmark"}
        </Button>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              if (navigator.share)
                await navigator.share({
                  title: post.headline,
                  url: window.location.href,
                });
              else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied.");
              }
            } catch (e) {
              if (!(e instanceof DOMException && e.name === "AbortError"))
                toast.error(
                  "Could not share. Copy the link from your address bar.",
                );
            }
          }}
        >
          <Share2 size={16} />
          Share
        </Button>
        <span className="row muted small">
          <Eye size={14} />
          {engagement.views}
        </span>
        {post.author_id === profile.id ? (
          <>
            <Button variant="ghost" asChild>
              <Link href={"/news/" + post.id + "/edit"}>Edit</Link>
            </Button>
            <ConfirmButton
              title="Delete this story?"
              description="This story will be removed from the news feed."
              onConfirm={async () => {
                await command("news_delete", { id: post.id });
                hardNavigate("/news");
              }}
            >
              Delete
            </ConfirmButton>
          </>
        ) : (
          <ReportButton type="news" id={post.id} />
        )}
      </div>
      <Comments postId={post.id} />
      {!!related.data?.length && (
        <section className="mt-12">
          <h2 className="text-2xl mb-6">Keep exploring.</h2>
          <div className="feed-grid">
            {related.data.map((p) => (
              <NewsCard post={p} key={p.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
function Comments({ postId }: { postId: string }) {
  const { db, profile } = useCommunity();
  const [limit, setLimit] = useState(40);
  const [content, setContent] = useState("");
  const [reply, setReply] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useAsyncData(async () => {
    const { data, error } = await db
      .from("news_comments")
      .select("*,profiles!news_comments_author_id_fkey(*)")
      .eq("post_id", postId)
      .eq("hidden", false)
      .order("created_at")
      .order("id")
      .limit(limit);
    if (error) throw error;
    return data as unknown as Comment[];
  }, postId + limit);
  const reload = query.reload;
  useEffect(() => {
    const c = db
      .channel("comments:" + postId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "news_comments",
          filter: "post_id=eq." + postId,
        },
        () => void reload(),
      )
      .subscribe();
    return () => {
      void db.removeChannel(c);
    };
  }, [db, postId, reload]);
  function item(c: Comment, isReply = false) {
    return (
      <article className={"comment " + (isReply ? "reply" : "")} key={c.id}>
        <div className="row spread">
          <PlayerLink profile={c.profiles} />
          <span className="muted text-[10px]">
            {stamp(c.created_at)}
            {c.edited_at ? " · edited" : ""}
          </span>
        </div>
        <p className={c.deleted_at ? "muted italic" : ""}>{c.content}</p>
        {!c.deleted_at && (
          <div className="row">
            {!isReply && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setReply(c);
                  setEditing(null);
                  setContent("");
                }}
              >
                Reply
              </Button>
            )}
            {c.author_id === profile.id ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(c);
                    setContent(c.content);
                    setReply(null);
                  }}
                >
                  Edit
                </Button>
                <ConfirmButton
                  title="Delete your comment?"
                  description="Your comment will be removed. Any replies remain in the discussion."
                  onConfirm={async () => {
                    await command("comment_delete", { id: c.id });
                    await reload();
                  }}
                >
                  Delete
                </ConfirmButton>
              </>
            ) : (
              <ReportButton type="comment" id={c.id} />
            )}
          </div>
        )}
      </article>
    );
  }
  return (
    <section className="mt-8">
      <h2 className="text-2xl">The conversation</h2>
      <form
        className="comment-form stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await command("comment_save", {
              id: editing?.id || null,
              post_id: postId,
              parent_id: editing?.parent_id || reply?.id || null,
              content,
            });
            setContent("");
            setReply(null);
            setEditing(null);
            await reload();
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Could not post comment.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {(reply || editing) && (
          <div className="row spread reply-quote">
            <span>
              {editing
                ? "Editing your comment"
                : "Replying to " + reply?.profiles.display_name}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setReply(null);
                setEditing(null);
                setContent("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}
        <Textarea
          aria-label="Comment"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          maxLength={2000}
          placeholder="Add your perspective. Keep it respectful."
        />
        {error && <ErrorNotice error={error} />}
        <Button className="self-start" disabled={busy || !content.trim()}>
          {busy ? "Posting…" : editing ? "Save comment" : "Post comment"}
        </Button>
      </form>
      {query.loading ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={reload} />
      ) : !query.data?.length ? (
        <p className="muted small py-8">
          No comments yet. Start the conversation.
        </p>
      ) : (
        query.data
          .filter((c) => !c.parent_id)
          .map((c) => (
            <div key={c.id}>
              {item(c)}
              {query.data
                ?.filter((r) => r.parent_id === c.id)
                .map((r) => item(r, true))}
            </div>
          ))
      )}
      {query.data?.length === limit && (
        <Button
          className="mt-5"
          variant="outline"
          onClick={() => setLimit((v) => v + 40)}
        >
          Load more comments
        </Button>
      )}
    </section>
  );
}
