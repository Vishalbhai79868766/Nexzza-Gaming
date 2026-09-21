/* eslint-disable @next/next/no-img-element -- Private media uses authenticated, uncached endpoints. */
"use client";
import { useEffect, useRef, useState } from "react";
import { Paperclip, X, Mic, Square, Upload, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { validateFile } from "@/lib/files";
import type { Asset } from "@/lib/types";
type UploadProps = {
  scope: "avatar" | "group" | "news" | "chat";
  conversationId?: string;
  postId?: string;
  onUpload: (a: Asset) => void;
  accept?: string;
  label?: string;
  disabled?: boolean;
};
export function UploadPicker({
  scope,
  conversationId,
  postId,
  onUpload,
  accept,
  label = "Attach file",
  disabled,
}: UploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  useEffect(() => () => xhr.current?.abort(), []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function upload(file: File) {
    setError("");
    try {
      const mime = file.type.split(";")[0];
      validateFile(file.name, mime, file.size, scope);
      setName(file.name);
      if (mime.startsWith("image/")) setPreview(URL.createObjectURL(file));
      setProgress(0);
      const request = new XMLHttpRequest();
      xhr.current = request;
      request.open("POST", "/api/upload");
      request.setRequestHeader("Content-Type", mime);
      request.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
      request.setRequestHeader("X-File-Size", String(file.size));
      request.setRequestHeader("X-File-Scope", scope);
      if (conversationId)
        request.setRequestHeader("X-Conversation-Id", conversationId);
      if (postId) request.setRequestHeader("X-Post-Id", postId);
      request.upload.onprogress = (e) => {
        if (e.lengthComputable)
          setProgress(Math.round((e.loaded / e.total) * 100));
      };
      request.onload = () => {
        setProgress(null);
        setPreview("");
        try {
          const result = JSON.parse(request.responseText);
          if (request.status < 200 || request.status >= 300)
            throw new Error(result.error || "Upload failed.");
          onUpload(result);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed.");
        }
      };
      request.onerror = () => {
        setProgress(null);
        setError("Connection lost. Choose the file again to retry.");
      };
      request.onabort = () => {
        setProgress(null);
        setPreview("");
      };
      request.send(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
  }
  return (
    <div>
      <input
        ref={input}
        type="file"
        hidden
        accept={
          accept ||
          "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/webm,audio/ogg,audio/mp4,application/pdf,text/plain"
        }
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || progress !== null}
        onClick={() => input.current?.click()}
      >
        <Paperclip size={15} />
        {label}
      </Button>
      {progress !== null && (
        <div className="upload-item mt-2">
          {preview && <img src={preview} alt="" className="upload-preview" />}
          <div className="min-w-0 flex-1">
            <span>{name}</span>
            <Progress value={progress} className="mt-2 h-1" />
            <small>
              {progress === 100 ? "Checking file…" : progress + "%"}
            </small>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Cancel upload"
            onClick={() => xhr.current?.abort()}
          >
            <X size={14} />
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="error-text mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
export function Media({ asset }: { asset: Asset }) {
  const src = "/api/media/" + asset.id;
  return (
    <div className="attachment">
      {asset.mime.startsWith("image/") ? (
        <a href={src} target="_blank" rel="noopener noreferrer">
          <img loading="lazy" src={src} alt={asset.filename} />
        </a>
      ) : asset.mime.startsWith("video/") ? (
        <video
          controls
          preload="metadata"
          src={src}
          aria-label={asset.filename}
        />
      ) : asset.mime.startsWith("audio/") ? (
        <audio
          controls
          preload="metadata"
          src={src}
          aria-label={asset.filename}
        />
      ) : (
        <a
          href={src}
          className="attachment-file"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FileDown size={20} />
          {asset.filename}
          <span className="muted">{(asset.size / 1024).toFixed(0)} KB</span>
        </a>
      )}
    </div>
  );
}
export function UploadedList({
  assets,
  onRemove,
}: {
  assets: Asset[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="uploads">
      {assets.map((a) => (
        <div key={a.id} className="upload-item">
          {a.mime.startsWith("image/") && (
            <img src={"/api/media/" + a.id} className="upload-preview" alt="" />
          )}
          <span>{a.filename}</span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={"Remove " + a.filename}
            onClick={() => onRemove(a.id)}
          >
            <X size={13} />
          </Button>
        </div>
      ))}
    </div>
  );
}
export function VoiceRecorder({
  conversationId,
  onUpload,
  disabled,
}: {
  conversationId: string;
  onUpload: (a: Asset) => void;
  disabled?: boolean;
}) {
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const discard = useRef(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<Blob | null>(null);
  const [src, setSrc] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      discard.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(
      () =>
        setSeconds((s) => {
          if (s >= 299) recorder.current?.stop();
          return s + 1;
        }),
      1000,
    );
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(
    () => () => {
      if (src) URL.revokeObjectURL(src);
    },
    [src],
  );
  async function start() {
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error("Voice recording is not supported in this browser.");
      const mime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime) throw new Error("No supported recording format found.");
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const r = new MediaRecorder(stream.current, { mimeType: mime });
      recorder.current = r;
      chunks.current = [];
      discard.current = false;
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      r.onstop = () => {
        stream.current?.getTracks().forEach((t) => t.stop());
        setRecording(false);
        if (!discard.current) {
          const blob = new Blob(chunks.current, { type: mime.split(";")[0] });
          setClip(blob);
          setSrc(URL.createObjectURL(blob));
        }
      };
      r.start();
      setSeconds(0);
      setRecording(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Microphone unavailable.");
    }
  }
  async function send() {
    if (!clip) return;
    setBusy(true);
    try {
      const ext =
        clip.type === "audio/mp4"
          ? "m4a"
          : clip.type === "audio/ogg"
            ? "ogg"
            : "webm";
      const result = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": clip.type,
          "X-File-Name": "voice-note." + ext,
          "X-File-Size": String(clip.size),
          "X-File-Scope": "chat",
          "X-Conversation-Id": conversationId,
        },
        body: clip,
      });
      const data = (await result.json()) as Asset & { error?: string };
      if (!result.ok) throw new Error(data.error || "Upload failed.");
      onUpload(data);
      setClip(null);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not upload voice note.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {!recording && !clip && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={start}
        >
          <Mic size={15} />
          Voice note
        </Button>
      )}
      {recording && (
        <div className="row">
          <span className="small">
            Recording {Math.floor(seconds / 60)}:
            {String(seconds % 60).padStart(2, "0")}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => recorder.current?.stop()}
          >
            <Square size={12} />
            Stop
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              discard.current = true;
              recorder.current?.stop();
            }}
          >
            Discard
          </Button>
        </div>
      )}
      {clip && (
        <div className="stack mt-2">
          <audio controls src={src} />
          <div className="row">
            <Button
              type="button"
              size="sm"
              disabled={busy || disabled}
              onClick={send}
            >
              <Upload size={14} />
              {busy ? "Uploading…" : "Attach voice note"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setClip(null)}
            >
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
