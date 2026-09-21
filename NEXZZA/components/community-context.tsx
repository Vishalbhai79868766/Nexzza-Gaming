"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useTheme } from "next-themes";
import type { SupabaseClient } from "@supabase/supabase-js";
import { browserClient, command } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";
type Context = {
  db: SupabaseClient;
  profile: Profile;
  role: Role;
  online: Profile[];
  unread: Record<string, number>;
  notificationCount: number;
  refreshCounts: () => Promise<void>;
};
const Community = createContext<Context | null>(null);
export function useCommunity() {
  const value = useContext(Community);
  if (!value) throw new Error("Community context is missing.");
  return value;
}
export function CommunityProvider({
  profile,
  role,
  url,
  apiKey,
  remember,
  children,
}: {
  profile: Profile;
  role: Role;
  url: string;
  apiKey: string;
  remember: boolean;
  children: React.ReactNode;
}) {
  const db = useMemo(
    () => browserClient(url, apiKey, remember),
    [url, apiKey, remember],
  );
  const [online, setOnline] = useState<Profile[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [notificationCount, setCount] = useState(0);
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme(profile.theme);
  }, [profile.theme, setTheme]);
  const refreshCounts = useCallback(async () => {
    const [n, u] = await Promise.all([
      db
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .is("read_at", null),
      db.rpc("unread_counts"),
    ]);
    if (!n.error) setCount(n.count || 0);
    if (!u.error) setUnread(u.data || {});
  }, [db]);
  useEffect(() => {
    void Promise.resolve().then(refreshCounts);
    const channel = db
      .channel("account:" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + profile.id,
        },
        () => void refreshCounts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => void refreshCounts(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_roles",
          filter: "user_id=eq." + profile.id,
        },
        () => window.location.reload(),
      )
      .subscribe();
    return () => {
      void db.removeChannel(channel);
    };
  }, [db, profile.id, refreshCounts]);
  useEffect(() => {
    let alive = true;
    async function heartbeat() {
      if (
        document.visibilityState === "visible" &&
        profile.status !== "offline"
      )
        await command("presence").catch(() => {});
      const { data } = await db
        .from("user_presence")
        .select("profiles!inner(*)")
        .gt("last_seen_at", new Date(Date.now() - 90000).toISOString());
      if (alive)
        setOnline(
          (data || [])
            .map((v) => v.profiles as unknown as Profile)
            .filter((v) => v.status !== "offline"),
        );
    }
    void heartbeat();
    const timer = setInterval(heartbeat, 30000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", heartbeat);
    };
  }, [db, profile.status]);
  return (
    <Community.Provider
      value={{
        db,
        profile,
        role,
        online,
        unread,
        notificationCount,
        refreshCounts,
      }}
    >
      {children}
    </Community.Provider>
  );
}
