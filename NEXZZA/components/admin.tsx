/* eslint-disable @next/next/no-img-element -- Private media uses authenticated, uncached endpoints. */
"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Search, Check } from "lucide-react";
import { useCommunity } from "@/components/community-context";
import {
  Button,
  Input,
  Textarea,
  Field,
  SelectField,
  Loading,
  Empty,
  ErrorNotice,
  useAsyncData,
  useDebounced,
  stamp,
} from "@/components/common";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { command } from "@/lib/supabase/client";
import { Media } from "@/components/media";
import type { Asset, Profile, Role } from "@/lib/types";
type Report = {
  id: string;
  reporter_id: string;
  target_id: string;
  target_type: string;
  reason: string;
  explanation: string;
  status: string;
  created_at: string;
};
type Audit = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  created_at: string;
};
type ModerationOption = {
  value: string;
  label: string;
  role?: string;
  status?: string;
};
const newsOptions: ModerationOption[] = [
  { value: "news_hide", label: "Hide story" },
  { value: "news_restore", label: "Restore story" },
  { value: "news_remove", label: "Remove story" },
  { value: "news_verify", label: "Mark verified" },
  { value: "news_unverify", label: "Remove verified badge" },
];
export function AdminDashboard() {
  const { db, role } = useCommunity();
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("open");
  const [type, setType] = useState("All types");
  const [page, setPage] = useState(0);
  const term = useDebounced(search);
  const [revision, setRevision] = useState(0);
  const admin = role.role === "administrator";
  function reload() {
    setRevision((v) => v + 1);
  }
  const stats = useAsyncData(
    () => command<Record<string, number>>("admin_stats"),
    String(revision),
  );
  const reports = useAsyncData(async () => {
    if (tab !== "reports") return [];
    let q = db
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * 30, page * 30 + 29);
    if (status !== "All statuses") q = q.eq("status", status);
    if (type !== "All types") q = q.eq("target_type", type);
    const { data, error } = await q;
    if (error) throw error;
    return data as Report[];
  }, JSON.stringify({ tab, status, type, page, revision }));
  const users = useAsyncData(async () => {
    if (tab !== "players") return [];
    let q = db
      .from("profiles")
      .select("*,user_roles!user_roles_user_id_fkey(*)")
      .order("created_at", { ascending: false })
      .range(page * 30, page * 30 + 29);
    if (term)
      q = q.ilike("username", "%" + term.replace(/[^a-zA-Z0-9_.]/g, "") + "%");
    const { data, error } = await q;
    if (error) throw error;
    return data as unknown as (Profile & { user_roles: Role })[];
  }, JSON.stringify({ tab, term, page, revision }));
  const news = useAsyncData(async () => {
    if (tab !== "news") return [];
    let q = db
      .from("news_posts")
      .select("id,headline,state,verified,author_id,published_at")
      .order("published_at", { ascending: false })
      .range(page * 30, page * 30 + 29);
    if (term) q = q.ilike("headline", "%" + term.replace(/[%_]/g, "") + "%");
    const { data, error } = await q;
    if (error) throw error;
    return data as {
      id: string;
      headline: string;
      state: string;
      verified: boolean;
      author_id: string;
      published_at: string;
    }[];
  }, JSON.stringify({ tab, term, page, revision }));
  const audit = useAsyncData(async () => {
    if (tab !== "audit") return [];
    const { data, error } = await db
      .from("moderation_actions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * 30, page * 30 + 29);
    if (error) throw error;
    return data as Audit[];
  }, JSON.stringify({ tab, page, revision }));
  const current =
    tab === "reports"
      ? reports
      : tab === "players"
        ? users
        : tab === "news"
          ? news
          : audit;
  const userOptions: ModerationOption[] = [
    { value: "suspend", label: "Suspend for 24 hours" },
    ...(admin
      ? [
          { value: "ban", label: "Ban account" },
          { value: "unban", label: "Restore account" },
          { value: "role", label: "Assign moderator", role: "moderator" },
          { value: "role", label: "Make player", role: "player" },
        ]
      : []),
  ];
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow blue">KEEP THE COMMUNITY WELCOMING</p>
          <h1>Moderation.</h1>
          <p>Clear decisions, limited access, and a record of every action.</p>
        </div>
        <Badge variant="outline">
          <ShieldCheck size={14} />
          {admin ? "Administrator" : "Moderator"}
        </Badge>
      </div>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v);
          setPage(0);
          setSearch("");
        }}
      >
        <TabsList className="flex flex-wrap h-auto justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
          <TabsTrigger value="news">News</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
          {admin && (
            <TabsTrigger value="settings">Community settings</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          {stats.loading ? (
            <Loading />
          ) : stats.error ? (
            <ErrorNotice error={stats.error} retry={stats.reload} />
          ) : (
            <>
              <div className="stats-grid">
                {Object.entries(stats.data || {}).map(([key, value]) => (
                  <div className="panel stat" key={key}>
                    <strong>{value}</strong>
                    <span>
                      {
                        (
                          {
                            users: "Players",
                            active: "Active in 5 minutes",
                            new_users: "Joined in 24 hours",
                            messages: "Messages",
                            news: "Stories",
                            reports: "Open reports",
                            suspended: "Suspended",
                            banned: "Banned",
                          } as Record<string, string>
                        )[key]
                      }
                    </span>
                  </div>
                ))}
              </div>
              <div className="notice mt-6">
                Private chats stay private. Moderators can review the specific
                content included in a report. Administrators manage roles and
                permanent bans.
              </div>
            </>
          )}
        </TabsContent>
        {["reports", "players", "news", "audit"].map((section) => (
          <TabsContent value={section} className="mt-6" key={section}>
            {section === "reports" ? (
              <div className="filters">
                <SelectField
                  label="Report status"
                  value={status}
                  onChange={(v) => {
                    setStatus(v);
                    setPage(0);
                  }}
                  options={[
                    "open",
                    "under_review",
                    "resolved",
                    "dismissed",
                    "All statuses",
                  ]}
                />
                <SelectField
                  label="Report type"
                  value={type}
                  onChange={(v) => {
                    setType(v);
                    setPage(0);
                  }}
                  options={["All types", "user", "message", "news", "comment"]}
                />
              </div>
            ) : (
              section !== "audit" && (
                <div className="row mb-5">
                  <Search size={17} className="muted" />
                  <Input
                    aria-label={"Search " + section}
                    value={search}
                    maxLength={80}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(0);
                    }}
                    placeholder={
                      section === "players"
                        ? "Search by username…"
                        : "Search headlines…"
                    }
                    className="max-w-md"
                  />
                </div>
              )
            )}
            {current.loading ? (
              <Loading />
            ) : current.error ? (
              <ErrorNotice error={current.error} retry={current.reload} />
            ) : !current.data?.length ? (
              <Empty
                title="Nothing here right now."
                description={
                  section === "reports"
                    ? "No reports match these filters."
                    : "Matching records will appear here."
                }
              />
            ) : (
              <div className="panel admin-table">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(section === "reports"
                        ? ["Content", "Reason", "Status", "Reported", "Review"]
                        : section === "players"
                          ? ["Player", "Role", "Account state", "Actions"]
                          : section === "news"
                            ? ["Headline", "Visibility", "Verified", "Actions"]
                            : ["Action", "Target", "Reason", "Date"]
                      ).map((h) => (
                        <TableHead key={h}>{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section === "reports" &&
                      reports.data?.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            {r.target_type}
                            <span className="block muted text-[10px]">
                              {r.target_id.slice(0, 8)}
                            </span>
                          </TableCell>
                          <TableCell>{r.reason}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{r.status}</Badge>
                          </TableCell>
                          <TableCell>{stamp(r.created_at)}</TableCell>
                          <TableCell>
                            <ReportReview report={r} onChange={reload} />
                          </TableCell>
                        </TableRow>
                      ))}
                    {section === "players" &&
                      users.data?.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <strong>{p.display_name}</strong>
                            <span className="block muted">@{p.username}</span>
                          </TableCell>
                          <TableCell>{p.user_roles.role}</TableCell>
                          <TableCell>
                            {p.user_roles.state}
                            {p.user_roles.suspended_until && (
                              <span className="block muted text-[10px]">
                                Until {stamp(p.user_roles.suspended_until)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <ModerationAction
                              id={p.id}
                              type="user"
                              options={userOptions}
                              onChange={reload}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    {section === "news" &&
                      news.data?.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.headline}</TableCell>
                          <TableCell>{p.state}</TableCell>
                          <TableCell>
                            {p.verified ? <Check size={15} /> : "—"}
                          </TableCell>
                          <TableCell>
                            <ModerationAction
                              id={p.id}
                              type="news"
                              options={newsOptions}
                              onChange={reload}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    {section === "audit" &&
                      audit.data?.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>{a.action}</TableCell>
                          <TableCell>
                            {a.target_type}
                            <span className="block muted text-[10px]">
                              {a.target_id}
                            </span>
                          </TableCell>
                          <TableCell>
                            {a.reason}
                            <span className="block muted text-[10px]">
                              By {a.actor_id}
                            </span>
                          </TableCell>
                          <TableCell>{stamp(a.created_at)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="row spread mt-5">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((v) => v - 1)}
              >
                Previous
              </Button>
              <span className="small muted">Page {page + 1}</span>
              <Button
                variant="outline"
                disabled={!current.data || current.data.length < 30}
                onClick={() => setPage((v) => v + 1)}
              >
                Next
              </Button>
            </div>
          </TabsContent>
        ))}
        {admin && (
          <TabsContent value="settings" className="mt-6">
            <CommunitySettings />
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}
function ModerationAction({
  id,
  type,
  options,
  onChange,
}: {
  id: string;
  type: string;
  options: ModerationOption[];
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(options[0].label);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Take action
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Moderation decision</DialogTitle>
          <DialogDescription>
            This decision is recorded in the audit log. Explain the specific
            rule or reason for your action.
          </DialogDescription>
        </DialogHeader>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const option = options.find((o) => o.label === selected)!;
            try {
              await command("moderate", {
                target_id: id,
                target_type: type,
                operation: option.value,
                reason,
                ...(option.role ? { role: option.role } : {}),
                ...(option.status ? { status: option.status } : {}),
              });
              setOpen(false);
              setReason("");
              onChange();
              toast.success("Moderation decision saved.");
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not apply decision.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Decision">
            <SelectField
              label="Moderation decision"
              value={selected}
              onChange={setSelected}
              options={options.map((o) => o.label)}
            />
          </Field>
          <Field label="Reason">
            <Textarea
              aria-label="Moderation reason"
              minLength={5}
              maxLength={1000}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          {error && <ErrorNotice error={error} />}
          <Button disabled={busy}>
            {busy ? "Saving…" : "Confirm decision"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function ReportReview({
  report: r,
  onChange,
}: {
  report: Report;
  onChange: () => void;
}) {
  const { db, role } = useCommunity();
  const [open, setOpen] = useState(false);
  const query = useAsyncData(
    async () => {
      if (!open) return { context: null, notes: [], assets: [] as Asset[] };
      const [context, notes] = await Promise.all([
        command<Record<string, unknown>>("report_context", { id: r.id }),
        db
          .from("report_notes")
          .select("id,content,created_at")
          .eq("report_id", r.id)
          .order("created_at"),
      ]);
      if (notes.error) throw notes.error;
      const mediaResponse = await fetch("/api/report-media/" + r.id);
      const assets = mediaResponse.ok
        ? ((await mediaResponse.json()) as Asset[])
        : [];
      return { context, notes: notes.data, assets };
    },
    String(open) + r.id,
  );
  const ctx = query.data?.context;
  const options: ModerationOption[] =
    r.target_type === "news"
      ? newsOptions
      : r.target_type === "user"
        ? [
            { value: "suspend", label: "Suspend for 24 hours" },
            ...(role.role === "administrator"
              ? [{ value: "ban", label: "Ban account" }]
              : []),
          ]
        : r.target_type === "comment"
          ? [
              { value: "comment_hide", label: "Hide comment" },
              { value: "comment_restore", label: "Restore comment" },
            ]
          : ctx?.conversation_id === "00000000-0000-4000-8000-000000000001"
            ? [
                { value: "message_hide", label: "Hide public message" },
                { value: "message_restore", label: "Restore public message" },
              ]
            : [];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review report</DialogTitle>
          <DialogDescription>
            {r.reason} · {r.target_type} · {stamp(r.created_at)}
          </DialogDescription>
        </DialogHeader>
        {query.loading ? (
          <Loading />
        ) : query.error ? (
          <ErrorNotice error={query.error} />
        ) : (
          <div className="stack">
            <div>
              <h3 className="small font-semibold">Reporter’s explanation</h3>
              <p className="small muted whitespace-pre-wrap">
                {r.explanation || "No additional explanation."}
              </p>
            </div>
            <div className="panel">
              <p className="eyebrow blue mb-3">REPORTED CONTENT SNAPSHOT</p>
              {!!ctx?.headline && (
                <h3 className="font-semibold mb-2">{String(ctx.headline)}</h3>
              )}
              {!!ctx?.username && (
                <h3 className="font-semibold mb-2">@{String(ctx.username)}</h3>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">
                {String(
                  ctx?.content || ctx?.body || ctx?.bio || "No text content.",
                )}
              </p>
              {!!ctx?.cover_id && (
                <img
                  className="mt-3 rounded"
                  src={"/api/media/" + String(ctx.cover_id)}
                  alt="Reported story cover"
                />
              )}
            </div>
            <div className="attachment-grid">
              {query.data?.assets.map((a) => (
                <Media key={a.id} asset={a} />
              ))}
            </div>
            {options.length > 0 && (
              <ModerationAction
                id={r.target_id}
                type={r.target_type}
                options={options}
                onChange={onChange}
              />
            )}
            <h3 className="font-semibold text-sm">Review notes</h3>
            {query.data?.notes.map((n) => (
              <div key={n.id} className="notice">
                <p className="small whitespace-pre-wrap">{n.content}</p>
                <span className="field-hint">{stamp(n.created_at)}</span>
              </div>
            ))}
            <ModerationAction
              id={r.id}
              type="report"
              options={[
                {
                  value: "report_status",
                  label: "Under review",
                  status: "under_review",
                },
                {
                  value: "report_status",
                  label: "Resolve report",
                  status: "resolved",
                },
                {
                  value: "report_status",
                  label: "Dismiss report",
                  status: "dismissed",
                },
              ]}
              onChange={() => {
                void query.reload();
                onChange();
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
function CommunitySettings() {
  const { db } = useCommunity();
  const [profanityDraft, setProfanity] = useState<boolean | undefined>();
  const [suspendDraft, setSuspend] = useState<boolean | undefined>();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const query = useAsyncData(async () => {
    const { data, error } = await db
      .from("community_settings")
      .select("*")
      .single();
    if (error) throw error;
    return data as {
      profanity_enabled: boolean;
      moderators_can_suspend: boolean;
    };
  }, "settings");
  const profanity = profanityDraft ?? query.data?.profanity_enabled ?? true;
  const suspend = suspendDraft ?? query.data?.moderators_can_suspend ?? false;
  return query.loading ? (
    <Loading />
  ) : query.error ? (
    <ErrorNotice error={query.error} />
  ) : (
    <form
      className="panel stack max-w-2xl"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await command("settings", {
            profanity_enabled: profanity,
            moderators_can_suspend: suspend,
            reason,
          });
          toast.success("Community settings updated.");
          setReason("");
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "Could not save settings.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="row spread">
        <span className="small">
          Block words in the community profanity filter
        </span>
        <Switch
          aria-label="Profanity filter"
          checked={profanity}
          onCheckedChange={setProfanity}
        />
      </div>
      <div className="row spread">
        <span className="small">
          Allow moderators to suspend players for 24 hours
        </span>
        <Switch
          aria-label="Allow moderator suspensions"
          checked={suspend}
          onCheckedChange={setSuspend}
        />
      </div>
      <Field label="Reason for this change">
        <Textarea
          aria-label="Settings change reason"
          value={reason}
          minLength={5}
          maxLength={1000}
          required
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <Button disabled={busy}>
        {busy ? "Saving…" : "Save community settings"}
      </Button>
    </form>
  );
}
