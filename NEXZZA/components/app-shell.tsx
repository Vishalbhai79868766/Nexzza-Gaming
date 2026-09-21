/* eslint-disable @next/next/no-location-assign-relative-destination -- Logout discards all in-memory private community data. */
"use client";
import { HardLink as Link } from "@/components/hard-link";
import { usePathname } from "next/navigation";
import {
  Radio,
  MessagesSquare,
  Newspaper,
  PenLine,
  Bell,
  Bookmark,
  UserRound,
  Settings,
  Shield,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { Logo, ThemeToggle } from "@/components/public-shell";
import { Button, PlayerAvatar } from "@/components/common";
import { useCommunity } from "@/components/community-context";
import { authAction } from "@/lib/supabase/client";
import { toast } from "sonner";
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, role, unread, notificationCount } = useCommunity();
  const items = [
    { href: "/chat", label: "Global lobby", icon: Radio },
    {
      href: "/messages",
      label: "My conversations",
      icon: MessagesSquare,
      count: Object.values(unread).reduce((a, b) => a + b, 0),
    },
    { href: "/news", label: "Gaming news", icon: Newspaper },
    { href: "/news/create", label: "Share a story", icon: PenLine },
    {
      href: "/notifications",
      label: "Notifications",
      icon: Bell,
      count: notificationCount,
    },
    { href: "/bookmarks", label: "Bookmarks", icon: Bookmark },
    {
      href: "/profile/" + profile.username,
      label: "My profile",
      icon: UserRound,
    },
    { href: "/settings", label: "Settings", icon: Settings },
    ...(role.role === "player"
      ? []
      : [{ href: "/admin", label: "Moderation", icon: Shield }]),
  ];
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-6 h-[88px]">
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 mb-3 tracking-widest text-[9px]">
              YOUR COMMUNITY
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        pathname === item.href ||
                        (item.href === "/messages" &&
                          pathname.startsWith("/messages/"))
                      }
                      className="h-11"
                    >
                      <Link href={item.href}>
                        <item.icon size={18} />
                        <span>{item.label}</span>
                        {!!item.count && (
                          <span className="unread-pill">
                            {item.count > 99 ? "99+" : item.count}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-auto">
            <Link
              href="/guidelines"
              className="muted text-xs flex items-center gap-2 px-3"
            >
              Community guidelines <ArrowUpRight size={12} />
            </Link>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t p-4">
          <div className="row">
            <PlayerAvatar profile={profile} />
            <div className="min-w-0">
              <strong className="text-xs block truncate">
                {profile.display_name}
              </strong>
              <span className="muted text-[10px]">@{profile.username}</span>
            </div>
            <Button
              className="ml-auto"
              variant="ghost"
              size="icon"
              aria-label="Log out"
              onClick={async () => {
                try {
                  await authAction("logout", {});
                  window.location.href = "/login";
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Could not log out.",
                  );
                }
              }}
            >
              <LogOut size={16} />
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="community-header">
          <div className="row">
            <SidebarTrigger />
            <span className="muted text-xs">
              A little less solo. A lot more together.
            </span>
          </div>
          <div className="row">
            <ThemeToggle />
            <Button variant="ghost" size="icon" asChild>
              <Link
                href="/notifications"
                aria-label={"Notifications, " + notificationCount + " unread"}
              >
                <Bell size={18} />
                {notificationCount > 0 && <span className="status-dot" />}
              </Link>
            </Button>
          </div>
        </header>
        <main id="main-content" className="community-main">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
