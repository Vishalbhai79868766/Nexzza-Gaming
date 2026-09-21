"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HardLink as Link } from "@/components/hard-link";
import { Flag, Gamepad2, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { command } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
export { Button, Input, Textarea, Label };
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="field">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
export function SelectField({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function PlayerAvatar({
  profile,
  className = "",
}: {
  profile: Pick<Profile, "display_name" | "avatar_id">;
  className?: string;
}) {
  return (
    <Avatar className={"avatar " + className}>
      {profile.avatar_id && (
        <AvatarImage src={"/api/media/" + profile.avatar_id} alt="" />
      )}
      <AvatarFallback>
        {profile.display_name.slice(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
export function PlayerLink({ profile }: { profile: Profile }) {
  return (
    <Link href={"/profile/" + profile.username} className="player-link">
      <PlayerAvatar profile={profile} />
      <span>
        <strong>{profile.display_name}</strong>
        <small>@{profile.username}</small>
      </span>
    </Link>
  );
}
export function Loading() {
  return (
    <div className="stack" aria-label="Loading" role="status">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-36 w-full" />
      <Skeleton className="h-14 w-3/4" />
    </div>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <Gamepad2 size={35} />
      <h3>{title}</h3>
      <p>{description}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return (
    <div className="notice error row spread" role="alert">
      <span>{error}</span>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function ConfirmButton({
  children,
  title,
  description,
  onConfirm,
  variant = "outline",
  disabled = false,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  onConfirm: () => Promise<unknown>;
  variant?: "outline" | "ghost" | "destructive";
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={variant} disabled={disabled || busy}>
          {busy ? (
            <LoaderCircle className="animate-spin" size={15} />
          ) : (
            children
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } catch (e) {
                toast.error(
                  e instanceof Error ? e.message : "Please try again.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function ReportButton({ type, id }: { type: string; id: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Harassment");
  const [explanation, setExplanation] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Flag size={13} />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {type}</DialogTitle>
          <DialogDescription>
            Help the moderation team understand what happened. Only the reported
            content is shared for review.
          </DialogDescription>
        </DialogHeader>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await command("report", {
                target_type: type,
                target_id: id,
                reason,
                explanation,
              });
              setOpen(false);
              toast.success("Report sent to the moderation team.");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Reason">
            <SelectField
              label="Report reason"
              value={reason}
              onChange={setReason}
              options={[
                "Harassment",
                "Spam",
                "Hate speech",
                "Unsafe content",
                "Misinformation",
                "Other",
              ]}
            />
          </Field>
          <Field label="What happened?">
            <Textarea
              aria-label="Report explanation"
              maxLength={1000}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </Field>
          <Button disabled={busy}>{busy ? "Sending…" : "Send report"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function useAsyncData<T>(loader: () => Promise<T>, key: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const ref = useRef(loader);
  useEffect(() => {
    ref.current = loader;
  }, [loader]);
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const current = ++seq.current;
    setError("");
    try {
      const result = await ref.current();
      if (current === seq.current) setData(result);
    } catch (e) {
      if (current === seq.current)
        setError(e instanceof Error ? e.message : "Could not load this page.");
    } finally {
      if (current === seq.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setLoading(true);
        setData(null);
        void reload();
      }
    });
    return () => {
      active = false;
    };
  }, [key, reload]);
  return { data, error, loading, reload, setData };
}
export function useDebounced(value: string, delay = 300) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setResult(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return result;
}
export function stamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
