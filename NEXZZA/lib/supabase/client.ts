"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
let singleton: SupabaseClient | undefined;
export function browserClient(url: string, key: string, remember = true) {
  return (singleton ??= createBrowserClient(url, key, {
    cookieOptions: { maxAge: remember ? 31536000 : undefined },
  }));
}
export async function command<T = Record<string, unknown>>(
  action: string,
  p: Record<string, unknown> = {},
): Promise<T> {
  const r = await fetch("/api/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, p }),
  });
  const result = (await r.json()) as T & { error?: string };
  if (!r.ok)
    throw new Error(result.error || "Something went wrong. Please try again.");
  return result as T;
}
export async function authAction(action: string, p: Record<string, unknown>) {
  const r = await fetch("/api/auth/" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  const data = (await r.json()) as {
    error?: string;
    message?: string;
    available?: boolean;
    ok?: boolean;
  };
  if (!r.ok) throw new Error(data.error || "Please try again.");
  return data;
}
