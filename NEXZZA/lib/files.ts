const MB = 1024 * 1024;
const formats: Record<string, { extensions: string[]; max: number }> = {
  "image/jpeg": { extensions: ["jpg", "jpeg"], max: 10 * MB },
  "image/png": { extensions: ["png"], max: 10 * MB },
  "image/webp": { extensions: ["webp"], max: 10 * MB },
  "image/gif": { extensions: ["gif"], max: 10 * MB },
  "video/mp4": { extensions: ["mp4"], max: 100 * MB },
  "video/webm": { extensions: ["webm"], max: 100 * MB },
  "audio/webm": { extensions: ["webm"], max: 25 * MB },
  "audio/ogg": { extensions: ["ogg"], max: 25 * MB },
  "audio/mp4": { extensions: ["m4a", "mp4"], max: 25 * MB },
  "application/pdf": { extensions: ["pdf"], max: 25 * MB },
  "text/plain": { extensions: ["txt"], max: 25 * MB },
};
export function validateFile(
  name: string,
  mime: string,
  size: number,
  scope: string,
) {
  const f = formats[mime];
  if (!f || !f.extensions.includes(name.split(".").pop()?.toLowerCase() || ""))
    throw new Error(
      "Choose a supported image, video, audio, PDF, or text file.",
    );
  if (size < 1 || size > f.max)
    throw new Error(
      "This file must be between 1 byte and " + f.max / MB + " MB.",
    );
  if (["avatar", "group"].includes(scope) && !mime.startsWith("image/"))
    throw new Error("Choose an image.");
  if (scope === "news" && !/^(image|video)\//.test(mime))
    throw new Error("News supports images and videos.");
  if (!["avatar", "group", "news", "chat"].includes(scope))
    throw new Error("Invalid upload location.");
}
export function validSignature(bytes: Uint8Array, mime: string) {
  const text = new TextDecoder().decode(bytes);
  const starts = (a: number[]) => a.every((v, i) => bytes[i] === v);
  if (mime === "image/jpeg") return starts([255, 216, 255]);
  if (mime === "image/png") return starts([137, 80, 78, 71, 13, 10, 26, 10]);
  if (mime === "image/gif") return /^GIF8[79]a/.test(text);
  if (mime === "image/webp")
    return text.startsWith("RIFF") && text.slice(8, 12) === "WEBP";
  if (mime.endsWith("/webm")) return starts([26, 69, 223, 163]);
  if (mime.endsWith("/mp4")) return text.slice(4, 8) === "ftyp";
  if (mime === "audio/ogg") return text.startsWith("OggS");
  if (mime === "application/pdf") return text.startsWith("%PDF-");
  if (mime === "text/plain")
    return (
      !bytes.includes(0) && !/^\s*(<!doctype|<html|<script|<svg)/i.test(text)
    );
  return false;
}
