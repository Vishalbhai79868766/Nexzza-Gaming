import { requireUser } from "@/lib/supabase/server";
import { CommunityProvider } from "@/components/community-context";
import { AppShell } from "@/components/app-shell";
export const dynamic = "force-dynamic";
export default async function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, role, url, key, remember } = await requireUser();
  return (
    <CommunityProvider
      profile={profile}
      role={role}
      url={url}
      apiKey={key}
      remember={remember}
    >
      <AppShell>{children}</AppShell>
    </CommunityProvider>
  );
}
